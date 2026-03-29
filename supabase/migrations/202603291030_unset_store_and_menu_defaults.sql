-- 営業状況・入荷状況の既定を「未設定」にし、初期シードの在庫行を削除する。

alter table public.store_status drop constraint if exists store_status_status_check;
alter table public.store_status add constraint store_status_status_check
  check (status in ('open', 'busy', 'closing_soon', 'closed', 'unset'));

alter table public.store_status alter column status set default 'unset';
update public.store_status set status = 'unset' where id = 1;

alter table public.menu_item_statuses drop constraint if exists menu_item_statuses_status_check;
alter table public.menu_item_statuses add constraint menu_item_statuses_status_check
  check (status in ('available', 'few', 'soldout', 'unset'));

delete from public.menu_item_statuses;
