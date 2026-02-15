import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  Mic,
  StopCircle,
  Star,
  Lock,
  TrendingUp,
  Trash2,
  EyeOff,
  Eye,
  Sparkles,
  AlertCircle,
} from "lucide-react";

export default function App() {
  // ===== 設定・状態 =====
  const [unlockThreshold, setUnlockThreshold] = useState(80);
  const [displayScale, setDisplayScale] = useState("10"); // "10" | "100"
  const [hiddenIds, setHiddenIds] = useState(new Set());
  const [scoreMode5, setScoreMode5] = useState("core"); // "core" | "full"

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
  const accumulatedTranscriptRef = useRef("");
  
  // 自動スクロール用
  const lineRefs = useRef({});

  // ===== 正式台本データ =====
  const scriptData = [
    {
      id: 1,
      role: "appointer",
      label: "アポインター①",
      text: "今回、〇〇さんの場所をお借りして、負担なくスマートハウスにできる施工様募集をさせてもらってるんですが、スマートハウスってご存知ですか？",
    },
    { id: 2, role: "customer", label: "お客様", text: "いや、ま、ちょっと忙しいんで大丈夫です。はい。" },
    {
      id: 3,
      role: "appointer",
      label: "アポインター②",
      text: "ああ、すいません。すぐ終わりますんで。\n\nちなみにスマートハウスはご存知でした？",
    },
    { id: 4, role: "customer", label: "お客様", text: "いや、あんまわかんないですけど。" },
    {
      id: 5,
      role: "appointer",
      label: "アポインター③",
      text:
        "あ～、そうなんですね。\n\n" +
        "これ何かっていうと、蓄電池と太陽光で電気を作って、貯めて、光熱費を払わないお家なんですけど。\n\n" +
        "新築とかだと、義務になっていく予定だったり、今でも２軒に1軒っていうところで、かなり増えてきてるんですね。\n\n" +
        "ちょっとその中で、今年建ってるお家とかでも、改めて検討される方ってかなり増えてきてまして。なぜこんなに増えてきているかっていうと。。",
    },
  ];

  // ===== ターゲット設定 =====
  const coreTargetTextById = {
    5: "蓄電池と太陽光で電気を作って、貯めて、光熱費を払わない。新築は義務化、２軒に1軒で増えている。今年建ってる家でも改めて検討が増えている。",
  };

  const keywordRules = {
    1: { must: ["スマートハウス", "場所をお借り", "負担なく", "施工", "ご存知"], ng: ["えっと", "たぶん", "まあ"] },
    3: { must: ["すいません", "すぐ終わ", "ちなみに", "スマートハウス", "ご存知"], ng: ["契約", "買って", "今すぐ"] },
    5: {
      must: ["蓄電池", "太陽光", "作って", "貯めて", "払わない", "新築", "義務", "２軒に1軒", "増えて", "今年", "検討"],
      ng: ["難しい", "無理", "よくわからない", "たぶん", "まあ"],
    },
  };

  // ===== Web対応版：データ読み込みロジック =====
  // 1. まずは安全な初期値（デフォルト）で立ち上げる
  const [unlockedAppLines, setUnlockedAppLines] = useState(new Set([1]));
  const [history, setHistory] = useState([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false); // データ読み込み完了フラグ

  // 2. 画面が表示された後に、ブラウザからデータを読み込む
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const rawUnlock = localStorage.getItem("toppa_unlocked_v7");
        if (rawUnlock) {
           setUnlockedAppLines(new Set(JSON.parse(rawUnlock)));
        }

        const rawHistory = localStorage.getItem("toppa_history_v7");
        if (rawHistory) {
           setHistory(JSON.parse(rawHistory));
        }
      } catch (e) {
        console.error("Load Error", e);
      }
      setIsDataLoaded(true); // 読み込み完了
    }
  }, []);

  const historyRef = useRef(history);
  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  // 3. データ読み込みが終わってから保存を開始する（空データでの上書き防止）
  useEffect(() => {
    if (!isDataLoaded) return; 
    localStorage.setItem("toppa_unlocked_v7", JSON.stringify(Array.from(unlockedAppLines)));
    localStorage.setItem("toppa_history_v7", JSON.stringify(history));
  }, [unlockedAppLines, history, isDataLoaded]);

  // ===== 自動スクロール =====
  const scrollToActive = () => {
    setTimeout(() => {
      const el = lineRefs.current[activeLineId];
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 300);
  };

  useEffect(() => {
    scrollToActive();
  }, [activeLineId]);

  // ===== 音声認識セットアップ =====
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setErrorMsg("お使いのブラウザは音声認識に対応していません。ChromeまたはSafariをご利用ください。");
      return;
    }

    const rec = new SR();
    rec.lang = "ja-JP";
    rec.interimResults = true;
    rec.continuous = true;

    rec.onresult = (event) => {
      let interim = "";
      let finalSession = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalSession += t;
        else interim += t;
      }
      if (finalSession) accumulatedTranscriptRef.current += finalSession;
      setRecognizedText(accumulatedTranscriptRef.current + interim);
    };

    rec.onerror = (event) => {
      console.error("Speech Error:", event.error);
      if (event.error === "not-allowed") {
        setPermissionError(true);
        setIsRecording(false);
        isRecordingRef.current = false;
      }
    };

    rec.onend = () => {
      if (isRecordingRef.current) {
        try {
           setTimeout(() => {
             if (isRecordingRef.current) rec.start();
           }, 100);
        } catch (e) {
          console.log("Retry failed", e);
        }
      }
    };

    recognitionRef.current = rec;

    return () => {
      isRecordingRef.current = false;
      try { rec.stop(); } catch {}
      if (praiseTimerRef.current) clearTimeout(praiseTimerRef.current);
    };
  }, []);

  // ===== 採点ロジック =====
  const normalize = (s) =>
    (s || "")
      .toLowerCase()
      .replace(/[、。？！\s\n・,.]/g, "")
      .replace(/〇〇/g, "")
      .replace(/お客/g, "きゃく");

  function levenshtein(a, b) {
    const tmp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i++) tmp[i][0] = i;
    for (let j = 0; j <= b.length; j++) tmp[0][j] = j;
    for (let i = 1; i <= a.length; i++)
      for (let j = 1; j <= b.length; j++)
        tmp[i][j] = Math.min(
          tmp[i - 1][j] + 1,
          tmp[i][j - 1] + 1,
          tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
        );
    return tmp[a.length][b.length];
  }

  const buildScore = (lineId, target, said, duration) => {
    const t = normalize(target);
    const s = normalize(said);

    if (s.length === 0) return { total: 0, match: 0, tempo: 0, fillerScore: 0, fillersCount: 0, cps: 0, bonus: 0, hits: [], misses: [], ngHits: [], ngPenalty: 0 };

    const dist = levenshtein(t, s);
    const maxLen = Math.max(t.length, s.length);
    const sim = maxLen === 0 ? 0 : Math.max(0, (maxLen - dist) / maxLen);
    
    // 60点満点
    const match = Math.min(60, Math.round(Math.pow(sim, 1.5) * 60 * 1.1)); 

    // テンポ（10点）
    const cps = duration > 0 ? s.length / duration : 0;
    const tempo = cps >= 4 && cps <= 8 ? 10 : (cps > 2 && cps < 10 ? 5 : 0);

    // フィラー（10点）
    const fillersCount = (said.match(/えー|あの|えっと|あのー|その|あー/g) || []).length;
    const fillerScore = Math.max(0, 10 - fillersCount * 2);

    // キーワード（最大20点）
    const rule = keywordRules[lineId] || { must: [], ng: [] };
    const hits = rule.must.filter((kw) => s.includes(normalize(kw)));
    const misses = rule.must.filter((k) => !hits.includes(k));
    const bonusPerWord = rule.must.length > 0 ? 20 / rule.must.length : 0;
    const bonus = Math.min(20, Math.round(hits.length * bonusPerWord));

    // NG減点
    const ngHits = (rule.ng || []).filter((ng) => s.includes(normalize(ng)));
    const ngPenalty = Math.min(8, ngHits.length * 3);

    const rawTotal = match + tempo + fillerScore + bonus - ngPenalty;
    const total = Math.max(0, Math.min(100, Math.round(rawTotal)));

    return { total, match: Math.min(60, match), tempo, fillerScore, fillersCount, cps: Number(cps.toFixed(2)), bonus, hits, misses, ngHits, ngPenalty };
  };

  const getTargetTextForScoring = (id) => {
    const full = scriptData.find((s) => s.id === id)?.text || "";
    if (id === 5 && scoreMode5 === "core") return coreTargetTextById[5] || full;
    return full;
  };

  const isAppLine = (id) => scriptData.find((x) => x.id === id)?.role === "appointer";

  // ===== ランク =====
  const getRank = (total) => {
    if (total >= 95) return { label: "S", sub: "神", cls: "bg-amber-500 text-white" };
    if (total >= 85) return { label: "A", sub: "上手い", cls: "bg-emerald-500 text-white" };
    if (total >= 70) return { label: "B", sub: "合格圏", cls: "bg-indigo-500 text-white" };
    return { label: "C", sub: "伸びしろ", cls: "bg-slate-500 text-white" };
  };

  const formatScore = (total) => {
    if (displayScale === "10") return (total / 10).toFixed(1);
    return String(Math.round(total));
  };
  const formatThreshold = () => {
    if (displayScale === "10") return (unlockThreshold / 10).toFixed(1);
    return String(unlockThreshold);
  };

  // ===== 操作ハンドラ =====
  const handleStart = () => {
    setErrorMsg(null);
    setPermissionError(false);
    setScore(null);
    setPraise(null);
    setRecognizedText("");
    accumulatedTranscriptRef.current = "";

    setIsRecording(true);
    isRecordingRef.current = true;
    recordStartAtRef.current = Date.now();

    try {
      recognitionRef.current.start();
    } catch (e) {
      console.error(e);
      try {
        recognitionRef.current.stop();
        setTimeout(() => recognitionRef.current.start(), 100);
      } catch {}
    }
  };

  const makePraise = ({ res, prev, unlockedNow }) => {
    const prevRank = typeof prev?.total === "number" ? getRank(prev.total).label : null;
    const nowRank = getRank(res.total).label;

    if (unlockedNow) return { tone: "emerald", title: "ステージ解放！", body: "合格。次のアポ行に進める。流れができた。" };
    if (prevRank && prevRank !== nowRank && res.total > prev.total) return { tone: "amber", title: `ランクUP：${prevRank} → ${nowRank}`, body: "格が上がった。いまの改善は本物。" };
    const prevHits = Array.isArray(prev?.hits) ? prev.hits : [];
    const newHits = (res.hits || []).filter((h) => !prevHits.includes(h));
    if (newHits.length) return { tone: "amber", title: "伸びたポイント：キーワードが入った", body: `今のは「${newHits[0]}」が入った。強い。` };
    if (typeof prev?.total === "number" && res.total > prev.total) return { tone: "violet", title: "スコア更新", body: `前回より +${(res.total - prev.total).toFixed(0)} 点。ちゃんと上手くなってる。` };
    if (res.total < 40) return { tone: "sky", title: "まずは内容を確認", body: "認識がうまくいかなかったかも？もう一度ゆっくり話してみよう。" };
    return { tone: "emerald", title: "ナイスファイト", body: "次は“名詞を落とさず言い切る”だけ意識すると、点が跳ねる。" };
  };

  const praiseStyle = (tone) => {
    switch (tone) {
      case "amber": return "bg-amber-50 border-amber-200 text-amber-900";
      case "violet": return "bg-violet-50 border-violet-200 text-violet-900";
      case "sky": return "bg-sky-50 border-sky-200 text-sky-900";
      case "indigo": return "bg-indigo-50 border-indigo-200 text-indigo-900";
      default: return "bg-emerald-50 border-emerald-200 text-emerald-900";
    }
  };

  const handleStop = () => {
    setIsRecording(false);
    isRecordingRef.current = false;
    try { recognitionRef.current.stop(); } catch {}

    if (!recognizedText && !accumulatedTranscriptRef.current) {
        setErrorMsg("音声が認識されませんでした");
        return;
    }

    const dur = (Date.now() - recordStartAtRef.current) / 1000;
    const target = getTargetTextForScoring(activeLineId);
    const textToScore = accumulatedTranscriptRef.current || recognizedText;
    const res = buildScore(activeLineId, target, textToScore, dur);

    const prev = (historyRef.current || []).find((h) => h.lineId === activeLineId) || null;

    let unlockedNow = false;
    if (res.total >= unlockThreshold) {
      const nextId = activeLineId + 2;
      const maxId = Math.max(...scriptData.map((x) => x.id));
      if (nextId <= maxId && isAppLine(nextId) && !unlockedAppLines.has(nextId)) unlockedNow = true;
      if (nextId <= maxId) setUnlockedAppLines((prevSet) => new Set(prevSet).add(nextId));
    }

    setScore(res);

    const entry = {
      ts: Date.now(),
      lineId: activeLineId,
      total: res.total,
      hits: res.hits,
      misses: res.misses,
      fillersCount: res.fillersCount,
      cps: res.cps,
    };
    setHistory((prevArr) => [entry, ...prevArr].slice(0, 100));

    const p = makePraise({ res, prev, unlockedNow });
    setPraise(p);
    if (praiseTimerRef.current) clearTimeout(praiseTimerRef.current);
    praiseTimerRef.current = setTimeout(() => setPraise(null), 6000);
    
    // スクロール
    if (unlockedNow) {
        setTimeout(() => {
             const el = lineRefs.current[activeLineId + 2];
             if(el) {
                 setActiveLineId(activeLineId + 2);
                 el.scrollIntoView({ behavior: "smooth", block: "center" });
             }
        }, 1500); 
    }
  };

  // ===== 次に直す1点 =====
  const oneFix = useMemo(() => {
    if (!score) return null;
    const misses = score.misses || [];
    if (misses.length > 0) return { type: "keyword", title: "キーワードを1個だけ足す", body: `「${misses[0]}」を必ず入れる。` };
    if ((score.fillersCount ?? 0) > 1) return { type: "filler", title: "フィラーを減らす", body: `「えー/あの」が ${score.fillersCount}回。無音を活用する。` };
    const cps = score.cps ?? null;
    if (cps !== null && cps < 4) return { type: "tempo", title: "テンポを上げる", body: `いま ${cps}字/秒。もう少し早口でOK。` };
    if (cps !== null && cps > 8) return { type: "tempo", title: "落ち着いて話す", body: `いま ${cps}字/秒。早すぎて伝わらない可能性あり。` };
    return { type: "ok", title: "語尾を落とさず言い切る", body: "最後の名詞を、1段だけ強く。" };
  }, [score]);

  const oneFixStyle = (type) => {
    switch (type) {
      case "keyword": return "bg-amber-50 border-amber-100 text-amber-900";
      case "filler": return "bg-sky-50 border-sky-100 text-sky-900";
      case "tempo": return "bg-violet-50 border-violet-100 text-violet-900";
      default: return "bg-emerald-50 border-emerald-100 text-emerald-900";
    }
  };

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

  const resetAll = () => {
    if (!confirm("全リセットしますか？")) return;
    if (typeof window !== "undefined") {
      localStorage.removeItem("toppa_unlocked_v7");
      localStorage.removeItem("toppa_history_v7");
    }
    setUnlockedAppLines(new Set([1]));
    setHistory([]);
    setHiddenIds(new Set());
    setScore(null);
    setPraise(null);
    setRecognizedText("");
    setActiveLineId(1);
    scrollToActive();
  };

  const rank = score ? getRank(score.total) : null;

  // データ読み込み中（isDataLoadedがfalse）は何も表示しないか、ローディングを表示する
  // これによりサーバーとクライアントの不一致（Hydration Error）を防ぐ
  if (!isDataLoaded && typeof window !== 'undefined') {
      return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400">Loading...</div>;
  }

  return (
    <div className={`min-h-screen bg-slate-50 p-4 font-sans text-slate-900 transition-colors duration-500 ${isRecording ? "bg-rose-50" : ""}`}>
      <div className="max-w-2xl mx-auto pb-20">
        <h1 className="text-xl font-bold text-indigo-700 text-center mb-6 flex items-center justify-center gap-2">
          <BookOpen /> 暗記突破ツール Pro
        </h1>

        {permissionError && (
          <div className="bg-rose-100 border border-rose-400 text-rose-800 px-4 py-3 rounded-xl mb-4 flex items-start gap-2">
             <AlertCircle className="shrink-0 mt-0.5"/>
             <div className="text-sm">
               <strong>マイクが使えません</strong><br/>
               ブラウザの設定でマイクの使用を許可してください。
             </div>
          </div>
        )}

        {/* グラフパネル */}
        <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200 mb-6">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-bold mb-3 text-sm text-slate-600">
              <TrendingUp size={16} /> スコア推移
            </div>
            <div className="flex items-center gap-2 mb-3">
              <button onClick={() => setDisplayScale("10")} className={`text-[10px] px-2 py-1 rounded-lg border font-bold ${displayScale === "10" ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200"}`}>/10</button>
              <button onClick={() => setDisplayScale("100")} className={`text-[10px] px-2 py-1 rounded-lg border font-bold ${displayScale === "100" ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200"}`}>/100</button>
            </div>
          </div>
          <MiniChart data={history.slice(0, 10).reverse()} />
        </div>

        {/* 採点パネル */}
        <div className="bg-white p-5 rounded-3xl shadow-xl border border-indigo-100 mb-8 relative overflow-hidden sticky top-2 z-10">
          {isRecording && <div className="absolute inset-0 border-4 border-rose-400 rounded-3xl animate-pulse pointer-events-none z-20"></div>}
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -z-10 opacity-50 pointer-events-none"></div>

          <div className="flex justify-between items-start mb-3">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target Line</span>
              <span className="font-black text-xl flex items-center gap-2">
                #{activeLineId} {isAppLine(activeLineId) ? "アポインター" : "お客様"}
                {isAppLine(activeLineId) && !unlockedAppLines.has(activeLineId) && <Lock size={16} className="text-slate-400" />}
              </span>
              <span className="text-[10px] text-slate-400">合格ライン：{formatThreshold()}{displayScale === "10" ? "/10" : "点"}</span>
            </div>

            {isRecording ? (
              <button onClick={handleStop} className="bg-rose-500 text-white px-6 py-3 rounded-2xl font-bold animate-pulse shadow-lg flex items-center gap-2 active:scale-95 transition-transform touch-manipulation z-30">
                <StopCircle size={20} /> 停止
              </button>
            ) : (
              <button
                onClick={handleStart}
                className={`px-6 py-3 rounded-2xl font-bold shadow-lg flex items-center gap-2 transition-all active:scale-95 touch-manipulation z-30 ${
                  isAppLine(activeLineId) && unlockedAppLines.has(activeLineId)
                    ? "bg-gradient-to-br from-indigo-500 to-indigo-600 text-white hover:shadow-indigo-200 hover:shadow-xl"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                }`}
                disabled={!isAppLine(activeLineId) || !unlockedAppLines.has(activeLineId)}
              >
                <Mic size={20} /> 採点開始
              </button>
            )}
          </div>

          <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-2xl p-2 mb-4">
             <span className="text-xs text-slate-500 font-bold ml-2">採点範囲</span>
             <div className="flex bg-white rounded-xl p-1 border border-slate-100">
               <button onClick={() => setScoreMode5("core")} className={`text-[10px] px-3 py-1.5 rounded-lg font-bold transition-colors ${scoreMode5 === "core" ? "bg-indigo-100 text-indigo-700" : "text-slate-400"}`}>核だけ</button>
               <button onClick={() => setScoreMode5("full")} className={`text-[10px] px-3 py-1.5 rounded-lg font-bold transition-colors ${scoreMode5 === "full" ? "bg-indigo-100 text-indigo-700" : "text-slate-400"}`}>全文</button>
             </div>
          </div>

          {isRecording && (
            <div className="bg-indigo-50/50 p-4 rounded-xl text-sm mb-4 border border-indigo-100 text-indigo-800 min-h-[60px] flex items-center justify-center text-center">
              {recognizedText || "話してください..."}
            </div>
          )}

          {praise && (
            <div className={`mb-4 p-4 rounded-2xl border ${praiseStyle(praise.tone)} shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300`}>
              <div className="flex items-center gap-2 font-black text-sm mb-1">
                <Sparkles size={16} /> {praise.title}
              </div>
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
                <div className={`px-4 py-2 rounded-2xl font-black shadow-sm ${rank.cls}`}>
                  {rank.label} <span className="ml-1 text-[10px] opacity-80 font-normal">{rank.sub}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px] mb-4">
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block mb-0.5">再現度</span>
                  <span className="text-slate-900 font-bold text-base">+{score.match}</span>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block mb-0.5">キーワード</span>
                  <span className="text-slate-900 font-bold text-base">+{score.bonus}</span>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block mb-0.5">テンポ</span>
                  <span className="text-slate-900 font-bold text-base">+{score.tempo}</span>
                </div>
                 <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block mb-0.5">無駄な口癖</span>
                  <span className="text-slate-900 font-bold text-base">+{score.fillerScore}</span>
                </div>
              </div>

              {/* NGワード警告 */}
              {score.ngHits?.length > 0 && (
                 <div className="bg-rose-50 border border-rose-100 text-rose-700 text-xs p-2 rounded-lg mb-3 font-bold text-center">
                    NGワード検出: {score.ngHits.join("、")} (-{score.ngPenalty})
                 </div>
              )}

              {oneFix && (
                <div className={`p-4 rounded-2xl border shadow-sm ${oneFixStyle(oneFix.type)}`}>
                  <div className="text-[10px] font-black opacity-60 mb-1 uppercase tracking-wider">Next Action</div>
                  <div className="text-sm font-black mb-1">{oneFix.title}</div>
                  <div className="text-xs opacity-90">{oneFix.body}</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 台本リスト */}
        <div className="space-y-3 pb-20">
          {scriptData.map((item) => {
            const isApp = item.role === "appointer";
            const locked = isApp && !unlockedAppLines.has(item.id);
            const hidden = hiddenIds.has(item.id);
            const isActive = activeLineId === item.id;

            return (
              <div 
                key={item.id} 
                ref={(el) => (lineRefs.current[item.id] = el)}
                className={`p-4 rounded-2xl border-2 transition-all duration-300 ${isActive && !locked ? "border-indigo-500 bg-white shadow-md ring-4 ring-indigo-50 scale-[1.02]" : "border-slate-100 bg-white"} ${locked ? "opacity-60 grayscale" : ""}`}
              >
                <div className="flex justify-between mb-3 items-center">
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${isApp ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500"}`}>{item.label}</span>
                  <div className="flex items-center gap-2">
                    {locked && <Lock size={14} className="text-slate-400" />}
                    {isApp && !locked && (
                      <button onClick={() => { setActiveLineId(item.id); setScore(null); setPraise(null); setRecognizedText(""); setErrorMsg(null); }} className="text-[10px] px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 font-bold inline-flex items-center gap-1 active:scale-95">
                        <Star size={12} fill="currentColor" /> 練習する
                      </button>
                    )}
                    <button disabled={locked} onClick={() => toggleHide(item.id)} className={`text-[10px] px-2.5 py-1.5 rounded-lg border font-bold inline-flex items-center gap-1 active:scale-95 transition-transform ${locked ? "bg-slate-50 border-slate-200 text-slate-300" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
                      {hidden ? <Eye size={12} /> : <EyeOff size={12} />}
                      {hidden ? "見る" : "隠す"}
                    </button>
                  </div>
                </div>
                <div onClick={() => { if (!locked) toggleHide(item.id); }} className={`relative text-sm leading-relaxed rounded-xl p-3 border cursor-pointer min-h-[3rem] flex items-center ${isApp ? "bg-indigo-50/30 border-indigo-100/50" : "bg-slate-50 border-slate-100"}`}>
                  {locked ? <div className="text-slate-400 text-xs w-full text-center">前のステージをクリアで解放</div> : hidden ? <div className="w-full text-center text-indigo-300 font-bold text-xs"><EyeOff size={16} className="inline mr-1" />タップして確認</div> : <div className="text-slate-700 whitespace-pre-wrap">{item.text}</div>}
                </div>
              </div>
            );
          })}
        </div>

        {/* コントロールパネル */}
        <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200 mb-6">
          <div className="flex gap-2 justify-between items-center">
            <div className="text-xs text-slate-500 font-bold">暗記補助</div>
            <div className="flex gap-2">
              <button onClick={hideAppLines} className="px-3 py-2 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100 text-xs font-bold hover:bg-indigo-100 inline-flex items-center gap-1 active:scale-95 transition-transform">
                <EyeOff size={14} /> アポを隠す
              </button>
              <button onClick={showAll} className="px-3 py-2 rounded-xl bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold hover:bg-slate-100 inline-flex items-center gap-1 active:scale-95 transition-transform">
                <Eye size={14} /> 全て表示
              </button>
            </div>
          </div>
        </div>

        <button onClick={resetAll} className="w-full py-4 text-slate-400 text-xs font-bold flex items-center justify-center gap-1 hover:text-rose-500 transition-colors">
          <Trash2 size={14} /> データを初期化する
        </button>

        {errorMsg && <div className="fixed bottom-4 left-4 right-4 bg-slate-800 text-white text-xs p-3 rounded-xl text-center shadow-2xl animate-bounce z-50">{errorMsg}</div>}
      </div>
    </div>
  );
}
