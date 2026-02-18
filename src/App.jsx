"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen, Mic, StopCircle, Star, Lock, Trash2, EyeOff, Eye,
  Sparkles, AlertCircle, TrendingUp, Check, Volume2, ArrowRightLeft
} from "lucide-react";

// ==========================================
// 📜 データエリア
// ==========================================

// --- コース1：スマートハウス ---
const scenario1 = {
  id: "smart_house_v1",
  title: "① スマートハウス",
  targetId: 5,
  targetText: "蓄電池と太陽光で電気を作って、貯めて、光熱費を払わない。新築は義務化、２軒に1軒で増えている。今建っている住宅でも検討されている方が増えているんですよね。。",
  script: [
    {
      id: 1, role: "appointer", label: "アポインター①",
      text: "今回、〇〇さんの場所をお借りして、負担なくスマートハウスにできる施工様募集をさせてもらってるんですが、スマートハウスってご存知ですか？",
      // 👇 ここを新しいファイル名（v2）に変えてあります！
      audio: "/model_1_v2.m4a", 
    },
    { id: 2, role: "customer", label: "お客様", text: "いや、ま、ちょっと忙しいんで大丈夫です。はい。" },
    {
      id: 3, role: "appointer", label: "アポインター②",
      text: "ああ、すいません。すぐ終わりますんで。\n\nちなみにスマートハウスはご存知でした？",
    },
    { id: 4, role: "customer", label: "お客様", text: "いや、あんまわかんないですけど。" },
    {
      id: 5, role: "appointer", label: "アポインター③",
      text: `あ～、そうなんですね。\n\nこれ何かっていうと、蓄電池と太陽光で電気を作って、貯めて、光熱費を払わないお家なんですけど。\n\n今後、新築を立てる時は、義務化になっていく予定で、実際にすでに新築の家では２件に１件がスマートハウスになっていて、電気代を払ってないおうちが増えているんです。\n\n最近はかなり電気代が上がってきたというのもあり、今建っている住宅でも電気代金が○円以上の方で、検討されている方が増えているんですよね。\nその理由がニュースとかでもご覧になったこともあると思うんですけど、電気代が上がってきているからなんです。`,
    },
  ],
  keywords: {
    1: { must: ["スマートハウス", "場所をお借り", "負担なく", "施工", "ご存知"], ng: ["えっと", "たぶん"] },
    3: { must: ["すいません", "すぐ終わ", "ちなみに", "ご存知"], ng: ["契約"] },
    5: { must: ["蓄電池", "太陽光", "作って", "貯めて", "払わない", "新築", "義務", "２軒に1軒", "増えて", "今年", "検討"], ng: ["難しい"] },
  },
  initialUnlock: [1, 3, 5], 
};

// --- コース2：奥様決済 ---
const scenario2 = {
  id: "okusan_v1",
  title: "② 奥様決済・不在",
  targetId: 9,
  targetText: "4名様ご家族で電気代が1万円を超えている。オール電化で聞いておいてよかったという方が多かった。絶対にすぐやってという話ではない。日曜日でしたら午前と午後、どちらがいらっしゃる事が多いですか？",
  script: [
    {
      id: 1, role: "appointer", label: "アポインター①",
      text: "エコキュートをお使いで、オール電化で電気代が1万円を超えているとのことでしたら、やはりお子様もいらっしゃることですし、ぜひ一度聞いておいていただいた方が良い内容かと思います。\n\nもしこういったお話を聞いていただくとしたら、普段ご在宅なのは平日と土日、どちらが多いイメージでしょうか？",
      audio: "/model_2.m4a",
    },
    { id: 2, role: "customer", label: "お客様", text: "いやあ、でも家のことは、全部奥さんが見てるからねぇ" },
    { id: 3, role: "appointer", label: "アポインター②", text: "そうなんですね、奥様の方がご管理されているんですね" },
    { id: 4, role: "customer", label: "お客様", text: "うん。奥さんに聞いてもらわないと、なんとも分かんないですよね" },
    {
      id: 5, role: "appointer", label: "アポインター③",
      text: "そうですよね、やっぱり奥様に聞かないとわからないという方が多かったんですけど、今のお話を私から奥様にするのが難しいと言われる方が多かったので、奥様がいらっしゃる時にお話しさせて頂いて、まずは今させて頂いたこのお話だけさせて頂いているんです。\n\nご主人様の所ですと結構電気使われているので、一度、一緒に聞いて頂いたほうがいいと思うんですけど、ちなみにお2人で聞けるとしたら平日と土日でしたらどちらがご都合いいですか？",
    },
    { id: 6, role: "customer", label: "お客様", text: "いつもパートに出てるから、やっぱり平日は仕事でいない感じですね" },
    { id: 7, role: "appointer", label: "アポインター④", text: "そうですか。それでしたら土日の方がよろしいかと思うのですが、土曜日と日曜日でしたら、どちらがいらっしゃる可能性が高いでしょうか？",
    },
    { id: 8, role: "customer", label: "お客様", text: "どちらかと言うと…出かけるとしたら日曜日かな。でも日曜日のいつかと言われても奥さんの予定まで細かくは分からないな" },
    {
      id: 9, role: "appointer", label: "アポインター⑤",
      text: `まあ、なかなか細かい予定までは把握されていないですよね。\n\nただ、先ほどのお話ですと、4名様ご家族で電気代が1万円を超えているのは、結構電気を使われている方ですし、オール電化で1万円以上使われているご家庭には『聞いておいてよかった』という方が多かったんで一度聞いてもらった方がいいかと思います。\n\nもちろん聞いたからといって『絶対にすぐやってください』という話でもなかったのでお気軽に皆さん聞いていただいていたのですが。\n\nなんとなくのイメージで大丈夫なのですが、日曜日でしたら午前と午後、どちらがいらっしゃる事が多いですか？`,
    },
    { id: 10, role: "customer", label: "お客様", text: "どちらかと言えば、やっぱり午後かな" },
    { id: 11, role: "appointer", label: "アポインター⑥", text: "午後ですね、ありがとうございます。\n結構お出かけされている方でも、夕方の5時か6時くらいには帰宅されている方が多いのですが、例えば今週末の日曜日の5時くらいでしたら、帰ってきてらっしゃいそうですかね？" },
    { id: 12, role: "customer", label: "お客様", text: "いるかなぁ…。たまに買い物に行くときは、5時はちょっと怪しいかな。6時ぐらいならどうかな？" },
    { id: 13, role: "appointer", label: "アポインター⑦", text: "6時くらいでしたら、多分いらっしゃいますか？" },
    { id: 14, role: "customer", label: "お客様", text: "まあ、それくらいなら多分おると思う。絶対じゃないけど" },
    { id: 15, role: "appointer", label: "アポインター⑧", text: "ありがとうございます。30分くらいの簡単なご案内ですので。まずは一度どういうものかを知っていただければと思います。では当日は担当が変わりますので、最後こちら3点ご記入お願いします。" },
  ],
  keywords: {
    1: { must: ["エコキュート", "オール電化", "1万円", "お子様", "平日", "土日"], ng: ["えっと"] },
    3: { must: ["管理", "そうなんですね"], ng: [] },
    5: { must: ["奥様", "難しい", "いらっしゃる時", "お話", "一緒に", "平日", "土日"], ng: ["契約"] },
    7: { must: ["土日", "土曜日", "日曜日", "どちら", "可能性"], ng: [] },
    9: { must: ["把握", "4名", "1万円", "結構電気", "聞いておいてよかった", "絶対", "気軽", "午前", "午後"], ng: ["無理"] },
    11: { must: ["午後", "夕方", "5時", "6時", "帰宅", "今週末"], ng: [] },
    13: { must: ["6時", "いらっしゃいますか"], ng: [] },
    15: { must: ["30分", "簡単", "知って", "担当", "3点"], ng: [] },
  },
  initialUnlock: [1, 3, 5, 7, 9, 11, 13, 15],
};

// --- コース3：忙しいお客様 ---
const scenario3 = {
  id: "busy_customer_v1",
  title: "③ 忙しいお客様",
  targetId: 13, 
  targetText: "特にこちらのお家みたいに結構オール電化とかで、これだけ電気代を1万円以上とか払っているご家庭は聞いておいてよかったっておっしゃる方とか正直多かった。もちろん、聞いてもらったからといってすぐやってくださいっていう話でもなかったんで、皆さんお気軽に聞いていただけた。まずは参考程度に。次の日曜日とか朝だと9時頃ならいらっしゃりそうですかね？",
  script: [
    {
      id: 1, role: "appointer", label: "アポインター①",
      text: "まあ、電気代が1万円以上は使っていらっしゃるのであれば、ぜひ聞いておいていただければなと思うんですけど。\n\nもし仮にこのお話を聞いていただくとしたら、平日か土日かと言われたりすると、どちらの方がご在宅されているイメージですかね？",
      audio: "/model_3.m4a",
    },
    { id: 2, role: "customer", label: "お客様", text: "いや、もう今めっちゃ年末で忙しいから。" },
    {
      id: 3, role: "appointer", label: "アポインター②",
      text: "そうですよね、お忙しいですよね。まあ、全然イメージの話で大丈夫なんですけど、平日か土日かでしたら、どちらの方がご在宅のことは多いですか？",
    },
    { id: 4, role: "customer", label: "お客様", text: "いや、もうね、両方ほとんど家にいないんで。忙しくて。" },
    {
      id: 5, role: "appointer", label: "アポインター③",
      text: "そうですよね。お忙しいですもんね。じゃあ、お休みの日とかって決まっていたりとかっていうのは…？",
    },
    { id: 6, role: "customer", label: "お客様", text: "まあ、日曜日だけ。もう1日しかないから忙しいんよね。" },
    {
      id: 7, role: "appointer", label: "アポインター④",
      text: "1日しかないんですか。それはお忙しいですよね。\n\n基本的に日曜日とかでも、多分お出かけとかされてらっしゃるかなとは思うんですけど、例えばご在宅だとしたら、結構『朝イチ』とかの方が多いかなとか、例えば『夕方』とかの方が多いかなとか、どっちの方かとかってイメージあったりされますか？",
    },
    { id: 8, role: "customer", label: "お客様", text: "いや、もうそれも日によるかな。" },
    {
      id: 9, role: "appointer", label: "アポインター⑤",
      text: "まあ、そうですよね。\n\n例えば結構皆さん、お出かけとかもされるとは思うんですけど、『朝の9時ぐらいとかであれば、まだ家にいるから、30分ぐらいだったらいいよ』って方も多かったんですけど、普段お出かけとかって、どれぐらいの時間からされます？",
    },
    { id: 10, role: "customer", label: "お客様", text: "いや、もうその時その時かな。まあ、そんなすごい朝早くから出ることはあんまりないけど。" },
    {
      id: 11, role: "appointer", label: "アポインター⑥",
      text: "そうだったんですね。とかでしたら、例えば朝の9時ぐらいとかだったら、お家にご在宅されてはいらっしゃるのはいらっしゃる感じですかね？",
    },
    { id: 12, role: "customer", label: "お客様", text: "まあ、特に予定なかったらいる時はいるけど。" },
    {
      id: 13, role: "appointer", label: "アポインター⑦",
      text: `ありがとうございます。\n\nまあ、特にこちらのお家みたいに結構オール電化とかで、これだけ電気代を1万円以上とか払っているご家庭は『聞いておいてよかったわ』っておっしゃる方とか正直多かったんで。\n\nもちろん、聞いてもらったからといって『すぐやってください』っていう話でもなかったんで、皆さんお気軽に聞いていただけたんで。まずはそもそもどういう風になるかとか、参考程度に聞いていただければなと思います。\n\n例えばじゃあ、今のところでいいんですけど、次の日曜日とか朝だと9時頃ならいらっしゃりそうですかね？`,
    },
    { id: 14, role: "customer", label: "お客様", text: "うん、まあ、いるけど。" },
    {
      id: 15, role: "appointer", label: "アポインター⑧",
      text: "ありがとうございます。聞いてよかったと言われる方多かったので楽しみに聞いてください。\n\nでは当日は担当が変わりますので、最後に3点だけご記入をお願いいたします",
    },
  ],
  keywords: {
    1: { must: ["電気代", "1万円", "聞いておいて", "仮に", "平日", "土日", "在宅"], ng: ["あのー"] },
    3: { must: ["忙しい", "イメージ", "平日", "土日", "在宅"], ng: [] },
    5: { must: ["忙しい", "お休み", "決まって"], ng: [] },
    7: { must: ["1日しかない", "忙しい", "日曜日", "お出かけ", "在宅", "朝イチ", "夕方", "イメージ"], ng: [] },
    9: { must: ["お出かけ", "朝の9時", "30分", "時間"], ng: [] },
    11: { must: ["朝の9時", "在宅", "いらっしゃる"], ng: [] },
    13: { must: ["オール電化", "電気代", "1万円", "聞いておいてよかった", "すぐやって", "お気軽", "参考", "日曜日", "朝", "9時頃"], ng: ["無理", "しつこく"] },
    15: { must: ["聞いてよかった", "楽しみ", "担当", "3点"], ng: [] },
  },
  initialUnlock: [1, 3, 5, 7, 9, 11, 13, 15], 
};

// --- コース4：蓄電池「高い・断った」 ---
const scenario4 = {
  id: "battery_refusal_v1",
  title: "④ 蓄電池「高い」への切り返し",
  targetId: 9, 
  targetText: "詳しく話しを聞いてみると、前に聞いた会社さんが、取り扱いのメーカーが2社、３社しか取り扱いがなくて、しかもその会社の売りたい値段高めの大きなタイプの蓄電池ばかりをお勧めしている会社も多いで、そういった会社さんでお話聞かれたかたが、前に聞いたけど、高かったとか、負担がでたって仰られる方が多かったんです。うちほうが、今○○さんにも入らせて貰っている事もあって、取り扱いのメーカーが30メーカー以上ありまして、その中からおうちの電気の使い方とか太陽光の発電量とかにぴったりのメーカーをさがさして貰うと、全然負担なくできたとか、前聞いた時より全然安かったという方が多かったんです。ご主人のところとかも、すごくいい太陽光を使っていて、発電もよくされていらっしゃいますし、ちょうど設置から10年も過ぎているタイミングですので。過去にそういう話を聞いたことがある方が逆に『うちで聞いておいてよかったわ』とおっしゃる方が多かったので。",
  script: [
    {
      id: 1, role: "appointer", label: "アポインター①",
      text: "1万円以上使われているのであれば聞いていただければと思うのですが、もしこういったお話を聞いていただくとしたら、お話し聞きやすいのは平日と土日だとどちらの方がご都合いいですか？",
      audio: "/model_4.m4a",
    },
    { id: 2, role: "customer", label: "お客様", text: "うん。でも蓄電池の話はもういい。もう何回か聞いたけどやらない。" },
    {
      id: 3, role: "appointer", label: "アポインター②",
      text: "あ、そうだったんですね。ちなみに、そのお話とかっていつ頃聞かれましたか？",
    },
    { id: 4, role: "customer", label: "お客様", text: "いや、もうね、訪問販売でしょっちゅう来るから。" },
    {
      id: 5, role: "appointer", label: "アポインター③",
      text: "そうなんですね。この辺り、すごく多いらしいですね。さっきの方も『しょっちゅう来るよ』とおっしゃってましたので。",
    },
    { id: 6, role: "customer", label: "お客様", text: "考えたこともあるけどね。もう値段高いし、全然そんなの無理かなっていう話になって、もううちはやらないって決めたから。" },
    {
      id: 7, role: "appointer", label: "アポインター④",
      text: "あ、そうだったんですね。じゃあ結構詳しくお話を聞かれて、『結構負担が出ちゃったな』という感じだったということですかね。",
    },
    { id: 8, role: "customer", label: "お客様", text: "うん。なんかすごい高くてとてもじゃないわと思って。" },
    {
      id: 9, role: "appointer", label: "アポインター⑤",
      text: `そうだったんですね。 ちょうどさっきの方もそうだったんですけど前に話を聞いて負担がでたからやめたと言ってたんですが\n\n詳しく話しを聞いてみると、前に聞いた会社さんが、取り扱いのメーカーが2社、３社しか取り扱いがなくて、しかもその会社の売りたい値段高めの大きなタイプの蓄電池ばかりをお勧めしている会社も多いで、そういった会社さんでお話聞かれたかたが、前に聞いたけど、高かったとか、負担がでたって仰られる方が多かったんです。\n\nうちほうが、今○○さんにも入らせて貰っている事もあって、取り扱いのメーカーが30メーカー以上ありまして、その中からおうちの電気の使い方とか太陽光の発電量とかにぴったりのメーカーをさがさして貰うと、全然負担なくできたとか、前聞いた時より全然安かったという方が多かったんです。\n\nご主人のところとかも、すごくいい太陽光を使っていて、発電もよくされていらっしゃいますし、ちょうど設置から10年も過ぎているタイミングですので。過去にそういう話を聞いたことがある方が逆に『うちで聞いておいてよかったわ』とおっしゃる方が多かったので。`,
    },
    { id: 10, role: "customer", label: "お客様", text: "うん。" },
    {
      id: 11, role: "appointer", label: "アポインター⑥",
      text: "そういうことであれば、一度聞いておいていただいた方がいいかなとは思うんですけど。 もし仮にこういうお話を聞かれるとしたら、平日か土日かと言われたら、どちらの方がいらっしゃることが多いですか？",
    },
  ],
  keywords: {
    1: { must: ["1万円", "平日", "土日", "都合"], ng: ["あのー", "えっと"] },
    3: { must: ["いつ頃", "聞かれました"], ng: [] },
    5: { must: ["この辺り", "多い", "さっきの方", "しょっちゅう来る"], ng: [] },
    7: { must: ["詳しく", "負担が出ちゃった"], ng: [] },
    9: { must: ["メーカー", "2社", "3社", "高い", "30メーカー以上", "ぴったり", "負担なく", "安かった", "発電", "10年", "聞いておいてよかった"], ng: ["無理", "売りたい"] },
    11: { must: ["聞いておいて", "仮に", "平日", "土日", "いらっしゃる"], ng: [] },
  },
  initialUnlock: [1, 3, 5, 7, 9, 11], 
};

// --- コース5：「考えていない」への切り返し ---
const scenario5 = {
  id: "not_thinking_v1",
  title: "⑤ 考えていない",
  targetId: 7, 
  targetText: "言葉さえ知らなかったら考えていなかったという方が多かった。光熱費が上がってきていることは確かに実感しておられてて、何もしなくても払っていかないといけないなら、支払いが減っていくなら考える価値あるかなとおっしゃっていた。オール電化で1万円以上かかっているのであれば、負担なくできるかは情報だけでも知っておいて良かったとおっしゃることは多かった。平日か土日かと言われると、どちらの方がいらっしゃることが多いイメージですかね？",
  script: [
    {
      id: 1, role: "appointer", label: "アポインター①",
      text: "そもそもどういうお話かと言いますと、今毎月、光熱費が1万円ほどかかってらっしゃると思うんですね。\n\nこのお支払いというのは、何もしなくてももちろん今後もずっと支払いが続いていきますし、値上がりがあったりと負担が増えていく一方だと思うんです。\n\nスマートハウスにする事で、その光熱費が先ほどのニュースの方 みたいにほぼほぼいらなくなる方もいらっしゃるので、その光熱費が安くなった分の範囲内で負担なくスマートハウスにできる方を探しているんですね。\n\n丁度、先ほどお話してたご主人様(奥様)も、今後、10、20 年で何百万円とか800 万円近く払うことになるなら、そうやって「負担なく光熱費払わないように、できたら嬉しいっ」と言われたんですが\n\nご主人さま(奥様)としては、負担なくスマートハウスにできて、光熱費が大幅に下がったら、嬉しくないですか?",
      audio: "/model_5.m4a",
    },
    { id: 2, role: "customer", label: "お客様", text: "まあ、そう安くなったらいいけどね" },
    {
      id: 3, role: "appointer", label: "アポインター②",
      text: "そうですよね。とはいえ全員ができるわけではないんです。特に太陽光とかって屋根の向きとか大きさ、角度によっても全然変わってくるので、合う人と合わない人がいるんですね。\n\nそこで、今回できるかどうかの無料診断をさせてもらっています。\n\nまずは設置できるかどうかというのもわからないので、今回の概要について簡単に 30 分程度でお話させて頂いておりまして、丁度、先ほどの方も、「そういう話ならこれからも電気代はずっと払っていくし、聞くだけになってもいいなら聞いておきたい、主人(奥様)と一緒に聞きたいから、今週の土曜日に来てっ」て言われまして、次の土曜日の朝にお伺いすることになったんです。\n\nもちろん、主人(奥様)の予定わからないから、とりあえず一人で聞くわっていう方もいるんですけど。\n\nご主人(奥様)の所だと、電気代も１万円とか結構使われていますので、一度は聞いといて頂いたほうがいいとは思いますが、もしもそういったお話を聞くとしたら平日と土日どちらがいいですか?",
    },
    { id: 4, role: "customer", label: "お客様", text: "でも、うちは今のところいいわ" },
    {
      id: 5, role: "appointer", label: "アポインター③",
      text: "そうですよね。まあ『何かやってください』というわけではなかったんですが、ちなみにこういうお話を以前詳しく聞かれたことがあって、『負担が出ちゃったな』という感じだったんですか？",
    },
    { id: 6, role: "customer", label: "お客様", text: "聞いたことはないけども、そんなにそこまで考えてないし" },
    {
      id: 7, role: "appointer", label: "アポインター④",
      text: `そうですよね。なかなかこういうのも、言葉さえ知らなかったら考えていなかったという方が多かったんですけど。\n\nちょっと先ほどの奥様もそうだったんですけど、正直『こんな家にどうこうとかも考えてないし、まあいいわ』って言っておられたんです。\n\nただ、ニュースでも光熱費上がってきているということはみたし光熱費が上がってきていることは確かに実感しておられてて『何もしなくても、先々こうやって払っていかないといけないんだったら、施工例として支払いが減っていくなら考える価値あるかな』っておっしゃっていたんですよね。\n\n特にご主人様のお宅はオール電化ですし、光熱費で1万円以上かかっているのであればかなり使われてはいるので 『する・しない』ではなくて負担なくできるかは情報だけでも知っておいて良かったな、という風におっしゃることは多かったんです。\n\nそもそも『負担なくできるならいいな』って方とか、特にお話を聞いたことがなかった方とかは、結構参考になった、聞いて良かったという方も多かったんでぜひ聞いてみてもらえればと思うのですが、\n\n30分ぐらいの簡単なお話なんですが、結構普段ご在宅なのは平日か土日かと言われると、どちらの方がいらっしゃることが多いイメージですかね？`,
    },
    { id: 8, role: "customer", label: "お客様", text: "お休みは土日だけ" },
    {
      id: 9, role: "appointer", label: "アポインター⑤",
      text: "土日かなっていう感じですか。土日の中だと、どっちの方がいらっしゃることが多いイメージですかね？",
    },
    { id: 10, role: "customer", label: "お客様", text: "日曜はまあ外出してるなあ" },
    {
      id: 11, role: "appointer", label: "アポインター⑥",
      text: "まあそうですよね。では土曜日だとイメージで大丈夫なんですけど、午前午後だとどちらの方がいらっしゃること多いですか？",
    },
    { id: 12, role: "customer", label: "お客様", text: "うん。午前やったら、まあ…でもわからないよ" },
    {
      id: 13, role: "appointer", label: "アポインター⑦",
      text: "あ、そうですよね。まあイメージなんで。 例えば今のところ（仮）で大丈夫なんですけど、週末の土曜日とかですと、朝の9時だけ空いてたんですけど、例えば9時ぐらいとかであればいらっしゃりそうですか？今のところの予定で大丈夫なんですけど",
    },
    { id: 14, role: "customer", label: "お客様", text: "うん。まあ、うん。多分いるとは思うけど" },
    {
      id: 15, role: "appointer", label: "アポインター⑧",
      text: "ありがとうございます。 こういうのとかも、何かいいきっかけがないと考える機会もなかったよっておっしゃった方も多かったんで。 特にご主人様のところだったら、オール電化のいいお家ではあるんで、するしないとかは置いておいても、診断はしておいて良かったなっておっしゃることは多かったんで、まずは色々知る機会にしていただければなと思います。\n\nすみません、当日は担当が変わってしまいますので、こちらお名前とご住所、3点だけ確認をお願いいたします",
    },
  ],
  keywords: {
    1: { must: ["光熱費", "1万円", "支払い", "値上がり", "スマートハウス", "負担なく", "嬉しくないですか"], ng: ["あのー", "えっと"] },
    3: { must: ["全員ができるわけではない", "屋根", "向き", "無料診断", "30分程度", "平日", "土日"], ng: [] },
    5: { must: ["詳しく聞かれた", "負担"], ng: [] },
    7: { must: ["言葉さえ知らなかったら", "ニュース", "光熱費", "実感", "施工例", "価値ある", "オール電化", "情報だけ", "平日", "土日"], ng: ["契約", "買って"] },
    9: { must: ["土日", "どっち", "イメージ"], ng: [] },
    11: { must: ["土曜日", "午前", "午後"], ng: [] },
    13: { must: ["仮", "朝の9時", "いらっしゃりそう", "今のところの予定"], ng: ["無理"] },
    15: { must: ["きっかけ", "診断", "知る機会", "担当", "3点"], ng: [] },
  },
  initialUnlock: [1, 3, 5, 7, 9, 11, 13, 15], 
};

const scenarios = {
  "course1": scenario1,
  "course2": scenario2,
  "course3": scenario3,
  "course4": scenario4,
  "course5": scenario5,
};

// ==========================================
// 🎮 メインアプリ
// ==========================================
export default function App() {
  const [currentCourse, setCurrentCourse] = useState("course1");

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* ヘッダー切り替えボタン */}
      <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 py-3 shadow-sm">
        <div className="max-w-2xl mx-auto flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 text-indigo-700 font-black">
            <BookOpen size={20} />
            <span className="text-sm">暗記突破AI</span>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-lg overflow-x-auto w-full max-w-full justify-start md:justify-center scrollbar-hide">
            <button onClick={() => setCurrentCourse("course1")} className={`whitespace-nowrap text-xs font-bold px-4 py-2 rounded-md transition-all ${currentCourse === "course1" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}>①スマートハウス</button>
            <button onClick={() => setCurrentCourse("course2")} className={`whitespace-nowrap text-xs font-bold px-4 py-2 rounded-md transition-all ${currentCourse === "course2" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}>②奥様決済</button>
            <button onClick={() => setCurrentCourse("course3")} className={`whitespace-nowrap text-xs font-bold px-4 py-2 rounded-md transition-all ${currentCourse === "course3" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}>③忙しい</button>
            <button onClick={() => setCurrentCourse("course4")} className={`whitespace-nowrap text-xs font-bold px-4 py-2 rounded-md transition-all ${currentCourse === "course4" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}>④蓄電池高い</button>
            <button onClick={() => setCurrentCourse("course5")} className={`whitespace-nowrap text-xs font-bold px-4 py-2 rounded-md transition-all ${currentCourse === "course5" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}>⑤考えてない</button>
          </div>
        </div>
      </div>

      <TrainingSession 
        key={currentCourse} 
        data={scenarios[currentCourse]} 
      />
    </div>
  );
}

// ==========================================
// 🏋️‍♂️ 練習セッション
// ==========================================
function TrainingSession({ data }) {
  const { id: scenarioId, title, script, keywords, targetId, targetText, initialUnlock } = data;

  const STORAGE_KEY_HISTORY = `toppa_history_${scenarioId}`;
  const STORAGE_KEY_CHECKED = `toppa_checked_${scenarioId}`;
  const STORAGE_KEY_UNLOCKED = `toppa_unlocked_${scenarioId}`;

  const [displayScale, setDisplayScale] = useState("10"); 
  const [hiddenIds, setHiddenIds] = useState(new Set());
  const [checkedIds, setCheckedIds] = useState(new Set());
  const [scoreModeCore, setScoreModeCore] = useState("core"); 

  const [isRecording, setIsRecording] = useState(false);
  const [activeLineId, setActiveLineId] = useState(script[0].id);
  const [recognizedText, setRecognizedText] = useState("");
  const [score, setScore] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [permissionError, setPermissionError] = useState(false);
  const [praise, setPraise] = useState(null);
  const praiseTimerRef = useRef(null);

  const recognitionRef = useRef(null);
  const isRecordingRef = useRef(false);
  const recordStartAtRef = useRef(null);
  
  const audioRef = useRef(null);
  const [isPlayingId, setIsPlayingId] = useState(null);

  const accumulatedFinalRef = useRef("");
  const sessionFinalRef = useRef("");
  const lineRefs = useRef({});

  // ステージ管理
  const [unlockedAppLines, setUnlockedAppLines] = useState(new Set(initialUnlock));
  const [history, setHistory] = useState([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const rawHistory = localStorage.getItem(STORAGE_KEY_HISTORY);
      if (rawHistory) setHistory(JSON.parse(rawHistory));
      const rawChecked = localStorage.getItem(STORAGE_KEY_CHECKED);
      if (rawChecked) setCheckedIds(new Set(JSON.parse(rawChecked)));
      const rawUnlocked = localStorage.getItem(STORAGE_KEY_UNLOCKED);
      if (rawUnlocked) setUnlockedAppLines(new Set(JSON.parse(rawUnlocked)));
    } catch {}
    setIsDataLoaded(true);
  }, []);

  const historyRef = useRef(history);
  useEffect(() => { historyRef.current = history; }, [history]);

  useEffect(() => {
    if (!isDataLoaded) return;
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
    localStorage.setItem(STORAGE_KEY_CHECKED, JSON.stringify(Array.from(checkedIds)));
    localStorage.setItem(STORAGE_KEY_UNLOCKED, JSON.stringify(Array.from(unlockedAppLines)));
  }, [history, checkedIds, unlockedAppLines, isDataLoaded]);

  useEffect(() => {
    if (lineRefs.current[activeLineId]) {
      setTimeout(() => {
        const el = lineRefs.current[activeLineId];
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 200);
    }
  }, [activeLineId]);

  const playModelAudio = (file, id) => {
    if (!file) return;
    if (isRecording) { alert("録音中は再生できません"); return; }
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if (isPlayingId === id) { setIsPlayingId(null); return; }
    
    const audio = new Audio(file);
    audioRef.current = audio;
    setIsPlayingId(id);
    audio.play().catch(e => { console.error(e); alert("再生エラー: publicフォルダにファイルがあるか確認してください"); setIsPlayingId(null); });
    audio.onended = () => setIsPlayingId(null);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setErrorMsg("このブラウザは音声認識未対応です"); return; }
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

  const getTargetText = (id) => {
    const item = script.find(s => s.id === id);
    if (!item) return "";
    if (id === targetId && scoreModeCore === "core") return targetText;
    return item.text;
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
    const rule = keywords[lineId] || { must: [], ng: [] };
    const hits = rule.must.filter((kw) => s.includes(normalize(kw)));
    const misses = rule.must.filter((k) => !hits.includes(k));
    const keywordBonus = Math.round((hits.length / (rule.must.length || 1)) * 35);
    const ngHits = (rule.ng || []).filter((ng) => s.includes(normalize(ng)));
    const ngPenalty = Math.min(4, ngHits.length);
    const total = Math.max(0, Math.min(100, match + tempo + fillerScore + keywordBonus - ngPenalty));
    return { total, match, tempo, fillerScore, fillersCount, cps: Number(cps.toFixed(2)), keywordBonus, hits, misses, ngHits, ngPenalty };
  };

  const isAppLine = (id) => script.find((x) => x.id === id)?.role === "appointer";
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
    const target = getTargetText(activeLineId);
    const res = buildScore(activeLineId, target, finalText, dur);
    const prev = (historyRef.current || []).find((h) => h.lineId === activeLineId) || null;
    setScore(res);
    setHistory((prevArr) => [{ ts: Date.now(), lineId: activeLineId, total: res.total, hits: res.hits, fillersCount: res.fillersCount, cps: res.cps }, ...prevArr].slice(0, 100));
    
    if (res.total >= 80) {
      setCheckedIds(prev => new Set(prev).add(activeLineId));
      const appLines = script.filter(s => s.role === "appointer").map(s => s.id);
      const currentIndex = appLines.indexOf(activeLineId);
      if (currentIndex >= 0 && currentIndex < appLines.length - 1) {
        const nextId = appLines[currentIndex + 1];
        setUnlockedAppLines(prev => new Set(prev).add(nextId));
      }
    }
    const p = makePraise({ res, prev });
    setPraise(p);
    if (praiseTimerRef.current) clearTimeout(praiseTimerRef.current);
    praiseTimerRef.current = setTimeout(() => setPraise(null), 6000);
  };

  const toggleHide = (id) => setHiddenIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const hideAppLines = () => { const next = new Set(hiddenIds); script.forEach((item) => { if (item.role === "appointer") next.add(item.id); }); setHiddenIds(next); };
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
    if (!confirm("このコースのデータを全リセットしますか？")) return;
    if (typeof window !== "undefined") { localStorage.removeItem(STORAGE_KEY_HISTORY); localStorage.removeItem(STORAGE_KEY_CHECKED); localStorage.removeItem(STORAGE_KEY_UNLOCKED); }
    setUnlockedAppLines(new Set(initialUnlock)); setHistory([]); setHiddenIds(new Set()); setCheckedIds(new Set()); setScore(null); setPraise(null); setRecognizedText(""); accumulatedFinalRef.current = ""; sessionFinalRef.current = ""; setActiveLineId(script[0].id);
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

  const rank = score ? getRank(score.total) : null;
  const headerRoleName = isAppLine(activeLineId) ? title : "お客様";

  return (
    <div className="p-4 pb-20 max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <h1 className="text-xl font-bold text-indigo-700 flex items-center justify-center gap-2">{title}</h1>
      </div>

      {permissionError && (
        <div className="bg-rose-100 border border-rose-400 text-rose-800 px-4 py-3 rounded-xl mb-4 flex items-start gap-2">
          <AlertCircle className="shrink-0 mt-0.5" />
          <div className="text-sm"><strong>マイクが使えません</strong><br />ブラウザの設定でマイクの使用を許可してください。</div>
        </div>
      )}

      {/* 採点パネル */}
      <div className="bg-white p-5 rounded-3xl shadow-xl border border-indigo-100 mb-8 relative overflow-hidden">
        {isRecording && <div className="absolute inset-0 border-4 border-rose-400 rounded-3xl animate-pulse pointer-events-none z-20"></div>}
        <div className="flex justify-between items-start mb-3">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target Line</span>
            <span className="font-black text-2xl flex items-center gap-2">
              #{activeLineId} {isAppLine(activeLineId) ? "自分" : "お客様"}
              {isAppLine(activeLineId) && !unlockedAppLines.has(activeLineId) && <Lock size={16} className="text-slate-400" />}
              {checkedIds.has(activeLineId) && <span className="text-emerald-500">✅</span>}
            </span>
            <div className="flex items-center gap-2 mt-1">
              <button onClick={() => setDisplayScale("10")} className={`text-[10px] px-2 py-1 rounded-lg border font-bold ${displayScale === "10" ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200"}`}>/10</button>
              <button onClick={() => setDisplayScale("100")} className={`text-[10px] px-2 py-1 rounded-lg border font-bold ${displayScale === "100" ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200"}`}>/100</button>
            </div>
          </div>
          {isRecording ? (
            <button onClick={handleStop} className="bg-rose-500 text-white px-6 py-3 rounded-2xl font-bold animate-pulse shadow-lg flex items-center gap-2 active:scale-95 transition-transform touch-manipulation z-30 text-sm"><StopCircle size={20} /> 停止</button>
          ) : (
            <button onClick={handleStart} className={`px-6 py-3 rounded-2xl font-bold shadow-lg flex items-center gap-2 transition-all active:scale-95 touch-manipulation z-30 text-sm ${isAppLine(activeLineId) ? "bg-gradient-to-br from-indigo-500 to-indigo-600 text-white hover:shadow-indigo-200 hover:shadow-xl" : "bg-slate-200 text-slate-400 cursor-not-allowed"}`} disabled={!isAppLine(activeLineId)}><Mic size={20} /> 採点開始</button>
          )}
        </div>

        {/* 長文モード切替（ターゲットIDの時だけ表示） */}
        {activeLineId === targetId && (
          <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-2xl p-2 mb-4">
            <span className="text-xs text-slate-500 font-bold ml-2">採点範囲</span>
            <div className="flex bg-white rounded-xl p-1 border border-slate-100">
              <button onClick={() => setScoreModeCore("core")} className={`text-[10px] px-3 py-1.5 rounded-lg font-bold transition-colors ${scoreModeCore === "core" ? "bg-indigo-100 text-indigo-700" : "text-slate-400"}`}>核だけ</button>
              <button onClick={() => setScoreModeCore("full")} className={`text-[10px] px-3 py-1.5 rounded-lg font-bold transition-colors ${scoreModeCore === "full" ? "bg-indigo-100 text-indigo-700" : "text-slate-400"}`}>全文</button>
            </div>
          </div>
        )}

        {isRecording && <div className="bg-indigo-50/50 p-4 rounded-xl text-base mb-4 border border-indigo-100 text-indigo-800 min-h-[60px] flex items-center justify-center text-center leading-relaxed">{recognizedText || "話してください..."}</div>}
        
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
                <div className="text-6xl font-black text-indigo-900 leading-none tracking-tighter">{formatScore(score.total)}</div>
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
        {script.map((item) => {
          const isApp = item.role === "appointer";
          const locked = isApp && !unlockedAppLines.has(item.id);
          const hidden = hiddenIds.has(item.id);
          const isActive = activeLineId === item.id;
          const isChecked = checkedIds.has(item.id);

          return (
            <div key={item.id} ref={(el) => (lineRefs.current[item.id] = el)} className={`p-4 rounded-2xl border-2 transition-all duration-300 ${isActive && !locked ? "border-indigo-500 bg-white shadow-md ring-4 ring-indigo-50 scale-[1.02]" : "border-slate-100 bg-white"} ${locked ? "opacity-60 grayscale" : ""} ${isChecked && isApp ? "bg-emerald-50/50 border-emerald-100" : ""}`}>
              <div className="flex justify-between mb-3 items-center">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-md ${isApp ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500"}`}>{item.label}</span>
                <div className="flex items-center gap-2">
                  {locked && <Lock size={14} className="text-slate-400" />}
                  {isApp && !locked && item.audio && (
                    <button onClick={() => playModelAudio(item.audio, item.id)} className={`text-xs px-2.5 py-1.5 rounded-lg border font-bold inline-flex items-center gap-1 active:scale-95 ${isPlayingId === item.id ? "bg-amber-100 text-amber-700 border-amber-200 animate-pulse" : "bg-white text-slate-500 border-slate-200"}`}>
                      {isPlayingId === item.id ? <StopCircle size={14} fill="currentColor"/> : <Volume2 size={14}/>} お手本
                    </button>
                  )}
                  {isApp && !locked && (
                    <button onClick={() => { setActiveLineId(item.id); setScore(null); setPraise(null); setRecognizedText(""); setErrorMsg(null); }} className="text-xs px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 font-bold inline-flex items-center gap-1 active:scale-95">
                      <Star size={14} fill="currentColor" /> 練習
                    </button>
                  )}
                  <button disabled={locked} onClick={() => toggleHide(item.id)} className={`text-xs px-2.5 py-1.5 rounded-lg border font-bold inline-flex items-center gap-1 active:scale-95 transition-transform ${locked ? "bg-slate-50 border-slate-200 text-slate-300" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
                    {hidden ? <Eye size={14} /> : <EyeOff size={14} />} {hidden ? "見る" : "隠す"}
                  </button>
                  {isApp && (
                    <button onClick={(e) => { e.stopPropagation(); toggleCheck(item.id); }} className={`text-xs px-2.5 py-1.5 rounded-lg border font-bold inline-flex items-center gap-1 active:scale-95 transition-transform ${isChecked ? "bg-emerald-500 text-white border-emerald-500 shadow-md" : "bg-white border-slate-200 text-slate-400 hover:bg-slate-50"}`}>
                      {isChecked ? "✅" : "未"}
                    </button>
                  )}
                </div>
              </div>
              <div onClick={() => { if (!locked) toggleHide(item.id); }} className={`relative text-base leading-relaxed rounded-xl p-3 border cursor-pointer min-h-[3rem] flex items-center ${isApp ? "bg-indigo-50/30 border-indigo-100/50" : "bg-slate-50 border-slate-100"} ${isChecked && !hidden && isApp ? "line-through text-slate-400 opacity-70" : ""} ${isActive && !locked ? "text-lg font-medium" : ""}`}>
                {locked ? <div className="text-slate-400 text-xs w-full text-center">ロックされています</div> : hidden ? <div className="w-full text-center text-indigo-300 font-bold text-xs"><EyeOff size={16} className="inline mr-1" />タップして確認</div> : <div className="text-slate-700 whitespace-pre-wrap">{item.text}</div>}
              </div>
            </div>
          );
        })}
      </div>

      <button onClick={resetAll} className="w-full py-4 text-slate-400 text-xs font-bold flex items-center justify-center gap-1 hover:text-rose-500 transition-colors"><Trash2 size={14} /> このコースのデータを初期化</button>
      {errorMsg && <div className="fixed bottom-4 left-4 right-4 bg-slate-800 text-white text-xs p-3 rounded-xl text-center shadow-2xl animate-bounce z-50">{errorMsg}</div>}
    </div>
  );
}
