import type { Part, PartDetailProfile, PartId } from "@/lib/domain/types";

type PartFlavorNote = {
  rarityMemo: string;
  textureMemo: string;
  fatMemo: string;
};

const PART_FLAVOR_NOTES: Partial<Record<PartId, PartFlavorNote>> = {
  otoro: {
    rarityMemo: "一尾から取れる量が少なく、当たり日に出会うと満足度がかなり高い王道の希少部位です。",
    textureMemo: "体温でほどけるような口どけで、繊維感はかなりやわらかめです。",
    fatMemo: "甘みが前に出る濃厚タイプ。ひと口で脂の存在感がはっきり分かります。",
  },
  chutoro: {
    rarityMemo: "定番よりは少し希少で、赤身派にも脂派にも刺さりやすい人気帯です。",
    textureMemo: "赤身の筋感とやわらかさの中間で、口当たりはなめらか寄りです。",
    fatMemo: "脂と赤身のバランス型。重すぎず、甘みと旨みを両立しやすい部位です。",
  },
  akami: {
    rarityMemo: "比較的出会いやすい基準部位で、ほかの部位との違いを測る軸にもなります。",
    textureMemo: "筋肉質でほどよい弾力があり、噛むほど旨みが広がるタイプです。",
    fatMemo: "脂は控えめで、香りと鉄っぽい旨みを楽しむすっきり寄りの部位です。",
  },
  noten: {
    rarityMemo: "頭まわりのごく少量しか取れないので、記録できるとかなり嬉しい当たり枠です。",
    textureMemo: "繊維はきめ細かく、大とろ系のやわらかさが出やすい部位です。",
    fatMemo: "濃厚なのに後味は意外と軽く、甘みが先に立ちやすいタイプです。",
  },
  hoho: {
    rarityMemo: "希少部位の中でも個性派で、見かけたら試す価値が高い一皿です。",
    textureMemo: "まぐろらしさより肉っぽい弾力があり、噛みごたえの印象が強めです。",
    fatMemo: "赤身の旨みと脂のコクが同居していて、濃さはあるのにくどくなりにくいです。",
  },
  meura: {
    rarityMemo: "かなり希少で、狙っても毎回は出会いにくいマニア向けの当たり部位です。",
    textureMemo: "とろみが強く、ねっとりした口当たりになりやすい部位です。",
    fatMemo: "脂の密度が高く、濃厚さと余韻の長さが印象に残りやすいです。",
  },
};

function rarityLabel(rarity: number) {
  if (rarity >= 3) return "かなり希少";
  if (rarity === 2) return "やや希少";
  return "比較的出会いやすい";
}

function fallbackNotes(part: Part): PartFlavorNote {
  return {
    rarityMemo: `${part.name} は ${part.area} の部位で、レア度 ${part.rarity} の個性を持っています。`,
    textureMemo: `${part.description} を手がかりに、食感の違いも意識して味わいたい部位です。`,
    fatMemo: "その日の切り方や個体差でも印象が変わるので、記録を重ねるほど違いが見えます。",
  };
}

export function buildPartDetailProfile(part: Part, firstCollectedAt: string | null): PartDetailProfile {
  const notes = PART_FLAVOR_NOTES[part.id] ?? fallbackNotes(part);

  return {
    partId: part.id,
    rarityLabel: rarityLabel(part.rarity),
    rarityMemo: notes.rarityMemo,
    textureMemo: notes.textureMemo,
    fatMemo: notes.fatMemo,
    firstCollectedAt,
    subjectiveSummary: {
      tastingCount: 0,
      dominantFatLevelLabel: null,
      dominantTextureLabel: null,
      averageSatisfaction: null,
      wantAgainRate: null,
    },
  };
}
