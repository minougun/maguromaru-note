-- 部位スウォッチを「身色・脂の乗り」のイメージに基づく調色へ更新
-- アプリ側 part-brand-colors.ts と揃える
update public.parts set color = '#fff6f4' where id = 'otoro';
update public.parts set color = '#d4324d' where id = 'chutoro';
update public.parts set color = '#f0a0ad' where id = 'noten';
update public.parts set color = '#ffc0cb' where id = 'meura';
update public.parts set color = '#b4102a' where id = 'hoho';
update public.parts set color = '#e8643a' where id = 'kama';
update public.parts set color = '#ffd8d2' where id = 'haramo';
update public.parts set color = '#e07082' where id = 'senaka';
