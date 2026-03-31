-- 部位マップ配色をスクリーンショット 2026-03-31 160835.png に合わせる（part-brand-colors.ts と同期）
update public.parts set color = '#ff82a5' where id = 'noten';
update public.parts set color = '#c85570' where id in ('chutoro', 'hoho', 'senaka');
update public.parts set color = '#b61c28' where id = 'akami';
update public.parts set color = '#ba4c65' where id in ('otoro', 'kama', 'haramo');
update public.parts set color = '#96a2ae' where id = 'meura';
