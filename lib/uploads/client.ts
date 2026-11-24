import { Data, Effect, Schema } from "effect";
import {
  ALLOWED_CONTENT_TYPES,
  ErrorResponse,
  MAX_UPLOAD_BYTES,
  UploadResponse,
} from "@/lib/uploads/shared";

class UploadRejected extends Data.TaggedError("UploadRejected")<{
  readonly message: string;
}> {}

const reject = (message: string) => new UploadRejected({ message });

/** Upload a file to `/api/uploads` (R2) with the user's SpacetimeAuth ID token. */
export const uploadAttachment = (file: File, idToken: string) =>
  Effect.gen(function* () {
    if (!(file.type in ALLOWED_CONTENT_TYPES)) {
      return yield* reject("Only PNG, JPEG, WebP, GIF, or PDF files are allowed");
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return yield* reject(`Files must be at most ${MAX_UPLOAD_BYTES / 1024 / 1024} MB`);
    }

    const body = new FormData();
    body.set("file", file);
    const response = yield* Effect.tryPromise({
      try: () =>
        fetch("/api/uploads", {
          method: "POST",
          body,
          headers: { authorization: `Bearer ${idToken}` },
        }),
      catch: () => reject("Network error while uploading"),
    });
    const payload: unknown = yield* Effect.tryPromise({
      try: () => response.json(),
      catch: () => reject(`Upload failed with HTTP ${response.status}`),
    });

    if (!response.ok) {
      const error = Schema.decodeUnknownOption(ErrorResponse)(payload);
      return yield* reject(error._tag === "Some" ? error.value.error : `HTTP ${response.status}`);
    }
    return yield* Schema.decodeUnknownEffect(UploadResponse)(payload).pipe(
      Effect.mapError(() => reject("Unexpected upload response")),
    );
  });
