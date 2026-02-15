import React, { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, User, Mic, StopCircle, CheckCircle2, XCircle, Star, Lock, TrendingUp, Trash2 } from "lucide-react";

export default function App() {
  const [unlockThreshold, setUnlockThreshold] = useState(80); // 80点で次を解放
  const [isRecording, setIsRecording] = useState(false);
  const [activeLineId, setActiveLineId] = useState(1);
  const [recognizedText, setRecognizedText] = useState("");
  const [score, setScore] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const recognitionRef = useRef(null);
  const isRecordingRef = useRef(false);
  const recordStartAtRef = useRef(null);
  const accumulatedTranscriptRef = useRef(""); 

  // ===== 台本データ（後半4つは予約席にしています） =====
  const scriptData = [
    { id: 1, role: "appointer", label: "アポインター①", text: "今回、〇〇さんの場所をお借りして、負担なくスマートハウスにできる施工様募集をさせてもらってるんですが、スマートハウスってご存知ですか？" },
    { id: 2, role: "customer", label: "お客様", text: "いや、ま、ちょっと忙しいんで大丈夫です。はい。" },
    { id: 3, role: "appointer", label: "アポインター②", text: "ああ、すいません。すぐ終わりますんで。ちなみにスマートハウスはご存知でした？" },
    { id: 4, role: "customer", label: "お客様", text: "いや、あんまわかんないですけど。" },
    { id: 5, role: "appointer", label: "アポインター③", text: "あ～、そうなんですね。これ何かっていうと、蓄電池と太陽光で電気を作って、貯めて、光熱費を払わないお家なんですけど。" },
    { id: 6, role: "customer", label: "お客様", text: "（ここに文章を入れる）" },
    { id: 7, role: "appointer", label: "アポインター④", text: "（ここに文章を入れる）" },
    { id: 8, role: "customer", label: "お客様", text: "（ここに文章を入れる）" },
    { id: 9, role: "appointer", label: "アポインター⑤", text: "（ここに文章を入れる）" },
  ];

  // ===== 採点キーワード（アポインターの行 1, 3, 5, 7, 9 専用） =====
  const keywordRules = {
    1: { must: ["スマートハウス", "場所をお借り", "負担なく", "施工", "ご存知"], ng: ["えっと", "たぶん"] },
    3: { must: ["すいません", "すぐ終わ", "ちなみに", "スマートハウス", "ご存知"], ng: ["契約", "買って"] },
    5: { must: ["蓄電池", "太陽光", "作って", "貯めて", "払わない"], ng: ["難しい"] },
    7: { must: ["未設定"], ng: [] },
    9: { must: ["未設定"], ng: [] },
  };

  // 履歴とステージの保存（スマホを閉じても消えない仕組み）
  const [unlockedAppLines, setUnlockedAppLines] = useState(() => {
    try {
      const raw = localStorage.getItem("toppa_unlocked_v4");
      return raw ? new Set(JSON.parse(raw)) : new Set([1]);
    } catch { return new Set([1]); }
  });

  const [history, setHistory] = useState(() => {
    try {
      const raw = localStorage.getItem("toppa_history_v4");
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem("toppa_unlocked_v4", JSON.stringify(Array.from(unlockedAppLines)));
    localStorage.setItem("toppa_history_v4", JSON.stringify(history));
  }, [unlockedAppLines, history]);

  // 音声認識の初期化（Pixelの途切れ対策済み）
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = "ja-JP"; rec.interimResults = true; rec.continuous = true;

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

    rec.onend = () => {
      if (isRecordingRef.current) { try { rec.start(); } catch {} }
    };
    recognitionRef.current = rec;
  }, []);

  const normalize = (s) => (s || "").toLowerCase().replace(/[、。？！\s\n]/g, "").replace(/〇〇/g, "");

  const buildScore = (lineId, target, said, duration) => {
    const t = normalize(target);
    const s = normalize(said);
    const sim = 1 - (levenshtein(t, s) / Math.max(t.length, s.length || 1));
    const match = Math.max(0, Math.min(60, Math.round(sim * 60)));
    const cps = s.length / Math.max(1, duration);
    const tempo = cps >= 4 && cps <= 7 ? 10 : 5;
    const rule = keywordRules[lineId] || { must: [], ng: [] };
    const hits = rule.must.filter(kw => s.includes(normalize(kw)));
    const bonus = Math.round((hits.length / (rule.must.length || 1)) * 30);
    const total = Math.min(100, match + tempo + bonus);
    return { total, match, tempo, bonus, hits, misses: rule.must.filter(k => !hits.includes(k)), said };
  };

  function levenshtein(a,b){
    const tmp=Array.from({length:a.length+1},()=>new Array(b.length+1).fill(0));
    for(let i=0;i<=a.length;i++)tmp[i][0]=i; for(let j=0;j<=b.length;j++)tmp[0][j]=j;
    for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)tmp[i][j]=Math.min(tmp[i-1][j]+1,tmp[i][j-1]+1,tmp[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
    return tmp[a.length][b.length];
  }

  const handleStart = () => {
    setScore(null); setRecognizedText(""); accumulatedTranscriptRef.current = "";
    setIsRecording(true); isRecordingRef.current = true;
    recordStartAtRef.current = Date.now();
    try { recognitionRef.current.start(); } catch { recognitionRef.current.stop(); }
  };

  const handleStop = () => {
    isRecordingRef.current = false; setIsRecording(false);
    try { recognitionRef.current.stop(); } catch {}
    const dur = (Date.now() - recordStartAtRef.current) / 1000;
    const target = scriptData.find(s => s.id === activeLineId).text;
    const res = buildScore(activeLineId, target, recognizedText, dur);
    setScore(res);
    setHistory(prev => [{ ts: Date.now(), lineId: activeLineId, total: res.total }, ...prev].slice(0, 100));
    if (res.total >= unlockThreshold) {
      const nextId = activeLineId + 2; 
      if (nextId <= 9) setUnlockedAppLines(prev => new Set(prev).add(nextId));
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

  return (
    <div className="min-h-screen bg-slate-50 p-4 font-sans text-slate-900">
      <div className="max-w-2xl mx-auto pb-10">
        <h1 className="text-xl font-bold text-indigo-700 text-center mb-6 flex items-center justify-center gap-2"><BookOpen /> 暗記突破ツール（プロ版）</h1>

        {/* グラフパネル */}
        <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200 mb-6">
          <div className="flex items-center gap-2 font-bold mb-3 text-sm text-slate-600"><TrendingUp size={16}/> スコア推移（最新10回）</div>
          <MiniChart data={history.slice(0, 10).reverse()} />
        </div>

        {/* 採点パネル */}
        <div className="bg-white p-5 rounded-3xl shadow-xl border border-indigo-100 mb-8">
          <div className="flex justify-between items-center mb-4">
            <div className="flex flex-col">
               <span className="text-[10px] font-bold text-slate-400 uppercase">Stage Mode</span>
               <span className="font-black text-xl">#{activeLineId} アポインター</span>
            </div>
            {isRecording ? 
              <button onClick={handleStop} className="bg-rose-500 text-white px-8 py-3 rounded-2xl font-bold animate-pulse shadow-lg flex items-center gap-2"><StopCircle size={20}/>停止</button> :
              <button onClick={handleStart} className={`px-8 py-3 rounded-2xl font-bold shadow-lg flex items-center gap-2 transition-all ${unlockedAppLines.has(activeLineId) ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-400"}`} disabled={!unlockedAppLines.has(activeLineId)}><Mic size={20}/>採点開始</button>
            }
          </div>
          {isRecording && <div className="bg-emerald-50 p-3 rounded-xl text-sm mb-4 border border-emerald-100 text-emerald-700">認識中: {recognizedText || "..."}</div>}
          {score && (
            <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 animate-in fade-in slide-in-from-top-2">
              <div className="text-4xl font-black text-indigo-900 mb-2">{score.total}<span className="text-sm font-normal text-indigo-400 ml-1">点</span></div>
              <div className="grid grid-cols-2 gap-2 text-[10px] mb-3">
                <div className="bg-white/60 p-1 rounded text-slate-500">再現度: <span className="text-slate-900 font-bold">+{score.match}</span></div>
                <div className="bg-white/60 p-1 rounded text-slate-500">キーワード: <span className="text-slate-900 font-bold">+{score.bonus}</span></div>
              </div>
              <div className="text-xs text-emerald-600 font-bold mb-1">✅ 言えた: {score.hits.join(", ") || "なし"}</div>
              <div className="text-xs text-rose-500">❌ 不足: {score.misses.join(", ") || "なし"}</div>
            </div>
          )}
        </div>

        {/* リスト */}
        <div className="space-y-3">
          {scriptData.map((item) => {
            const isApp = item.role === "appointer";
            const locked = isApp && !unlockedAppLines.has(item.id);
            return (
              <div key={item.id} onClick={() => { if(isApp && !locked){setActiveLineId(item.id); setScore(null); setRecognizedText("");} }}
                className={`p-4 rounded-2xl border-2 transition-all ${activeLineId === item.id && !locked ? "border-indigo-500 bg-white" : "border-slate-100 bg-white"} ${locked ? "opacity-50" : "cursor-pointer"}`}>
                <div className="flex justify-between mb-1">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isApp ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-400"}`}>{item.label}</span>
                  {locked && <Lock size={12} className="text-slate-400"/>}
                </div>
                <div className="text-sm text-slate-700">{locked ? "？？？？？ (前の文章をクリアすると解放)" : item.text}</div>
              </div>
            );
          })}
        </div>
        <button onClick={() => { if(confirm("全リセットしますか？")){localStorage.clear(); window.location.reload();} }} className="w-full mt-10 text-slate-300 text-[10px] flex items-center justify-center gap-1 hover:text-rose-400 transition-colors"><Trash2 size={12}/> 進捗をリセットして最初から</button>
      </div>
    </div>
  );
}
