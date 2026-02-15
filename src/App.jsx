import React, { useEffect, useMemo, useRef, useState } from "react";
import { EyeOff, BookOpen, User, MessageCircle, Mic, StopCircle, CheckCircle2, XCircle, RefreshCw, Star } from "lucide-react";

export default function App() {
  const [hiddenIds, setHiddenIds] = useState(new Set());
  const [practiceMode, setPracticeMode] = useState("none");
  const [isRecording, setIsRecording] = useState(false);
  const [activeLineId, setActiveLineId] = useState(1);
  const [recognizedText, setRecognizedText] = useState("");
  const [score, setScore] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const recognitionRef = useRef(null);
  const isRecordingRef = useRef(false);
  const recordStartAtRef = useRef(null);
  const accumulatedTranscriptRef = useRef(""); // 途切れても言葉を貯め続ける箱

  // ===== 台本データ（ここを増やすことができます！） =====
  const scriptData = [
    { id: 1, role: "appointer", label: "アポインター①", text: "今回、〇〇さんの場所をお借りして、負担なくスマートハウスにできる施工様募集をさせてもらってるんですが、スマートハウスってご存知ですか？" },
    { id: 2, role: "customer", label: "お客様", text: "いや、ま、ちょっと忙しいんで大丈夫です。はい。" },
    { id: 3, role: "appointer", label: "アポインター②", text: "ああ、すいません。すぐ終わりますんで。ちなみにスマートハウスはご存知でした？" },
    { id: 4, role: "customer", label: "お客様", text: "いや、あんまわかんないですけど。" },
    { id: 5, role: "appointer", label: "アポインター③", text: "あ～、そうなんですね。これ何かっていうと、蓄電池と太陽光で電気を作って、貯めて、光熱費を払わないお家なんですけど。" },
    // ここにあと4つ、文章を追加していく予定です！
  ];

  // ===== 採点ルール =====
  const keywordRules = {
    1: { must: ["スマートハウス", "場所をお借り", "負担なく", "施工", "ご存知"], ng: ["えっと", "たぶん"] },
    3: { must: ["すいません", "すぐ終わる", "ちなみに", "スマートハウス", "ご存知"], ng: ["売り込み", "契約"] },
    5: { must: ["蓄電池", "太陽光", "作って", "貯めて", "払わない"], ng: ["難しい"] },
  };

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = "ja-JP";
    rec.interimResults = true;
    rec.continuous = true;

    rec.onresult = (event) => {
      let interim = "";
      let finalForThisSession = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalForThisSession += t;
        else interim += t;
      }
      if (finalForThisSession) accumulatedTranscriptRef.current += finalForThisSession;
      setRecognizedText(accumulatedTranscriptRef.current + interim);
    };

    rec.onend = () => {
      if (isRecordingRef.current) {
        try { rec.start(); } catch (e) {}
      }
    };

    recognitionRef.current = rec;
  }, []);

  // ===== 採点エンジン（復活版！） =====
  const normalize = (s) => s.toLowerCase().replace(/[、。？！\s\n]/g, "").replace(/〇〇/g, "");

  const buildScore = (target, said, duration) => {
    const t = normalize(target);
    const s = normalize(said);
    
    // 1. 再現度（どれだけ正確か）
    const match = Math.round((1 - (levenshtein(t, s) / Math.max(t.length, s.length || 1))) * 60);
    
    // 2. テンポ（文字/秒）
    const cps = s.length / Math.max(1, duration);
    const tempo = (cps >= 4 && cps <= 7) ? 10 : 5;

    // 3. フィラー（えー、あのー）
    const fillers = (said.match(/えー|あの|えっと|あのー/g) || []).length;
    const fillerScore = Math.max(0, 10 - (fillers * 2));

    // 4. キーワード
    const rule = keywordRules[activeLineId] || { must: [] };
    const hits = rule.must.filter(kw => s.includes(normalize(kw)));
    const misses = rule.must.filter(kw => !hits.includes(kw));
    const keywordBonus = Math.round((hits.length / (rule.must.length || 1)) * 20);

    const total = Math.max(0, Math.min(100, match + tempo + fillerScore + keywordBonus));

    return { total, match, tempo, fillerScore, keywordBonus, hits, misses, said };
  };

  function levenshtein(a, b) {
    const tmp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i++) tmp[i][0] = i;
    for (let j = 0; j <= b.length; j++) tmp[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        tmp[i][j] = Math.min(tmp[i - 1][j] + 1, tmp[i][j - 1] + 1, tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
    }
    return tmp[a.length][b.length];
  }

  const handleStart = () => {
    setScore(null); setRecognizedText(""); accumulatedTranscriptRef.current = "";
    setIsRecording(true); isRecordingRef.current = true;
    recordStartAtRef.current = Date.now();
    try { recognitionRef.current.start(); } catch (e) { recognitionRef.current.stop(); }
  };

  const handleStop = () => {
    isRecordingRef.current = false; setIsRecording(false);
    try { recognitionRef.current.stop(); } catch (e) {}
    const duration = (Date.now() - recordStartAtRef.current) / 1000;
    const target = scriptData.find(s => s.id === activeLineId).text;
    setScore(buildScore(target, recognizedText, duration));
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 font-sans text-slate-900">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-xl font-bold text-indigo-700 text-center mb-6 flex items-center justify-center gap-2">
          <BookOpen /> スマートハウスフロントネガの暗記ツール
        </h1>

        {/* 採点パネル */}
        <div className="bg-white p-5 rounded-3xl shadow-xl border border-indigo-100 mb-8">
          <div className="flex justify-between items-center mb-6">
            <div className="flex flex-col">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Target Line</span>
              <span className="font-black text-slate-700 text-xl">#{activeLineId} アポインター</span>
            </div>
            {isRecording ? 
              <button onClick={handleStop} className="bg-rose-500 text-white px-8 py-3 rounded-2xl font-bold animate-pulse shadow-lg flex items-center gap-2"><StopCircle size={20}/>停止</button> :
              <button onClick={handleStart} className="bg-emerald-500 text-white px-8 py-3 rounded-2xl font-bold shadow-lg hover:bg-emerald-600 transition-all flex items-center gap-2"><Mic size={20}/>採点開始</button>
            }
          </div>

          {isRecording && (
            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 mb-4 animate-in fade-in">
               <div className="text-xs font-bold text-emerald-600 mb-1 flex items-center gap-2">
                 <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" /> REALTIME TRANSCRIPT
               </div>
               <div className="text-slate-700 font-medium">{recognizedText || "音声を待っています..."}</div>
            </div>
          )}

          {score && (
            <div className="space-y-4 animate-in slide-in-from-bottom-4">
              <div className="flex items-center gap-4">
                <div className="bg-indigo-600 text-white w-20 h-20 rounded-2xl flex flex-col items-center justify-center shadow-lg">
                  <span className="text-2xl font-black">{score.total}</span>
                  <span className="text-[10px] opacity-70">SCORE</span>
                </div>
                <div className="flex-1 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-[10px] font-bold text-slate-400">再現度: <span className="text-slate-700">+{score.match}</span></div>
                    <div className="text-[10px] font-bold text-slate-400">テンポ: <span className="text-slate-700">+{score.tempo}</span></div>
                    <div className="text-[10px] font-bold text-slate-400">フィラー: <span className="text-slate-700">+{score.fillerScore}</span></div>
                    <div className="text-[10px] font-bold text-slate-400">キーワード: <span className="text-slate-700">+{score.keywordBonus}</span></div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                  <div className="text-[10px] font-bold text-emerald-600 mb-1">言えた言葉</div>
                  <div className="flex flex-wrap gap-1">{score.hits.map(h => <span key={h} className="text-[10px] bg-white px-1.5 py-0.5 rounded border border-emerald-200 text-emerald-700 font-bold">{h}</span>)}</div>
                </div>
                <div className="bg-rose-50 p-3 rounded-xl border border-rose-100">
                  <div className="text-[10px] font-bold text-rose-600 mb-1">言い忘れ</div>
                  <div className="flex flex-wrap gap-1">{score.misses.map(m => <span key={m} className="text-[10px] bg-white px-1.5 py-0.5 rounded border border-rose-200 text-rose-700 font-bold">{m}</span>)}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 文章リスト */}
        <div className="space-y-3">
          {scriptData.map((item) => (
            <div key={item.id} 
              onClick={() => { if(item.role==="appointer"){setActiveLineId(item.id); setScore(null); setRecognizedText("");} }}
              className={`p-5 rounded-2xl border-2 transition-all cursor-pointer ${activeLineId === item.id && item.role === "appointer" ? "border-indigo-500 bg-white shadow-md scale-[1.02]" : "border-slate-100 bg-white opacity-80"}`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${item.role === "appointer" ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-400"}`}>{item.label}</span>
                {activeLineId === item.id && item.role === "appointer" && <Star size={14} className="text-indigo-500 fill-indigo-500"/>}
              </div>
              <p className="text-sm leading-relaxed text-slate-700">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
