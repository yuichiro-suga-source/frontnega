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
  Volume2, // 📢 音声アイコン
} from "lucide-react";

// 👇 ここで音声ファイルを読み込みます！
// ⚠️ GitHubのsrcフォルダに「model_1.m4a」がないとエラーで画面が出ません！
import audioFile1 from "./model_1.m4a"; 

export default function App() {
  // ===== 設定・状態 =====
  const [displayScale, setDisplayScale] = useState("10"); 
  const [hiddenIds, setHiddenIds] = useState(new Set());
  
  // チェックリストの状態
  const [checkedIds, setCheckedIds] = useState(new Set());

  const [scoreMode5, setScoreMode5] = useState("core"); 

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
  
  // 音声再生用
  const audioRef = useRef(null);
  const [isPlayingId, setIsPlayingId] = useState(null);

  const accumulatedFinalRef = useRef("");
  const sessionFinalRef = useRef("");
  const lineRefs = useRef({});

  // ===== 台本データ =====
  const scriptData = [
    {
      id: 1,
      role: "appointer",
      label: "アポインター①",
      text: "今回、〇〇さんの場所をお借りして、負担なくスマートハウスにできる施工様募集をさせてもらってるんですが、スマートハウスってご存知ですか？",
      audio: audioFile1, // 📢 ここで音声をセット！
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

  // ===== ステージ管理・保存 =====
  const [unlockedAppLines, setUnlockedAppLines] = useState(new Set([1, 3, 5]));
  const [history, setHistory] = useState([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      setUnlockedAppLines(new Set([1, 3, 5]));
      const rawHistory = localStorage.getItem("toppa_history_v7");
      if (rawHistory) setHistory(JSON.parse(rawHistory));
      const rawChecked = localStorage.getItem("toppa_checked_v7");
      if (rawChecked) setCheckedIds(new Set(JSON.parse(rawChecked)));
    } catch {}
    setIsDataLoaded(true);
  }, []);

  const historyRef = useRef(history);
  useEffect(() => { historyRef.current = history; }, [history]);

  useEffect(() => {
    if (!isDataLoaded) return;
    localStorage.setItem("toppa_history_v7", JSON.stringify(history));
    localStorage.setItem("toppa_checked_v7", JSON.stringify(Array.from(checkedIds)));
  }, [history, checkedIds, isDataLoaded]);

  // ===== 自動スクロール =====
  useEffect(() => {
    if (lineRefs.current[activeLineId]) {
      setTimeout(() => {
        const el = lineRefs.current[activeLineId];
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 200);
    }
  }, [activeLineId]);

  // ===== お手本再生 =====
  const playModelAudio = (file, id) => {
    if (!file) return;
    
    // 録音中なら止める
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

  // ===== 音声認識 =====
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
    rec.onend = () => { if (isRecordingRef.current)
