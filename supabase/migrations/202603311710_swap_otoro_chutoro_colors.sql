-- 大とろ・中とろの表示色を入れ替え（冪等）
update public.parts
set color = case id
  when 'otoro' then '#e85555'
  when 'chutoro' then '#ff6b6b'
end
where id in ('otoro', 'chutoro');
