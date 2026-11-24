import { Schema } from "effect";

/** Shared by the browser and the Worker so both sides enforce the same limits. */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export const ALLOWED_CONTENT_TYPES = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
} as const;

export type AllowedContentType = keyof typeof ALLOWED_CONTENT_TYPES;

/** Must match `ATTACHMENT_KEY_PATTERN` in spacetimedb/src/index.ts. */
export const UPLOAD_KEY_PATTERN =
  /^uploads\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|webp|gif|pdf)$/;

export const ContentType = Schema.Literals(
  Object.keys(ALLOWED_CONTENT_TYPES) as [AllowedContentType, ...AllowedContentType[]],
);

export const UploadKey = Schema.String.check(Schema.isPattern(UPLOAD_KEY_PATTERN));

export const UploadResponse = Schema.Struct({
  key: UploadKey,
  url: Schema.String,
  size: Schema.Number,
  contentType: ContentType,
});
export type UploadResponse = typeof UploadResponse.Type;

export const ErrorResponse = Schema.Struct({ error: Schema.String });

export const uploadUrl = (key: string) => `/api/${key}`;
