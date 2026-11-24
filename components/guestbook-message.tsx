"use client";

import { Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { Message, User } from "@/lib/module_bindings/types";
import { uploadUrl } from "@/lib/uploads/shared";

function ImageAttachment({
  attachmentKey,
  name,
}: {
  attachmentKey: string;
  name: string | undefined;
}) {
  return (
    <img
      src={uploadUrl(attachmentKey)}
      alt={name ?? "Attachment"}
      className="max-h-64 w-auto rounded-md border"
      loading="lazy"
    />
  );
}

function MessageAttachment({ message }: { message: Message }) {
  if (!message.attachmentKey) return null;
  if (message.attachmentKey.endsWith(".pdf")) {
    return (
      <a className="text-sm underline" href={uploadUrl(message.attachmentKey)}>
        {message.attachmentName ?? "Download attachment"}
      </a>
    );
  }
  return <ImageAttachment attachmentKey={message.attachmentKey} name={message.attachmentName} />;
}

function AuthorImage({ avatarUrl }: { avatarUrl?: string }) {
  return avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null;
}

function AuthorAvatar({ author }: { author: User | undefined }) {
  return (
    <Avatar>
      <AuthorImage avatarUrl={author?.avatarUrl} />
      <AvatarFallback>{(author?.name ?? "?").slice(0, 1).toUpperCase()}</AvatarFallback>
    </Avatar>
  );
}

function AuthorDetails({ author, message }: { author: User | undefined; message: Message }) {
  return (
    <p className="text-sm">
      <span className="font-medium">{author?.name ?? "Unknown"}</span>{" "}
      <time className="text-muted-foreground" dateTime={message.sent.toDate().toISOString()}>
        {message.sent.toDate().toLocaleString()}
      </time>
    </p>
  );
}

export function MessageItem({
  message,
  author,
  mine,
  onDelete,
}: {
  message: Message;
  author: User | undefined;
  mine: boolean;
  onDelete: () => void;
}) {
  return (
    <li className="flex gap-3">
      <AuthorAvatar author={author} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <AuthorDetails author={author} message={message} />
        <p className="break-words">{message.text}</p>
        <MessageAttachment message={message} />
      </div>
      {mine ? (
        <Button variant="ghost" size="icon" aria-label="Delete message" onClick={onDelete}>
          <Trash2 aria-hidden="true" />
        </Button>
      ) : null}
    </li>
  );
}
