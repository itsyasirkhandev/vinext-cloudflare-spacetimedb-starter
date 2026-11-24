import { env } from "cloudflare:workers";
import { Data, Effect, Schema } from "effect";
import { verifyRequest } from "@/lib/auth/verify-token";
import {
  ALLOWED_CONTENT_TYPES,
  ContentType,
  MAX_UPLOAD_BYTES,
  type UploadResponse,
  uploadUrl,
} from "@/lib/uploads/shared";

class BadRequest extends Data.TaggedError("BadRequest")<{ readonly message: string }> {}
class PayloadTooLarge extends Data.TaggedError("PayloadTooLarge")<{}> {}
class StorageError extends Data.TaggedError("StorageError")<{ readonly cause: unknown }> {}

const json = (body: unknown, status: number) => Response.json(body, { status });

const MAX_REQUEST_BYTES = MAX_UPLOAD_BYTES + 64 * 1024;

async function boundedFormRequest(request: Request): Promise<Request> {
  const reader = request.body?.getReader();
  if (!reader) throw new BadRequest({ message: "Expected multipart/form-data" });
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_REQUEST_BYTES) {
      void reader.cancel().catch(() => {});
      throw new PayloadTooLarge();
    }
    chunks.push(value);
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new Request(request.url, {
    method: "POST",
    headers: { "content-type": request.headers.get("content-type") ?? "" },
    body,
  });
}

function readUploadFile(request: Request) {
  return Effect.gen(function* () {
    const form = yield* Effect.tryPromise({
      try: async () => (await boundedFormRequest(request)).formData(),
      catch: (cause) =>
        cause instanceof PayloadTooLarge
          ? cause
          : new BadRequest({ message: "Expected multipart/form-data" }),
    });
    const file = form.get("file");
    if (!(file instanceof File)) return yield* new BadRequest({ message: "Missing `file` field" });
    if (file.size === 0) return yield* new BadRequest({ message: "File is empty" });
    if (file.size > MAX_UPLOAD_BYTES) return yield* new PayloadTooLarge();

    return file;
  });
}

/** Authenticated upload: verify the SpacetimeAuth token, validate, then write to R2. */
export const handleUpload = (request: Request) =>
  Effect.gen(function* () {
    const claims = yield* verifyRequest(request);
    const declaredLength = Number(request.headers.get("content-length") ?? "0");
    if (declaredLength > MAX_REQUEST_BYTES) return yield* new PayloadTooLarge();

    const file = yield* readUploadFile(request);

    const contentType = yield* Schema.decodeUnknownEffect(ContentType)(file.type).pipe(
      Effect.mapError(
        () => new BadRequest({ message: `Unsupported file type: ${file.type || "unknown"}` }),
      ),
    );

    const key = `uploads/${crypto.randomUUID()}.${ALLOWED_CONTENT_TYPES[contentType]}`;
    yield* Effect.tryPromise({
      try: async () =>
        env.UPLOADS.put(key, await file.arrayBuffer(), {
          httpMetadata: { contentType },
          customMetadata: {
            uploadedBy: claims.sub ?? "unknown",
            originalName: file.name.slice(0, 120),
          },
        }),
      catch: (cause) => new StorageError({ cause }),
    });

    const body: UploadResponse = { key, url: uploadUrl(key), size: file.size, contentType };
    return json(body, 201);
  }).pipe(
    Effect.catchTags({
      MissingToken: () => Effect.succeed(json({ error: "Sign in to upload files" }, 401)),
      InvalidToken: () => Effect.succeed(json({ error: "Invalid or expired token" }, 401)),
      AuthNotConfigured: () =>
        Effect.succeed(json({ error: "NEXT_PUBLIC_SPACETIMEAUTH_CLIENT_ID is not set" }, 503)),
      BadRequest: (error) => Effect.succeed(json({ error: error.message }, 400)),
      PayloadTooLarge: () =>
        Effect.succeed(json({ error: `Files must be at most ${MAX_UPLOAD_BYTES} bytes` }, 413)),
      StorageError: (error) =>
        Effect.sync(() => {
          console.error("R2 put failed", error.cause);
          return json({ error: "Storage is unavailable" }, 502);
        }),
    }),
  );

/** Streams an object back from R2. Keys are random UUIDs; see README for access control notes. */
export const handleDownload = (id: string) =>
  Effect.gen(function* () {
    const key = `uploads/${id}`;
    const object = yield* Effect.tryPromise({
      try: () => env.UPLOADS.get(key),
      catch: (cause) => new StorageError({ cause }),
    });
    if (object === null) return json({ error: "Not found" }, 404);

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("cache-control", "public, max-age=31536000, immutable");
    headers.set("x-content-type-options", "nosniff");
    headers.set(
      "content-disposition",
      headers.get("content-type")?.startsWith("image/") ? "inline" : "attachment",
    );
    return new Response(object.body, { headers });
  }).pipe(
    Effect.catchTag("StorageError", (error) =>
      Effect.sync(() => {
        console.error("R2 get failed", error.cause);
        return json({ error: "Storage is unavailable" }, 502);
      }),
    ),
  );
