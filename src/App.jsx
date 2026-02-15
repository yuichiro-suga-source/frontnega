import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  BookOpen, User, Mic, StopCircle, CheckCircle2, XCircle, Star, Lock, TrendingUp, Trash2, EyeOff, Eye
} from "lucide-react";

export default function App() {
  const [unlockThreshold, setUnlockThreshold] = useState(80); 
  const [hiddenIds, setHiddenIds] = useState(new Set());
  const [isRecording, setIsRecording] = useState(false);
  const [activeLineId, setActiveLineId] = useState(1);
  const [recognizedText, setRecognizedText] = useState("");
  const [score, setScore] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const recognitionRef = useRef(null);
  const isRecordingRef = useRef(false);
  const recordStartAtRef = useRef(null);
  const accumulatedTranscriptRef = useRef("");

  // ===== 台本データ（全9行） =====
  const scriptData = [
    { id: 1, role: "appointer", label: "アポインター①", text: "今回、〇〇さんの場所をお借りして、負担なくスマートハウスにできる施工様募集をさせてもらってるんですが、スマートハウスってご存知ですか？" },
    { id: 2, role: "customer", label: "お客様", text: "いや、ま、ちょっと忙しいんで大丈夫です。はい。" },
    { id: 3, role: "appointer", label: "アポインター②", text: "ああ、すいません。すぐ終わりますんで。ちなみにスマートハウスはご存知でした？" },
    { id: 4, role: "customer", label: "お客様", text: "いや、あんまわかんないですけど。" },
    { id: 5, role: "appointer", label: "アポインター③", text: "あ～、そうなんですね。これ何かっていうと、蓄電池と太陽光で電気を作って、貯めて、光熱費を払わないお家なんですけど。" },
    { id: 6, role: "customer", label: "お客様", text: "うちはもう太陽光ついてるし、今さらって感じですね。" },
    { id: 7, role: "appointer", label: "アポインター④", text: "そうなんですね、付いてる方増えてます。実は今、注目されてるのが“蓄電池の後付け”でして、停電対策と電気代の両方に効くので、改めて検討する方が多いんです。" },
    { id: 8, role: "customer", label: "お客様", text: "でも高そうだし、工事も大変そうじゃない？" },
    { id: 9, role: "appointer", label: "アポインター⑤", text: "そこが誤解されやすい所で、補助金や分割で負担を抑えられるケースが多いんです。今日は“条件に合うか”だけ、無料で10分チェックできます。もし合えば、施工店さんをご紹介する流れです。" },
  ];

  // ===== 採点ルール =====
  const keywordRules = {
    1: { must: ["スマートハウス", "場所をお借り", "負担なく", "施工", "ご存知"], ng: ["えっと", "たぶん"] },
    3: { must: ["すいません", "すぐ終わ", "ちなみに", "スマートハウス", "ご存知"], ng: ["契約", "買って"] },
    5: { must: ["蓄電池", "太陽光", "作って", "貯めて", "払わない"], ng: ["難しい"] },
    7: { must: ["蓄電池", "後付け", "停電", "電気代"], ng: ["わかんない"] },
    9: { must: ["補助金", "分割", "無料", "10分", "チェック"], ng: ["契約"] },
  };

  // ステージと履歴の保存
  const [unlockedAppLines, setUnlockedAppLines] = useState(() => {
    const raw = localStorage.getItem("toppa_unlocked_v4");
    return raw ? new Set(JSON.parse(raw)) : new Set([1]);
  });
  const [history, setHistory] = useState(() => {
    const raw = localStorage.getItem("toppa_history_v4");
    return raw ? JSON.parse(raw) : [];
  });

  useEffect(() => {
    localStorage.setItem("toppa_unlocked_v4", JSON.stringify(Array.from(unlockedAppLines)));
    localStorage.setItem("toppa_history_v4", JSON.stringify(history));
  }, [unlockedAppLines, history]);

  // 音声認識
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = "ja-JP"; rec.interimResults = true; rec.continuous = true;
    rec.onresult = (event) => {
      let interim = ""; let finalSession = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalSession += t; else interim += t;
      }
      if (finalSession) accumulatedTranscriptRef.current += finalSession;
      setRecognizedText(accumulatedTranscriptRef.current + interim);
    };
    rec.onend = () => { if (isRecordingRef.current) try { rec.start(); } catch {} };
    recognitionRef.current = rec;
  }, []);

  // 採点計算
  const normalize = (s) => (s || "").toLowerCase().replace(/[、。？！\s\n]/g, "").replace(/〇〇/g, "");
  function levenshtein(a, b) {
    const tmp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i++) tmp[i][0] = i;
    for (let j = 0; j <= b.length; j++) tmp[0][j] = j;
    for (let i = 1; i <= a.length; i++)
      for (let j = 1; j <= b.length; j++)
        tmp[i][j] = Math.min(tmp[i-1][j]+1, tmp[i][j-1]+1, tmp[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
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
    const duration = (Date.now() - recordStartAtRef.current) / 1000;
    const target = scriptData.find(s => s.id === activeLineId).text;
    const s = normalize(recognizedText);
    const t = normalize(target);
    const sim = 1 - levenshtein(t, s) / Math.max(t.length, s.length || 1);
    const match = Math.round(sim * 60);
    const rule = keywordRules[activeLineId] || { must: [] };
    const hits = rule.must.filter(kw => s.includes(normalize(kw)));
    const bonus = Math.round((hits.length / (rule.must.length || 1)) * 40);
    const total = Math.min(100, match + bonus);
    
    setScore({ total, hits, misses: rule.must.filter(k => !hits.includes(k)) });
    setHistory(prev => [{ ts: Date.now(), total }, ...prev].slice(0, 10));
    if (total >= unlockThreshold && activeLineId + 2 <= 9) {
      setUnlockedAppLines(prev => new Set(prev).add(activeLineId + 2));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 font-sans text-slate-900">
      <div className="max-w-2xl mx-auto pb-10">
        <h1 className="text-2xl font-black text-indigo-700 text-center mb-6 flex items-center justify-center gap-2">
          <BookOpen /> スマートハウス暗記突破ツール
        </h1>

        {/* グラフ表示 */}
        <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200 mb-6">
          <div className="text-sm font-bold text-slate-500 mb-3 flex items-center gap-2"><TrendingUp size={16}/> 直近のスコア推移</div>
          <div className="flex items-end gap-1 h-20 px-2">
            {history.slice().reverse().map((h, i) => (
              <div key={i} className="flex-1 bg-indigo-100 rounded-t-sm relative group" style={{ height: `${h.total}%` }}>
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">{h.total}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 採点パネル */}
        <div className="bg-white p-6 rounded-3xl shadow-xl border border-indigo-100 mb-8">
          <div className="flex justify-between items-center mb-4">
            <span className="font-black text-xl">#{activeLineId} 採点</span>
            {isRecording ? 
              <button onClick={handleStop} className="bg-rose-500 text-white px-8 py-3 rounded-2xl font-bold animate-pulse shadow-lg flex items-center gap-2"><StopCircle size={20}/>停止</button> :
              <button onClick={handleStart} disabled={!unlockedAppLines.has(activeLineId)} className={`px-8 py-3 rounded-2xl font-bold shadow-lg flex items-center gap-2 ${unlockedAppLines.has(activeLineId) ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-400"}`}><Mic size={20}/>開始</button>
            }
          </div>
          {isRecording && <div className="p-3 bg-emerald-50 rounded-xl text-sm border border-emerald-100 mb-4">{recognizedText || "..."}</div>}
          {score && (
            <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
              <div className="text-4xl font-black text-indigo-900">{score.total}点</div>
              <div className="text-xs text-emerald-600 font-bold mt-2">✅ 言えた: {score.hits.join(", ") || "なし"}</div>
              <div className="text-xs text-rose-500 font-bold">❌ 不足: {score.misses.join(", ") || "なし"}</div>
            </div>
          )}
        </div>

        {/* 台本リスト */}
        <div className="space-y-3">
          {scriptData.map((item) => {
            const isApp = item.role === "appointer";
            const locked = isApp && !unlockedAppLines.has(item.id);
            return (
              <div key={item.id} 
                onClick={() => { if(isApp && !locked) { setActiveLineId(item.id); setScore(null); setRecognizedText(""); } }}
                className={`p-5 rounded-2xl border-2 transition-all ${activeLineId === item.id && !locked ? "border-indigo-500 bg-white" : "border-slate-100 bg-white"} ${locked ? "opacity-50" : "cursor-pointer"}`}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isApp ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-400"}`}>{item.label}</span>
                  <div className="flex gap-2">
                    <button onClick={(e) => { e.stopPropagation(); setHiddenIds(prev => { const n = new Set(prev); n.has(item.id) ? n.delete(item.id) : n.add(item.id); return n; }); }} className="text-slate-400 hover:text-indigo-500">{hiddenIds.has(item.id) ? <Eye size={16}/> : <EyeOff size={16}/>}</button>
                    {locked && <Lock size={14} className="text-slate-400"/>}
                  </div>
                </div>
                <p className={`text-sm leading-relaxed ${hiddenIds.has(item.id) ? "bg-slate-200 text-transparent select-none rounded" : "text-slate-700"}`}>{item.text}</p>
              </div>
            );
          })}
        </div>
        <button onClick={() => { if(confirm("データを削除しますか？")){localStorage.clear(); window.location.reload();} }} className="w-full mt-10 text-slate-300 text-[10px] flex items-center justify-center gap-1"><Trash2 size={12}/> データをリセット</button>
      </div>
    </div>
  );
}
