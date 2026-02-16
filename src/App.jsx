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
} from "lucide-react";

export default function App() {
  // ===== 設定・状態 =====
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

  // ✅ 途切れても貯め続ける箱（Pixel対策）
  const accumulatedFinalRef = useRef("");
  // ✅ Android重複/再送対策：セッション内のfinalの前回値
  const sessionFinalRef = useRef("");

  // 自動スクロール用
  const lineRefs = useRef({});

  // ===== 正式台本データ (修正済み) =====
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
      text: `あ～、そうなんですね。

これ何かっていうと、蓄電池と太陽光で電気を作って、貯めて、光熱費を払わないお家なんですけど。

今後、新築を立てる時は、義務化になっていく予定で、実際にすでに新築の家では２件に１件がスマートハウスになっていて、電気代を払ってないおうちが増えているんです。

最近はかなり電気代が上がってきたというのもあり、今建っている住宅でも電気代金が○円以上の方で、検討されている方が増えているんですよね。
その理由がニュースとかでもご覧になったこともあると思うんですけど、電気代が上がってきているからなんです。`,
    },
  ];

  // ===== ターゲット設定 =====
  const coreTargetTextById = {
    5: "蓄電池と太陽光で電気を作って、貯めて、光熱費を払わない。新築は義務化、２軒に1軒で増えている。今建っている住宅でも検討されている方が増えているんですよね。。",
  };

  const keywordRules = {
    1: { must: ["スマートハウス", "場所をお借り", "負担なく", "施工", "ご存知"], ng: ["えっと", "たぶん", "まあ"] },
    3: { must: ["すいません", "すぐ終わ", "ちなみに", "スマートハウス", "ご存知"], ng: ["契約", "買って", "今すぐ"] },
    5: {
      must: ["蓄電池", "太陽光", "作って", "貯めて", "払わない", "新築", "義務", "２軒に1軒", "増えて", "今年", "検討"],
      ng: ["難しい", "無理", "よくわからない", "たぶん", "まあ"],
    },
  };

  // ===== Web対応：常に解放（前に進めないをゼロに）=====
  const [unlockedAppLines, setUnlockedAppLines] = useState(new Set([1, 3, 5]));
  const [history, setHistory] = useState([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      setUnlockedAppLines(new Set([1, 3, 5]));
      const rawHistory = localStorage.getItem("toppa_history_v7");
      if (rawHistory) setHistory(JSON.parse(rawHistory));
    } catch {}
    setIsDataLoaded(true);
  }, []);

  const historyRef = useRef(history);
  useEffect(() => { historyRef.current = history; }, [history]);

  useEffect(() => {
    if (!isDataLoaded) return;
    localStorage.setItem("toppa_history_v7", JSON.stringify(history));
  }, [history, isDataLoaded]);

  // ===== 自動スクロール =====
  useEffect(() => {
    setTimeout(() => {
      const el = lineRefs.current[activeLineId];
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 200);
  }, [activeLineId]);

  // ===== 音声認識（途切れOK + Android重複抑制）=====
  useEffect(() => {
    if (typeof window === "undefined") return;

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setErrorMsg("お使いのブラウザは音声認識に対応していません（Chrome推奨）");
      return;
    }

    const rec = new SR();
    rec.lang = "ja-JP";
    rec.interimResults = true;
    rec.continuous = true;

    rec.onresult = (event) => {
      let interim = "";
      let finalTextThisEvent = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalTextThisEvent += t;
        else interim += t;
      }

      // ✅ finalの“増えた分だけ”を追加する（Androidの再送・重複を抑える）
      if (finalTextThisEvent) {
        const prevSessionFinal = sessionFinalRef.current;

        // よくあるケース：prevSessionFinal の続きが来る
        if (finalTextThisEvent.startsWith(prevSessionFinal)) {
          const delta = finalTextThisEvent.slice(prevSessionFinal.length);
          if (delta) accumulatedFinalRef.current += delta;
        } else {
          // 途切れ/再起動などでズレたケース：重複しないように調整
          if (!accumulatedFinalRef.current.endsWith(finalTextThisEvent)) {
            accumulatedFinalRef.current += finalTextThisEvent;
          }
        }

        sessionFinalRef.current = finalTextThisEvent;
      }

      setRecognizedText(accumulatedFinalRef.current + interim);
    };

    rec.onerror = (event) => {
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
          }, 120);
        } catch {}
      }
    };

    recognitionRef.current = rec;

    return () => {
      isRecordingRef.current = false;
      try { rec.stop(); } catch {}
      if (praiseTimerRef.current) clearTimeout(praiseTimerRef.current);
    };
  }, []);

  // ===== 採点（優しく）=====
  const normalize = (s) =>
    (s || "")
      .toLowerCase()
      .replace(/[、。？！\s\n・,.]/g, "")
      .replace(/〇〇/g, "");

  // 日本語向け：文字バイグラムDice（録音ブレに強い）
  const diceSimilarity = (a, b) => {
    const s1 = normalize(a);
    const s2 = normalize(b);
    if (s1.length < 2 || s2.length < 2) return 0;

    const grams = (s) => {
      const m = new Map();
      for (let i = 0; i < s.length - 1; i++) {
        const g = s.slice(i, i + 2);
        m
