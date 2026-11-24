/** Serialize JSON for an HTML script element without allowing a closing script tag. */
export function serializeJsonForHtml(value: Record<string, unknown>): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}
