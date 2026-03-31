-- 表示スウォッチ: 大トロと中トロの色を入れ替え（part-brand-colors.ts の PART_DISPLAY_SWATCHES と一致）
update public.parts set color = '#e87384' where id = 'otoro';
update public.parts set color = '#ffcee0' where id = 'chutoro';
