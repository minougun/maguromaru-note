import assert from "node:assert/strict";
import test from "node:test";

import { QUIZ_QUESTIONS, QUIZ_SESSION_SIZE, createQuizSession, scoreQuizAnswers, toPublicQuizSession } from "@/lib/quiz";

test("quiz pool contains at least 1000 stage-specific questions", () => {
  assert.ok(QUIZ_QUESTIONS.length >= 1000);
});

test("quiz questions have valid 4-choice structure", () => {
  for (const question of QUIZ_QUESTIONS) {
    assert.equal(question.options.length, 4);
    assert.ok(question.answerIndex >= 0 && question.answerIndex < 4);
    assert.equal(new Set(question.options).size, 4);
    assert.ok(question.options[question.answerIndex]);
  }
});

test("createQuizSession respects requested count", () => {
  const session = createQuizSession(100, 7);
  assert.equal(session.length, QUIZ_SESSION_SIZE);
});

test("createQuizSession uses stage-specific question pools", () => {
  const stage1 = createQuizSession(1, 7);
  const stage20 = createQuizSession(20, 7);
  const stage60 = createQuizSession(60, 7);
  const stage100 = createQuizSession(100, 7);

  assert.equal(stage1.every((question) => question.stageNumber === 1), true);
  assert.equal(stage20.every((question) => question.stageNumber === 20), true);
  assert.equal(stage60.every((question) => question.stageNumber === 60), true);
  assert.equal(stage100.every((question) => question.stageNumber === 100), true);
});

test("createQuizSession is deterministic for the same seed and avoids duplicates", () => {
  const first = createQuizSession(33, 42);
  const second = createQuizSession(33, 42);

  assert.deepEqual(
    first.map((question) => question.id),
    second.map((question) => question.id),
  );
  assert.equal(new Set(first.map((question) => question.id)).size, first.length);
  assert.equal(new Set(first.map((question) => `${question.question}::${question.options.join("|")}`)).size, first.length);
});

test("createQuizSession avoids recently used questions when enough alternatives exist", () => {
  const previous = createQuizSession(77, 42);
  const next = createQuizSession(
    77,
    42,
    previous.slice(0, 8).map((question) => question.id),
  );

  assert.equal(
    next.some((question) => previous.slice(0, 8).some((used) => used.id === question.id)),
    false,
  );
});

test("toPublicQuizSession strips answerIndex before sending to client", () => {
  const session = toPublicQuizSession(createQuizSession(1, 3).slice(0, 1));
  assert.equal(session.length, 1);
  assert.equal("answerIndex" in session[0], false);
});

test("scoreQuizAnswers evaluates answers from question ids on the server", () => {
  const session = createQuizSession(3, 5).slice(0, 3);
  const results = scoreQuizAnswers(
    session.map((question) => question.id),
    session.map((question) => question.acceptedAnswerIndexes ?? [question.answerIndex]),
  );

  assert.equal(results.length, 3);
  assert.equal(results.every((entry) => entry.correct), true);
});

test("akami area question requires selecting both abdomen and back", () => {
  const akamiAreaQuestion = QUIZ_QUESTIONS.find((question) => question.id.includes("part-area-akami"));
  assert.ok(akamiAreaQuestion);

  const abdomenIndex = akamiAreaQuestion.options.indexOf("腹部");
  const backIndex = akamiAreaQuestion.options.indexOf("背部");

  assert.ok(abdomenIndex >= 0);
  assert.ok(backIndex >= 0);

  const combinedResult = scoreQuizAnswers([akamiAreaQuestion.id], [[abdomenIndex, backIndex]])[0];
  const abdomenOnlyResult = scoreQuizAnswers([akamiAreaQuestion.id], [[abdomenIndex]])[0];

  assert.equal(combinedResult.correct, true);
  assert.equal(abdomenOnlyResult.correct, false);
  assert.deepEqual(combinedResult.correctIndexes, [abdomenIndex, backIndex].sort((a, b) => a - b));
});
