-- Allow authenticated app users to read fleet master data without granting write access.
create policy fleets_select_authenticated
  on public.fleets
  for select
  to authenticated
  using (true);
