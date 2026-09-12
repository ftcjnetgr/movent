-- Movent v2.1: align authorization helpers with public.profiles and protect assignment transitions.

drop function if exists public.is_executor() cascade;
drop function if exists public.is_admin_or_dispatcher() cascade;
drop function if exists public.current_user_role() cascade;

create function public.current_user_role()
returns text language sql stable security invoker set search_path=public as $$
  select p.role from public.profiles p
  where p.id=auth.uid() and p.status='Active' and p.is_locked=false limit 1
$$;

create function public.is_admin_or_dispatcher()
returns boolean language sql stable security invoker set search_path=public as $$
  select public.current_user_role() in ('Dispatcher','Controller','Super User')
$$;

create function public.is_executor()
returns boolean language sql stable security invoker set search_path=public as $$
  select public.current_user_role()='Executor'
$$;

create or replace function public.transition_assignment(p_assignment_id uuid,p_next_status text,p_actor_id uuid default auth.uid())
returns public.assignments language plpgsql security invoker set search_path=public as $$
declare v_assignment public.assignments; v_role text;
begin
  v_role:=public.current_user_role();
  if v_role is null then raise exception 'Profil pengguna tidak aktif atau tidak ditemukan'; end if;
  select * into v_assignment from public.assignments where id=p_assignment_id for update;
  if not found then raise exception 'Assignment tidak ditemukan'; end if;
  if not ((v_assignment.status='ASSIGNED' and p_next_status='CONFIRMED') or (v_assignment.status='CONFIRMED' and p_next_status='IN_PROGRESS') or (v_assignment.status='IN_PROGRESS' and p_next_status='ARRIVED') or (v_assignment.status='ARRIVED' and p_next_status='COMPLETED') or (v_assignment.status='ASSIGNED' and p_next_status='CANCELLED')) then raise exception 'Transisi status tidak valid: % -> %',v_assignment.status,p_next_status; end if;
  if p_next_status='CANCELLED' then
    if v_role not in ('Dispatcher','Controller','Super User') then raise exception 'Tidak berwenang membatalkan assignment'; end if;
  elsif v_role='Executor' then
    if not exists(select 1 from public.profiles p where p.id=auth.uid() and p.nik=v_assignment.executor_nik and p.role='Executor' and p.status='Active' and p.is_locked=false) then raise exception 'Executor tidak berwenang untuk assignment ini'; end if;
  elsif v_role not in ('Dispatcher','Controller','Super User') then
    raise exception 'Tidak berwenang mengubah status assignment';
  end if;
  update public.assignments set status=p_next_status,accepted_at=case when p_next_status='CONFIRMED' then now() else accepted_at end,departed_at=case when p_next_status='IN_PROGRESS' then now() else departed_at end,arrived_at=case when p_next_status='ARRIVED' then now() else arrived_at end,completed_at=case when p_next_status='COMPLETED' then now() else completed_at end,cancelled_at=case when p_next_status='CANCELLED' then now() else cancelled_at end where id=p_assignment_id returning * into v_assignment;
  insert into public.assignment_events(assignment_id,event_type,event_at,actor_id) values(p_assignment_id,p_next_status,now(),coalesce(p_actor_id,auth.uid()));
  return v_assignment;
end;
$$;

revoke execute on function public.current_user_role() from anon;
revoke execute on function public.is_admin_or_dispatcher() from anon;
revoke execute on function public.is_executor() from anon;
revoke execute on function public.transition_assignment(uuid,text,uuid) from anon;
revoke execute on function public.normalize_schedule_import() from anon,authenticated;

create policy assignments_insert_dispatch_control on public.assignments for insert to authenticated with check (public.is_admin_or_dispatcher());
create policy assignments_update_operational on public.assignments for update to authenticated
using (public.is_admin_or_dispatcher() or exists(select 1 from public.profiles p where p.id=auth.uid() and p.nik=assignments.executor_nik and p.role='Executor' and p.status='Active' and p.is_locked=false))
with check (public.is_admin_or_dispatcher() or exists(select 1 from public.profiles p where p.id=auth.uid() and p.nik=assignments.executor_nik and p.role='Executor' and p.status='Active' and p.is_locked=false));

create policy assignment_events_insert_operational on public.assignment_events for insert to authenticated
with check (public.is_admin_or_dispatcher() or exists(select 1 from public.assignments a join public.profiles p on p.nik=a.executor_nik where a.id=assignment_events.assignment_id and p.id=auth.uid() and p.role='Executor' and p.status='Active' and p.is_locked=false));

create policy base_schedules_write_dispatch_control on public.base_schedules for all to authenticated using (public.is_admin_or_dispatcher()) with check (public.is_admin_or_dispatcher());
create policy base_executors_write_dispatch_control on public.base_executors for all to authenticated using (public.is_admin_or_dispatcher()) with check (public.is_admin_or_dispatcher());
create policy base_fleets_write_dispatch_control on public.base_fleets for all to authenticated using (public.is_admin_or_dispatcher()) with check (public.is_admin_or_dispatcher());
create policy base_products_write_dispatch_control on public.base_products for all to authenticated using (public.is_admin_or_dispatcher()) with check (public.is_admin_or_dispatcher());
create policy base_userlogin_write_dispatch_control on public.base_userlogin for all to authenticated using (public.is_admin_or_dispatcher()) with check (public.is_admin_or_dispatcher());

create policy surat_jalan_insert_dispatch_control on public.surat_jalan for insert to authenticated with check (public.is_admin_or_dispatcher());
create policy surat_jalan_update_dispatch_control on public.surat_jalan for update to authenticated using (public.is_admin_or_dispatcher()) with check (public.is_admin_or_dispatcher());
create policy surat_jalan_delete_dispatch_control on public.surat_jalan for delete to authenticated using (public.is_admin_or_dispatcher());
create policy surat_jalan_products_insert_dispatch_control on public.surat_jalan_products for insert to authenticated with check (public.is_admin_or_dispatcher());
create policy surat_jalan_products_update_dispatch_control on public.surat_jalan_products for update to authenticated using (public.is_admin_or_dispatcher()) with check (public.is_admin_or_dispatcher());
create policy surat_jalan_products_delete_dispatch_control on public.surat_jalan_products for delete to authenticated using (public.is_admin_or_dispatcher());
