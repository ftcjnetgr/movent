-- Keep the transaction ID generator and stop/activity constraints clean.
drop index if exists public.pickup_delivery_stops_activity_sequence_idx;
drop index if exists public.task_stops_task_id_sequence_idx;
drop table if exists private.transaction_sequences;

create unique index if not exists pickup_delivery_activities_one_active_per_user_idx
  on public.pickup_delivery_activities (executor_nik)
  where status in ('Confirmed', 'Driving');
