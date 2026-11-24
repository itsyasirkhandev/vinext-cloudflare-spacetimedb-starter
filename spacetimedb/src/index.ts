import { schema, SenderError, t, table } from "spacetimedb/server";
import { profileFromClaims, requireSpacetimeAuth } from "./auth";

/** Signed-in users. Public so every client can render names and presence. */
const user = table(
  { name: "user", public: true },
  {
    identity: t.identity().primaryKey(),
    name: t.string(),
    avatarUrl: t.string().optional(),
    online: t.bool(),
    lastSeen: t.timestamp(),
  },
);

/** Realtime guestbook messages, optionally pointing at an R2 object. */
const message = table(
  { name: "message", public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    sender: t.identity().index("btree"),
    text: t.string(),
    attachmentKey: t.string().optional(),
    attachmentName: t.string().optional(),
    sent: t.timestamp(),
  },
);

const spacetimedb = schema({ user, message });
export default spacetimedb;

const MAX_MESSAGE_LENGTH = 500;
/** Must match `UPLOAD_KEY_PATTERN` in lib/uploads/shared.ts. */
const ATTACHMENT_KEY_PATTERN =
  /^uploads\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|webp|gif|pdf)$/;

export const init = spacetimedb.init((_ctx) => {});

export const onConnect = spacetimedb.clientConnected((ctx) => {
  const jwt = requireSpacetimeAuth(ctx.senderAuth.jwt);
  const profile = profileFromClaims(jwt);
  const existing = ctx.db.user.identity.find(ctx.sender);
  if (existing) {
    ctx.db.user.identity.update({
      ...existing,
      name: profile.name,
      avatarUrl: profile.avatarUrl,
      online: true,
      lastSeen: ctx.timestamp,
    });
  } else {
    ctx.db.user.insert({
      identity: ctx.sender,
      name: profile.name,
      avatarUrl: profile.avatarUrl,
      online: true,
      lastSeen: ctx.timestamp,
    });
  }
});

export const onDisconnect = spacetimedb.clientDisconnected((ctx) => {
  const existing = ctx.db.user.identity.find(ctx.sender);
  if (existing) {
    ctx.db.user.identity.update({ ...existing, online: false, lastSeen: ctx.timestamp });
  }
});

export const send_message = spacetimedb.reducer(
  {
    text: t.string(),
    attachmentKey: t.option(t.string()),
    attachmentName: t.option(t.string()),
  },
  (ctx, { text, attachmentKey, attachmentName }) => {
    requireSpacetimeAuth(ctx.senderAuth.jwt);
    const body = text.trim();
    if (body.length === 0) throw new SenderError("Messages must not be empty");
    if (body.length > MAX_MESSAGE_LENGTH) {
      throw new SenderError(`Messages must be at most ${MAX_MESSAGE_LENGTH} characters`);
    }
    if (attachmentKey !== undefined && !ATTACHMENT_KEY_PATTERN.test(attachmentKey)) {
      throw new SenderError("Invalid attachment key");
    }
    ctx.db.message.insert({
      id: 0n,
      sender: ctx.sender,
      text: body,
      attachmentKey,
      attachmentName: attachmentKey === undefined ? undefined : attachmentName?.slice(0, 120),
      sent: ctx.timestamp,
    });
  },
);

export const delete_message = spacetimedb.reducer({ id: t.u64() }, (ctx, { id }) => {
  requireSpacetimeAuth(ctx.senderAuth.jwt);
  const existing = ctx.db.message.id.find(id);
  if (!existing) throw new SenderError("Message not found");
  if (!existing.sender.isEqual(ctx.sender)) {
    throw new SenderError("You can only delete your own messages");
  }
  ctx.db.message.id.delete(id);
});
