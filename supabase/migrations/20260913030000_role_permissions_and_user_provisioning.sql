-- Movent v2.1 role model
-- Dispatcher: create assignments + assignment history/read access.
-- Executor: own assignments/execution only.
-- Controller: monitoring/read-only operational access.
-- Super User: full operational/master write access.

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT p.role
  FROM public.profiles p
  WHERE p.id = (select auth.uid())
    AND p.status = 'Active'
    AND p.is_locked = false
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_dispatcher()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT public.current_user_role() IN ('Dispatcher','Super User');
$$;

CREATE OR REPLACE FUNCTION public.is_executor()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT public.current_user_role() = 'Executor';
$$;

-- Master data is writable only by Super User.
DROP POLICY IF EXISTS base_executors_insert ON public.base_executors;
DROP POLICY IF EXISTS base_executors_update ON public.base_executors;
DROP POLICY IF EXISTS base_executors_delete ON public.base_executors;
DROP POLICY IF EXISTS base_fleets_insert ON public.base_fleets;
DROP POLICY IF EXISTS base_fleets_update ON public.base_fleets;
DROP POLICY IF EXISTS base_fleets_delete ON public.base_fleets;
DROP POLICY IF EXISTS base_products_insert ON public.base_products;
DROP POLICY IF EXISTS base_products_update ON public.base_products;
DROP POLICY IF EXISTS base_products_delete ON public.base_products;
DROP POLICY IF EXISTS base_schedules_insert ON public.base_schedules;
DROP POLICY IF EXISTS base_schedules_update ON public.base_schedules;
DROP POLICY IF EXISTS base_schedules_delete ON public.base_schedules;
DROP POLICY IF EXISTS base_userlogin_insert ON public.base_userlogin;
DROP POLICY IF EXISTS base_userlogin_update ON public.base_userlogin;
DROP POLICY IF EXISTS base_userlogin_delete ON public.base_userlogin;

CREATE POLICY base_executors_insert ON public.base_executors FOR INSERT TO authenticated WITH CHECK ((select public.current_user_role()) = 'Super User');
CREATE POLICY base_executors_update ON public.base_executors FOR UPDATE TO authenticated USING ((select public.current_user_role()) = 'Super User') WITH CHECK ((select public.current_user_role()) = 'Super User');
CREATE POLICY base_executors_delete ON public.base_executors FOR DELETE TO authenticated USING ((select public.current_user_role()) = 'Super User');
CREATE POLICY base_fleets_insert ON public.base_fleets FOR INSERT TO authenticated WITH CHECK ((select public.current_user_role()) = 'Super User');
CREATE POLICY base_fleets_update ON public.base_fleets FOR UPDATE TO authenticated USING ((select public.current_user_role()) = 'Super User') WITH CHECK ((select public.current_user_role()) = 'Super User');
CREATE POLICY base_fleets_delete ON public.base_fleets FOR DELETE TO authenticated USING ((select public.current_user_role()) = 'Super User');
CREATE POLICY base_products_insert ON public.base_products FOR INSERT TO authenticated WITH CHECK ((select public.current_user_role()) = 'Super User');
CREATE POLICY base_products_update ON public.base_products FOR UPDATE TO authenticated USING ((select public.current_user_role()) = 'Super User') WITH CHECK ((select public.current_user_role()) = 'Super User');
CREATE POLICY base_products_delete ON public.base_products FOR DELETE TO authenticated USING ((select public.current_user_role()) = 'Super User');
CREATE POLICY base_schedules_insert ON public.base_schedules FOR INSERT TO authenticated WITH CHECK ((select public.current_user_role()) = 'Super User');
CREATE POLICY base_schedules_update ON public.base_schedules FOR UPDATE TO authenticated USING ((select public.current_user_role()) = 'Super User') WITH CHECK ((select public.current_user_role()) = 'Super User');
CREATE POLICY base_schedules_delete ON public.base_schedules FOR DELETE TO authenticated USING ((select public.current_user_role()) = 'Super User');
CREATE POLICY base_userlogin_insert ON public.base_userlogin FOR INSERT TO authenticated WITH CHECK ((select public.current_user_role()) = 'Super User');
CREATE POLICY base_userlogin_update ON public.base_userlogin FOR UPDATE TO authenticated USING ((select public.current_user_role()) = 'Super User') WITH CHECK ((select public.current_user_role()) = 'Super User');
CREATE POLICY base_userlogin_delete ON public.base_userlogin FOR DELETE TO authenticated USING ((select public.current_user_role()) = 'Super User');

-- Assignment creation/history belongs to Dispatcher and Super User.
DROP POLICY IF EXISTS assignments_insert ON public.assignments;
DROP POLICY IF EXISTS assignments_update ON public.assignments;
CREATE POLICY assignments_insert ON public.assignments FOR INSERT TO authenticated
  WITH CHECK ((select public.current_user_role()) IN ('Dispatcher','Super User'));
CREATE POLICY assignments_update ON public.assignments FOR UPDATE TO authenticated
  USING ((select public.current_user_role()) IN ('Dispatcher','Super User') OR
         (select public.current_user_role()) = 'Executor' AND executor_nik = (SELECT p.nik FROM public.profiles p WHERE p.id=(select auth.uid()) AND p.status='Active' AND p.is_locked=false LIMIT 1))
  WITH CHECK ((select public.current_user_role()) IN ('Dispatcher','Super User') OR
         (select public.current_user_role()) = 'Executor' AND executor_nik = (SELECT p.nik FROM public.profiles p WHERE p.id=(select auth.uid()) AND p.status='Active' AND p.is_locked=false LIMIT 1));

-- Surat Jalan is operational administration, not Dispatcher/Controller scope.
DROP POLICY IF EXISTS surat_jalan_insert ON public.surat_jalan;
DROP POLICY IF EXISTS surat_jalan_update ON public.surat_jalan;
DROP POLICY IF EXISTS surat_jalan_delete ON public.surat_jalan;
CREATE POLICY surat_jalan_insert ON public.surat_jalan FOR INSERT TO authenticated WITH CHECK ((select public.current_user_role()) = 'Super User');
CREATE POLICY surat_jalan_update ON public.surat_jalan FOR UPDATE TO authenticated USING ((select public.current_user_role()) = 'Super User') WITH CHECK ((select public.current_user_role()) = 'Super User');
CREATE POLICY surat_jalan_delete ON public.surat_jalan FOR DELETE TO authenticated USING ((select public.current_user_role()) = 'Super User');

DROP POLICY IF EXISTS surat_jalan_products_insert ON public.surat_jalan_products;
DROP POLICY IF EXISTS surat_jalan_products_update ON public.surat_jalan_products;
DROP POLICY IF EXISTS surat_jalan_products_delete ON public.surat_jalan_products;
CREATE POLICY surat_jalan_products_insert ON public.surat_jalan_products FOR INSERT TO authenticated WITH CHECK ((select public.current_user_role()) = 'Super User');
CREATE POLICY surat_jalan_products_update ON public.surat_jalan_products FOR UPDATE TO authenticated USING ((select public.current_user_role()) = 'Super User') WITH CHECK ((select public.current_user_role()) = 'Super User');
CREATE POLICY surat_jalan_products_delete ON public.surat_jalan_products FOR DELETE TO authenticated USING ((select public.current_user_role()) = 'Super User');

-- When an Auth user is created, automatically create the Movent profile from base_userlogin.
-- Email is the stable bridge between the import/master record and Auth user.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  src public.base_userlogin%ROWTYPE;
BEGIN
  SELECT * INTO src
  FROM public.base_userlogin
  WHERE lower(email) = lower(NEW.email)
  LIMIT 1;

  IF src.username IS NULL THEN
    RAISE EXCEPTION 'No base_userlogin record found for email %', NEW.email;
  END IF;

  INSERT INTO public.profiles (id, username, nik, full_name, phone_number, role, status)
  VALUES (NEW.id, src.username, src.nik, src.full_name, src.phone_number, src.role, src.status)
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    nik = EXCLUDED.nik,
    full_name = EXCLUDED.full_name,
    phone_number = EXCLUDED.phone_number,
    role = EXCLUDED.role,
    status = EXCLUDED.status,
    updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_movent ON auth.users;
CREATE TRIGGER on_auth_user_created_movent
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user() FROM PUBLIC, anon, authenticated;
