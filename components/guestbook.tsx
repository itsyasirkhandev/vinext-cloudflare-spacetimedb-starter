"use client";

import { Effect } from "effect";
import { Paperclip, Send } from "lucide-react";
import { useId, useRef, useState, type FormEvent, type RefObject } from "react";
import type { Identity } from "spacetimedb";
import { useReducer, useSpacetimeDB, useTable } from "spacetimedb/react";
import { MessageItem } from "@/components/guestbook-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { reducers, tables } from "@/lib/module_bindings";
import { uploadAttachment } from "@/lib/uploads/client";

async function uploadSelectedFile(file: File | null, idToken: string) {
  return file ? Effect.runPromise(uploadAttachment(file, idToken)) : undefined;
}

function errorMessage(cause: unknown) {
  return cause instanceof Error ? cause.message : String(cause);
}

function buildMessage(
  text: string,
  file: File | null,
  attachment: Awaited<ReturnType<typeof uploadSelectedFile>>,
) {
  return { text, attachmentKey: attachment?.key, attachmentName: file?.name };
}

function inputDisabled(isActive: boolean, busy: boolean) {
  return !isActive || busy;
}

function GuestbookFields({
  text,
  setText,
  fileInputId,
  fileInputRef,
  busy,
  isActive,
}: {
  text: string;
  setText: (value: string) => void;
  fileInputId: string;
  fileInputRef: RefObject<HTMLInputElement | null>;
  busy: boolean;
  isActive: boolean;
}) {
  const disabled = inputDisabled(isActive, busy);
  return (
    <>
      <label htmlFor="guestbook-text" className="sr-only">
        Message
      </label>
      <Input
        id="guestbook-text"
        value={text}
        maxLength={500}
        placeholder="Say hello…"
        onChange={(event) => setText(event.target.value)}
        disabled={disabled}
      />
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor={fileInputId} className="text-sm text-muted-foreground">
          <Paperclip className="mr-1 inline size-4" aria-hidden="true" />
          Optional attachment (PNG, JPEG, WebP, GIF, PDF, 5 MB max)
        </label>
        <input
          id={fileInputId}
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"
          className="text-sm"
          disabled={disabled}
        />
        <Button type="submit" disabled={disabled || !text.trim()} className="ml-auto">
          <Send aria-hidden="true" />
          {busy ? "Sending…" : "Send"}
        </Button>
      </div>
    </>
  );
}

function GuestbookForm({
  idToken,
  isActive,
  sendMessage,
}: {
  idToken: string;
  isActive: boolean;
  sendMessage: (args: {
    text: string;
    attachmentKey: string | undefined;
    attachmentName: string | undefined;
  }) => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!text.trim()) return;
    const file = fileInputRef.current?.files?.[0] ?? null;
    setBusy(true);
    setError(null);
    try {
      const attachment = await uploadSelectedFile(file, idToken);
      await sendMessage(buildMessage(text, file, attachment));
      setText("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3" aria-busy={busy}>
      <GuestbookFields
        text={text}
        setText={setText}
        fileInputId={fileInputId}
        fileInputRef={fileInputRef}
        busy={busy}
        isActive={isActive}
      />
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  );
}

function MessageListStatus({ loading, empty }: { loading: boolean; empty: boolean }) {
  if (loading) return <li className="text-sm text-muted-foreground">Loading messages…</li>;
  if (empty)
    return <li className="text-sm text-muted-foreground">No messages yet. Be the first!</li>;
  return null;
}

function isOwnMessage(sender: Identity, identity: Identity | undefined) {
  return identity ? sender.isEqual(identity) : false;
}

export function Guestbook({ idToken }: { idToken: string }) {
  const { isActive, identity, connectionError } = useSpacetimeDB();
  const [messages, messagesLoading] = useTable(tables.message);
  const [users] = useTable(tables.user);
  const sendMessage = useReducer(reducers.sendMessage);
  const deleteMessage = useReducer(reducers.deleteMessage);

  const online = users.filter((user) => user.online);
  const sorted = [...messages].sort((a, b) => (a.sent.toDate() < b.sent.toDate() ? 1 : -1));
  const nameOf = (hex: string) => users.find((user) => user.identity.toHexString() === hex);

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
        <GuestbookForm idToken={idToken} isActive={isActive} sendMessage={sendMessage} />

        <ul className="flex flex-col gap-4" aria-live="polite">
          <MessageListStatus loading={messagesLoading} empty={sorted.length === 0} />
          {sorted.map((message) => (
            <MessageItem
              key={message.id.toString()}
              message={message}
              author={nameOf(message.sender.toHexString())}
              mine={isOwnMessage(message.sender, identity)}
              onDelete={() => void deleteMessage({ id: message.id })}
            />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
