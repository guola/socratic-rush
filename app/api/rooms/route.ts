import { and, asc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { leaderboard, players, rooms } from "@/db/schema";

const ROOM_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function code() {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => ROOM_CHARS[value % ROOM_CHARS.length]).join("");
}

function cleanName(value: unknown) {
  return String(value ?? "PLAYER").trim().replace(/[<>]/g, "").slice(0, 14) || "PLAYER";
}

function cleanLang(value: unknown): "zh" | "en" | "ja" {
  return value === "en" || value === "ja" ? value : "zh";
}

export async function GET(request: Request) {
  const roomCode = new URL(request.url).searchParams.get("code")?.toUpperCase().trim() ?? "";
  if (!/^[A-Z2-9]{6}$/.test(roomCode)) return Response.json({ error: "Invalid room code." }, { status: 400 });
  try {
    const [room] = await getDb().select().from(rooms).where(eq(rooms.code, roomCode)).limit(1);
    if (!room) return Response.json({ error: "Room not found." }, { status: 404 });
    const roster = await getDb().select({ id: players.id, nickname: players.nickname, slot: players.slot, score: players.score, combo: players.combo, finished: players.finished }).from(players).where(eq(players.roomCode, roomCode)).orderBy(asc(players.slot));
    const token=request.headers.get("X-Player-Token");
    return Response.json({ room, serverNow:Date.now(), players: roster.map(p=>({...p,id:p.id===token?p.id:`player-${p.slot}`})) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("rooms:get", error);
    return Response.json({ error: "Room is temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json() as Record<string, unknown>;
    const action = String(payload.action ?? "");
    const db = getDb();

    if (action === "create") {
      let roomCode = code();
      for (let attempt = 0; attempt < 4; attempt += 1) {
        const [found] = await db.select({ code: rooms.code }).from(rooms).where(eq(rooms.code, roomCode)).limit(1);
        if (!found) break;
        roomCode = code();
      }
      const playerId = crypto.randomUUID();
      const now = Date.now();
      await db.batch([
        db.insert(rooms).values({ code: roomCode, seed: Math.floor(Math.random() * 2_000_000_000), status: "lobby", createdAt: now }),
        db.insert(players).values({ id: playerId, roomCode, nickname: cleanName(payload.nickname), slot: 1, lang: cleanLang(payload.lang), updatedAt: now }),
      ]);
      return Response.json({ code: roomCode, playerId, slot: 1 }, { status: 201 });
    }

    if (action === "join") {
      const roomCode = String(payload.code ?? "").toUpperCase().trim();
      const [room] = await db.select().from(rooms).where(eq(rooms.code, roomCode)).limit(1);
      if (!room || room.status !== "lobby" || Date.now()-room.createdAt>30*60*1000) return Response.json({ error: "Room is unavailable." }, { status: 404 });
      const roster = await db.select().from(players).where(eq(players.roomCode, roomCode));
      if (roster.length >= 2) return Response.json({ error: "Room is full." }, { status: 409 });
      const playerId = crypto.randomUUID();
      const startAt = Date.now() + 4500;
      await db.batch([
        db.insert(players).values({ id: playerId, roomCode, nickname: cleanName(payload.nickname), slot: 2, lang: cleanLang(payload.lang), updatedAt: Date.now() }),
        db.update(rooms).set({ status: "active", startAt }).where(eq(rooms.code, roomCode)),
      ]);
      return Response.json({ code: roomCode, playerId, slot: 2, startAt }, { status: 201 });
    }

    if (action === "progress") {
      const roomCode = String(payload.code ?? "").toUpperCase().trim();
      const playerId = String(payload.playerId ?? "");
      if(!Number.isInteger(payload.score)||!Number.isInteger(payload.combo)||Number(payload.score)<0||Number(payload.score)>100000||Number(payload.combo)<0||Number(payload.combo)>150)return Response.json({error:"Invalid score"},{status:400});
      const score = Number(payload.score);
      const combo = Math.max(0, Math.min(9999, Number(payload.combo) || 0));
      const finished = payload.finished === true;
      const [player] = await db.select().from(players).where(and(eq(players.id, playerId), eq(players.roomCode, roomCode))).limit(1);
      if (!player) return Response.json({ error: "Player not found." }, { status: 404 });
      if(player.submitted)return Response.json({ok:true});
      const [activeRoom]=await db.select().from(rooms).where(eq(rooms.code,roomCode)).limit(1);
      if(!activeRoom?.startAt || Date.now()<activeRoom.startAt)return Response.json({error:"Match has not started"},{status:409});
      if(finished&&Date.now()<activeRoom.startAt+44500)return Response.json({error:"Match is still playing"},{status:409});
      if (finished && !player.submitted) {
        await db.batch([
          db.update(players).set({ score:Math.max(score,player.score), combo:Math.max(combo,player.combo), finished: true, submitted: true, updatedAt: Date.now() }).where(eq(players.id, playerId)),
          db.insert(leaderboard).values({ nickname: player.nickname, score:Math.max(score,player.score), bestCombo:Math.max(combo,player.combo), mode: "duo", lang: player.lang, createdAt: Date.now(), submissionKey:playerId }).onConflictDoNothing(),
        ]);
      } else {
        await db.update(players).set({ score:sql`max(${players.score}, ${score})`, combo:sql`max(${players.combo}, ${combo})`, updatedAt: Date.now() }).where(and(eq(players.id, playerId),eq(players.submitted,false)));
      }
      return Response.json({ ok: true });
    }

    return Response.json({ error: "Unsupported action." }, { status: 400 });
  } catch (error) {
    console.error("rooms:post", error);
    const message = error instanceof Error && /UNIQUE/.test(error.message) ? "Please try again." : "Room action failed.";
    return Response.json({ error: message }, { status: 503 });
  }
}
