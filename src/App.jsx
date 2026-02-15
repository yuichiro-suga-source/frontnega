import React, { useEffect, useMemo, useRef, useState } from "react";
import { EyeOff, BookOpen, User, MessageCircle, Mic, StopCircle, CheckCircle2, XCircle, RefreshCw } from "lucide-react";

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
  const transcriptRef = useRef(""); // 途切れても言葉を貯めておく箱

  // ==========================================
  // 【ここを書き換える！】合計5つの文章データ
  // ==========================================
  const scriptData = [
    { id: 1, role: "appointer", label: "アポインター①", text: "今回、〇〇さんの場所をお借りして、負担なくスマートハウスにできる施工様募集をさせてもらってるんですが、スマートハウスってご存知ですか？" },
    { id: 2, role: "appointer", label: "アポインター②", text: "ああ、すいません。すぐ終わりますんで。ちなみにスマートハウスはご存知でした？" },
    { id: 3, role: "appointer", label: "アポインター③", text: "蓄電池と太陽光で電気を作って、貯めて、光熱費を払わないお家なんです。" },
    { id: 4, role: "appointer", label: "アポインター④", text: "ここに4つ目の文章を入れてください" },
    { id: 5, role: "appointer", label: "アポインター⑤", text: "ここに5つ目の文章を入れてください" },
  ];

  // ==========================================
  // 【ここを書き換える！】それぞれの採点キーワード
  // ==========================================
  const keywordRules = {
    1: ["スマートハウス", "場所をお借り", "負担なく", "施工", "ご存知"],
    2: ["すいません", "すぐ終わる", "ちなみに", "スマートハウス", "ご存知"],
    3: ["蓄電池", "太陽光", "作って", "貯めて", "払わない"],
    4: ["キーワード1", "キーワード2"],
    5: ["キーワード1", "キーワード2"],
  };

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = "ja-JP";
    rec.interimResults = true;
    rec.continuous = true;

    rec.onresult = (event) => {
      let currentText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        currentText += event.results[i][0].transcript;
      }
      // 途切れる前の言葉に今の言葉を足す
      setRecognizedText(transcriptRef.current + currentText);
    };

    rec.onend = () => {
      // 録音中なのに止まったら即座に再起動（Pixel対策）
      if (isRecordingRef.current) {
        try {
          // 確定した分をRefに保存しておく
          transcriptRef.current = recognizedText;
          rec.start();
        } catch (e) {}
      }
    };

    recognitionRef.current = rec;
  }, [recognizedText]);

  const normalize = (s) => s.replace(/[、。？！\s]/g, "");

  const handleStart = () => {
    setScore(null);
    setRecognizedText("");
    transcriptRef.current = "";
    setIsRecording(true);
    isRecordingRef.current = true;
    try { recognitionRef.current.start(); } catch (e) { recognitionRef.current.stop(); }
  };

  const handleStop = () => {
    isRecordingRef.current = false;
    setIsRecording(false);
    try { recognitionRef.current.stop(); } catch (e) {}

    // 採点計算
    const target = scriptData.find(s => s.id === activeLineId).text;
    const said = recognizedText;
    
    // キーワードチェック
    const rules = keywordRules[activeLineId] || [];
    const hits = rules.filter(kw => normalize(said).includes(normalize(kw)));
    const keywordScore = Math.round((hits.length / rules.length) * 40);
    
    // 一致度チェック（簡易計算）
    const matchScore = said.length > 5 ? 60 : 0; 

    setScore({
      total: Math.min(100, keywordScore + matchScore),
      hits: hits,
      misses: rules.filter(kw => !hits.includes(kw)),
      said: said
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 font-sans">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-xl font-bold text-indigo-700 text-center mb-6 flex items-center justify-center gap-2">
          <BookOpen /> スマートハウスフロントネガの暗記ツール
        </h1>

        {/* 採点パネル */}
        <div className="bg-white p-4 rounded-2xl shadow-md border border-indigo-100 mb-6">
          <div className="flex justify-between items-center mb-4">
            <span className="font-bold text-slate-700">選択中: #{activeLineId}</span>
            {isRecording ? 
              <button onClick={handleStop} className="bg-rose-600 text-white px-6 py-2 rounded-full font-bold animate-pulse flex items-center gap-2"><StopCircle size={18}/>停止</button> :
              <button onClick={handleStart} className="bg-emerald-600 text-white px-6 py-2 rounded-full font-bold flex items-center gap-2"><Mic size={18}/>採点開始</button>
            }
          </div>

          {isRecording && <div className="text-sm bg-slate-50 p-3 rounded-lg border mb-4 text-slate-600">聞き取り中: {recognizedText}</div>}

          {score && (
            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-200">
              <div className="text-3xl font-black text-indigo-900 mb-2">{score.total}点</div>
              <div className="text-sm mb-1 text-emerald-700">✅ 言えた: {score.hits.join(", ") || "なし"}</div>
              <div className="text-sm mb-3 text-rose-500">❌ 不足: {score.misses.join(", ") || "なし"}</div>
              <div className="text-xs text-slate-400 border-t pt-2">認識結果: {score.said}</div>
            </div>
          )}
        </div>

        {/* 文章リスト */}
        <div className="space-y-4">
          {scriptData.map((item) => (
            <div key={item.id} 
              onClick={() => { setActiveLineId(item.id); setScore(null); setPracticeMode("appointer"); }}
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${activeLineId === item.id ? "border-indigo-500 bg-white shadow-md" : "border-slate-200 bg-slate-100"}`}
            >
              <div className="text-xs font-bold text-indigo-400 mb-1">{item.label}</div>
              <div className="text-slate-800">{item.text}</div>
            </div>
          ))}
        </div>
        
        <button onClick={() => window.location.reload()} className="w-full mt-8 py-3 text-slate-400 flex items-center justify-center gap-2 text-sm">
          <RefreshCw size={14}/> 画面をリセット
        </button>
      </div>
    </div>
  );
}
