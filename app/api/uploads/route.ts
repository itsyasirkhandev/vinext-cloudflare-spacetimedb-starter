import { Effect } from "effect";
import { handleUpload } from "@/lib/uploads/server";

export async function POST(request: Request) {
  return Effect.runPromise(handleUpload(request));
}
