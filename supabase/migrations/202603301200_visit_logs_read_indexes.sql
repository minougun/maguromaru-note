-- 来店ログ一覧・ページング（user_id + visited_at / created_at 降順）と部位 IN 検索の負荷軽減
create index if not exists visit_logs_user_visited_created_idx
  on public.visit_logs (user_id, visited_at desc, created_at desc);

create index if not exists visit_log_parts_visit_log_id_idx
  on public.visit_log_parts (visit_log_id);
