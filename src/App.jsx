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

/**
 * ✅ スマートハウス暗記ツール（アポインター専用・採点付き）
 * - 「アポインターを隠す」モードのときだけ採点可能
 * - Web Speech API で音声認識 → 台本一致・テンポ・間・フィラー・キーワードで採点
 */

export default function App() {
  const [hiddenIds, setHiddenIds] = useState(new Set());
  const [practiceMode, setPracticeMode] = useState("none"); // 'none' | 'appointer' | 'customer'

  // ===== 採点用 state =====
  const [isRecording, setIsRecording] = useState(false);
  const [activeLineId, setActiveLineId] = useState(null); // 採点対象の台本行
  const [recognizedText, setRecognizedText] = useState("");
  const [score, setScore] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const recognitionRef = useRef(null);
  const recordStartAtRef = useRef(null);

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
      content:
        "拒絶（忙しい）に対して、一旦受け流して質問（ご存知でした？）に戻すのがポイントです。",
    },
    {
      title: "メリットの3ステップ",
      content:
        "『作って』『貯めて』『払わない』の3リズムで伝えると、お客様の印象に残りやすくなります。",
    },
    {
      title: "時流の強調",
      content:
        "『義務化』『増えている』という言葉で『今聞かなければならない話』という空気を作ります。",
    },
  ];

  // ====== 音声認識（Web Speech API）初期化 ======
  useEffect(() => {
    // ブラウザ互換性チェック
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setErrorMsg("このブラウザは音声認識に対応していません。Google ChromeまたはEdgeをご利用ください。");
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

      setRecognizedText((prev) => {
        // final は累積、interim は一時表示（簡易）
        // 実際の実装では interim の扱いを工夫する必要があるが、簡易的に結合して表示
        // ここでは final が確定したときに prev に追加するロジックにするため、
        // 毎回リセットせず、現在のセッションの累積として管理する簡易実装
        
        // 修正: continuous=true の場合、onresult は差分ではなく全量または追加分を返す挙動がブラウザにより異なる。
        // ここではシンプルに最新の interim を表示に反映させる。
        // ※厳密なリアルタイム表示には複雑な管理が必要だが、練習用としては以下で十分動作する。
        return finalText + interim;
      });
    };

    rec.onerror = (e) => {
      console.error("Speech recognition error", e);
      setIsRecording(false);
      if (e.error === 'not-allowed') {
        setErrorMsg("マイクの使用が許可されていません。ブラウザの設定を確認してください。");
      }
    };

    rec.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = rec;
  }, []);

  // ====== 文字正規化・採点ユーティリティ ======
  const normalizeJa = (s) =>
    (s || "")
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[。、．，・「」『』（）()【】\n?!？！]/g, "")
      .replace(/〇〇/g, "");

  const levenshtein = (a, b) => {
    const m = a.length,
      n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + cost
        );
      }
    }
    return dp[m][n];
  };

  const similarity01 = (target, said) => {
    const t = normalizeJa(target);
    const s = normalizeJa(said);
    const maxLen = Math.max(t.length, s.length);
    if (maxLen === 0) return 1;
    const dist = levenshtein(t, s);
    return Math.max(0, 1 - dist / maxLen);
  };

  const countFillers = (said) => {
    const txt = (said || "").toLowerCase();
    const fillers = ["えー", "ええ", "あの", "あのー", "その", "えっと", "ま", "なんか"];
    let c = 0;
    fillers.forEach((f) => {
      // 単純な出現回数カウント
      const re = new RegExp(f, "g");
      const m = txt.match(re);
      c += m ? m.length : 0;
    });
    return c;
  };

  const keywordHit = (said, rule) => {
    const s = normalizeJa(said);
    const hits = [];
    const misses = [];

    (rule?.must || []).forEach((kw) => {
      const ok = (kw.synonyms || [kw.label]).some((syn) => s.includes(normalizeJa(syn)));
      if (ok) hits.push(kw.label);
      else misses.push(kw.label);
    });

    const ngHits = [];
    (rule?.ng || []).forEach((ng) => {
      if (s.includes(normalizeJa(ng))) ngHits.push(ng);
    });

    return { hits, misses, ngHits };
  };

  const buildScore = ({ lineId, targetText, saidText, durationSec }) => {
    // 1) 台本一致（基本点70点満点）
    const sim = similarity01(targetText, saidText); // 0..1
    const match = Math.round(sim * 70);

    // 2) テンポ（10点満点）
    const saidNorm = normalizeJa(saidText);
    const chars = saidNorm.length || 1;
    const cps = chars / Math.max(1, durationSec); // chars/sec
    // 理想的なスピーチ速度: 4〜6文字/秒程度
    const tempoPenalty = cps < 3 ? 5 : cps > 8 ? 5 : 0;
    const tempo = Math.max(0, 10 - tempoPenalty);

    // 3) 間（10点満点）※簡易判定：遅すぎを減点
    const secPerChar = durationSec / chars;
    const pausePenalty = secPerChar > 0.6 ? 6 : secPerChar > 0.45 ? 3 : 0;
    const pause = Math.max(0, 10 - pausePenalty);

    // 4) フィラー（10点満点）
    const fillers = countFillers(saidText);
    const fillerPenalty = Math.min(10, fillers * 2);
    const fillerScore = Math.max(0, 10 - fillerPenalty);

    // 5) キーワード加点・NG減点
    const rule = keywordRules[lineId];
    const { hits, misses, ngHits } = keywordHit(saidText, rule);

    // must が多いほど満点を取りにくいので、比率で加点（最大15点くらいボーナス）
    const mustCount = (rule?.must || []).length || 1;
    // キーワード網羅率
    const keywordCoverage = hits.length / mustCount;
    const keywordAdd = Math.round(keywordCoverage * 15); 

    // NG ワードは最大 -10 点
    const ngPenalty = Math.min(10, ngHits.length * 3);

    // 合計 (最大100点にキャップ)
    let total = match + tempo + pause + fillerScore + keywordAdd - ngPenalty;
    total = Math.max(0, Math.min(100, total));

    const comment =
      total >= 90
        ? "素晴らしい！現場でそのまま通用するレベルです。"
        : total >= 75
        ? "かなり良いです。キーワードの漏れをなくせば完璧です。"
        : total >= 60
        ? "合格ラインです。もう少し自信を持って言い切りましょう。"
        : "伸びしろがあります。まずは必須キーワードを確実に言うことから始めましょう。";

    return {
      total,
      detail: {
        再現度: match,
        テンポ: tempo,
        間: pause,
        フィラー: fillerScore,
        キーワード加点: keywordAdd,
        NG減点: -ngPenalty,
      },
      debug: {
        類似度: Math.round(sim * 100),
        文字毎秒: Number(cps.toFixed(2)),
        フィラー回数: fillers,
        キーワード命中: hits,
        キーワード不足: misses,
        NG検出: ngHits,
      },
      comment,
    };
  };

  // ===== UI動作 =====
  const toggleLine = (id) => {
    setHiddenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const setMode = (mode) => {
    setPracticeMode(mode);
    setScore(null);
    setRecognizedText("");
    setActiveLineId(null);
    setErrorMsg(null);

    if (mode === "none") {
      setHiddenIds(new Set());
      return;
    }

    // mode が 'appointer' の時：アポインターの行を隠す（＝アポインターが言う）
    const next = new Set(scriptData.filter((x) => x.role === mode).map((x) => x.id));
    setHiddenIds(next);

    // アポインター練習の時は、最初のアポ行を採点対象にしておく
    if (mode === "appointer") {
      const first = scriptData.find((x) => x.role === "appointer");
      setActiveLineId(first?.id ?? null);
    }
  };

  const resetAll = () => {
    setHiddenIds(new Set());
    setPracticeMode("none");
    setScore(null);
    setRecognizedText("");
    setActiveLineId(null);
    setErrorMsg(null);
    try {
      if (recognitionRef.current && isRecording) recognitionRef.current.stop();
    } catch {}
  };

  const activeTarget = useMemo(() => scriptData.find((x) => x.id === activeLineId) || null, [activeLineId]);

  const canScore =
    practiceMode === "appointer" &&
    activeTarget?.role === "appointer" &&
    hiddenIds.has(activeTarget?.id);

  const startScoring = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setErrorMsg("このブラウザは音声認識に対応していません。");
      return;
    }
    if (!canScore) {
      alert("採点は『アポインターを隠す』モードで、隠れているアポ行を選んだ時だけできます。");
      return;
    }

    setScore(null);
    setRecognizedText("");
    setErrorMsg(null);
    setIsRecording(true);
    recordStartAtRef.current = Date.now();

    try {
      recognitionRef.current.start();
    } catch (e) {
      // すでに開始されている場合などのエラーハンドリング
      console.error(e);
      recognitionRef.current.stop();
      setTimeout(() => recognitionRef.current.start(), 100);
    }
  };

  const stopScoring = () => {
    try {
      recognitionRef.current?.stop();
    } catch {}

    const endAt = Date.now();
    const durationSec = (endAt - (recordStartAtRef.current || endAt)) / 1000;

    // 少し待ってから結果を表示（認識のラグを考慮）
    setTimeout(() => {
      const target = activeTarget?.text || "";
      // recognizedText ステートは非同期更新される可能性があるため、現状の値を使用
      // ※厳密にはRefで最新のテキストを保持する方が安全だが、ここでは簡易実装とする
      setRecognizedText((currentText) => {
        const result = buildScore({
          lineId: activeTarget?.id,
          targetText: target,
          saidText: currentText,
          durationSec: Math.max(1, durationSec), // 0除算防止
        });
        setScore(result);
        return currentText;
      });
      setIsRecording(false);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <header className="mb-8 text-center">
          <h1 className="text-2xl md:text-3xl font-bold text-indigo-700 flex items-center justify-center gap-3 mb-2">
            <BookOpen className="w-8 h-8" />
            スマートハウス暗記ツール
          </h1>
          <p className="text-slate-500 text-sm">
            アポインター専用・AI採点機能付き<br/>
            <span className="text-xs text-slate-400">※音声認識はChrome/Edge推奨</span>
          </p>
        </header>

        {/* Controls */}
        <div className="bg-white p-6 rounded-2xl shadow-sm mb-6 border border-slate-200">
          <div className="flex flex-col md:flex-row items-center justify-center gap-4">
            <button
              onClick={() => setMode("appointer")}
              className={`w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl transition-all font-bold ${
                practiceMode === "appointer"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-105"
                  : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
              }`}
            >
              <User className="w-5 h-5" />
              アポインターを隠す（採点）
            </button>
            <button
              onClick={() => setMode("customer")}
              className={`w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl transition-all font-medium ${
                practiceMode === "customer"
                  ? "bg-slate-600 text-white shadow-lg scale-105"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <MessageCircle className="w-5 h-5" />
              お客様を隠す（閲覧用）
            </button>
            <button
              onClick={resetAll}
              className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              リセット
            </button>
          </div>
        </div>

        {/* Error Message */}
        {errorMsg && (
            <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm flex items-start gap-2">
                <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>{errorMsg}</div>
            </div>
        )}

        {/* Scoring Panel */}
        <div className={`transition-all duration-500 overflow-hidden ${practiceMode === "appointer" ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"}`}>
        <div className="bg-white p-5 rounded-2xl shadow-sm mb-8 border border-slate-200 ring-1 ring-slate-100">
          <div className="flex flex-col md:flex-row md:items-center gap-4 md:justify-between mb-4">
            <div className="text-sm text-slate-600">
               {activeTarget ? (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-xs font-bold">STEP 1</span>
                    <span>採点対象を選択中:</span>
                  </div>
                  <div className="font-bold text-slate-900 text-lg flex items-center gap-2">
                    #{activeTarget.id} {activeTarget.label}
                    {hiddenIds.has(activeTarget.id) ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                        <span className="text-xs text-rose-500 font-normal">（タップして隠すと採点できます）</span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-slate-400">
                    <Star className="w-5 h-5" />
                    <span>下のリストから採点したい行をタップしてください</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {!isRecording ? (
                <button
                  disabled={!canScore}
                  onClick={startScoring}
                  className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl transition-all font-bold shadow-sm ${
                    canScore
                      ? "bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-md hover:scale-105"
                      : "bg-slate-100 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  <Mic className="w-5 h-5" />
                  音声入力を開始
                </button>
              ) : (
                <button
                  onClick={stopScoring}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-rose-600 text-white hover:bg-rose-700 transition-all animate-pulse font-bold shadow-md"
                >
                  <StopCircle className="w-5 h-5" />
                  停止して採点
                </button>
              )}
            </div>
          </div>

          {isRecording && (
            <div className="text-center py-4 bg-emerald-50 border border-emerald-100 rounded-xl mb-4">
              <div className="text-emerald-800 font-bold flex items-center justify-center gap-2 mb-1">
                <div className="w-3 h-3 bg-emerald-500 rounded-full animate-ping"></div>
                録音中...
              </div>
              <div className="text-xs text-emerald-600">
                はっきりと、相手に伝わるように話してください。
              </div>
              <div className="mt-2 text-sm text-slate-700 min-h-[1.5em] px-4">
                  {recognizedText}
              </div>
            </div>
          )}

          {(recognizedText || score) && !isRecording && (
            <div className="grid gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
              {score ? (
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5">
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4 border-b border-indigo-100 pb-4">
                    <div>
                        <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">Total Score</div>
                        <div className="text-4xl font-black text-indigo-900 flex items-baseline gap-1">
                            {score.total}<span className="text-lg text-indigo-400 font-medium">/100</span>
                        </div>
                    </div>
                    <div className="bg-white/60 px-4 py-2 rounded-lg text-indigo-800 text-sm font-medium border border-indigo-100">
                        {score.comment}
                    </div>
                  </div>

                  {/* スコア詳細グリッド */}
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-sm mb-4">
                    {Object.entries(score.detail).map(([k, v]) => (
                      <div key={k} className="bg-white/80 border border-indigo-100 rounded-lg p-2 flex flex-col items-center justify-center text-center">
                        <div className="text-[10px] text-slate-500 mb-1">{k}</div>
                        <div className={`font-bold text-lg ${v < 0 ? "text-rose-600" : "text-slate-700"}`}>
                            {v > 0 ? `+${v}` : v}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="bg-white/80 border border-indigo-100 rounded-lg p-3">
                      <div className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          言えたキーワード
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(score.debug.キーワード命中 || []).length > 0 ? (
                            score.debug.キーワード命中.map((t) => (
                            <span key={t} className="inline-flex items-center text-xs px-2 py-1 rounded-md bg-emerald-100 text-emerald-800 font-medium">
                                {t}
                            </span>
                            ))
                        ) : (
                            <span className="text-xs text-slate-400">なし</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="bg-white/80 border border-indigo-100 rounded-lg p-3">
                      <div className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1">
                          <XCircle className="w-3 h-3" />
                          言い忘れたキーワード
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(score.debug.キーワード不足 || []).length > 0 ? (
                            score.debug.キーワード不足.map((t) => (
                            <span key={t} className="inline-flex items-center text-xs px-2 py-1 rounded-md bg-rose-100 text-rose-800 font-medium">
                                {t}
                            </span>
                            ))
                        ) : (
                            <span className="text-xs text-emerald-600 font-bold">パーフェクト！</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                 <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <div className="text-xs font-bold text-slate-500 mb-1">認識されたテキスト</div>
                    <div className="text-sm text-slate-800">{recognizedText}</div>
                 </div>
              )}
            </div>
          )}
        </div>
        </div>

        {/* Script Display */}
        <div className="space-y-4 mb-12">
          {scriptData.map((item) => (
            <div
              key={item.id}
              className={`flex flex-col ${item.role === "appointer" ? "items-start" : "items-end"}`}
            >
              <div
                className={`text-xs font-bold mb-1 px-1 ${
                  item.role === "appointer" ? "text-indigo-600 ml-1" : "text-slate-500 mr-1"
                }`}
              >
                {item.label}
              </div>

              <div
                onClick={() => {
                  // クリックで隠す/表示
                  const willBeHidden = !hiddenIds.has(item.id);
                  toggleLine(item.id);

                  // ✅ 採点対象はアポインター行だけ
                  if (willBeHidden && item.role === "appointer") {
                    setActiveLineId(item.id);
                    setScore(null);
                    setRecognizedText("");
                    setPracticeMode("appointer"); // 自動でモード切り替え
                    setErrorMsg(null);
                  }
                }}
                className={`relative max-w-[90%] md:max-w-[85%] p-5 rounded-2xl cursor-pointer transition-all duration-200 shadow-sm border text-base leading-relaxed group ${
                  item.role === "appointer"
                    ? "bg-white border-indigo-100 rounded-tl-none hover:border-indigo-300"
                    : "bg-slate-100 border-transparent rounded-tr-none hover:bg-slate-200"
                } ${
                  activeLineId === item.id && item.role === "appointer" ? "ring-2 ring-indigo-500 ring-offset-2" : ""
                }`}
              >
                <div
                  className={`transition-opacity duration-300 ${
                    hiddenIds.has(item.id) ? "opacity-0 select-none" : "opacity-100"
                  }`}
                >
                  {item.text}
                </div>

                {hiddenIds.has(item.id) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-indigo-50/90 backdrop-blur-[1px] rounded-2xl group-hover:bg-indigo-50/70 transition-colors">
                    <span className="text-indigo-600 font-bold text-sm flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-sm">
                      <EyeOff className="w-4 h-4" /> 
                      {item.role === "appointer" ? "あなたの番です（タップで表示）" : "タップして確認"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Tips */}
        <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100 mb-10">
          <h2 className="text-amber-800 font-bold flex items-center gap-2 mb-4 text-lg">
            <Lightbulb className="w-5 h-5" />
            トーク上達のヒント
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {tips.map((tip, idx) => (
              <div key={idx} className="bg-white/80 p-4 rounded-xl border border-amber-200/30 shadow-sm">
                <div className="font-bold text-amber-900 text-sm mb-2 border-b border-amber-100 pb-2">{tip.title}</div>
                <div className="text-slate-700 text-xs leading-relaxed">{tip.content}</div>
              </div>
            ))}
          </div>
        </div>

        <footer className="text-center text-slate-400 text-xs pb-10">
          <p className="mb-2">うまくなるコツは「全部直さない」こと。</p>
          <p className="font-bold text-slate-500">“名詞（蓄電池/太陽光）と質問”だけ先に固める。</p>
        </footer>
      </div>
    </div>
  );
}
