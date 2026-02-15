import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  EyeOff,
  BookOpen,
  User,
  MessageCircle,
  Lightbulb,
  RefreshCw,
  Mic,
  StopCircle,
  Star,
  CheckCircle2,
  XCircle,
} from "lucide-react";

export default function App() {
  const [hiddenIds, setHiddenIds] = useState(new Set());
  const [practiceMode, setPracticeMode] = useState("none");

  // ===== 採点用 state =====
  const [isRecording, setIsRecording] = useState(false);
  const [activeLineId, setActiveLineId] = useState(null);
  const [recognizedText, setRecognizedText] = useState("");
  const [score, setScore] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const recognitionRef = useRef(null);
  const recordStartAtRef = useRef(null);
  // 【修正ポイント1】録音状態を確実に管理するためのRefを追加
  const isRecordingRef = useRef(false);

  // ===== 台本データ =====
  const scriptData = [
    {
      id: 1,
      role: "appointer",
      label: "アポインター",
      text: "今回、〇〇さんの場所をお借りして、負担なくスマートハウスにできる施工様募集をさせてもらってるんですが、スマートハウスってご存知ですか？",
    },
    {
      id: 2,
      role: "customer",
      label: "お客様",
      text: "いや、ま、ちょっと忙しいんで大丈夫です。はい。",
    },
    {
      id: 3,
      role: "appointer",
      label: "アポインター",
      text: "ああ、すいません。すぐ終わりますんで。\nちなみにスマートハウスはご存知でした？",
    },
    {
      id: 4,
      role: "customer",
      label: "お客様",
      text: "いや、あんまわかんないですけど。",
    },
    {
      id: 5,
      role: "appointer",
      label: "アポインター",
      text: "あ～、そうなんですね。\nこれ何かっていうと、蓄電池と太陽光で電気を作って、貯めて、光熱費を払わないお家なんですけど。\n新築とかだと、義務になっていく予定だったり、今でも２軒に1軒っていうところで、かなり増えてきてるんですね。\nちょっとその中で、今年建ってるお家とかでも、改めて検討される方ってかなり増えてきてまして。なぜこんなに増えてきているかっていうと。。",
    },
  ];

  // ===== キーワード採点ルール =====
  const keywordRules = {
    1: {
      must: [
        { label: "スマートハウス", synonyms: ["スマートハウス"] },
        { label: "場所をお借りして", synonyms: ["場所をお借り", "場所を借り", "近所", "近く"] },
        { label: "負担なく", synonyms: ["負担なく", "負担なし", "負担がない", "無料", "0円"] },
        { label: "施工", synonyms: ["施工", "工事", "モニター"] },
        { label: "ご存知", synonyms: ["ご存知", "知って", "ご存じ"] },
      ],
      ng: ["たぶん", "多分", "よくわかんない", "まあ", "えっと"] ,
    },
    3: {
      must: [
        { label: "すいません", synonyms: ["すいません", "すみません", "失礼"] },
        { label: "すぐ終わる", synonyms: ["すぐ終わ", "すぐ終わり", "手短"] },
        { label: "ちなみに", synonyms: ["ちなみに"] },
        { label: "スマートハウス", synonyms: ["スマートハウス"] },
        { label: "ご存知", synonyms: ["ご存知", "知って", "ご存じ"] },
      ],
      ng: ["押し売り", "買って", "契約", "お願いします"] ,
    },
    5: {
      must: [
        { label: "蓄電池", synonyms: ["蓄電池"] },
        { label: "太陽光", synonyms: ["太陽光", "ソーラー"] },
        { label: "作って", synonyms: ["作って", "つくって"] },
        { label: "貯めて", synonyms: ["貯めて", "ためて"] },
        { label: "払わない", synonyms: ["払わない", "支払わない", "0円", "ゼロ"] },
        { label: "義務", synonyms: ["義務", "義務化"] },
        { label: "増えて", synonyms: ["増えて", "増えてき", "多い"] },
      ],
      ng: ["難しい", "よくわからない", "無理", "怪しい"] ,
    },
  };

  const tips = [
    {
      title: "『すぐ終わりますんで』の切り返し",
      content: "拒絶（忙しい）に対して、一旦受け流して質問（ご存知でした？）に戻すのがポイントです。",
    },
    {
      title: "メリットの3ステップ",
      content: "『作って』『貯めて』『払わない』の3リズムで伝えると、お客様の印象に残りやすくなります。",
    },
    {
      title: "時流の強調",
      content: "『義務化』『増えている』という言葉で『今聞かなければならない話』という空気を作ります。",
    },
  ];

  // ====== 音声認識 初期化 ======
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setErrorMsg("このブラウザは音声認識に対応していません。Google Chromeをご利用ください。");
      return;
    }

    const rec = new SR();
    rec.lang = "ja-JP";
    rec.interimResults = true;
    rec.continuous = true;

    rec.onresult = (event) => {
      let finalText = "";
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += t;
        else interim += t;
      }
      setRecognizedText(finalText + interim);
    };

    rec.onerror = (e) => {
      if (e.error === 'not-allowed') {
        setErrorMsg("マイクの使用が許可されていません。");
        setIsRecording(false);
        isRecordingRef.current = false;
      }
    };

    // 【修正ポイント2】スマホの勝手な停止を検知して強制再起動する
    rec.onend = () => {
      if (isRecordingRef.current) {
        try {
          rec.start();
        } catch (err) {
          console.error("再起動失敗", err);
        }
      }
    };

    recognitionRef.current = rec;
  }, []);

  // ====== 採点ロジック ======
  const normalizeJa = (s) => (s || "").toLowerCase().replace(/\s+/g, "").replace(/[。、．，・「」『』（）()【】\n?!？！]/g, "").replace(/〇〇/g, "");

  const levenshtein = (a, b) => {
    const m = a.length, n = b.length;
    if (m === 0) return n; if (n === 0) return m;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
      }
    }
    return dp[m][n];
  };

  const buildScore = ({ lineId, targetText, saidText, durationSec }) => {
    const sim = normalizeJa(targetText) === "" && normalizeJa(saidText) === "" ? 1 : 
                (Math.max(0, 1 - levenshtein(normalizeJa(targetText), normalizeJa(saidText)) / Math.max(normalizeJa(targetText).length, normalizeJa(saidText).length)));
    const match = Math.round(sim * 70);
    const chars = normalizeJa(saidText).length || 1;
    const cps = chars / Math.max(1, durationSec);
    const tempo = Math.max(0, 10 - (cps < 3 || cps > 8 ? 5 : 0));
    const pause = Math.max(0, 10 - (durationSec / chars > 0.6 ? 6 : 0));
    
    const rule = keywordRules[lineId];
    const s = normalizeJa(saidText);
    const hits = (rule?.must || []).filter(kw => (kw.synonyms || [kw.label]).some(syn => s.includes(normalizeJa(syn)))).map(k => k.label);
    const misses = (rule?.must || []).filter(kw => !hits.includes(kw.label)).map(k => k.label);
    const ngHits = (rule?.ng || []).filter(ng => s.includes(normalizeJa(ng)));
    
    const keywordAdd = Math.round((hits.length / ((rule?.must || []).length || 1)) * 15);
    const total = Math.max(0, Math.min(100, match + tempo + pause + keywordAdd - (ngHits.length * 3)));

    return { total, detail: { 再現度: match, テンポ: tempo, 間: pause, キーワード: keywordAdd }, debug: { キーワード命中: hits, キーワード不足: misses, NG検出: ngHits }, comment: total >= 80 ? "合格！" : "練習しましょう" };
  };

  // ===== ボタン操作 =====
  const startScoring = () => {
    setScore(null);
    setRecognizedText("");
    setIsRecording(true);
    // 【修正ポイント3】開始時にRefをtrueにする
    isRecordingRef.current = true;
    recordStartAtRef.current = Date.now();
    try { recognitionRef.current.start(); } catch (e) { recognitionRef.current.stop(); setTimeout(() => recognitionRef.current.start(), 100); }
  };

  const stopScoring = () => {
    // 【修正ポイント4】停止時にRefをfalseにする（これで再起動ループが止まる）
    isRecordingRef.current = false;
    try { recognitionRef.current.stop(); } catch {}
    const durationSec = (Date.now() - recordStartAtRef.current) / 1000;
    setTimeout(() => {
      setRecognizedText(current => {
        setScore(buildScore({ lineId: activeLineId, targetText: activeTarget?.text, saidText: current, durationSec }));
        return current;
      });
      setIsRecording(false);
    }, 500);
  };

  const activeTarget = useMemo(() => scriptData.find((x) => x.id === activeLineId) || null, [activeLineId]);
  const canScore = practiceMode === "appointer" && activeTarget?.role === "appointer" && hiddenIds.has(activeTarget?.id);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
      <div className="max-w-3xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-2xl md:text-3xl font-bold text-indigo-700 flex items-center justify-center gap-3 mb-2">
            <BookOpen className="w-8 h-8" />
            スマートハウスフロントネガの暗記ツール
          </h1>
        </header>

        <div className="bg-white p-6 rounded-2xl shadow-sm mb-6 border border-slate-200 flex flex-wrap justify-center gap-4">
          <button onClick={() => { setPracticeMode("appointer"); setHiddenIds(new Set(scriptData.filter(x => x.role === "appointer").map(x => x.id))); setActiveLineId(1); }} className={`px-6 py-3 rounded-xl font-bold ${practiceMode === "appointer" ? "bg-indigo-600 text-white" : "bg-indigo-50 text-indigo-700"}`}>アポインターを隠す</button>
          <button onClick={() => { setPracticeMode("customer"); setHiddenIds(new Set(scriptData.filter(x => x.role === "customer").map(x => x.id))); }} className={`px-6 py-3 rounded-xl font-bold ${practiceMode === "customer" ? "bg-slate-600 text-white" : "bg-slate-100 text-slate-700"}`}>お客様を隠す</button>
          <button onClick={() => { setPracticeMode("none"); setHiddenIds(new Set()); setScore(null); }} className="px-6 py-3 rounded-xl border border-slate-200">リセット</button>
        </div>

        {practiceMode === "appointer" && (
          <div className="bg-white p-5 rounded-2xl shadow-sm mb-8 border border-slate-200">
            <div className="flex justify-between items-center mb-4">
               <div className="font-bold text-lg">#{activeLineId} の採点</div>
               {!isRecording ? 
                <button disabled={!canScore} onClick={startScoring} className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2"><Mic className="w-5 h-5"/>開始</button> :
                <button onClick={stopScoring} className="bg-rose-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 animate-pulse"><StopCircle className="w-5 h-5"/>停止して採点</button>
               }
            </div>
            {isRecording && <div className="p-4 bg-emerald-50 rounded-xl mb-4 text-emerald-800 text-center font-bold">録音中...<br/><span className="font-normal text-sm">{recognizedText}</span></div>}
            {score && (
              <div className="bg-indigo-50 p-4 rounded-xl">
                <div className="text-2xl font-black text-indigo-900 mb-2">スコア: {score.total}点</div>
                <div className="text-sm text-indigo-700 mb-2">言えた言葉: {score.debug.キーワード命中.join(", ") || "なし"}</div>
                <div className="text-sm text-rose-600">足りない言葉: {score.debug.キーワード不足.join(", ") || "なし"}</div>
              </div>
            )}
          </div>
        )}

        <div className="space-y-4">
          {scriptData.map((item) => (
            <div key={item.id} className={`flex flex-col ${item.role === "appointer" ? "items-start" : "items-end"}`}>
              <div className="text-xs font-bold mb-1 px-1">{item.label}</div>
              <div 
                onClick={() => {
                  setHiddenIds(prev => { const n = new Set(prev); if(n.has(item.id)) n.delete(item.id); else n.add(item.id); return n; });
                  if(item.role === "appointer") { setActiveLineId(item.id); setScore(null); setRecognizedText(""); }
                }}
                className={`max-w-[85%] p-5 rounded-2xl border cursor-pointer relative ${item.role === "appointer" ? "bg-white border-indigo-100" : "bg-slate-100 border-transparent"}`}
              >
                <div className={hiddenIds.has(item.id) ? "opacity-0" : "opacity-100"}>{item.text}</div>
                {hiddenIds.has(item.id) && <div className="absolute inset-0 flex items-center justify-center text-indigo-600 font-bold"><EyeOff className="w-4 h-4 mr-2"/>タップして表示</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
