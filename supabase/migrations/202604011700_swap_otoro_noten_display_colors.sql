-- 大トロと脳天の表示色を入れ替え（part-brand-colors.ts と一致）
update public.parts set color = '#fde8e6' where id = 'otoro';
update public.parts set color = '#ea7e7b' where id = 'noten';
