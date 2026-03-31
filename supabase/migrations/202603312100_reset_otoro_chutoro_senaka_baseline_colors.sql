-- 大とろ・中とろ・背中とろの色を初期プロダクト既定へ戻す（冪等）
update public.parts set color = '#ff6b6b' where id = 'otoro';
update public.parts set color = '#e85555' where id = 'chutoro';
update public.parts set color = '#d35050' where id = 'senaka';
