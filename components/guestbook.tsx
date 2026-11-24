"use client";

import { Effect } from "effect";
import { Paperclip, Send, Trash2 } from "lucide-react";
import { useId, useState, type FormEvent } from "react";
import { useReducer, useSpacetimeDB, useTable } from "spacetimedb/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { reducers, tables } from "@/lib/module_bindings";
import { uploadAttachment } from "@/lib/uploads/client";
import { uploadUrl } from "@/lib/uploads/shared";

export function Guestbook({ idToken }: { idToken: string }) {
  const { isActive, identity, connectionError } = useSpacetimeDB();
  const [messages, messagesLoading] = useTable(tables.message);
  const [users] = useTable(tables.user);
  const sendMessage = useReducer(reducers.sendMessage);
  const deleteMessage = useReducer(reducers.deleteMessage);

  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputId = useId();

  const online = users.filter((user) => user.online);
  const sorted = [...messages].sort((a, b) => (a.sent.toDate() < b.sent.toDate() ? 1 : -1));
  const nameOf = (hex: string) => users.find((user) => user.identity.toHexString() === hex);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const attachment = file
        ? await Effect.runPromise(uploadAttachment(file, idToken))
        : undefined;
      await sendMessage({
        text,
        attachmentKey: attachment?.key,
        attachmentName: attachment ? file?.name : undefined,
      });
      setText("");
      setFile(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  if (connectionError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Could not connect to SpacetimeDB</CardTitle>
          <CardDescription>{connectionError.message}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Realtime guestbook
          <Badge variant={isActive ? "default" : "secondary"}>
            {isActive ? "Live" : "Connecting"}
          </Badge>
        </CardTitle>
        <CardDescription>
          {online.length} online. Messages sync through SpacetimeDB; attachments are stored in
          Cloudflare R2.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <form onSubmit={onSubmit} className="flex flex-col gap-3" aria-busy={busy}>
          <label htmlFor="guestbook-text" className="sr-only">
            Message
          </label>
          <Input
            id="guestbook-text"
            value={text}
            maxLength={500}
            placeholder="Say hello…"
            onChange={(event) => setText(event.target.value)}
            disabled={!isActive || busy}
          />
          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor={fileInputId} className="text-sm text-muted-foreground">
              <Paperclip className="mr-1 inline size-4" aria-hidden="true" />
              Optional attachment (PNG, JPEG, WebP, GIF, PDF, 5 MB max)
            </label>
            <input
              id={fileInputId}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"
              className="text-sm"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              disabled={!isActive || busy}
            />
            <Button type="submit" disabled={!isActive || busy || !text.trim()} className="ml-auto">
              <Send aria-hidden="true" />
              {busy ? "Sending…" : "Send"}
            </Button>
          </div>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </form>

        <ul className="flex flex-col gap-4" aria-live="polite">
          {messagesLoading ? (
            <li className="text-sm text-muted-foreground">Loading messages…</li>
          ) : null}
          {!messagesLoading && sorted.length === 0 ? (
            <li className="text-sm text-muted-foreground">No messages yet. Be the first!</li>
          ) : null}
          {sorted.map((message) => {
            const author = nameOf(message.sender.toHexString());
            const mine = identity ? message.sender.isEqual(identity) : false;
            return (
              <li key={message.id.toString()} className="flex gap-3">
                <Avatar>
                  {author?.avatarUrl ? <AvatarImage src={author.avatarUrl} alt="" /> : null}
                  <AvatarFallback>{(author?.name ?? "?").slice(0, 1).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="text-sm">
                    <span className="font-medium">{author?.name ?? "Unknown"}</span>{" "}
                    <time
                      className="text-muted-foreground"
                      dateTime={message.sent.toDate().toISOString()}
                    >
                      {message.sent.toDate().toLocaleString()}
                    </time>
                  </p>
                  <p className="break-words">{message.text}</p>
                  {message.attachmentKey ? (
                    !message.attachmentKey.endsWith(".pdf") ? (
                      <img
                        src={uploadUrl(message.attachmentKey)}
                        alt={message.attachmentName ?? "Attachment"}
                        className="max-h-64 w-auto rounded-md border"
                        loading="lazy"
                      />
                    ) : (
                      <a className="text-sm underline" href={uploadUrl(message.attachmentKey)}>
                        {message.attachmentName ?? "Download attachment"}
                      </a>
                    )
                  ) : null}
                </div>
                {mine ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Delete message"
                    onClick={() => void deleteMessage({ id: message.id })}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
