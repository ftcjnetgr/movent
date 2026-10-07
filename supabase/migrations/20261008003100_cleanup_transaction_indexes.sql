-- Keep the transaction ID generator and stop/activity constraints clean.
drop index if exists public.pickup_delivery_stops_activity_sequence_idx;
drop index if exists public.task_stops_task_id_sequence_idx;
drop index if exists public.pickup_delivery_activities_user_status_idx;
drop table if exists private.transaction_sequences;

create unique index if not exists pickup_delivery_activities_one_active_per_user_idx
  on public.pickup_delivery_activities (executor_nik)
  where status in ('Confirmed', 'Driving');


-- Keep auth lookups stable per statement for RLS performance.
alter policy "executors_select" on public.executors using (
  (exists (
    select 1 from public.user_profiles p
    where p.auth_user_id = (select auth.uid()) and p.role = 'Super User'
  ))
  or (
    status = 'Active' and area = (
      select p.area from public.user_profiles p
      where p.auth_user_id = (select auth.uid()) limit 1
    )
  )
);

alter policy "schedules_select" on public.schedules using (
  private.is_super_user()
  or (
    status = 'Active' and schedule_area = (
      select p.area from public.user_profiles p
      where p.auth_user_id = (select auth.uid()) limit 1
    )
  )
);

alter policy "pickup delivery can read own activities" on public.pickup_delivery_activities
  using (user_id = (select auth.uid()));

alter policy "pickup delivery can read own activity stops" on public.pickup_delivery_stops
  using (exists (
    select 1 from public.pickup_delivery_activities a
    where a.id = pickup_delivery_stops.activity_id
      and a.user_id = (select auth.uid())
  ));

alter policy "pickup delivery can update own activity stops" on public.pickup_delivery_stops
  using (exists (
    select 1 from public.pickup_delivery_activities a
    where a.id = pickup_delivery_stops.activity_id
      and a.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.pickup_delivery_activities a
    where a.id = pickup_delivery_stops.activity_id
      and a.user_id = (select auth.uid())
  ));

alter policy "pickup delivery can read own task stops" on public.task_stops
  using (exists (
    select 1 from public.tasks t
    join public.user_profiles p on p.username = t.executor_nik
    where t.id = task_stops.task_id
      and p.auth_user_id = (select auth.uid())
      and p.role in ('Pickup','Delivery')
  ));

alter policy "pickup delivery can update own task stops" on public.task_stops
  using (exists (
    select 1 from public.tasks t
    join public.user_profiles p on p.username = t.executor_nik
    where t.id = task_stops.task_id
      and p.auth_user_id = (select auth.uid())
      and p.role in ('Pickup','Delivery')
  ))
  with check (exists (
    select 1 from public.tasks t
    join public.user_profiles p on p.username = t.executor_nik
    where t.id = task_stops.task_id
      and p.auth_user_id = (select auth.uid())
      and p.role in ('Pickup','Delivery')
  ));
