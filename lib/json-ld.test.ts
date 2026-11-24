import { describe, expect, it } from "vite-plus/test";
import { serializeJsonForHtml } from "./json-ld";

describe("serializeJsonForHtml", () => {
  it("escapes HTML script delimiters without changing the JSON data", () => {
    const data = { title: '</script><script>alert("xss")</script>', text: "A & B > C" };
    const serialized = serializeJsonForHtml(data);
    expect(serialized).not.toContain("<");
    expect(serialized).not.toContain(">");
    expect(serialized).not.toContain("&");
    expect(JSON.parse(serialized)).toEqual(data);
  });
});
