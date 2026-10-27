import { desc } from "drizzle-orm";
import { getDb } from "@/db";
import { leaderboard } from "@/db/schema";

function cleanName(value: unknown) {
  return String(value ?? "PLAYER").trim().replace(/[<>]/g, "").slice(0, 14) || "PLAYER";
}

export async function GET() {
  try {
    const rows = await getDb().select({id:leaderboard.id,nickname:leaderboard.nickname,score:leaderboard.score,bestCombo:leaderboard.bestCombo,mode:leaderboard.mode,lang:leaderboard.lang,createdAt:leaderboard.createdAt}).from(leaderboard).orderBy(desc(leaderboard.score), desc(leaderboard.createdAt)).limit(10);
    return Response.json({ leaderboard: rows }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("leaderboard:get", error);
    return Response.json({ error: "Leaderboard is temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json() as Record<string, unknown>;
    if(!Number.isInteger(payload.score)||!Number.isInteger(payload.bestCombo)||Number(payload.score)<0||Number(payload.score)>100000||Number(payload.bestCombo)<0||Number(payload.bestCombo)>150||typeof payload.submissionKey!=="string"||!/^[a-f0-9-]{36}$/.test(payload.submissionKey))return Response.json({error:"Invalid score"},{status:400});
    const score=Number(payload.score);
    const bestCombo = Math.max(0, Math.min(9999, Number(payload.bestCombo) || 0));
    const mode = "solo";
    const lang = payload.lang === "en" || payload.lang === "ja" ? payload.lang : "zh";
    const [row] = await getDb().insert(leaderboard).values({ nickname: cleanName(payload.nickname), score, bestCombo, mode, lang, createdAt: Date.now(), submissionKey:String(payload.submissionKey) }).onConflictDoNothing().returning();
    return Response.json({ score: row?{id:row.id,score:row.score}:null, ok:true }, { status: 201 });
  } catch (error) {
    console.error("leaderboard:post", error);
    return Response.json({ error: "Score could not be saved." }, { status: 503 });
  }
}
