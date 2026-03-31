-- 大とろ: 中とろより白っぽい薄ピンク / 中とろ: 赤身(#cc3333)と大とろの中間の赤み（冪等）
-- ※ 202603311400 の直後の DB もここで最終調整に揃える
update public.parts set color = '#fff5f6' where id = 'otoro';
update public.parts set color = '#b94848' where id = 'chutoro';
update public.parts set color = '#b94848' where id = 'senaka';
