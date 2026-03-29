-- ステージ解放用: 各提出で正解だった設問 ID を保持し、同一問題は1回だけカウントする集計に使う
alter table public.quiz_sessions
  add column if not exists correct_question_ids jsonb;

comment on column public.quiz_sessions.correct_question_ids is
  'その提出で正解だった設問IDの配列。未設定の旧行は score=全問分のときのみ当セッションの question_ids を全正解とみなす。';
