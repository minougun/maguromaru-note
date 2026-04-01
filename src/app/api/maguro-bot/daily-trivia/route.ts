import { NextResponse } from "next/server";

const TRIVIA_LIST = [
  "本マグロ中トロは、脂がのって最も美味しい部位と言われています。水温が低い冬の時期が最高の旬です。",
  "マグロは時速100kmで泳ぐことができ、一日に数百km移動することもあります。",
  "マグロの寿司ネタ「大トロ」は、最も希少で高価な部位です。天然本マグロの大トロは特に貴重です。",
  "マグロは歯が丈夫で、獲物の小魚を素早く捕食します。その素早さはあっという間です。",
  "マグロの目玉は、昼間の光が強い海でも見える特殊な構造をしています。夜間でも視力が落ちません。",
  "本マグロは赤身が最も人気で、鉄分とタンパク質が豊富で栄養価が高い食材です。",
  "マグロの刺身は、新鮮なほど香りと甘みが際立ちます。当店は毎日新鮮なマグロを厳選しています。",
  "マグロの尾身（シッポ）は別名『ネギトロ』の原料で、脂と赤身のバランスが絶妙です。",
  "本マグロと南マグロは異なる種類で、味わいや食感が違います。食べ比べも楽しみです。",
  "マグロは世界中の海で漁獲されますが、特に日本の築地市場で高く評価されます。",
];

interface DailyTriviaResponse {
  success: boolean;
  trivia: string;
  date: string;
}

function getDailyTrivia(): { trivia: string; date: string } {
  const today = new Date();
  const dateString = today.toISOString().split("T")[0];
  
  const daysSinceEpoch = Math.floor(today.getTime() / (24 * 60 * 60 * 1000));
  const triviaIndex = daysSinceEpoch % TRIVIA_LIST.length;
  
  return {
    trivia: TRIVIA_LIST[triviaIndex],
    date: dateString,
  };
}

export async function GET(): Promise<NextResponse<DailyTriviaResponse>> {
  const { trivia, date } = getDailyTrivia();
  
  return NextResponse.json(
    {
      success: true,
      trivia,
      date,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=172800",
      },
    }
  );
}
