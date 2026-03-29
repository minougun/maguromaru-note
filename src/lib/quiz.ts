import { STORE_INFO, TITLES, quizQuestionsPerStage, quizStageCount, quizStagesPerTier } from "@/lib/domain/constants";
import { getDefaultPartIdsForMenuItem } from "@/lib/domain/menu-part-defaults";
import { seededMenuItems, seededParts } from "@/lib/domain/seed";
import { filterTrackedParts } from "@/lib/domain/tracked-parts";

export interface QuizQuestion {
  id: string;
  stageNumber: number;
  category: "部位" | "メニュー" | "称号" | "お店" | "アプリ";
  question: string;
  options: [string, string, string, string];
  answerIndex: number;
  acceptedAnswerIndexes?: number[];
  explanation: string;
}

interface QuizQuestionSpec {
  idBase: string;
  category: QuizQuestion["category"];
  question: string;
  options: [string, string, string, string];
  answerIndex: number;
  acceptedAnswerIndexes?: number[];
  explanation: string;
}

interface Statement {
  id: string;
  category: QuizQuestion["category"];
  subject: string;
  text: string;
  explanation: string;
}

type QuizTier = 1 | 2 | 3 | 4 | 5;

export interface PublicQuizQuestion {
  id: string;
  category: QuizQuestion["category"];
  question: string;
  options: [string, string, string, string];
}

const QUIZ_STAGE_CANDIDATE_COUNT = 18;
const QUIZ_TIER_COUNT = 5;
const singlePromptVariants = [
  "正しい説明はどれ？",
  "この中で正しい内容を選んで。",
  "4つの説明から正しいものはどれ？",
] as const;
const multiPromptVariants = [
  "正しい説明をすべて選べ。",
  "この中で正しい内容をすべて選んで。",
  "4つの説明から当てはまるものをすべて選べ。",
] as const;

function combinations<T>(values: T[], size: number): T[][] {
  if (size === 0) {
    return [[]];
  }

  if (values.length < size) {
    return [];
  }

  if (size === 1) {
    return values.map((value) => [value]);
  }

  return values.flatMap((value, index) =>
    combinations(values.slice(index + 1), size - 1).map((rest) => [value, ...rest]),
  );
}

function uniqueStrings(values: string[]) {
  return [...new Set(values)];
}

function shuffleValues<T>(values: readonly T[], seed: number) {
  const result = [...values];
  let randomSeed = seed || 1;

  for (let index = result.length - 1; index > 0; index -= 1) {
    randomSeed = (randomSeed * 1664525 + 1013904223) % 4294967296;
    const swapIndex = Math.floor((randomSeed / 4294967296) * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }

  return result;
}

function buildOptions(
  correct: string,
  primaryDistractors: string[],
  fallbackDistractors: string[],
  seed: number,
) {
  const distractors = uniqueStrings([
    ...primaryDistractors.filter((value) => value !== correct),
    ...fallbackDistractors.filter((value) => value !== correct),
  ]).slice(0, 3);

  if (distractors.length < 3) {
    throw new Error(`Not enough distractors for quiz option: ${correct}`);
  }

  const insertAt = seed % 4;
  const result = [...distractors];
  result.splice(insertAt, 0, correct);
  return result as [string, string, string, string];
}

function buildOptionsWithAcceptedAnswers(
  acceptedAnswers: string[],
  primaryDistractors: string[],
  fallbackDistractors: string[],
) {
  const uniqueAcceptedAnswers = uniqueStrings(acceptedAnswers);
  const distractors = uniqueStrings([
    ...primaryDistractors.filter((value) => !uniqueAcceptedAnswers.includes(value)),
    ...fallbackDistractors.filter((value) => !uniqueAcceptedAnswers.includes(value)),
  ]).slice(0, 4 - uniqueAcceptedAnswers.length);

  if (uniqueAcceptedAnswers.length + distractors.length !== 4) {
    throw new Error(`Not enough distractors for quiz options: ${uniqueAcceptedAnswers.join(", ")}`);
  }

  return [...uniqueAcceptedAnswers, ...distractors] as [string, string, string, string];
}

function answerIndexOf(options: string[], correct: string) {
  return options.indexOf(correct);
}

function answerIndexesOf(options: string[], acceptedAnswers: string[]) {
  return uniqueStrings(acceptedAnswers)
    .map((answer) => options.indexOf(answer))
    .filter((index) => index >= 0);
}

function seededRandom(seed: number) {
  let value = seed || 1;
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
}

function statementPrompt(statements: Statement[], variants: readonly string[], index: number) {
  const subjects = uniqueStrings(statements.map((statement) => statement.subject)).slice(0, 3).join(" / ");
  return `「${subjects}」について${variants[index % variants.length]}`;
}

function buildSingleTruthStatementQuestions(
  idPrefix: string,
  truths: Statement[],
  lies: Statement[],
  limit: number,
) {
  const questions: QuizQuestionSpec[] = [];

  for (let truthIndex = 0; truthIndex < truths.length && questions.length < limit; truthIndex += 1) {
    const truth = truths[truthIndex];

    for (let variant = 0; variant < lies.length && questions.length < limit; variant += 1) {
      const selectedLies: Statement[] = [];

      for (let probe = 0; probe < lies.length * 2 && selectedLies.length < 3; probe += 1) {
        const lie = lies[(truthIndex * 11 + variant * 7 + probe) % lies.length];
        if (
          lie.text === truth.text ||
          selectedLies.some((entry) => entry.text === lie.text)
        ) {
          continue;
        }
        selectedLies.push(lie);
      }

      if (selectedLies.length < 3) {
        continue;
      }

      const optionTexts = [truth.text, ...selectedLies.map((statement) => statement.text)];
      if (new Set(optionTexts).size !== 4) {
        continue;
      }

      const options = shuffleValues(optionTexts, truthIndex * 97 + variant * 13) as [
        string,
        string,
        string,
        string,
      ];
      questions.push({
        idBase: `${idPrefix}-${questions.length + 1}`,
        category: truth.category,
        question: statementPrompt([truth, ...selectedLies], singlePromptVariants, questions.length),
        options,
        answerIndex: answerIndexOf(options, truth.text),
        explanation: truth.explanation,
      });
    }
  }

  return questions;
}

function buildMultiTruthStatementQuestions(
  idPrefix: string,
  truths: Statement[],
  lies: Statement[],
  truthCount: 2 | 3,
  limit: number,
  categoryOverride?: QuizQuestion["category"],
) {
  const questions: QuizQuestionSpec[] = [];
  const truthSets = combinations(truths, truthCount);

  for (let truthSetIndex = 0; truthSetIndex < truthSets.length && questions.length < limit; truthSetIndex += 1) {
    const truthSet = truthSets[truthSetIndex];
    const lieCount = 4 - truthCount;

    for (let variant = 0; variant < lies.length && questions.length < limit; variant += 1) {
      const selectedLies: Statement[] = [];

      for (let probe = 0; probe < lies.length * 2 && selectedLies.length < lieCount; probe += 1) {
        const lie = lies[(truthSetIndex * 17 + variant * 5 + probe) % lies.length];
        if (
          truthSet.some((statement) => statement.text === lie.text) ||
          selectedLies.some((entry) => entry.text === lie.text)
        ) {
          continue;
        }
        selectedLies.push(lie);
      }

      if (selectedLies.length < lieCount) {
        continue;
      }

      const statements = [...truthSet, ...selectedLies];
      const optionTexts = statements.map((statement) => statement.text);
      if (new Set(optionTexts).size !== 4) {
        continue;
      }

      const options = shuffleValues(optionTexts, truthSetIndex * 53 + variant * 19) as [
        string,
        string,
        string,
        string,
      ];
      const correctIndexes = truthSet
        .map((statement) => options.indexOf(statement.text))
        .sort((left, right) => left - right);

      questions.push({
        idBase: `${idPrefix}-${questions.length + 1}`,
        category: categoryOverride ?? truthSet[0]?.category ?? "部位",
        question: statementPrompt(statements, multiPromptVariants, questions.length),
        options,
        answerIndex: correctIndexes[0] ?? 0,
        acceptedAnswerIndexes: correctIndexes,
        explanation: `正しいのは ${truthSet.map((statement) => `「${statement.text}」`).join("、")} です。`,
      });
    }
  }

  return questions;
}

function dedupeQuestionSpecs(questions: QuizQuestionSpec[]) {
  const seen = new Set<string>();
  return questions.filter((question) => {
    const signature = `${question.question}::${question.options.join("|")}`;
    if (seen.has(signature)) {
      return false;
    }
    seen.add(signature);
    return true;
  });
}

const quizParts = filterTrackedParts(seededParts);
const areaPool = [...new Set(quizParts.map((part) => part.area))];
const rarityPool = ["1", "2", "3", "不明"];
const descriptionPool = quizParts.map((part) => part.description);
const namePool = quizParts.map((part) => part.name);
const pricePool = uniqueStrings([
  ...seededMenuItems.map((item) => `${item.price}円`),
  "1200円",
  "1500円",
  "2000円",
  "2500円",
  "3000円",
]);
const menuSortPool = seededMenuItems.map((item) => `${item.sort_order}番目`);
const titlePool = [...new Set(TITLES.map((title) => title.name))];
const visitPool = [...new Set(TITLES.map((title) => `${title.requiredVisits}回`))];
const partRequirementPool = uniqueStrings([
  ...TITLES.map((title) => `${title.requiredCollectedParts}種`),
  "0種",
  "3種",
  "4種",
  "5種",
  "6種",
]);
const quizCorrectPool = [...new Set(TITLES.map((title) => `${title.requiredQuizCorrect}問`))];

const partFactQuestions = quizParts.flatMap<QuizQuestionSpec>((part, index) => {
  const acceptedAreas = part.id === "akami" ? ["腹部", "背部"] : [part.area];
  const areaOptions =
    part.id === "akami"
      ? buildOptionsWithAcceptedAnswers(acceptedAreas, areaPool, ["腹部", "背部", "頭部", "胸部"])
      : buildOptions(part.area, areaPool, ["腹部", "背部", "頭部", "胸部"], index);
  const areaAnswerIndexes = answerIndexesOf(areaOptions, acceptedAreas);
  const rarityOptions = buildOptions(String(part.rarity), rarityPool, ["1", "2", "3", "不明"], index + 1);
  const descriptionOptions = buildOptions(
    part.description,
    descriptionPool.filter((value) => value !== part.description),
    descriptionPool,
    index + 2,
  );
  const nameOptions = buildOptions(part.name, namePool.filter((value) => value !== part.name), namePool, index + 3);

  return [
    {
      idBase: `part-area-${part.id}`,
      category: "部位",
      question: `「${part.name}」が属するエリアはどこ？`,
      options: areaOptions,
      answerIndex: areaAnswerIndexes[0] ?? answerIndexOf(areaOptions, part.area),
      acceptedAnswerIndexes: areaAnswerIndexes,
      explanation:
        part.id === "akami"
          ? "赤身は背側中心ですが、切り分けによって腹側の赤身もあるため、この問題では腹部 / 背部の両方を正解扱いにしています。"
          : `${part.name} は ${part.area} の部位です。`,
    },
    {
      idBase: `part-rarity-${part.id}`,
      category: "部位",
      question: `「${part.name}」のレア度はいくつ？`,
      options: rarityOptions,
      answerIndex: answerIndexOf(rarityOptions, String(part.rarity)),
      explanation: `${part.name} のレア度は ${part.rarity} です。`,
    },
    {
      idBase: `part-description-${part.id}`,
      category: "部位",
      question: `「${part.name}」の説明として正しいものはどれ？`,
      options: descriptionOptions,
      answerIndex: answerIndexOf(descriptionOptions, part.description),
      explanation: `${part.name} は「${part.description}」という部位です。`,
    },
    {
      idBase: `part-name-${part.id}`,
      category: "部位",
      question: `「${part.description}」に当てはまる部位名は？`,
      options: nameOptions,
      answerIndex: answerIndexOf(nameOptions, part.name),
      explanation: `「${part.description}」なのは ${part.name} です。`,
    },
  ];
});

const partCombinationQuestions = quizParts.flatMap<QuizQuestionSpec>((part) => {
  const others = quizParts.filter((candidate) => candidate.id !== part.id);
  const distractorSets = combinations(others, 3);

  return distractorSets.flatMap((distractors, index) => {
    const distractorNames = distractors.map((item) => item.name);
    const distractorDescriptions = distractors.map((item) => item.description);
    const nameOptions = buildOptions(part.name, distractorNames, namePool, index);
    const descriptionOptions = buildOptions(part.description, distractorDescriptions, descriptionPool, index + 1);
    const hybridOptions = buildOptions(part.name, distractorNames, namePool, index + 2);
    const detailOptions = buildOptions(part.name, distractorNames, namePool, index + 3);

    return [
      {
        idBase: `part-combo-desc-${part.id}-${index}`,
        category: "部位",
        question: `「${part.description}」なのはどれ？`,
        options: nameOptions,
        answerIndex: answerIndexOf(nameOptions, part.name),
        explanation: `「${part.description}」なのは ${part.name} です。`,
      },
      {
        idBase: `part-combo-name-${part.id}-${index}`,
        category: "部位",
        question: `「${part.name}」の説明はどれ？`,
        options: descriptionOptions,
        answerIndex: answerIndexOf(descriptionOptions, part.description),
        explanation: `${part.name} の説明は「${part.description}」です。`,
      },
      {
        idBase: `part-combo-structured-${part.id}-${index}`,
        category: "部位",
        question: `「${part.area} / レア度${part.rarity}」に当てはまる部位はどれ？`,
        options: hybridOptions,
        answerIndex: answerIndexOf(hybridOptions, part.name),
        explanation: `${part.name} は ${part.area} でレア度 ${part.rarity} の部位です。`,
      },
      {
        idBase: `part-combo-detail-${part.id}-${index}`,
        category: "部位",
        question: `「${part.area} で ${part.description}」に当てはまる部位はどれ？`,
        options: detailOptions,
        answerIndex: answerIndexOf(detailOptions, part.name),
        explanation: `${part.name} は ${part.area} で「${part.description}」の部位です。`,
      },
    ];
  });
});

const menuQuestions = seededMenuItems.flatMap<QuizQuestionSpec>((menuItem, index) => {
  const priceOptions = buildOptions(`${menuItem.price}円`, pricePool, pricePool, index);
  const orderOptions = buildOptions(`${menuItem.sort_order}番目`, menuSortPool, menuSortPool, index + 1);
  const kindAnswer = "丼";
  const kindOptions = buildOptions(
    kindAnswer,
    ["丼", "ドリンク", "限定メニュー", "セット"],
    ["丼", "ドリンク", "限定メニュー", "セット"],
    index + 2,
  );

  return [
    {
      idBase: `menu-price-${menuItem.id}`,
      category: "メニュー",
      question: `「${menuItem.name}」の価格は？`,
      options: priceOptions,
      answerIndex: answerIndexOf(priceOptions, `${menuItem.price}円`),
      explanation: `${menuItem.name} は ${menuItem.price}円です。`,
    },
    {
      idBase: `menu-order-${menuItem.id}`,
      category: "メニュー",
      question: `メニュー一覧で「${menuItem.name}」は上から何番目？`,
      options: orderOptions,
      answerIndex: answerIndexOf(orderOptions, `${menuItem.sort_order}番目`),
      explanation: `${menuItem.name} は一覧の上から ${menuItem.sort_order}番目です。`,
    },
    {
      idBase: `menu-kind-${menuItem.id}`,
      category: "メニュー",
      question: `「${menuItem.name}」はどの分類？`,
      options: kindOptions,
      answerIndex: answerIndexOf(kindOptions, kindAnswer),
      explanation: `${menuItem.name} は ${kindAnswer} に当たります。`,
    },
  ];
});

const titleQuestions = TITLES.flatMap<QuizQuestionSpec>((title, index) => {
  const visitOptions = buildOptions(`${title.requiredVisits}回`, visitPool, visitPool, index);
  const requiredPartsLabel = `${title.requiredCollectedParts}種`;
  const partsOptions = buildOptions(requiredPartsLabel, partRequirementPool, partRequirementPool, index + 1);
  const quizCorrectOptions = buildOptions(`${title.requiredQuizCorrect}問`, quizCorrectPool, quizCorrectPool, index + 2);
  const titleOptions = buildOptions(title.name, titlePool, titlePool, index + 3);

  return [
    {
      idBase: `title-threshold-${title.id}`,
      category: "称号",
      question: `称号「${title.name}」は来店何回で解放候補になる？`,
      options: visitOptions,
      answerIndex: answerIndexOf(visitOptions, `${title.requiredVisits}回`),
      explanation: `${title.name} は来店 ${title.requiredVisits}回 が必要です。`,
    },
    {
      idBase: `title-parts-${title.id}`,
      category: "称号",
      question: `称号「${title.name}」に必要な部位条件は？`,
      options: partsOptions,
      answerIndex: answerIndexOf(partsOptions, requiredPartsLabel),
      explanation: `${title.name} には部位 ${requiredPartsLabel} の条件があります。`,
    },
    {
      idBase: `title-quiz-${title.id}`,
      category: "称号",
      question: `称号「${title.name}」に必要な累計クイズ正解数は？`,
      options: quizCorrectOptions,
      answerIndex: answerIndexOf(quizCorrectOptions, `${title.requiredQuizCorrect}問`),
      explanation: `${title.name} には累計 ${title.requiredQuizCorrect}問の正解が必要です。`,
    },
    {
      idBase: `title-name-${title.id}`,
      category: "称号",
      question: `来店 ${title.requiredVisits}回・部位 ${requiredPartsLabel}・累計 ${title.requiredQuizCorrect}問正解で狙える称号はどれ？`,
      options: titleOptions,
      answerIndex: answerIndexOf(titleOptions, title.name),
      explanation: `来店 ${title.requiredVisits}回・部位 ${requiredPartsLabel}・累計 ${title.requiredQuizCorrect}問正解で狙えるのは ${title.name} です。`,
    },
  ];
});

const storeQuestions: QuizQuestionSpec[] = [
  {
    idBase: "store-facility",
    category: "お店",
    question: "海鮮丼まぐろ丸はどこに入っている？",
    options: ["HUB KITCHEN内", "単独路面店", "百貨店の地下", "駅ナカ"],
    answerIndex: 0,
    explanation: "海鮮丼まぐろ丸は HUB KITCHEN 内の店舗です。",
  },
  {
    idBase: "store-address",
    category: "お店",
    question: "店舗があるエリアはどこ？",
    options: ["大阪・本町", "大阪・梅田", "神戸・三宮", "京都・河原町"],
    answerIndex: 0,
    explanation: "店舗は大阪・本町にあります。",
  },
  {
    idBase: "store-exit",
    category: "お店",
    question: "最寄りの案内として正しいのはどれ？",
    options: ["本町駅12番出口から徒歩1-2分", "梅田駅から徒歩10分", "難波駅から徒歩15分", "新大阪駅直結"],
    answerIndex: 0,
    explanation: "本町駅12番出口から徒歩1-2分です。",
  },
  {
    idBase: "store-hours",
    category: "お店",
    question: "営業時間の案内として正しいものは？",
    options: ["10:00〜24:00（売り切れ次第終了）", "7:00〜15:00", "11:30〜14:00のみ", "24時間営業"],
    answerIndex: 0,
    explanation: "営業時間は 10:00〜24:00、売り切れ次第終了です。",
  },
  {
    idBase: "store-instagram",
    category: "お店",
    question: "仕様書に記載されている Instagram ID は？",
    options: [STORE_INFO.instagram, "@honmachi_maguro", "@hubkitchen_maguro", "@maguro_don_osaka"],
    answerIndex: 0,
    explanation: `Instagram ID は ${STORE_INFO.instagram} です。`,
  },
  {
    idBase: "store-name",
    category: "お店",
    question: "アプリの対象店舗名はどれ？",
    options: [STORE_INFO.name, "まぐろ市場 本町店", "海鮮丼ほんまぐろ", "本町まぐろ食堂"],
    answerIndex: 0,
    explanation: `対象店舗は ${STORE_INFO.name} です。`,
  },
];

const appQuestions: QuizQuestionSpec[] = [
  {
    idBase: "app-auth",
    category: "アプリ",
    question: "このアプリは最初にどの方式で使い始める？",
    options: ["匿名認証", "メール必須", "電話番号認証", "会員コード入力"],
    answerIndex: 0,
    explanation: "最初は匿名認証で即利用開始できます。",
  },
  {
    idBase: "app-weather",
    category: "アプリ",
    question: "ホーム画面の天気取得に使うAPIは？",
    options: ["Open-Meteo", "OpenWeather 有料版", "Yahoo!天気 RSS", "Google Weather API"],
    answerIndex: 0,
    explanation: "仕様では Open-Meteo を使います。",
  },
  {
    idBase: "app-photo",
    category: "アプリ",
    question: "丼の写真はどこに保存される？",
    options: ["Supabase Storage", "localStorage", "IndexedDBだけ", "Google Drive"],
    answerIndex: 0,
    explanation: "写真は Supabase Storage の `don-photos` に保存します。",
  },
  {
    idBase: "app-record",
    category: "アプリ",
    question: "記録で必須なのはどれ？",
    options: ["メニュー選択", "写真アップロード", "部位入力", "メモ入力"],
    answerIndex: 0,
    explanation: "現仕様ではメニュー選択が必須で、写真・部位・メモは任意です。",
  },
  {
    idBase: "app-home-purpose",
    category: "アプリ",
    question: "ホーム画面の主目的として仕様に含まれるのはどれ？",
    options: ["今日行く理由を作る", "ランキングを競う", "クーポンを配る", "通販注文する"],
    answerIndex: 0,
    explanation: "ホーム画面は「今日行く理由を作る」ための画面です。",
  },
  {
    idBase: "app-zukan",
    category: "アプリ",
    question: "図鑑画面で採用している方式はどれ？",
    options: ["2カラムの部位カード一覧", "3Dまぐろモデル", "動画図鑑", "ARスキャン"],
    answerIndex: 0,
    explanation: "現仕様の図鑑は 2 カラムの部位カード一覧です。",
  },
];

const partTruthStatements: Statement[] = [];
const partLieStatements: Statement[] = [];
for (const part of quizParts) {
  partTruthStatements.push(
    {
      id: `part-area-true-${part.id}`,
      category: "部位",
      subject: part.name,
      text: `${part.name} は ${part.area} の部位です。`,
      explanation: `${part.name} は ${part.area} の部位です。`,
    },
    {
      id: `part-rarity-true-${part.id}`,
      category: "部位",
      subject: part.name,
      text: `${part.name} のレア度は ${part.rarity} です。`,
      explanation: `${part.name} のレア度は ${part.rarity} です。`,
    },
    {
      id: `part-description-true-${part.id}`,
      category: "部位",
      subject: part.name,
      text: `${part.name} は「${part.description}」と説明されます。`,
      explanation: `${part.name} は「${part.description}」と説明されます。`,
    },
    {
      id: `part-inverse-true-${part.id}`,
      category: "部位",
      subject: part.name,
      text: `「${part.description}」に当てはまる部位は ${part.name} です。`,
      explanation: `「${part.description}」に当てはまる部位は ${part.name} です。`,
    },
  );

  for (const area of areaPool.filter((value) => value !== part.area)) {
    partLieStatements.push({
      id: `part-area-false-${part.id}-${area}`,
      category: "部位",
      subject: part.name,
      text: `${part.name} は ${area} の部位です。`,
      explanation: `${part.name} は ${part.area} の部位です。`,
    });
  }

  for (const rarity of rarityPool.filter((value) => value !== String(part.rarity))) {
    partLieStatements.push({
      id: `part-rarity-false-${part.id}-${rarity}`,
      category: "部位",
      subject: part.name,
      text: `${part.name} のレア度は ${rarity} です。`,
      explanation: `${part.name} のレア度は ${part.rarity} です。`,
    });
  }

  for (const other of quizParts.filter((candidate) => candidate.id !== part.id)) {
    partLieStatements.push(
      {
        id: `part-description-false-${part.id}-${other.id}`,
        category: "部位",
        subject: part.name,
        text: `${part.name} は「${other.description}」と説明されます。`,
        explanation: `${part.name} は「${part.description}」と説明されます。`,
      },
      {
        id: `part-inverse-false-${part.id}-${other.id}`,
        category: "部位",
        subject: part.name,
        text: `「${part.description}」に当てはまる部位は ${other.name} です。`,
        explanation: `「${part.description}」に当てはまる部位は ${part.name} です。`,
      },
    );
  }
}

const menuTruthStatements: Statement[] = [];
const menuLieStatements: Statement[] = [];
for (const menuItem of seededMenuItems) {
  const defaultPartIds = getDefaultPartIdsForMenuItem(menuItem.id);
  const isMini = menuItem.id.includes("mini");

  menuTruthStatements.push(
    {
      id: `menu-price-true-${menuItem.id}`,
      category: "メニュー",
      subject: menuItem.name,
      text: `${menuItem.name} は ${menuItem.price}円です。`,
      explanation: `${menuItem.name} は ${menuItem.price}円です。`,
    },
    {
      id: `menu-order-true-${menuItem.id}`,
      category: "メニュー",
      subject: menuItem.name,
      text: `${menuItem.name} はメニュー一覧の ${menuItem.sort_order} 番目です。`,
      explanation: `${menuItem.name} はメニュー一覧の ${menuItem.sort_order} 番目です。`,
    },
    {
      id: `menu-kind-true-${menuItem.id}`,
      category: "メニュー",
      subject: menuItem.name,
      text: `${menuItem.name} は丼メニューです。`,
      explanation: `${menuItem.name} は丼メニューです。`,
    },
    {
      id: `menu-size-true-${menuItem.id}`,
      category: "メニュー",
      subject: menuItem.name,
      text: `${menuItem.name} は${isMini ? "ミニサイズ" : "通常サイズ"}です。`,
      explanation: `${menuItem.name} は${isMini ? "ミニサイズ" : "通常サイズ"}です。`,
    },
  );

  for (const price of pricePool.filter((value) => value !== `${menuItem.price}円`)) {
    menuLieStatements.push({
      id: `menu-price-false-${menuItem.id}-${price}`,
      category: "メニュー",
      subject: menuItem.name,
      text: `${menuItem.name} は ${price}です。`,
      explanation: `${menuItem.name} は ${menuItem.price}円です。`,
    });
  }

  for (const order of menuSortPool.filter((value) => value !== `${menuItem.sort_order}番目`)) {
    menuLieStatements.push({
      id: `menu-order-false-${menuItem.id}-${order}`,
      category: "メニュー",
      subject: menuItem.name,
      text: `${menuItem.name} はメニュー一覧の ${order}です。`,
      explanation: `${menuItem.name} はメニュー一覧の ${menuItem.sort_order} 番目です。`,
    });
  }

  menuLieStatements.push({
    id: `menu-size-false-${menuItem.id}`,
    category: "メニュー",
    subject: menuItem.name,
    text: `${menuItem.name} は${isMini ? "通常サイズ" : "ミニサイズ"}です。`,
    explanation: `${menuItem.name} は${isMini ? "ミニサイズ" : "通常サイズ"}です。`,
  });

  for (const part of quizParts) {
    const containsPart = defaultPartIds.includes(part.id);
    const truthTarget = containsPart ? menuTruthStatements : menuLieStatements;
    truthTarget.push({
      id: `menu-part-${containsPart ? "true" : "false"}-${menuItem.id}-${part.id}`,
      category: "メニュー",
      subject: menuItem.name,
      text: `${menuItem.name} の標準部位には ${part.name} が${containsPart ? "含まれます" : "含まれません"}。`,
      explanation: `${menuItem.name} の標準部位には ${containsPart ? `${part.name} が含まれます` : `${part.name} は含まれません`}。`,
    });
  }
}

const titleTruthStatements: Statement[] = [];
const titleLieStatements: Statement[] = [];
for (const title of TITLES) {
  titleTruthStatements.push(
    {
      id: `title-visit-true-${title.id}`,
      category: "称号",
      subject: title.name,
      text: `${title.name} は来店 ${title.requiredVisits} 回が解放条件です。`,
      explanation: `${title.name} は来店 ${title.requiredVisits} 回が必要です。`,
    },
    {
      id: `title-parts-true-${title.id}`,
      category: "称号",
      subject: title.name,
      text: `${title.name} は部位 ${title.requiredCollectedParts} 種が条件です。`,
      explanation: `${title.name} は部位 ${title.requiredCollectedParts} 種が条件です。`,
    },
    {
      id: `title-quiz-true-${title.id}`,
      category: "称号",
      subject: title.name,
      text: `${title.name} は累計 ${title.requiredQuizCorrect} 問正解が条件です。`,
      explanation: `${title.name} は累計 ${title.requiredQuizCorrect} 問正解が条件です。`,
    },
  );

  for (const other of TITLES.filter((candidate) => candidate.id !== title.id)) {
    titleLieStatements.push(
      {
        id: `title-visit-false-${title.id}-${other.id}`,
        category: "称号",
        subject: title.name,
        text: `${title.name} は来店 ${other.requiredVisits} 回が解放条件です。`,
        explanation: `${title.name} は来店 ${title.requiredVisits} 回が必要です。`,
      },
      {
        id: `title-parts-false-${title.id}-${other.id}`,
        category: "称号",
        subject: title.name,
        text: `${title.name} は部位 ${other.requiredCollectedParts} 種が条件です。`,
        explanation: `${title.name} は部位 ${title.requiredCollectedParts} 種が条件です。`,
      },
      {
        id: `title-quiz-false-${title.id}-${other.id}`,
        category: "称号",
        subject: title.name,
        text: `${title.name} は累計 ${other.requiredQuizCorrect} 問正解が条件です。`,
        explanation: `${title.name} は累計 ${title.requiredQuizCorrect} 問正解が条件です。`,
      },
    );
  }
}

const storeTruthStatements: Statement[] = [
  {
    id: "store-truth-1",
    category: "お店",
    subject: "店舗情報",
    text: `${STORE_INFO.name} は HUB KITCHEN 内にあります。`,
    explanation: `${STORE_INFO.name} は HUB KITCHEN 内にあります。`,
  },
  {
    id: "store-truth-2",
    category: "お店",
    subject: "店舗情報",
    text: `${STORE_INFO.name} は大阪・本町の店舗です。`,
    explanation: `${STORE_INFO.name} は大阪・本町の店舗です。`,
  },
  {
    id: "store-truth-3",
    category: "お店",
    subject: "アクセス",
    text: `${STORE_INFO.name} は本町駅12番出口から徒歩1-2分です。`,
    explanation: `${STORE_INFO.name} は本町駅12番出口から徒歩1-2分です。`,
  },
  {
    id: "store-truth-4",
    category: "お店",
    subject: "営業時間",
    text: `${STORE_INFO.name} の営業時間案内は ${STORE_INFO.hours} です。`,
    explanation: `${STORE_INFO.name} の営業時間案内は ${STORE_INFO.hours} です。`,
  },
  {
    id: "store-truth-5",
    category: "お店",
    subject: "SNS",
    text: `店舗 Instagram は ${STORE_INFO.instagram} です。`,
    explanation: `店舗 Instagram は ${STORE_INFO.instagram} です。`,
  },
  {
    id: "store-truth-6",
    category: "お店",
    subject: "住所",
    text: `店舗住所は ${STORE_INFO.address} です。`,
    explanation: `店舗住所は ${STORE_INFO.address} です。`,
  },
  {
    id: "store-truth-7",
    category: "お店",
    subject: "建物",
    text: `${STORE_INFO.name} はヒグチビル 1F にあります。`,
    explanation: `${STORE_INFO.name} はヒグチビル 1F にあります。`,
  },
  {
    id: "store-truth-8",
    category: "お店",
    subject: "営業時間",
    text: `${STORE_INFO.name} は売り切れ次第で営業終了します。`,
    explanation: `${STORE_INFO.name} は売り切れ次第で営業終了します。`,
  },
  {
    id: "store-truth-9",
    category: "お店",
    subject: "アクセス",
    text: `最寄り案内では本町駅12番出口が使われています。`,
    explanation: `最寄り案内では本町駅12番出口が使われています。`,
  },
  {
    id: "store-truth-10",
    category: "お店",
    subject: "施設",
    text: `${STORE_INFO.name} は HUB KITCHEN の店舗として案内されています。`,
    explanation: `${STORE_INFO.name} は HUB KITCHEN の店舗として案内されています。`,
  },
];

const storeLieStatements: Statement[] = [
  {
    id: "store-false-1",
    category: "お店",
    subject: "店舗情報",
    text: `${STORE_INFO.name} は梅田駅直結です。`,
    explanation: `${STORE_INFO.name} は大阪・本町の店舗です。`,
  },
  {
    id: "store-false-2",
    category: "お店",
    subject: "店舗情報",
    text: `${STORE_INFO.name} は百貨店の地下にあります。`,
    explanation: `${STORE_INFO.name} は HUB KITCHEN 内にあります。`,
  },
  {
    id: "store-false-3",
    category: "お店",
    subject: "アクセス",
    text: `${STORE_INFO.name} は難波駅から徒歩15分です。`,
    explanation: `${STORE_INFO.name} は本町駅12番出口から徒歩1-2分です。`,
  },
  {
    id: "store-false-4",
    category: "お店",
    subject: "営業時間",
    text: `${STORE_INFO.name} は24時間営業です。`,
    explanation: `${STORE_INFO.name} の営業時間案内は ${STORE_INFO.hours} です。`,
  },
  {
    id: "store-false-5",
    category: "お店",
    subject: "SNS",
    text: `店舗 Instagram は @honmachi_maguro です。`,
    explanation: `店舗 Instagram は ${STORE_INFO.instagram} です。`,
  },
  {
    id: "store-false-6",
    category: "お店",
    subject: "住所",
    text: `店舗住所は大阪府大阪市北区梅田 1-1-1 です。`,
    explanation: `店舗住所は ${STORE_INFO.address} です。`,
  },
  {
    id: "store-false-7",
    category: "お店",
    subject: "建物",
    text: `${STORE_INFO.name} はヒグチビル 3F にあります。`,
    explanation: `${STORE_INFO.name} はヒグチビル 1F にあります。`,
  },
  {
    id: "store-false-8",
    category: "お店",
    subject: "営業時間",
    text: `${STORE_INFO.name} は売り切れても24時まで必ず営業します。`,
    explanation: `${STORE_INFO.name} は売り切れ次第で営業終了します。`,
  },
  {
    id: "store-false-9",
    category: "お店",
    subject: "アクセス",
    text: `最寄り案内では本町駅3番出口が使われています。`,
    explanation: `最寄り案内では本町駅12番出口が使われています。`,
  },
  {
    id: "store-false-10",
    category: "お店",
    subject: "施設",
    text: `${STORE_INFO.name} は駅ナカ店舗として案内されています。`,
    explanation: `${STORE_INFO.name} は HUB KITCHEN の店舗として案内されています。`,
  },
];

const appTruthStatements: Statement[] = [
  {
    id: "app-truth-1",
    category: "アプリ",
    subject: "認証",
    text: "このアプリは最初は匿名認証で使い始めます。",
    explanation: "このアプリは最初は匿名認証で使い始めます。",
  },
  {
    id: "app-truth-2",
    category: "アプリ",
    subject: "天気",
    text: "ホーム画面の天気取得には Open-Meteo を使います。",
    explanation: "ホーム画面の天気取得には Open-Meteo を使います。",
  },
  {
    id: "app-truth-3",
    category: "アプリ",
    subject: "保存先",
    text: "丼の写真は Supabase Storage に保存します。",
    explanation: "丼の写真は Supabase Storage に保存します。",
  },
  {
    id: "app-truth-4",
    category: "アプリ",
    subject: "記録",
    text: "記録で必須なのはメニュー選択です。",
    explanation: "記録で必須なのはメニュー選択です。",
  },
  {
    id: "app-truth-5",
    category: "アプリ",
    subject: "シェア",
    text: "記録やクイズ結果をシェアすると 1.2 倍ボーナスが入ります。",
    explanation: "記録やクイズ結果をシェアすると 1.2 倍ボーナスが入ります。",
  },
  {
    id: "app-truth-6",
    category: "アプリ",
    subject: "採点",
    text: "クイズはサーバー発行セッションで採点します。",
    explanation: "クイズはサーバー発行セッションで採点します。",
  },
  {
    id: "app-truth-7",
    category: "アプリ",
    subject: "引き継ぎ",
    text: "記録を引き継ぐには Google 連携またはメール登録を使えます。",
    explanation: "記録を引き継ぐには Google 連携またはメール登録を使えます。",
  },
  {
    id: "app-truth-8",
    category: "アプリ",
    subject: "図鑑",
    text: "部位マップはタップで部位の詳細を表示できます。",
    explanation: "部位マップはタップで部位の詳細を表示できます。",
  },
  {
    id: "app-truth-9",
    category: "アプリ",
    subject: "ホーム",
    text: "ホームでは本日の入荷状況を確認できます。",
    explanation: "ホームでは本日の入荷状況を確認できます。",
  },
  {
    id: "app-truth-10",
    category: "アプリ",
    subject: "在庫管理",
    text: "入荷状況は available / few / soldout で管理します。",
    explanation: "入荷状況は available / few / soldout で管理します。",
  },
];

const appLieStatements: Statement[] = [
  {
    id: "app-false-1",
    category: "アプリ",
    subject: "認証",
    text: "このアプリは最初にメール登録が必須です。",
    explanation: "このアプリは最初は匿名認証で使い始めます。",
  },
  {
    id: "app-false-2",
    category: "アプリ",
    subject: "天気",
    text: "ホーム画面の天気取得には Google Weather API を使います。",
    explanation: "ホーム画面の天気取得には Open-Meteo を使います。",
  },
  {
    id: "app-false-3",
    category: "アプリ",
    subject: "保存先",
    text: "丼の写真は localStorage のみに保存します。",
    explanation: "丼の写真は Supabase Storage に保存します。",
  },
  {
    id: "app-false-4",
    category: "アプリ",
    subject: "記録",
    text: "記録では写真アップロードが必須です。",
    explanation: "記録で必須なのはメニュー選択です。",
  },
  {
    id: "app-false-5",
    category: "アプリ",
    subject: "シェア",
    text: "シェアボーナスは同じ結果に何度でも積み上がります。",
    explanation: "シェアボーナスは 1 対象につき 1 回までです。",
  },
  {
    id: "app-false-6",
    category: "アプリ",
    subject: "採点",
    text: "クイズはブラウザだけで自己採点します。",
    explanation: "クイズはサーバー発行セッションで採点します。",
  },
  {
    id: "app-false-7",
    category: "アプリ",
    subject: "引き継ぎ",
    text: "記録の引き継ぎには電話認証しか使えません。",
    explanation: "記録を引き継ぐには Google 連携またはメール登録を使えます。",
  },
  {
    id: "app-false-8",
    category: "アプリ",
    subject: "図鑑",
    text: "部位マップは画像だけで、タップしても詳細は出ません。",
    explanation: "部位マップはタップで部位の詳細を表示できます。",
  },
  {
    id: "app-false-9",
    category: "アプリ",
    subject: "ホーム",
    text: "ホームではランキングだけが表示されます。",
    explanation: "ホームでは本日の入荷状況を確認できます。",
  },
  {
    id: "app-false-10",
    category: "アプリ",
    subject: "在庫管理",
    text: "入荷状況は open / closed の 2 値だけで管理します。",
    explanation: "入荷状況は available / few / soldout で管理します。",
  },
];

const mixedTruthStatements = [
  ...partTruthStatements,
  ...menuTruthStatements,
  ...titleTruthStatements,
  ...storeTruthStatements,
  ...appTruthStatements,
];
const mixedLieStatements = [
  ...partLieStatements,
  ...menuLieStatements,
  ...titleLieStatements,
  ...storeLieStatements,
  ...appLieStatements,
];

const tier1QuestionBank = dedupeQuestionSpecs([
  ...partFactQuestions,
  ...menuQuestions,
  ...buildSingleTruthStatementQuestions("tier1-part", partTruthStatements, partLieStatements, 220),
  ...buildSingleTruthStatementQuestions("tier1-menu", menuTruthStatements, menuLieStatements, 140),
  ...buildSingleTruthStatementQuestions("tier1-title", titleTruthStatements, titleLieStatements, 80),
]);

const tier2QuestionBank = dedupeQuestionSpecs([
  ...partCombinationQuestions,
  ...buildMultiTruthStatementQuestions("tier2-part", partTruthStatements, partLieStatements, 2, 160, "部位"),
  ...buildMultiTruthStatementQuestions("tier2-menu", menuTruthStatements, menuLieStatements, 2, 120, "メニュー"),
]);

const tier3QuestionBank = dedupeQuestionSpecs([
  ...titleQuestions,
  ...buildSingleTruthStatementQuestions("tier3-title", titleTruthStatements, titleLieStatements, 160),
  ...buildMultiTruthStatementQuestions("tier3-title", titleTruthStatements, titleLieStatements, 2, 160, "称号"),
  ...buildMultiTruthStatementQuestions("tier3-mixed", [...partTruthStatements, ...menuTruthStatements], [...partLieStatements, ...menuLieStatements], 2, 100, "称号"),
]);

const tier4QuestionBank = dedupeQuestionSpecs([
  ...storeQuestions,
  ...appQuestions,
  ...buildSingleTruthStatementQuestions("tier4-store", storeTruthStatements, storeLieStatements, 120),
  ...buildMultiTruthStatementQuestions("tier4-store", storeTruthStatements, storeLieStatements, 2, 120, "お店"),
  ...buildSingleTruthStatementQuestions("tier4-app", appTruthStatements, appLieStatements, 120),
  ...buildMultiTruthStatementQuestions("tier4-app", appTruthStatements, appLieStatements, 2, 120, "アプリ"),
  ...buildMultiTruthStatementQuestions(
    "tier4-mixed",
    [...storeTruthStatements, ...appTruthStatements],
    [...storeLieStatements, ...appLieStatements],
    2,
    200,
    "お店",
  ),
]);

const tier5QuestionBank = dedupeQuestionSpecs([
  ...buildMultiTruthStatementQuestions("tier5-mixed-2", mixedTruthStatements, mixedLieStatements, 2, 220, "アプリ"),
  ...buildMultiTruthStatementQuestions("tier5-mixed-3", mixedTruthStatements, mixedLieStatements, 3, 220, "アプリ"),
  ...buildSingleTruthStatementQuestions("tier5-mixed-single", mixedTruthStatements, mixedLieStatements, 80),
]);

const tierQuestionBanks: Record<QuizTier, QuizQuestionSpec[]> = {
  1: tier1QuestionBank,
  2: tier2QuestionBank,
  3: tier3QuestionBank,
  4: tier4QuestionBank,
  5: tier5QuestionBank,
};

function getTierForStage(stageNumber: number): QuizTier {
  return Math.min(QUIZ_TIER_COUNT, Math.floor((stageNumber - 1) / quizStagesPerTier) + 1) as QuizTier;
}

function buildStageQuestionBanks() {
  const banks = new Map<number, QuizQuestion[]>();
  const minimumBankSize = quizStagesPerTier * QUIZ_STAGE_CANDIDATE_COUNT;

  for (let tier = 1 as QuizTier; tier <= QUIZ_TIER_COUNT; tier = (tier + 1) as QuizTier) {
    if ((tierQuestionBanks[tier] ?? []).length < minimumBankSize) {
      throw new Error(`Quiz tier ${tier} does not contain enough questions.`);
    }
  }

  for (let stageNumber = 1; stageNumber <= quizStageCount; stageNumber += 1) {
    const tier = getTierForStage(stageNumber);
    const bank = tierQuestionBanks[tier];
    const stageOffset = ((stageNumber - 1) % quizStagesPerTier) * QUIZ_STAGE_CANDIDATE_COUNT;
    const stageSpecs = bank.slice(stageOffset, stageOffset + QUIZ_STAGE_CANDIDATE_COUNT);

    banks.set(
      stageNumber,
      stageSpecs.map((question, index) => ({
        id: `s${String(stageNumber).padStart(3, "0")}-${question.idBase}-${index + 1}`,
        stageNumber,
        category: question.category,
        question: question.question,
        options: question.options,
        answerIndex: question.answerIndex,
        acceptedAnswerIndexes: question.acceptedAnswerIndexes,
        explanation: question.explanation,
      })),
    );
  }

  return banks;
}

const STAGE_QUESTION_BANKS = buildStageQuestionBanks();

export const QUIZ_QUESTIONS: QuizQuestion[] = Array.from(STAGE_QUESTION_BANKS.values()).flat();
export const QUIZ_SESSION_SIZE = quizQuestionsPerStage;
export const QUIZ_STAGE_NUMBERS = Array.from({ length: quizStageCount }, (_, index) => index + 1);
export const QUIZ_CATEGORIES = ["部位", "メニュー", "称号", "お店", "アプリ"] as const;

const quizSessionCache = new Map<string, QuizQuestion[]>();
const questionMap = new Map(QUIZ_QUESTIONS.map((question) => [question.id, question]));

function createSelectedIndexes(length: number, count: number, random: () => number) {
  const indexes = Array.from({ length }, (_, index) => index);
  const selectedCount = Math.min(count, length);

  for (let index = 0; index < selectedCount; index += 1) {
    const swapIndex = index + Math.floor(random() * (length - index));
    [indexes[index], indexes[swapIndex]] = [indexes[swapIndex], indexes[index]];
  }

  return indexes.slice(0, selectedCount);
}

function normalizeExcludedQuestionIds(excludedQuestionIds: string[]) {
  return [...new Set(excludedQuestionIds)].sort();
}

function createQuizSessionFromPool(pool: QuizQuestion[], random: () => number) {
  const selectedQuestions: QuizQuestion[] = [];
  const selectedIds = new Set<string>();
  const selectedSignatures = new Set<string>();

  for (const index of createSelectedIndexes(pool.length, pool.length, random)) {
    const question = pool[index];
    const signature = `${question.question}::${question.options.join("|")}`;
    if (selectedSignatures.has(signature)) {
      continue;
    }
    selectedQuestions.push(question);
    selectedIds.add(question.id);
    selectedSignatures.add(signature);
    if (selectedQuestions.length >= quizQuestionsPerStage) {
      return selectedQuestions;
    }
  }

  for (const index of createSelectedIndexes(pool.length, pool.length, random)) {
    const question = pool[index];
    if (selectedIds.has(question.id)) {
      continue;
    }
    selectedQuestions.push(question);
    selectedIds.add(question.id);
    if (selectedQuestions.length >= quizQuestionsPerStage) {
      return selectedQuestions;
    }
  }

  return selectedQuestions;
}

export function getStageNumberFromQuestionId(questionId: string) {
  const match = /^s(\d{3})-/.exec(questionId);
  if (!match) {
    return null;
  }

  const parsed = Number(match[1]);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > quizStageCount) {
    return null;
  }

  return parsed;
}

function getQuizQuestionsForStage(stageNumber: number) {
  return [...(STAGE_QUESTION_BANKS.get(stageNumber) ?? [])];
}

export function createQuizSession(stageNumber = 1, seed = 1, excludedQuestionIds: string[] = []) {
  const normalizedExcludedQuestionIds = normalizeExcludedQuestionIds(excludedQuestionIds);
  const cacheKey = `${stageNumber}:${seed}:${normalizedExcludedQuestionIds.join(",")}`;
  const cached = quizSessionCache.get(cacheKey);
  if (cached) {
    return [...cached];
  }

  const random = seededRandom(seed);
  const excludedQuestionIdSet = new Set(normalizedExcludedQuestionIds);
  const stagePool = getQuizQuestionsForStage(stageNumber);
  const preferredPool = stagePool.filter((question) => !excludedQuestionIdSet.has(question.id));
  const pool = preferredPool.length >= quizQuestionsPerStage ? preferredPool : stagePool;
  const session = createQuizSessionFromPool(pool, random);
  quizSessionCache.set(cacheKey, session);
  return [...session];
}

export function toPublicQuizQuestion(question: QuizQuestion): PublicQuizQuestion {
  return {
    id: question.id,
    category: question.category,
    question: question.question,
    options: question.options,
  };
}

export function toPublicQuizSession(questions: QuizQuestion[]) {
  return questions.map(toPublicQuizQuestion);
}

export function scoreQuizAnswers(questionIds: string[], answers: number[][]) {
  if (questionIds.length !== answers.length) {
    throw new Error("Answer count mismatch.");
  }

  return questionIds.map((questionId, index) => {
    const question = questionMap.get(questionId);
    if (!question) {
      throw new Error(`Unknown quiz question: ${questionId}`);
    }

    const selectedIndexes = [...answers[index]].sort((left, right) => left - right);
    const correctIndexes = [...(question.acceptedAnswerIndexes ?? [question.answerIndex])].sort(
      (left, right) => left - right,
    );
    const correct =
      selectedIndexes.length === correctIndexes.length &&
      selectedIndexes.every((value, answerIndex) => value === correctIndexes[answerIndex]);

    return {
      question: toPublicQuizQuestion(question),
      selectedIndexes,
      correct,
      correctIndex: question.answerIndex,
      correctIndexes,
      explanation: question.explanation,
    };
  });
}
