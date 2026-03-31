-- 表示スウォッチを全体に赤寄りに（部位ごとの輝度の並びは維持）
-- アプリ側 part-brand-colors.ts と揃える
update public.parts set color = '#ffe1df' where id = 'otoro';
update public.parts set color = '#e14459' where id = 'chutoro';
update public.parts set color = '#ff726f' where id = 'noten';
update public.parts set color = '#ff99a5' where id = 'meura';
update public.parts set color = '#fa3a53' where id = 'hoho';
update public.parts set color = '#ff6141' where id = 'kama';
update public.parts set color = '#ffaaa7' where id = 'haramo';
update public.parts set color = '#f66574' where id = 'senaka';
