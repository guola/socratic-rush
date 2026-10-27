"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Check, Copy, Crown, Delete, Gamepad2, Globe2, Medal, RotateCcw, Trophy, Users, UserRound, Volume2, VolumeX, Zap } from "lucide-react";

import { deck, skills, badges, emptyProfile, ranks, rankIndex, tr, type Lang, type Profile, type Skill } from "./game";
type Screen = "home" | "lobby" | "countdown" | "play" | "result";
type GameMode = "solo" | "duo";
type ScoreRow = { id: number; nickname: string; score: number; bestCombo: number; mode: GameMode };
type RoomResponse = { serverNow:number; error?:string;code:string;playerId:string;slot:number;room:{seed:number;startAt:number;status:string};players:Player[];leaderboard:ScoreRow[] };
type Player = { id: string; nickname: string; slot: number; score: number; combo: number; finished: boolean };
type DopaAudio = {
  unlock: () => void; setMuted: (muted: boolean) => void; setVolume: (volume: number) => void;
  setLevel: (level: number, bpm?: number) => void; startMusic: () => void; stopMusic: () => void;
  update: () => void; pulse: () => { kick: number; phase: number; beat: number };
  keyTap: (combo: number) => void; correct: (combo: number, energy: number) => void;
  wrong: (energy: number) => void; jingle: () => void; finale: () => void;
};
type DopaFx = {
  motion: number; reduced: boolean;
  burst: (x: number, y: number, options?: Record<string, unknown>) => void;
  ring: (x: number, y: number, options?: Record<string, unknown>) => void;
  text: (x: number, y: number, value: string, options?: Record<string, unknown>) => void;
  fireworks: (width: number, height: number, count?: number, top?: number, bottom?: number) => void;
  streamers: (width: number, height: number, count?: number) => void;
  rain: (width: number, count?: number, options?: Record<string, unknown>) => void;
  update: (delta: number) => void; draw: () => void;
};
type DopaBackdrop = { state: { E: number; kick: number; flash: number; reach: number; hue: number; cx: number; cy: number; theme: number }; render: (time: number) => void; setTheme: (name: string) => void };
type DopaBridge = {
  AudioEngine: new () => DopaAudio;
  Backdrop: new (canvas: HTMLCanvasElement, fallback: HTMLDivElement) => DopaBackdrop;
  FX: new (canvas: HTMLCanvasElement, max?: number) => DopaFx;
};

declare global { interface Window { SocraticDopa?: DopaBridge } }

function loadDopaBridge(): Promise<DopaBridge> {
  if (window.SocraticDopa) return Promise.resolve(window.SocraticDopa);
  return new Promise((resolve, reject) => {
    const ready = () => window.SocraticDopa ? resolve(window.SocraticDopa) : reject(new Error("Effects engine did not initialize."));
    window.addEventListener("socratic-rush-dopa-ready", ready, { once: true });
    let script = document.querySelector<HTMLScriptElement>('script[data-socratic-rush-dopa]');
    if (!script) {
      script = document.createElement("script");
      script.type = "module";
      script.src = "/dopa/bridge.js";
      script.dataset.mathClashDopa = "true";
      script.addEventListener("error", () => reject(new Error("Effects engine could not be loaded.")), { once: true });
      document.head.appendChild(script);
    }
  });
}

const GAME_SECONDS = 45;

const copy = {
  zh: {
    kicker: "MARK & DADDY · 系列 02", sub: "好问题，也能一击必杀。", solo: "单人闯关", soloNote: "45 秒刷新最高分", duo: "双人 PK", duoNote: "两台手机 · 同场对决", rank: "总排行榜", soundOn: "动态音效已开启", soundOff: "音效已关闭", ready: "选择模式", live: "实时", combo: "连击", start: "开始", nickname: "你的昵称", nameHint: "例如：MARK", createRoom: "创建房间", joinRoom: "加入房间", roomCode: "房间码", joinHint: "输入另一台手机上的 6 位房间码", duoTitle: "双人手机 PK", duoDesc: "一台手机创建房间，另一台输入房间码。两人加入后自动倒计时。", waiting: "等待挑战者加入", waitingNote: "在另一台手机打开本页，选择“双人 PK”并输入房间码。", copied: "已复制", player: "玩家", opponent: "对手", connecting: "正在连接…", invalidRoom: "房间不可用，请检查房间码。", getReady: "准备", go: "开始！", score: "得分", time: "时间", correct: "漂亮！", wrong: "再试一次", submit: "确定", finished: "挑战完成", newBest: "节奏全开！", resultSolo: "你的最终得分", resultWin: "你赢了！", resultLose: "对手获胜", resultTie: "平局！", again: "再来一局", home: "返回首页", saved: "成绩已进入排行榜", saving: "正在保存成绩…", empty: "等待第一位挑战者", rankNote: "来自所有单人和双人比赛", copyRoom: "复制 PK 邀请", questions: "答题", you: "你", rules: "45 秒，选出更有用的追问。连击点燃节拍，每 5 题双倍奖励。答错也不会出局。",
  },
  en: {
    kicker: "MARK & DADDY · EPISODE 02", sub: "Great questions. Electric victories.", solo: "Solo Run", soloNote: "45 seconds to set a high score", duo: "2-Player VS", duoNote: "Two phones · One arena", rank: "Global leaderboard", soundOn: "Dynamic sound on", soundOff: "Sound off", ready: "Choose a mode", live: "Live", combo: "Combo", start: "Start", nickname: "Your nickname", nameHint: "e.g. MARK", createRoom: "Create room", joinRoom: "Join room", roomCode: "Room code", joinHint: "Enter the 6-character code from the other phone", duoTitle: "Two-phone battle", duoDesc: "Create a room on one phone and enter the code on the other. The match starts when both players join.", waiting: "Waiting for a challenger", waitingNote: "Open this page on the second phone, choose 2-Player VS, and enter the room code.", copied: "Copied", player: "Player", opponent: "Opponent", connecting: "Connecting…", invalidRoom: "Room unavailable. Check the code and try again.", getReady: "Get ready", go: "GO!", score: "Score", time: "Time", correct: "Perfect!", wrong: "Try again", submit: "Check", finished: "Challenge complete", newBest: "Full beat!", resultSolo: "Your final score", resultWin: "You win!", resultLose: "Opponent wins", resultTie: "Tie game!", again: "Play again", home: "Back home", saved: "Score added to the leaderboard", saving: "Saving your score…", empty: "Be the first challenger", rankNote: "Solo and two-player scores", copyRoom: "Copy PK invitation", questions: "Solved", you: "You", rules: "45 seconds. Pick the more useful question. Build combos; every fifth event scores double. Mistakes never knock you out.",
  },
  ja: {
    kicker: "MARK & DADDY · シリーズ 02", sub: "いい問いで、ビートを加速。", solo: "ひとりモード", soloNote: "45秒でハイスコアに挑戦", duo: "ふたり対戦", duoNote: "スマホ2台 · 同時バトル", rank: "総合ランキング", soundOn: "ダイナミックサウンド ON", soundOff: "サウンド OFF", ready: "モードを選ぶ", live: "ライブ", combo: "コンボ", start: "スタート", nickname: "ニックネーム", nameHint: "例：MARK", createRoom: "部屋をつくる", joinRoom: "部屋に入る", roomCode: "ルームコード", joinHint: "もう1台のスマホに表示された6文字を入力", duoTitle: "スマホ2台で対戦", duoDesc: "1台目で部屋を作り、2台目でコードを入力。2人そろうと自動でカウントダウンします。", waiting: "チャレンジャーを待っています", waitingNote: "もう1台のスマホでこのページを開き、「ふたり対戦」からコードを入力してください。", copied: "コピーしました", player: "プレイヤー", opponent: "相手", connecting: "接続中…", invalidRoom: "部屋が見つかりません。コードを確認してください。", getReady: "準備", go: "スタート！", score: "スコア", time: "タイム", correct: "ナイス！", wrong: "もう一度", submit: "決定", finished: "チャレンジ終了", newBest: "ビート全開！", resultSolo: "最終スコア", resultWin: "あなたの勝ち！", resultLose: "相手の勝ち", resultTie: "引き分け！", again: "もう一度", home: "ホームへ", saved: "ランキングに登録しました", saving: "スコアを保存中…", empty: "最初の挑戦者になろう", rankNote: "ひとり・ふたり対戦の総合", copyRoom: "対戦招待をコピー", questions: "正解", you: "あなた", rules: "45秒で役立つ問いを選ぼう。コンボでビート加速、5問ごとに得点2倍。間違えても脱落なし。",
  },
} as const;

function validateEmptyToolInput(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).length > 0) {
    throw new Error("This tool accepts an empty object only.");
  }
}

export default function Home() {
  const [lang, setLang] = useState<Lang>("zh");
  const [screen, setScreen] = useState<Screen>("home");
  const [mode, setMode] = useState<GameMode>("solo");
  const [sound, setSound] = useState(true);
  const [duoOpen, setDuoOpen] = useState(false);
  const [joinMode, setJoinMode] = useState<"create" | "join">("create");
  const [nickname, setNickname] = useState("MARK");
  const [joinCode, setJoinCode] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [roomBusy, setRoomBusy] = useState(false);
  const [roomError, setRoomError] = useState("");
  const [copied, setCopied] = useState(false);
  const [startAt, setStartAt] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [seed, setSeed] = useState(1);
  const [questionIndex, setQuestionIndex] = useState(0);

  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [remaining, setRemaining] = useState(GAME_SECONDS);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | "">("");
  const [opponent, setOpponent] = useState<Player | null>(null);
  const [leaderboard, setLeaderboard] = useState<ScoreRow[]>([]);
  const [saved, setSaved] = useState(false);
  const [resultOpponentScore, setResultOpponentScore] = useState<number | null>(null);
  const audioRef = useRef<DopaAudio | null>(null);
  const backdropRef = useRef<DopaBackdrop | null>(null);
  const fxRef = useRef<DopaFx | null>(null);
  const fxBackRef = useRef<DopaFx | null>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fallbackRef = useRef<HTMLDivElement | null>(null);
  const fxCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fxBackCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const questionStageRef = useRef<HTMLElement | null>(null);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const bestComboRef = useRef(0);
  const endAtRef = useRef(0);
  const finishingRef = useRef(false);
  const t = copy[lang];
  const cards = useMemo(() => deck(seed), [seed]);
  const question = cards[questionIndex % cards.length];
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [badgesOpen, setBadgesOpen] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [saveError, setSaveError] = useState(false);
  const [rankError, setRankError] = useState(false);
  const [syncError, setSyncError] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [earned, setEarned] = useState<number[]>([]);
  const [gain, setGain] = useState(0);
  const sessionSkills = useRef<Record<string,number>>({});
  const seenRef = useRef<number[]>([]);
  const correctRef = useRef(0);
  const lockedRef = useRef(false);
  const questionAtRef = useRef(0);
  const pendingSave=useRef<{url:string;body:string}|null>(null);
  const responseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const profileRef = useRef<Profile>(emptyProfile());
  const persistProfile = useCallback((next:Profile) => { profileRef.current=next; setProfile(next); localStorage.setItem('socratic-rush-profile:'+(nickname.trim()||"MARK").toLowerCase(),JSON.stringify(next)); },[nickname]);
  useEffect(()=>{try{const raw=localStorage.getItem('socratic-rush-profile:'+(nickname.trim()||"MARK").toLowerCase());const value=raw?{...emptyProfile(),...JSON.parse(raw)}:emptyProfile();profileRef.current=value;setProfile(value);}catch{profileRef.current=emptyProfile();setProfile(emptyProfile());}},[nickname]);
  useEffect(()=>{document.documentElement.lang=lang==='zh'?'zh-CN':lang;},[lang]);
  useEffect(()=>{questionAtRef.current=performance.now();},[questionIndex,screen]);
  useEffect(()=>()=>{if(responseTimer.current)clearTimeout(responseTimer.current);},[]);
  const u = (zh:string,en:string,ja:string)=>tr(zh,en,ja)[lang];
  const mainSkill = (Object.entries(sessionSkills.current).sort((a,b)=>b[1]-a[1])[0]?.[0]??'clarify') as Skill;

  const unlockAudio = useCallback(() => {
    if (!sound) return null;
    audioRef.current?.unlock();
    audioRef.current?.setMuted(false);
    return audioRef.current;
  }, [sound]);

  const playTap = useCallback(() => { unlockAudio()?.keyTap(comboRef.current); }, [unlockAudio]);

  const playCorrect = useCallback((nextCombo: number) => {
    const energy = Math.min(1.15, .12 + nextCombo / 10);
    unlockAudio()?.correct(nextCombo, energy);
    const rect = questionStageRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height * .48;
    fxRef.current?.burst(x, y, { count: 14 + Math.round(32 * energy), speed: 320 + 420 * energy, kinds: ["star", "spark", "confetti", "coin"], up: 120, life: .7 });
    fxRef.current?.ring(x, y, { color: energy > .55 ? "#ffd23f" : "#ff7ab6", radius: 70 + 100 * energy, width: 7 });
    fxRef.current?.text(x, y - 40, copy[lang].correct, { color: "#ffd23f", size: 24 + Math.round(16 * energy), vy: -110, life: 1 });
    if (energy > .45) fxBackRef.current?.burst(x, y, { count: Math.round(45 * energy), speed: 760, kinds: ["confetti", "star", "spark"], up: 220, life: .8 });
    if (nextCombo > 0 && nextCombo % 5 === 0) fxBackRef.current?.streamers(window.innerWidth, window.innerHeight, 5 + Math.floor(nextCombo / 5));
    if (backdropRef.current) backdropRef.current.state.flash = Math.min(.45, .12 + energy * .18);
  }, [lang, unlockAudio]);

  const playWrong = useCallback(() => {
    const energy = Math.min(1, .12 + comboRef.current / 10);
    unlockAudio()?.wrong(energy);
  }, [unlockAudio]);

  const loadLeaderboard = useCallback(async () => {
    try {
      const response = await fetch("/api/leaderboard", { cache: "no-store" });
      if (!response.ok) throw new Error("rank");
      const data = await response.json() as RoomResponse;
      setLeaderboard(data.leaderboard ?? []); setRankError(false);
    } catch { setRankError(true); }
  }, []);

  useEffect(() => { void loadLeaderboard(); const timer=setInterval(()=>void loadLeaderboard(),15000);return()=>clearInterval(timer); }, [loadLeaderboard]);
  useEffect(() => {
    const storedName = localStorage.getItem("socratic-rush-name");
    const storedLang = localStorage.getItem("socratic-rush-lang") as Lang | null;
    if (storedName) setNickname(storedName);
    if (storedLang && ["zh", "en", "ja"].includes(storedLang)) setLang(storedLang);
  }, []);
  useEffect(() => { localStorage.setItem("socratic-rush-lang", lang); }, [lang]);

  useEffect(() => {
    let active = true;
    void loadDopaBridge().then((bridge) => {
      if (!active) return;
      const engine = new bridge.AudioEngine();
      engine.setVolume(.82);
      engine.setMuted(!sound);
      audioRef.current = engine;
    }).catch(()=>undefined);
    return () => { active = false; audioRef.current?.stopMusic(); };
  }, []);

  useEffect(() => { audioRef.current?.setMuted(!sound); }, [sound]);

  useEffect(() => {
    let active = true;
    let frame = 0;
    let previous = performance.now();
    void loadDopaBridge().then((bridge) => {
      if (!active || !bgCanvasRef.current || !fallbackRef.current || !fxCanvasRef.current || !fxBackCanvasRef.current) return;
      const backdrop = new bridge.Backdrop(bgCanvasRef.current, fallbackRef.current);
      const front = new bridge.FX(fxCanvasRef.current, 420);
      const back = new bridge.FX(fxBackCanvasRef.current, 600);
      const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches; front.motion = reduced ? .15 : 1; back.motion = reduced ? .15 : 1; front.reduced=reduced; back.reduced=reduced;
      backdrop.setTheme(screen === "lobby" ? "night" : screen === "result" ? "festival" : "classic");
      backdropRef.current = backdrop; fxRef.current = front; fxBackRef.current = back;
      if (screen === "home") back.rain(window.innerWidth, 28, { kinds: ["confetti", "star"] });
      if (screen === "result") { back.fireworks(window.innerWidth, window.innerHeight, 7, .08, .5); front.rain(window.innerWidth, 70, { kinds: ["confetti", "star", "coin"] }); }
      const render = (time: number) => {
        if (!active) return;
        const delta = Math.min(.05, Math.max(0, (time - previous) / 1000));
        previous = time;
        audioRef.current?.update();
        const pulse = audioRef.current?.pulse() ?? { kick: 0, phase: 0, beat: 0 };
        const energy = screen === "play" ? Math.min(1.18, .12 + comboRef.current / 10 + scoreRef.current / 12000) : screen === "result" ? 1.08 : screen === "countdown" ? .42 : .18;
        backdrop.state.E += (energy - backdrop.state.E) * Math.min(1, delta * 4);
        backdrop.state.kick = pulse.kick;
        backdrop.state.cx = window.innerWidth / 2;
        backdrop.state.cy = window.innerHeight * (screen === "play" ? .45 : .5);
        backdrop.state.hue = (backdrop.state.hue + delta * (.015 + energy * .04)) % 1;
        backdrop.state.flash *= Math.exp(-delta * 8);
        backdrop.render(time);
        front.update(delta); back.update(delta); back.draw(); front.draw();
        frame = requestAnimationFrame(render);
      };
      frame = requestAnimationFrame(render);
    }).catch(()=>undefined);
    return () => {
      active = false;
      cancelAnimationFrame(frame);
      backdropRef.current = null; fxRef.current = null; fxBackRef.current = null;
    };
  }, [screen]);

  useEffect(() => {
    const engine = audioRef.current;
    if (!engine) return;
    if (screen === "play" && sound) { engine.unlock(); engine.setMuted(false); engine.startMusic(); }
    else engine.stopMusic();
    return () => { if (screen === "play") engine.stopMusic(); };
  }, [screen, sound]);

  useEffect(() => {
    if (screen !== "play") return;
    const level = Math.min(9, Math.floor(combo / 2));
    audioRef.current?.setLevel(level, 112 + level * 4);
  }, [combo, screen]);

  const resetGame = useCallback(() => {
    if(responseTimer.current)clearTimeout(responseTimer.current); lockedRef.current=false; sessionSkills.current={};seenRef.current=[];correctRef.current=0;setCorrectCount(0);setSelected(null);setGain(0);setEarned([]);setSaveError(false);setSyncError(false); setQuestionIndex(0);  setScore(0); setCombo(0); setBestCombo(0); setRemaining(GAME_SECONDS); setFeedback(""); setOpponent(null); setSaved(false); setResultOpponentScore(null);
    scoreRef.current = 0; comboRef.current = 0; bestComboRef.current = 0; endAtRef.current = 0; finishingRef.current = false;
  }, []);

  const beginSolo = useCallback(() => {
    localStorage.setItem("socratic-rush-name",nickname.trim()||"MARK"); setMode("solo"); resetGame(); setSeed(Date.now() % 2_000_000_000); setStartAt(Date.now() + 3000); setCountdown(3); setScreen("countdown");
    unlockAudio()?.jingle();
  }, [nickname, resetGame, unlockAudio]);

  const roomAction = async (action: "create" | "join") => {
    setRoomBusy(true); setRoomError("");
    const name = nickname.trim().slice(0, 14) || "PLAYER";
    localStorage.setItem("socratic-rush-name", name);
    try {
      const response = await fetch("/api/rooms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, nickname: name, lang, code: joinCode }) });
      const data = await response.json() as RoomResponse;
      if (!response.ok) throw new Error(data.error || "room_error");
      setMode("duo"); setRoomCode(data.code); setPlayerId(data.playerId); setPlayers([{ id: data.playerId, nickname: name, slot: data.slot, score: 0, combo: 0, finished: false }]);
      resetGame(); setScreen("lobby"); setDuoOpen(false); unlockAudio()?.jingle();
    } catch { setRoomError(t.invalidRoom); } finally { setRoomBusy(false); }
  };

  useEffect(() => {
    if (screen !== "lobby" || !roomCode) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const response = await fetch(`/api/rooms?code=${encodeURIComponent(roomCode)}`, { cache: "no-store", headers:{"X-Player-Token":playerId} });
        if (!response.ok) throw new Error("network");
        const data = await response.json() as RoomResponse;
        if (cancelled) return;
        setPlayers(data.players ?? []);setSyncError(false);
        if (data.room?.status === "active" && data.room.startAt) {
          setSeed(data.room.seed); setStartAt(data.room.startAt-(data.serverNow-Date.now())); setCountdown(Math.max(1, Math.ceil((data.room.startAt - data.serverNow) / 1000))); setScreen("countdown");
        }
      } catch { setSyncError(true); }
    };
    void poll();
    const timer = window.setInterval(poll, 800);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [screen, roomCode, playerId]);

  useEffect(() => {
    if (screen !== "countdown") return;
    const tick = () => {
      const next = Math.ceil((startAt - Date.now()) / 1000);
      if (next <= 0) {
        endAtRef.current = startAt + GAME_SECONDS * 1000;
        setRemaining(GAME_SECONDS); setScreen("play");
        unlockAudio()?.jingle();
      } else setCountdown(next);
    };
    tick();
    const timer = window.setInterval(tick, 80);
    return () => window.clearInterval(timer);
  }, [screen, startAt, unlockAudio]);

  const finishGame = useCallback(async () => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    unlockAudio()?.finale();
    if(responseTimer.current)clearTimeout(responseTimer.current);
    lockedRef.current=true;
    const old=profileRef.current;
    const next={...old,xp:old.xp+40+correctRef.current*12,runs:old.runs+1,pk:old.pk+(mode==='duo'?1:0),best:Math.max(old.best,scoreRef.current),combo:Math.max(old.combo,bestComboRef.current),skills:{...old.skills},seen:[...new Set([...old.seen,...seenRef.current])]};
    for(const [k,v] of Object.entries(sessionSkills.current))next.skills[k]=(next.skills[k]??0)+v;
    setEarned(badges.flatMap((b,i)=>b.test(next)&&!b.test(old)?[i]:[]));persistProfile(next);
    setScreen("result");
    const finalScore = scoreRef.current;
    const finalCombo = bestComboRef.current;
    pendingSave.current=mode==="solo"?{url:"/api/leaderboard",body:JSON.stringify({nickname,score:finalScore,bestCombo:finalCombo,mode,lang,submissionKey:crypto.randomUUID()})}:{url:"/api/rooms",body:JSON.stringify({action:"progress",code:roomCode,playerId,score:finalScore,combo:finalCombo,finished:true})};
    try {
      if (mode === "solo") {
        const savedResponse = await fetch("/api/leaderboard", { method: "POST", headers: { "Content-Type": "application/json" }, body: pendingSave.current.body });
        if(!savedResponse.ok)throw new Error("save");
      } else {
        const savedResponse=await fetch("/api/rooms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "progress", code: roomCode, playerId, score: finalScore, combo: finalCombo, finished: true }) });
        if(!savedResponse.ok)throw new Error("save");
        const response = await fetch(`/api/rooms?code=${encodeURIComponent(roomCode)}`, { cache: "no-store", headers:{"X-Player-Token":playerId} });
        if (response.ok) {
          const data = await response.json() as RoomResponse;
          const rival = (data.players as Player[]).find((item) => item.id !== playerId);
          if(rival?.finished)setResultOpponentScore(rival.score);
        }
      }
      setSaved(true); void loadLeaderboard();
    } catch { setSaved(false); setSaveError(true); }
  }, [lang, loadLeaderboard, mode, nickname, playerId, roomCode, unlockAudio, persistProfile]);

  useEffect(() => {
    if (screen !== "play") return;
    const timer = window.setInterval(() => {
      const left = Math.max(0, (endAtRef.current - Date.now()) / 1000);
      setRemaining(left);
      if (left <= 0) { window.clearInterval(timer); void finishGame(); }
    }, 70);
    return () => window.clearInterval(timer);
  }, [screen, finishGame]);

  useEffect(() => {
    if (!["play","result"].includes(screen) || mode !== "duo" || !roomCode || !playerId) return;
    let busy=false;
    const sync = async () => {
      if(busy)return;busy=true;
      try {
        if(screen==="play" && !finishingRef.current)await fetch("/api/rooms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "progress", code: roomCode, playerId, score: scoreRef.current, combo: bestComboRef.current, finished: false }) });
        const response = await fetch(`/api/rooms?code=${encodeURIComponent(roomCode)}`, { cache: "no-store", headers:{"X-Player-Token":playerId} });
        if (!response.ok) throw new Error("network");
        const data = await response.json() as RoomResponse;
        const rival=(data.players as Player[]).find((item) => item.slot !== players.find(p=>p.id===playerId)?.slot) ?? null;
        setOpponent(rival);setSyncError(false);if(screen==="result"&&rival?.finished)setResultOpponentScore(rival.score);
      } catch { setSyncError(true); } finally {busy=false;}
    };
    void sync();
    const timer = window.setInterval(sync, 900);
    return () => window.clearInterval(timer);
  }, [screen, mode, roomCode, playerId, players]);

  const checkAnswer = useCallback((choice:number) => {
    if(screen!=="play" || lockedRef.current || Date.now()>=endAtRef.current)return;
    lockedRef.current=true;setSelected(choice);seenRef.current.push(question.id);
    if(choice===question.correct){
      const nextCombo=comboRef.current+1;
      const speed=Math.max(0,Math.round(50-(performance.now()-questionAtRef.current)/100));
      const points=(100+Math.min(nextCombo,15)*15+speed)*(question.bonus?2:1);
      comboRef.current=nextCombo;bestComboRef.current=Math.max(bestComboRef.current,nextCombo);scoreRef.current+=points;
      correctRef.current++;sessionSkills.current[question.skill]=(sessionSkills.current[question.skill]??0)+1;
      setCorrectCount(correctRef.current);setCombo(nextCombo);setBestCombo(bestComboRef.current);setScore(scoreRef.current);setGain(points);setFeedback("correct");playCorrect(nextCombo);
    }else{comboRef.current=0;setCombo(0);setGain(0);setFeedback("wrong");playWrong();}
    responseTimer.current=setTimeout(()=>{setQuestionIndex(v=>v+1);setSelected(null);setFeedback("");lockedRef.current=false;},choice===question.correct?320:700);
  },[question,screen,playCorrect,playWrong]);
  useEffect(()=>{if(screen!=="play")return;const key=(e:KeyboardEvent)=>{if(e.repeat)return;if(e.key==='1'||e.key==='ArrowLeft'){e.preventDefault();checkAnswer(0);}if(e.key==='2'||e.key==='ArrowRight'){e.preventDefault();checkAnswer(1);}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[screen,checkAnswer]);
  useEffect(()=>{if(screen!=='result'||saved||!saveError)return;let busy=false;const timer=setInterval(async()=>{if(busy||!pendingSave.current)return;busy=true;try{const r=await fetch(pendingSave.current.url,{method:'POST',headers:{'Content-Type':'application/json'},body:pendingSave.current.body});if(r.ok){setSaved(true);setSaveError(false);void loadLeaderboard();}}catch{}finally{busy=false;}},4000);return()=>clearInterval(timer);},[screen,saved,saveError,loadLeaderboard]);
  const replay=()=>{persistProfile({...profileRef.current,replays:profileRef.current.replays+1});if(mode==='solo')beginSolo();else{setScreen('home');setJoinMode('create');setDuoOpen(true);}};
  const copyInvite=async()=>{try{await navigator.clipboard.writeText(`${location.origin}/?room=${roomCode}`);setCopied(true);persistProfile({...profileRef.current,invites:profileRef.current.invites+1});setTimeout(()=>setCopied(false),1600);}catch{setRoomError(u('请手动分享房间码','Share the room code manually','ルームコードを手動で共有してください'));}};
  useEffect(()=>{const room=new URLSearchParams(location.search).get('room');if(room&&/^[A-Z2-9]{6}$/.test(room)){setJoinCode(room);setJoinMode('join');setDuoOpen(true);}},[]);

  useEffect(() => {
    const context = (document as Document & { modelContext?: { registerTool: (tool: unknown, options?: { signal?: AbortSignal }) => void | Promise<void> } }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const tools = [
      { name: "start_solo_socratic_challenge", title: "Start solo challenge", description: "Start the visible 45-second solo questioning challenge.", inputSchema: { type: "object", properties: {}, additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: (input: unknown) => { validateEmptyToolInput(input); beginSolo(); return { status: "countdown", durationSeconds: GAME_SECONDS }; } },
      { name: "open_two_player_setup", title: "Open two-player setup", description: "Open the visible setup for a two-phone Socratic Rush room.", inputSchema: { type: "object", properties: {}, additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: (input: unknown) => { validateEmptyToolInput(input); setDuoOpen(true); return { status: "setup_open" }; } },
      { name: "read_socratic_rush_leaderboard", title: "Read leaderboard", description: "Read the current Socratic Rush high scores shown on the page.", inputSchema: { type: "object", properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: true }, execute: (input: unknown) => { validateEmptyToolInput(input); return { leaderboard: leaderboard.slice(0, 10) }; } },
    ];
    for (const tool of tools) void Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => undefined);
    return () => lifecycle.abort();
  }, [beginSolo, leaderboard]);

  const resultTitle = mode === "solo" ? t.resultSolo : resultOpponentScore === null ? t.finished : scoreRef.current > resultOpponentScore ? t.resultWin : scoreRef.current < resultOpponentScore ? t.resultLose : t.resultTie;

  const topbar = (
    <header className="topbar">
      <button className="brand-mark" aria-label="Socratic Rush home" onClick={() => setScreen("home")}><span>?</span><b>ϟ</b></button>
      <div className="top-actions">
        <button className="sound-pill" aria-label={sound?t.soundOn:t.soundOff} onClick={() => setSound((value) => !value)}>{sound ? <Volume2 size={16} /> : <VolumeX size={16} />}<span>{sound ? t.soundOn : t.soundOff}</span></button>
        <div className="lang-picker" aria-label="Language"><Globe2 size={16} />{(["zh", "en", "ja"] as Lang[]).map((item) => <button key={item} onClick={() => setLang(item)} className={lang === item ? "active" : ""}>{item === "zh" ? "中" : item === "en" ? "EN" : "日"}</button>)}</div>
      </div>
    </header>
  );

  const effectLayers = (
    <>
      <div ref={fallbackRef} className="dopa-fallback" aria-hidden="true" />
      <canvas ref={bgCanvasRef} className="dopa-bg" aria-hidden="true" />
      <canvas ref={fxBackCanvasRef} className="dopa-fx dopa-fx-back" aria-hidden="true" />
      <canvas ref={fxCanvasRef} className="dopa-fx dopa-fx-front" aria-hidden="true" />
    </>
  );

  if (screen === "lobby") return (
    <main className="game-shell centered-shell">{effectLayers}{topbar}<section className="lobby-card"><div className="status-orbit"><Users /><i /></div><p className="eyebrow center"><span />{t.waiting}<span /></p><h1 className="room-code">{roomCode}</h1><Button className="copy-button" onClick={async () => { await copyInvite(); }}><Copy size={16} />{copied ? t.copied : t.copyRoom}</Button><p className="lobby-note">{t.waitingNote}</p>{syncError&&<p className="network-note">{u("连接恢复中…","Reconnecting…","再接続中…")}</p>}{roomError&&<p className="room-error">{roomError}</p>}<div className="players-row">{[0, 1].map((index) => <div className={`player-slot ${players[index] ? "joined" : ""}`} key={index}><span>{players[index] ? players[index].nickname.slice(0, 1).toUpperCase() : "?"}</span><div><small>{t.player} {index + 1}</small><strong>{players[index]?.nickname ?? t.connecting}</strong></div>{players[index] && <Check size={18} />}</div>)}</div><button className="text-button" onClick={() => setScreen("home")}><ArrowLeft size={16} />{t.home}</button></section></main>
  );

  if (screen === "countdown") return (
    <main className="game-shell countdown-shell">{effectLayers}<div className="countdown-ring"><span>{countdown > 0 ? countdown : t.go}</span><i /><i /><i /></div><p>{t.getReady}</p>{mode === "duo" && <div className="versus-mini"><span>{players.find((item) => item.id === playerId)?.nickname ?? t.you}</span><b>VS</b><span>{players.find((item) => item.id !== playerId)?.nickname ?? t.opponent}</span></div>}</main>
  );

  if (screen === "play") return (
    <main className={`game-shell play-shell combo-level-${Math.min(4, Math.floor(combo / 4))}`}>
      {effectLayers}
      <header className="play-hud"><div className="hud-stat"><small>{t.score}</small><strong>{score.toLocaleString()}</strong></div><div className="timer"><svg viewBox="0 0 44 44"><circle cx="22" cy="22" r="18" /><circle className="timer-progress" cx="22" cy="22" r="18" style={{ strokeDashoffset: `${113 - 113 * remaining / GAME_SECONDS}` }} /></svg><span>{Math.ceil(remaining)}</span></div><div className="hud-stat right"><small>{t.combo}</small><strong>×{combo}</strong></div></header>
      {mode === "duo" && <div className="opponent-bar"><span>{t.you} <b>{score}</b></span><i><i style={{ width: `${Math.min(100, score / Math.max(score, opponent?.score ?? 1) * 100)}%` }} /></i><span>{opponent?.nickname ?? t.opponent} <b>{opponent?.score ?? 0}</b></span></div>}
      <div className="arena-meta"><span>CHALLENGE {String(questionIndex+1).padStart(2,'0')}</span><button onClick={()=>setSound(v=>!v)} aria-label={sound?t.soundOn:t.soundOff}>{sound?<Volume2 size={18}/>:<VolumeX size={18}/>}</button><button onClick={()=>{if(responseTimer.current)clearTimeout(responseTimer.current);finishingRef.current=true;setScreen('home');}}>{u('退出','Exit','終了')}</button></div>
      {syncError&&<p className="network-note">{u('连接恢复中…','Reconnecting…','再接続中…')}</p>}
      <section ref={questionStageRef} className={`question-stage rush-stage ${feedback}`}>
        <div className="event-tag">{question.bonus?'⚡ '+u('双倍闪电','DOUBLE FLASH','得点2倍'):combo>=3?'🔥 '+combo+' COMBO':u('选出更有用的追问','Pick the more useful question','より役立つ問いを選ぼう')}</div>
        <h1 className="claim">{question.claim[lang]}</h1>
        <p className="mission">{skills[question.skill].icon} {skills[question.skill].mission[lang]}</p>
        <div className="choice-grid">{question.options.map((option,index)=><button key={index} disabled={selected!==null} className={`choice ${selected!==null&&index===question.correct?'choice-correct':''} ${selected===index&&index!==question.correct?'choice-wrong':''}`} onClick={()=>checkAnswer(index)}><span className="choice-key">{index+1}</span><strong>{option[lang]}</strong><span className="choice-arrow">↗</span></button>)}</div>
        <div className="rush-feedback" aria-live="polite">{feedback==='correct'?`+${gain} · ${t.correct}`:feedback==='wrong'?u('好问题已亮起，下一击！','Better question lit up. Next hit!','良い問いが光った！次へ！'):u('点击选择 · 键盘 1 / 2','Tap to choose · Keys 1 / 2','タップで選択 · キー 1 / 2')}</div>
      </section>
      <div className="energy-track"><div style={{width:`${Math.min(100,combo/10*100)}%`}}/></div><p className="energy-label">{u('连击越高，节拍越燃','BUILD YOUR COMBO. FEEL THE BEAT.','コンボをつなげ、ビートを感じよう')}</p>
    </main>
  );

  if (screen === "result") return (
    <main className="game-shell centered-shell result-shell">{effectLayers}{topbar}<section className="result-card"><div className="result-crown"><Crown /></div><p className="eyebrow center"><span />{t.finished}<span /></p><h2>{resultTitle}</h2><div className="final-score">{scoreRef.current.toLocaleString()}</div><div className="result-stats"><div><small>{t.combo}</small><strong>×{bestComboRef.current}</strong></div><div><small>{t.questions}</small><strong>{correctCount}</strong></div>{mode === "duo" && <div><small>{t.opponent}</small><strong>{resultOpponentScore ?? "…"}</strong></div>}</div><p className="save-state">{saved ? <><Check />{t.saved}</> : saveError?u("成绩暂未保存，网络恢复后自动重试","Score not saved. Retrying automatically.","保存できません。自動で再試行します。"):t.saving}</p><div className="result-actions"><Button onClick={replay}><RotateCcw />{t.again}</Button><Button variant="outline" onClick={() => setScreen("home")}><ArrowLeft />{t.home}</Button></div>
      {mode==="duo"&&resultOpponentScore===null&&<p className="quiet-note">{u("等待对手结算；若对手离线，本局暂不判胜负。","Waiting for the opponent. No winner is declared while their result is missing.","相手の結果を待っています。未受信の間は勝敗を決めません。")}</p>}<div className="xp-result">+{40+correctCount*12} XP · {ranks[rankIndex(profile.xp)][lang]}</div>
      {earned.length>0&&<div className="earned-row">{earned.map(i=><span key={i}>{badges[i].icon} {badges[i].name[lang]}</span>)}</div>}
      <details className="skill-card"><summary><span>{skills[mainSkill].icon}</span><div><small>{correctCount?u('本局收获','YOUR SKILL THIS RUN','今回のスキル'):u('下一局试试','TRY NEXT RUN','次の挑戦に')}</small><strong>{skills[mainSkill].name[lang]}</strong></div><b>＋</b></summary><p>{skills[mainSkill].detail[lang]}</p><blockquote>{skills[mainSkill].prompt[lang]}</blockquote><button className="text-button" onClick={async()=>{try{await navigator.clipboard.writeText(skills[mainSkill].prompt[lang]);setCopied(true);setTimeout(()=>setCopied(false),1600);}catch{setCopied(false);}}}>{copied?t.copied:u('复制，试着问 AI','Copy & try with AI','コピーしてAIに聞こう')}</button><small>{u('赛后自愿尝试：用这句话追问 AI，再自己检查答案。','Optional: try this with AI, then check the answer yourself.','自由参加：AIにこの問いを投げ、自分で答えを確かめよう。')}</small>
      <p className="quiet-note">{u('学会提问的第一步：澄清 → 找证据 → 检查前提 → 换位 → 看后果 → 反思。顺序可以灵活变化。','Ask for clarity, evidence, assumptions, viewpoints, consequences and reflection. The order is flexible.','明確さ・証拠・前提・視点・結果・振り返り。順番は自由です。')}</p></details>
      </section></main>
  );

  return (
    <main className="game-shell">
      {effectLayers}<div className="ambient ambient-one" /><div className="ambient ambient-two" />{topbar}
      <section className="home-grid">
        <div className="hero-copy"><p className="eyebrow"><span />{t.kicker}</p><p className="method-title">{u("苏格拉底的提问方法","THE ART OF SOCRATIC QUESTIONING","ソクラテス式の問いかけ")}</p><h1 className="rush-title">{u("思维闪电","SOCRATIC","思考の閃光")}<span>{lang==="en"?"RUSH":"SOCRATIC RUSH"}</span></h1><p className="subtitle">{t.sub}</p><div className="equation-strip"><span>45s</span><b>×</b><em>100</em><i>{u("挑战事件 · 6 种技能","EVENTS · 6 SKILLS","チャレンジ · 6スキル")}</i></div><p className="rules-copy">{t.rules}</p><div className="identity-row"><label>{t.nickname}<input aria-label={t.nickname} value={nickname} maxLength={14} onChange={e=>setNickname(e.target.value)} /></label><button onClick={()=>setBadgesOpen(true)}>LV.{rankIndex(profile.xp)+1} · {ranks[rankIndex(profile.xp)][lang]} ↗</button></div><p className="ready-label">{t.ready}</p><div className="mode-grid"><Button className="mode-card solo-card" onClick={beginSolo}><span className="mode-icon"><UserRound /></span><span><strong>{t.solo}</strong><small>{t.soloNote}</small></span><span className="mode-key">01</span></Button><Button className="mode-card duo-card" onClick={() => { setRoomError(""); setDuoOpen(true); }}><span className="mode-icon"><Users /></span><span><strong>{t.duo}</strong><small>{t.duoNote}</small></span><span className="mode-key">02</span></Button></div></div>
        <aside className="score-panel"><div className="panel-head"><span><Trophy size={18} /> {t.rank}</span><b>{t.live}</b></div>{leaderboard.length ? <ol>{leaderboard.slice(0, 5).map((row, index) => <li key={row.id}><i>{index + 1}</i><span className={`avatar ${index === 0 ? "coral" : index === 1 ? "cyan" : "yellow"}`}>{row.nickname.slice(0,1).toUpperCase()}</span><span><strong>{row.nickname}</strong><small>{row.bestCombo} {t.combo.toLowerCase()} · {row.mode === "duo" ? "VS" : "SOLO"}</small></span><b>{row.score.toLocaleString()}</b></li>)}</ol> : <div className="empty-rank"><Medal /><p>{rankError?u("排行榜暂时离线","Leaderboard temporarily offline","ランキングは一時オフライン"):t.empty}</p></div>}<p className="rank-note">{t.rankNote}</p><div className="pulse-line"><span /><span /><span /><span /><span /><span /><span /></div></aside>
      </section>
      <section className="growth-strip"><button onClick={()=>setBadgesOpen(true)}><span>✦</span><div><strong>{u("我的成就星图","MY ACHIEVEMENTS","実績の星図")}</strong><small>{badges.filter(b=>b.test(profile)).length} / {badges.length} · {profile.xp} XP · {profile.seen.length}/100</small></div><b>↗</b></button><div className="mini-badges">{badges.slice(0,5).map((b,i)=><button key={i} className={b.test(profile)?"unlocked":"locked"} onClick={()=>setBadgesOpen(true)} title={b.name[lang]}>{b.icon}</button>)}</div></section><footer><span>02</span><div /><p><a href="https://math-clash-family.guola.chatgpt.site" target="_blank" rel="noreferrer">{u("系列 01：数学对决 ↗","EP.01: MATH CLASH ↗","シリーズ01：算数対決 ↗")}</a></p><div /><a href="/dopa/LICENSE.txt" target="_blank" rel="noreferrer">FX: dopa-drill · MIT</a></footer>

      <Dialog open={badgesOpen} onOpenChange={setBadgesOpen}><DialogContent className="duo-dialog badges-dialog"><DialogHeader><DialogTitle>{u('成就与成长','Achievements & growth','実績と成長')}</DialogTitle><DialogDescription>{nickname} · LV.{rankIndex(profile.xp)+1} · {ranks[rankIndex(profile.xp)][lang]} · {profile.xp} XP</DialogDescription></DialogHeader><div className="xp-track"><i style={{width:`${rankIndex(profile.xp)===4?100:profile.xp%500/5}%`}}/></div><p className="quiet-note">{u('每局 +40 XP，每次答对 +12 XP。每 500 XP 升级；成长按昵称保存在这台设备。','+40 XP per run, +12 per correct choice. Level up every 500 XP. Progress is stored by nickname on this device.','一回+40 XP、正解+12 XP。500 XPごとに昇級。成長はこの端末に名前別で保存。')}</p><div className="badge-grid">{badges.map((b,i)=><div key={i} className={b.test(profile)?'badge unlocked':'badge locked'}><span>{b.icon}</span><strong>{b.name[lang]}</strong><small>{b.hint[lang]}</small><em>{b.test(profile)?u('已解锁','Unlocked','獲得済み'):u('待解锁','Locked','未獲得')}</em></div>)}</div><a className="quiet-note" href="https://www.criticalthinking.org/pages/the-role-of-socratic-questioning-in-thinking-teaching-learning/522" target="_blank" rel="noreferrer">{u('了解提问方法的背景 ↗','Explore the questioning method ↗','問いの背景を読む ↗')}</a></DialogContent></Dialog>
      <Dialog open={duoOpen} onOpenChange={setDuoOpen}><DialogContent className="duo-dialog"><DialogHeader><div className="dialog-icon"><Gamepad2 /></div><DialogTitle>{t.duoTitle}</DialogTitle><DialogDescription>{t.duoDesc}</DialogDescription></DialogHeader><div className="dialog-tabs"><button className={joinMode === "create" ? "active" : ""} onClick={() => { setJoinMode("create"); setRoomError(""); }}>{t.createRoom}</button><button className={joinMode === "join" ? "active" : ""} onClick={() => { setJoinMode("join"); setRoomError(""); }}>{t.joinRoom}</button></div><label className="field-label">{t.nickname}<Input value={nickname} maxLength={14} onChange={(event) => setNickname(event.target.value)} placeholder={t.nameHint} /></label>{joinMode === "join" && <label className="field-label">{t.roomCode}<Input className="room-input" value={joinCode} maxLength={6} onChange={(event) => setJoinCode(event.target.value.toUpperCase().replace(/[^A-Z2-9]/g, ""))} placeholder="ABC123" /><small>{t.joinHint}</small></label>}{roomError && <p className="room-error">{roomError}</p>}<Button className="dialog-primary" disabled={roomBusy || !nickname.trim() || (joinMode === "join" && joinCode.length !== 6)} onClick={() => void roomAction(joinMode)}>{roomBusy ? t.connecting : joinMode === "create" ? t.createRoom : t.joinRoom}</Button></DialogContent></Dialog>
    </main>
  );
}
