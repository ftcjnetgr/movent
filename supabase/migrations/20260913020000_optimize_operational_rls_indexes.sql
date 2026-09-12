-- Movent v2.1: reduce permissive-policy overlap and add missing FK indexes.

drop policy if exists base_schedules_write_dispatch_control on public.base_schedules;
drop policy if exists base_executors_write_dispatch_control on public.base_executors;
drop policy if exists base_fleets_write_dispatch_control on public.base_fleets;
drop policy if exists base_products_write_dispatch_control on public.base_products;
drop policy if exists base_userlogin_write_dispatch_control on public.base_userlogin;

create policy base_schedules_insert_dispatch_control on public.base_schedules for insert to authenticated with check (public.is_admin_or_dispatcher());
create policy base_schedules_update_dispatch_control on public.base_schedules for update to authenticated using (public.is_admin_or_dispatcher()) with check (public.is_admin_or_dispatcher());
create policy base_schedules_delete_dispatch_control on public.base_schedules for delete to authenticated using (public.is_admin_or_dispatcher());
create policy base_executors_insert_dispatch_control on public.base_executors for insert to authenticated with check (public.is_admin_or_dispatcher());
create policy base_executors_update_dispatch_control on public.base_executors for update to authenticated using (public.is_admin_or_dispatcher()) with check (public.is_admin_or_dispatcher());
create policy base_executors_delete_dispatch_control on public.base_executors for delete to authenticated using (public.is_admin_or_dispatcher());
create policy base_fleets_insert_dispatch_control on public.base_fleets for insert to authenticated with check (public.is_admin_or_dispatcher());
create policy base_fleets_update_dispatch_control on public.base_fleets for update to authenticated using (public.is_admin_or_dispatcher()) with check (public.is_admin_or_dispatcher());
create policy base_fleets_delete_dispatch_control on public.base_fleets for delete to authenticated using (public.is_admin_or_dispatcher());
create policy base_products_insert_dispatch_control on public.base_products for insert to authenticated with check (public.is_admin_or_dispatcher());
create policy base_products_update_dispatch_control on public.base_products for update to authenticated using (public.is_admin_or_dispatcher()) with check (public.is_admin_or_dispatcher());
create policy base_products_delete_dispatch_control on public.base_products for delete to authenticated using (public.is_admin_or_dispatcher());
create policy base_userlogin_insert_dispatch_control on public.base_userlogin for insert to authenticated with check (public.is_admin_or_dispatcher());
create policy base_userlogin_update_dispatch_control on public.base_userlogin for update to authenticated using (public.is_admin_or_dispatcher()) with check (public.is_admin_or_dispatcher());
create policy base_userlogin_delete_dispatch_control on public.base_userlogin for delete to authenticated using (public.is_admin_or_dispatcher());

drop policy if exists profiles_select_self on public.profiles;
create policy profiles_select_self on public.profiles for select to authenticated using (id=(select auth.uid()));

drop policy if exists assignments_update_operational on public.assignments;
create policy assignments_update_operational on public.assignments for update to authenticated using (public.is_admin_or_dispatcher() or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.nik=assignments.executor_nik and p.role='Executor' and p.status='Active' and p.is_locked=false)) with check (public.is_admin_or_dispatcher() or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.nik=assignments.executor_nik and p.role='Executor' and p.status='Active' and p.is_locked=false));

drop policy if exists assignment_events_insert_operational on public.assignment_events;
create policy assignment_events_insert_operational on public.assignment_events for insert to authenticated with check (public.is_admin_or_dispatcher() or exists(select 1 from public.assignments a join public.profiles p on p.nik=a.executor_nik where a.id=assignment_events.assignment_id and p.id=(select auth.uid()) and p.role='Executor' and p.status='Active' and p.is_locked=false));

create index if not exists assignment_events_actor_idx on public.assignment_events(actor_id);
create index if not exists assignments_created_by_idx on public.assignments(created_by);
create index if not exists audit_logs_actor_idx on public.audit_logs(actor_id);
create index if not exists login_events_user_idx on public.login_events(user_id);
create index if not exists surat_jalan_products_product_idx on public.surat_jalan_products(product);
create index if not exists surat_jalan_products_sj_idx on public.surat_jalan_products(surat_jalan_id);
