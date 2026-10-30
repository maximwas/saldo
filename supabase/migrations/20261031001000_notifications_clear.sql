-- «Clear read» in the notification centre (Figma 2:62586): a member deletes only their own notifications they have read.
create policy notifications_clear_read on public.notifications for delete to authenticated
  using (user_id = (select auth.uid()) and read_at is not null);
grant delete on table public.notifications to authenticated;
