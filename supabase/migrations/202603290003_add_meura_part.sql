do $$
begin
  if not exists (select 1 from public.parts where id = 'meura') then
    update public.parts set sort_order = 9 where id = 'senaka';
    update public.parts set sort_order = 8 where id = 'haramo';
    update public.parts set sort_order = 7 where id = 'kama';

    insert into public.parts (id, name, area, rarity, description, color, sort_order)
    values ('meura', '目裏', '頭部', 3, '目の裏側にある濃厚でとろける希少部位', '#f08d7d', 6);
  else
    update public.parts set sort_order = 60 where id = 'meura';
    update public.parts set sort_order = 9 where id = 'senaka';
    update public.parts set sort_order = 8 where id = 'haramo';
    update public.parts set sort_order = 7 where id = 'kama';

    update public.parts
    set
      name = '目裏',
      area = '頭部',
      rarity = 3,
      description = '目の裏側にある濃厚でとろける希少部位',
      color = '#f08d7d',
      sort_order = 6
    where id = 'meura';
  end if;
end $$;
