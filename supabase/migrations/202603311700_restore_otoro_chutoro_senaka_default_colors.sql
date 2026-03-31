-- 色調整前の既定へ戻す（冪等）。311400 / 311600 適用済み環境向け
update public.parts set color = '#ff6b6b' where id = 'otoro';
update public.parts set color = '#e85555' where id = 'chutoro';
update public.parts set color = '#d35050' where id = 'senaka';
