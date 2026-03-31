-- 大トロ・脳天・中トロの表示色を循環（大トロ←旧中トロ、中トロ←旧脳天、脳天←旧大トロ）
update public.parts set color = '#ea7e7b' where id = 'otoro';
update public.parts set color = '#b43854' where id = 'chutoro';
update public.parts set color = '#e6708a' where id = 'noten';
