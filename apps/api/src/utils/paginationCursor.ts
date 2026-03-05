import { AppError } from "@/middlewares/error.middleware";

export type TimeIdCursor = {
  time: Date;
  id: string;
};

type CursorPayload = {
  t: string;
  i: string;
};

export function encodeTimeIdCursor(cursor: TimeIdCursor): string {
  const payload: CursorPayload = {
    t: cursor.time.toISOString(),
    i: cursor.id,
  };

  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodeTimeIdCursor(rawCursor: string): TimeIdCursor {
  let parsed: unknown;

  try {
    const decoded = Buffer.from(rawCursor, "base64url").toString("utf8");
    parsed = JSON.parse(decoded);
  } catch {
    throw new AppError("Invalid cursor", 400);
  }

  const payload = parsed as Partial<CursorPayload>;
  const timeIso = payload.t;
  const id = payload.i;

  if (
    typeof timeIso !== "string"
    || typeof id !== "string"
    || !id.trim()
  ) {
    throw new AppError("Invalid cursor", 400);
  }

  const time = new Date(timeIso);

  if (Number.isNaN(time.getTime())) {
    throw new AppError("Invalid cursor", 400);
  }

  return {
    time,
    id,
  };
}
