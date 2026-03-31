-- 表示スウォッチの彩度・明度を一括で上げる（部位間の輝度順は維持）
-- アプリ側 part-brand-colors.ts と揃える
update public.parts set color = '#fdf3f4' where id = 'otoro';
update public.parts set color = '#fd4253' where id = 'chutoro';
update public.parts set color = '#fa7a86' where id = 'noten';
update public.parts set color = '#f9a2a9' where id = 'meura';
update public.parts set color = '#fd2b3e' where id = 'hoho';
update public.parts set color = '#fd5a27' where id = 'kama';
update public.parts set color = '#f9c7cc' where id = 'haramo';
update public.parts set color = '#fc5564' where id = 'senaka';
