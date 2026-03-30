-- 中とろ（chutoro）は図鑑マップ上で背・腹の両方を指すためエリア表記を統一する
update public.parts
set area = '背部・腹部'
where id = 'chutoro';
