"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  Mic,
  StopCircle,
  Star,
  Lock,
  Trash2,
  EyeOff,
  Eye,
  Sparkles,
  AlertCircle,
  TrendingUp,
  Check,
  Volume2, // Uncommented Volume2
} from "lucide-react";

// ✅ 1. Uncommented import (Ensure model_2_1.m4a exists in src folder!)
import audioFile1 from "./model_2_1.m4a"; 

export default function App() {
  // ... (Settings and state remain the same) ...
  const [displayScale, setDisplayScale] = useState("10"); 
  const [hiddenIds, setHiddenIds] = useState(new Set());
  const [checkedIds, setCheckedIds] = useState(new Set());
  const [scoreModeCore, setScoreModeCore] = useState("core");

  const [isRecording, setIsRecording] = useState(false);
  const [activeLineId, setActiveLineId] = useState(1);
  const [recognizedText, setRecognizedText] = useState("");
  const [score, setScore] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [permissionError, setPermissionError] = useState(false);

  const [praise, setPraise] = useState(null);
  const praiseTimerRef = useRef(null);

  const recognitionRef = useRef(null);
  const isRecordingRef = useRef(false);
  const recordStartAtRef = useRef(null);
  
  // Audio playback refs/state
  const audioRef = useRef(null);
  const [isPlayingId, setIsPlayingId] = useState(null);

  const accumulatedFinalRef = useRef("");
  const sessionFinalRef = useRef("");
  const lineRefs = useRef({});

  // ===== Script Data =====
  const scriptData = [
    {
      id: 1,
      role: "appointer",
      label: "アポインター①",
      text: "エコキュートをお使いで、オール電化で電気代が1万円を超えているとのことでしたら、やはりお子様もいらっしゃることですし、ぜひ一度聞いておいていただいた方が良い内容かと思います。\n\nもしこういったお話を聞いていただくとしたら、普段ご在宅なのは平日と土日、どちらが多いイメージでしょうか？",
      audio: audioFile1, // ✅ 2. Added audio file reference here
    },
    // ... (Rest of scriptData remains the same) ...
    { id: 2, role: "customer", label: "お客様", text: "いやあ、でも家のことは、全部奥さんが見てるからねぇ" },
    { id: 3, role: "appointer", label: "アポインター②", text: "そうなんですね、奥様の方がご管理されているんですね" },
    { id: 4, role: "customer", label: "お客様", text: "うん。奥さんに聞いてもらわないと、なんとも分かんないですよね" },
    { id: 5, role: "appointer", label: "アポインター③", text: "そうですよね、やっぱり奥様に聞かないとわからないという方が多かったんですけど、今のお話を私から奥様にするのが難しいと言われる方が多かったので、奥様がいらっしゃる時にお話しさせて頂いて、まずは今させて頂いたこのお話だけさせて頂いているんです。\n\nご主人様の所ですと結構電気使われているので、一度、一緒に聞いて頂いたほうがいいと思うんですけど、ちなみにお2人で聞けるとしたら平日と土日でしたらどちらがご都合いいですか？" },
    { id: 6, role: "customer", label: "お客様", text: "いつもパートに出てるから、やっぱり平日は仕事でいない感じですね" },
    { id: 7, role: "appointer", label: "アポインター④", text: "そうですか。それでしたら土日の方がよろしいかと思うのですが、土曜日と日曜日でしたら、どちらがいらっしゃる可能性が高いでしょうか？" },
    { id: 8, role: "customer", label: "お客様", text: "どちらかと言うと…出かけるとしたら日曜日かな。でも日曜日のいつかと言われても奥さんの予定まで細かくは分からないな" },
    { id: 9, role: "appointer", label: "アポインター⑤", text: `まあ、なかなか細かい予定までは把握されていないですよね。\n\nただ、先ほどのお話ですと、4名様ご家族で電気代が1万円を超えているのは、結構電気を使われている方ですし、オール電化で1万円以上使われているご家庭には『聞いておいてよかった』という方が多かったんで一度聞いてもらった方がいいかと思います。\n\nもちろん聞いたからといって『絶対にすぐやってください』という話でもなかったのでお気軽に皆さん聞いていただいていたのですが。\n\nなんとなくのイメージで大丈夫なのですが、日曜日でしたら午前と午後、どちらがいらっしゃる事が多いですか？` },
    { id: 10, role: "customer", label: "お客様", text: "どちらかと言えば、やっぱり午後かな" },
    { id: 11, role: "appointer", label: "アポインター⑥", text: "午後ですね、ありがとうございます。\n結構お出かけされている方でも、夕方の5時か6時くらいには帰宅されている方が多いのですが、例えば今週末の日曜日の5時くらいでしたら、帰ってきてらっしゃいそうですかね？" },
    { id: 12, role: "customer", label: "お客様", text: "いるかなぁ…。たまに買い物に行くときは、5時はちょっと怪しいかな。6時ぐらいならどうかな？" },
    { id: 13, role: "appointer", label: "アポインター⑦", text: "6時くらいでしたら、多分いらっしゃいますか？" },
    { id: 14, role: "customer", label: "お客様", text: "まあ、それくらいなら多分おると思う。絶対じゃないけど" },
    { id: 15, role: "appointer", label: "アポインター⑧", text: "ありがとうございます。30分くらいの簡単なご案内ですので。まずは一度どういうものかを知っていただければと思います。では当日は担当が変わりますので、最後こちら3点ご記入お願いします。" },
  ];

  // ... (coreTargetTextById, keywordRules, storage keys remain the same) ...
  const coreTargetTextById = {
    9: "4名様ご家族で電気代が1万円を超えている。オール電化で聞いておいてよかったという方が多かった。絶対にすぐやってという話ではない。日曜日でしたら午前と午後、どちらがいらっしゃる事が多いですか？",
  };

  const keywordRules = {
    1: { must: ["エコキュート", "オール電化", "1万円", "お子様", "平日", "土日"], ng: ["えっと", "あのー"] },
    3: { must: ["管理", "そうなんですね"], ng: [] },
    5: { must: ["奥様", "難しい", "いらっしゃる時", "お話", "一緒に", "平日", "土日"], ng: ["契約", "買って"] },
    7: { must: ["土日", "土曜日", "日曜日", "どちら", "可能性"], ng: [] },
    9: { must: ["把握", "4名", "1万円", "結構電気", "聞いておいてよかった", "絶対", "気軽", "午前", "午後"], ng: ["無理", "しつこく"] },
    11: { must: ["午後", "夕方", "5時", "6時", "帰宅", "今週末"], ng: [] },
    13: { must: ["6時", "いらっしゃいますか"], ng: [] },
    15: { must: ["30分", "簡単", "知って", "担当", "3点"], ng: [] },
  };

  const STORAGE_KEY_HISTORY = "toppa_history_okusan_v1";
  const STORAGE_KEY_CHECKED = "toppa_checked_okusan_v1";

  // ... (useEffect hooks for storage and scrolling remain the same) ...
  const [unlockedAppLines, setUnlockedAppLines] = useState(new Set([1, 3, 5, 7, 9, 11, 13, 15]));
  const [history, setHistory] = useState([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      setUnlockedAppLines(new Set([1])); 
      const rawHistory = localStorage.getItem(STORAGE_KEY_HISTORY);
      if (rawHistory) setHistory(JSON.parse(rawHistory));
      const rawChecked = localStorage.getItem(STORAGE_KEY_CHECKED);
      if (rawChecked) setCheckedIds(new Set(JSON.parse(rawChecked)));
    } catch {}
    setIsDataLoaded(true);
  }, []);

  const historyRef = useRef(history);
  useEffect(() => { historyRef.current = history; }, [history]);

  useEffect(() => {
    if (!isDataLoaded) return;
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
    localStorage.setItem(STORAGE_KEY_CHECKED, JSON.stringify(Array.from(checkedIds)));
  }, [history, checkedIds, isDataLoaded]);

  useEffect(() => {
    if (lineRefs.current[activeLineId]) {
      setTimeout(() => {
        const el = lineRefs.current[activeLineId];
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 200);
    }
  }, [activeLineId]);

  // ===== Audio Playback Function =====
  const playModelAudio = (file, id) => {
    if (!file) return;
    
    if (isRecording) {
      alert("録音中は再生できません");
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    
    if (isPlayingId === id) {
      setIsPlayingId(null);
      return;
    }
    
    // NOTE: This assumes file is a valid URL or imported path
    const audio = new Audio(file);
    audioRef.current = audio;
    setIsPlayingId(id);
    
    audio.play().catch(e => {
      console.error(e);
      alert("音声の再生に失敗しました。ファイル形式などを確認してください。");
      setIsPlayingId(null);
    });
    
    audio.onended = () => setIsPlayingId(null);
  };

  // ... (Speech recognition, scoring logic, praise generation logic remain the same) ...
  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setErrorMsg("お使いのブラウザは音声認識に対応していません（Chrome推奨）"); return; }
    const rec = new SR();
    rec.lang = "ja-JP"; rec.interimResults = true; rec.continuous = true;
    rec.onresult = (event) => {
      let interim = ""; let finalTextThisEvent = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalTextThisEvent += t; else interim += t;
      }
      if (finalTextThisEvent) {
        const prevSessionFinal = sessionFinalRef.current;
        if (finalTextThisEvent.startsWith(prevSessionFinal)) {
          const delta = finalTextThisEvent.slice(prevSessionFinal.length);
          if (delta) accumulatedFinalRef.current += delta;
        } else {
          if (!accumulatedFinalRef.current.endsWith(finalTextThisEvent)) accumulatedFinalRef.current += finalTextThisEvent;
        }
        sessionFinalRef.current = finalTextThisEvent;
      }
      setRecognizedText(accumulatedFinalRef.current + interim);
    };
    rec.onerror = (event) => { if (event.error === "not-allowed") { setPermissionError(true); setIsRecording(false); isRecordingRef.current = false; } };
    rec.onend = () => { if (isRecordingRef.current) { try { setTimeout(() => { if (isRecordingRef.current) { sessionFinalRef.current = ""; rec.start(); } }, 120); } catch (e) {} } };
    recognitionRef.current = rec;
    return () => { isRecordingRef.current = false; try { rec.stop(); } catch {} if (praiseTimerRef.current) clearTimeout(praiseTimerRef.current); };
  }, []);

  const normalize = (s) => (s || "").toLowerCase().replace(/[、。？！\s\n・,.]/g, "").replace(/〇〇/g, "");
  const diceSimilarity = (a, b) => {
    const s1 = normalize(a); const s2 = normalize(b);
    if (s1.length < 2 || s2.length < 2) return 0;
    const grams = (s) => { const m = new Map(); for (let i = 0; i < s.length - 1; i++) { const g = s.slice(i, i + 2); m.set(g, (m.get(g) || 0) + 1); } return m; };
    const g1 = grams(s1); const g2 = grams(s2);
    let inter = 0, c1 = 0, c2 = 0;
    for (const v of g1.values()) c1 += v; for (const v of g2.values()) c2 += v;
    for (const [k, v1] of g1.entries()) inter += Math.min(v1, g2.get(k) || 0);
    return (2 * inter) / Math.max(1, c1 + c2);
  };
  const buildScore = (lineId, target, said, duration) => {
    const t = normalize(target); const s = normalize(said);
    if (!s) return { total: 0, match: 0, tempo: 0, fillerScore: 0, fillersCount: 0, cps: 0, keywordBonus: 0, hits: [], misses: [], ngHits: [], ngPenalty: 0 };
    const dice = diceSimilarity(target, said);
    const match = Math.round(Math.max(0, Math.min(1, dice)) * 45);
    const cps = duration > 0 ? s.length / duration : 0;
    let tempo = 5; if (cps >= 4 && cps <= 8) tempo = 10; else if ((cps >= 3.2 && cps < 4) || (cps > 8 && cps <= 9.5)) tempo = 8;
    const fillersCount = (said.match(/えー|あの|えっと|あのー|その|あー/g) || []).length;
    const fillerScore = Math.max(0, 10 - fillersCount);
    const rule = keywordRules[lineId] || { must: [], ng: [] };
    const hits = rule.must.filter((kw) => s.includes(normalize(kw)));
    const misses = rule.must.filter((k) => !hits.includes(k));
    const keywordBonus = Math.round((hits.length / (rule.must.length || 1)) * 35);
    const ngHits = (rule.ng || []).filter((ng) => s.includes(normalize(ng)));
    const ngPenalty = Math.min(4, ngHits.length);
    const total = Math.max(0, Math.min(100, match + tempo + fillerScore + keywordBonus - ngPenalty));
    return { total, match, tempo, fillerScore, fillersCount, cps: Number(cps.toFixed(2)), keywordBonus, hits, misses, ngHits, ngPenalty };
  };

  const getTargetTextForScoring = (id) => { const full = scriptData.find((s) => s.id === id)?.text || ""; if (id === 9 && scoreModeCore === "core") return coreTargetTextById[9] || full; return full; };
  const isAppLine = (id) => scriptData.find((x) => x.id === id)?.role === "appointer";
  const getRank = (total) => { if (total >= 95) return { label: "S", sub: "神", cls: "bg-amber-500 text-white" }; if (total >= 85) return { label: "A", sub: "上手い", cls: "bg-emerald-500 text-white" }; if (total >= 70) return { label: "B", sub: "合格圏", cls: "bg-indigo-500 text-white" }; return { label: "C", sub: "伸びしろ", cls: "bg-slate-500 text-white" }; };
  const formatScore = (total) => (displayScale === "10" ? (total / 10).toFixed(1) : String(Math.round(total)));

  const handleStart = () => {
    setErrorMsg(null); setPermissionError(false); setScore(null); setPraise(null); setRecognizedText("");
    accumulatedFinalRef.current = ""; sessionFinalRef.current = "";
    setIsRecording(true); isRecordingRef.current = true; recordStartAtRef.current = Date.now();
    if(audioRef.current) { audioRef.current.pause(); setIsPlayingId(null); }
    try { recognitionRef.current.start(); } catch { try { recognitionRef.current.stop(); setTimeout(() => recognitionRef.current.start(), 100); } catch {} }
  };

  const praiseStyle = (tone) => { switch (tone) { case "amber": return "bg-amber-50 border-amber-200 text-amber-900"; case "violet": return "bg-violet-50 border-violet-200 text-violet-900"; case "sky": return "bg-sky-50 border-sky-200 text-sky-900"; default: return "bg-emerald-50 border-emerald-200 text-emerald-900"; } };
  const makePraise = ({ res, prev }) => {
    if (res.total < 35) return { tone: "sky", title: "認識が弱かったかも", body: "マイク位置を近づけて、ゆっくりでもOK。内容が取れれば点は出る。" };
    const prevHits = Array.isArray(prev?.hits) ? prev.hits : []; const newHits = (res.hits || []).filter((h) => !prevHits.includes(h));
    if (newHits.length) return { tone: "amber", title: "伸びた", body: `「${newHits[0]}」が入った。ここが強い。` };
    if (typeof prev?.total === "number" && res.total > prev.total) return { tone: "violet", title: "更新", body: `前回より +${res.total - prev.total} 点。積み上がってる。` };
    return { tone: "emerald", title: "ナイス", body: "次は“キーワードを1個足す”だけで跳ねる。" };
  };

  const handleStop = () => {
    setIsRecording(false); isRecordingRef.current = false; try { recognitionRef.current.stop(); } catch {}
    const finalText = accumulatedFinalRef.current || recognizedText;
    if (!finalText) { setErrorMsg("音声が認識されませんでした（もう一度ゆっくり）"); return; }
    const dur = (Date.now() - recordStartAtRef.current) / 1000;
    const target = getTargetTextForScoring(activeLineId);
    const res = buildScore(activeLineId, target, finalText, dur);
    const prev = (historyRef.current || []).find((h) => h.lineId === activeLineId) || null;
    setScore(res);
    setHistory((prevArr) => [{ ts: Date.now(), lineId: activeLineId, total: res.total, hits: res.hits, fillersCount: res.fillersCount, cps: res.cps }, ...prevArr].slice(0, 100));
    if (res.total >= 80) {
      setCheckedIds(prev => new Set(prev).add(activeLineId));
      const nextId = activeLineId + 2; 
      if (nextId <= 15) setUnlockedAppLines(prev => new Set(prev).add(nextId));
    }
    const p = makePraise({ res, prev });
    setPraise(p);
    if (praiseTimerRef.current) clearTimeout(praiseTimerRef.current);
    praiseTimerRef.current = setTimeout(() => setPraise(null), 6000);
  };

  const toggleHide = (id) => setHiddenIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const hideAppLines = () => { const next = new Set(hiddenIds); scriptData.forEach((item) => { if (item.role === "appointer") next.add(item.id); }); setHiddenIds(next); };
  const showAll = () => setHiddenIds(new Set());
  const toggleCheck = (id) => setCheckedIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });

  const oneFix = useMemo(() => {
    if (!score) return null;
    const misses = score.misses || [];
    if (misses.length > 0) return { type: "keyword", title: "キーワードを1個だけ足す", body: `「${misses[0]}」を必ず入れる。` };
    if ((score.fillersCount ?? 0) > 1) return { type: "filler", title: "フィラーを減らす", body: `「えー/あの」が ${score.fillersCount}回。無音を使う。` };
    const cps = score.cps ?? null;
    if (cps !== null && cps < 3.2) return { type: "tempo", title: "テンポを上げる", body: `いま ${cps}字/秒。少し速くてOK。` };
    if (cps !== null && cps > 9.5) return { type: "tempo", title: "落ち着く", body: `いま ${cps}字/秒。速すぎ注意。` };
    return { type: "ok", title: "語尾を言い切る", body: "最後の名詞を、1段だけ強く。" };
  }, [score]);

  const oneFixStyle = (type) => {
    switch (type) { case "keyword": return "bg-amber-50 border-amber-100 text-amber-900"; case "filler": return "bg-sky-50 border-sky-100 text-sky-900"; case "tempo": return "bg-violet-50 border-violet-100 text-violet-900"; default: return "bg-emerald-50 border-emerald-100 text-emerald-900"; }
  };

  const resetAll = () => {
    if (!confirm("全リセットしますか？")) return;
    if (typeof window !== "undefined") { localStorage.removeItem(STORAGE_KEY_HISTORY); localStorage.removeItem(STORAGE_KEY_CHECKED); }
    setUnlockedAppLines(new Set([1])); setHistory([]); setHiddenIds(new Set()); setCheckedIds(new Set()); setScore(null); setPraise(null); setRecognizedText(""); accumulatedFinalRef.current = ""; sessionFinalRef.current = ""; setActiveLineId(1);
  };

  // ... (MiniChart component, rank logic, return statement) ...
  const MiniChart = ({ data }) => {
    if (!data.length) return <div className="text-xs text-slate-400 py-4 text-center">採点するとグラフが表示されます</div>;
    const w = 300, h = 60;
    const pts = data.map((d, i) => `${(i * w) / (data.length - 1 || 1)},${h - (d.total * h) / 100}`).join(" ");
    return (
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} className="bg-indigo-50/50 rounded-xl overflow-visible">
        <polyline points={pts} fill="none" stroke="#4f46e5" strokeWidth="4" strokeLinejoin="round" />
        {data.map((d, i) => <circle key={i} cx={(i * w) / (data.length - 1 || 1)} cy={h - (d.total * h) / 100} r="4" fill="#4f46e5" />)}
      </svg>
    );
  };

  const rank = score ? getRank(score.total) : null;
  const headerRoleName = isAppLine(activeLineId) ? "奥様不在・決済" : "お客様";

  if (!isDataLoaded && typeof window !== "undefined") return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400">Loading...</div>;

  return (
    <div className={`min-h-screen bg-slate-50 p-4 font-sans text-slate-900 transition-colors duration-500 ${isRecording ? "bg-rose-50" : ""}`}>
      <div className="max-w-2xl mx-auto pb-20">
        <h1 className="text-xl font-bold text-indigo-700 text-center mb-6 flex items-center justify-center gap-2">
          <BookOpen /> #2 奥様決済・不在
        </h1>

        {permissionError && (
          <div className="bg-rose-100 border border-rose-400 text-rose-800 px-4 py-3 rounded-xl mb-4 flex items-start gap-2">
            <AlertCircle className="shrink-0 mt-0.5" />
            <div className="text-sm"><strong>マイクが使えません</strong><br />ブラウザの設定でマイクの使用を許可してください。</div>
          </div>
        )}

        <div className="bg-white p-5 rounded-3xl shadow-xl border border-indigo-100 mb-8 relative overflow-hidden">
          {isRecording && <div className="absolute inset-0 border-4 border-rose-400 rounded-3xl animate-pulse pointer-events-none z-20"></div>}
          <div className="flex justify-between items-start mb-3">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target Line</span>
              <span className="font-black text-xl flex items-center gap-2">
                #{activeLineId} {headerRoleName}
                {isAppLine(activeLineId) && !unlockedAppLines.has(activeLineId) && <Lock size={16} className="text-slate-400" />}
                {checkedIds.has(activeLineId) && <span className="text-emerald-500">✅</span>}
              </span>
              <div className="flex items-center gap-2 mt-1">
                <button onClick={() => setDisplayScale("10")} className={`text-[10px] px-2 py-1 rounded-lg border font-bold ${displayScale === "10" ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200"}`}>/10</button>
                <button onClick={() => setDisplayScale("100")} className={`text-[10px] px-2 py-1 rounded-lg border font-bold ${displayScale === "100" ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200"}`}>/100</button>
              </div>
            </div>
            {isRecording ? (
              <button onClick={handleStop} className="bg-rose-500 text-white px-6 py-3 rounded-2xl font-bold animate-pulse shadow-lg flex items-center gap-2 active:scale-95 transition-transform touch-manipulation z-30"><StopCircle size={20} /> 停止</button>
            ) : (
              <button onClick={handleStart} className={`px-6 py-3 rounded-2xl font-bold shadow-lg flex items-center gap-2 transition-all active:scale-95 touch-manipulation z-30 ${isAppLine(activeLineId) ? "bg-gradient-to-br from-indigo-500 to-indigo-600 text-white hover:shadow-indigo-200 hover:shadow-xl" : "bg-slate-200 text-slate-400 cursor-not-allowed"}`} disabled={!isAppLine(activeLineId)}><Mic size={20} /> 採点開始</button>
            )}
          </div>

          {activeLineId === 9 && (
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-2xl p-2 mb-4">
              <span className="text-xs text-slate-500 font-bold ml-2">採点範囲</span>
              <div className="flex bg-white rounded-xl p-1 border border-slate-100">
                <button onClick={() => setScoreModeCore("core")} className={`text-[10px] px-3 py-1.5 rounded-lg font-bold transition-colors ${scoreModeCore === "core" ? "bg-indigo-100 text-indigo-700" : "text-slate-400"}`}>核だけ</button>
                <button onClick={() => setScoreModeCore("full")} className={`text-[10px] px-3 py-1.5 rounded-lg font-bold transition-colors ${scoreModeCore === "full" ? "bg-indigo-100 text-indigo-700" : "text-slate-400"}`}>全文</button>
              </div>
            </div>
          )}

          {isRecording && <div className="bg-indigo-50/50 p-4 rounded-xl text-sm mb-4 border border-indigo-100 text-indigo-800 min-h-[60px] flex items-center justify-center text-center">{recognizedText || "話してください..."}</div>}
          
          {praise && (
            <div className={`mb-4 p-4 rounded-2xl border ${praiseStyle(praise.tone)} shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300`}>
              <div className="flex items-center gap-2 font-black text-sm mb-1"><Sparkles size={16} /> {praise.title}</div>
              <div className="text-xs opacity-90 leading-relaxed">{praise.body}</div>
            </div>
          )}

          {score && (
            <div className="bg-white p-0 rounded-2xl">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-end gap-2">
                  <div className="text-5xl font-black text-indigo-900 leading-none tracking-tighter">{formatScore(score.total)}</div>
                  <div className="text-xs text-indigo-400 font-bold mb-1.5">{displayScale === "10" ? "/10" : "点"}</div>
                </div>
                <div className={`px-4 py-2 rounded-2xl font-black shadow-sm ${rank.cls}`}>{rank.label} <span className="ml-1 text-[10px] opacity-80 font-normal">{rank.sub}</span></div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px] mb-4">
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100"><span className="text-slate-400 block mb-0.5">再現度</span><span className="text-slate-900 font-bold text-base">+{score.match}</span></div>
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100"><span className="text-slate-400 block mb-0.5">キーワード</span><span className="text-slate-900 font-bold text-base">+{score.keywordBonus}</span></div>
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100"><span className="text-slate-400 block mb-0.5">テンポ</span><span className="text-slate-900 font-bold text-base">+{score.tempo}</span></div>
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100"><span className="text-slate-400 block mb-0.5">口癖</span><span className="text-slate-900 font-bold text-base">+{score.fillerScore}</span></div>
              </div>
              {score.ngHits?.length > 0 && <div className="bg-rose-50 border border-rose-100 text-rose-700 text-xs p-2 rounded-lg mb-3 font-bold text-center">NGワード検出: {score.ngHits.join("、")} (-{score.ngPenalty})</div>}
              {oneFix && <div className={`p-4 rounded-2xl border shadow-sm ${oneFixStyle(oneFix.type)}`}><div className="text-[10px] font-black opacity-60 mb-1 uppercase tracking-wider">Next</div><div className="text-sm font-black mb-1">{oneFix.title}</div><div className="text-xs opacity-90">{oneFix.body}</div></div>}
            </div>
          )}
        </div>

        <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200 mb-6">
          <div className="flex items-center gap-2 font-bold mb-3 text-sm text-slate-600"><TrendingUp size={16} /> スコア推移（最新10回）</div>
          <MiniChart data={history.slice(0, 10).reverse()} />
        </div>

        <div className="space-y-3 pb-20">
          {scriptData.map((item) => {
            const isApp = item.role === "appointer";
            const locked = isApp && !unlockedAppLines.has(item.id);
            const hidden = hiddenIds.has(item.id);
            const isActive = activeLineId === item.id;
            const isChecked = checkedIds.has(item.id);

            return (
              <div key={item.id} ref={(el) => (lineRefs.current[item.id] = el)} className={`p-4 rounded-2xl border-2 transition-all duration-300 ${isActive && !locked ? "border-indigo-500 bg-white shadow-md ring-4 ring-indigo-50 scale-[1.02]" : "border-slate-100 bg-white"} ${locked ? "opacity-60 grayscale" : ""} ${isChecked && isApp ? "bg-emerald-50/50 border-emerald-100" : ""}`}>
                <div className="flex justify-between mb-3 items-center">
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${isApp ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500"}`}>{item.label}</span>
                  <div className="flex items-center gap-2">
                    {locked && <Lock size={14} className="text-slate-400" />}
                    
                    {/* ✅ 3. Uncommented button code */}
                    {isApp && !locked && item.audio && (
                      <button onClick={() => playModelAudio(item.audio, item.id)} className={`text-[10px] px-2.5 py-1.5 rounded-lg border font-bold inline-flex items-center gap-1 active:scale-95 ${isPlayingId === item.id ? "bg-amber-100 text-amber-700 border-amber-200 animate-pulse" : "bg-white text-slate-500 border-slate-200"}`}>
                        {isPlayingId === item.id ? <StopCircle size={12} fill="currentColor"/> : <Volume2 size={12}/>}
                        お手本
                      </button>
                    )}

                    {isApp && !locked && (
                      <button onClick={() => { setActiveLineId(item.id); setScore(null); setPraise(null); setRecognizedText(""); setErrorMsg(null); }} className="text-[10px] px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 font-bold inline-flex items-center gap-1 active:scale-95">
                        <Star size={12} fill="currentColor" /> 練習
                      </button>
                    )}
                    <button disabled={locked} onClick={() => toggleHide(item.id)} className={`text-[10px] px-2.5 py-1.5 rounded-lg border font-bold inline-flex items-center gap-1 active:scale-95 transition-transform ${locked ? "bg-slate-50 border-slate-200 text-slate-300" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
                      {hidden ? <Eye size={12} /> : <EyeOff size={12} />} {hidden ? "見る" : "隠す"}
                    </button>
                    {isApp && (
                      <button onClick={(e) => { e.stopPropagation(); toggleCheck(item.id); }} className={`text-[10px] px-2.5 py-1.5 rounded-lg border font-bold inline-flex items-center gap-1 active:scale-95 transition-transform ${isChecked ? "bg-emerald-500 text-white border-emerald-500 shadow-md" : "bg-white border-slate-200 text-slate-400 hover:bg-slate-50"}`}>
                        {isChecked ? "✅" : "未"}
                      </button>
                    )}
                  </div>
                </div>
                <div onClick={() => { if (!locked) toggleHide(item.id); }} className={`relative text-sm leading-relaxed rounded-xl p-3 border cursor-pointer min-h-[3rem] flex items-center ${isApp ? "bg-indigo-50/30 border-indigo-100/50" : "bg-slate-50 border-slate-100"} ${isChecked && !hidden && isApp ? "line-through text-slate-400 opacity-70" : ""}`}>
                  {locked ? <div className="text-slate-400 text-xs w-full text-center">ロックされています</div> : hidden ? <div className="w-full text-center text-indigo-300 font-bold text-xs"><EyeOff size={16} className="inline mr-1" />タップして確認</div> : <div className="text-slate-700 whitespace-pre-wrap">{item.text}</div>}
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200 mb-6">
          <div className="flex gap-2 justify-between items-center">
            <div className="text-xs text-slate-500 font-bold">暗記補助</div>
            <div className="flex gap-2">
              <button onClick={hideAppLines} className="px-3 py-2 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100 text-xs font-bold hover:bg-indigo-100 inline-flex items-center gap-1 active:scale-95 transition-transform"><EyeOff size={14} /> アポを隠す</button>
              <button onClick={showAll} className="px-3 py-2 rounded-xl bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold hover:bg-slate-100 inline-flex items-center gap-1 active:scale-95 transition-transform"><Eye size={14} /> 全て表示</button>
            </div>
          </div>
        </div>

        <button onClick={resetAll} className="w-full py-4 text-slate-400 text-xs font-bold flex items-center justify-center gap-1 hover:text-rose-500 transition-colors"><Trash2 size={14} /> データを初期化する</button>
        {errorMsg && <div className="fixed bottom-4 left-4 right-4 bg-slate-800 text-white text-xs p-3 rounded-xl text-center shadow-2xl animate-bounce z-50">{errorMsg}</div>}
      </div>
    </div>
  );
}
