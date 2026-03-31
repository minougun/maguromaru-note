-- 大とろ・中とろの表示色入れ替え（applyOtoroChutoroDisplayColors / part-brand-colors と一致）
-- 202603312200 は参考スウォッチとして旧割当のままのため、本 migration で揃える
update public.parts set color = '#d66078' where id = 'otoro';
update public.parts set color = '#eb7e7c' where id = 'chutoro';
