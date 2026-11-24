import { Effect } from "effect";
import { handleDownload } from "@/lib/uploads/server";
import { UPLOAD_KEY_PATTERN } from "@/lib/uploads/shared";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!UPLOAD_KEY_PATTERN.test(`uploads/${id}`)) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  return Effect.runPromise(handleDownload(id));
}
