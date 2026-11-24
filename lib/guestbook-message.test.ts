import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";
import { MessageItem } from "@/components/guestbook-message";
import type { Message } from "@/lib/module_bindings/types";

function messageWith(attachmentKey?: string, attachmentName?: string): Message {
  return {
    id: BigInt(1),
    text: "Hello <world>",
    attachmentKey,
    attachmentName,
    sent: { toDate: () => new Date("2026-01-01T00:00:00Z") },
  } as unknown as Message;
}

function renderMessage(message: Message, mine = false) {
  return renderToStaticMarkup(
    createElement(MessageItem, { message, mine, author: undefined, onDelete: () => {} }),
  );
}

describe("guestbook message rendering", () => {
  it("renders text safely and exposes the delete action only to the author", () => {
    const own = renderMessage(messageWith(), true);
    expect(own).toContain("Hello &lt;world&gt;");
    expect(own).toContain('aria-label="Delete message"');
    expect(renderMessage(messageWith())).not.toContain('aria-label="Delete message"');
  });

  it("renders image and PDF attachments with the expected URL and label", () => {
    const image = renderMessage(messageWith("uploads/example.png", "photo"));
    expect(image).toContain('src="/api/uploads/example.png"');
    expect(image).toContain('alt="photo"');
    const pdf = renderMessage(messageWith("uploads/example.pdf", "document"));
    expect(pdf).toContain('href="/api/uploads/example.pdf"');
    expect(pdf).toContain("document");
    expect(pdf).not.toContain('src="/api/uploads/example.pdf"');
  });
});
