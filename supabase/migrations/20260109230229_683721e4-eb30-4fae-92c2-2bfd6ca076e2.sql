-- 1) Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- 2) Create a SECURITY DEFINER helper function to check if a user is admin
-- This function runs with owner privileges, bypassing RLS and avoiding recursion
CREATE OR REPLACE FUNCTION public.is_admin(p_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = p_uid AND role = 'admin'
  );
$$;

-- 3) Recreate the admin policy using the helper function (no recursion)
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.is_admin(auth.uid()));

-- 4) Update other admin policies in courses table to use is_admin()
DROP POLICY IF EXISTS "Admins can view all courses" ON public.courses;
CREATE POLICY "Admins can view all courses"
ON public.courses
FOR SELECT
USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can create courses" ON public.courses;
CREATE POLICY "Admins can create courses"
ON public.courses
FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update courses" ON public.courses;
CREATE POLICY "Admins can update courses"
ON public.courses
FOR UPDATE
USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete courses" ON public.courses;
CREATE POLICY "Admins can delete courses"
ON public.courses
FOR DELETE
USING (public.is_admin(auth.uid()));

-- 5) Update admin policies in modules table
DROP POLICY IF EXISTS "Admins can manage modules" ON public.modules;
CREATE POLICY "Admins can manage modules"
ON public.modules
FOR ALL
USING (public.is_admin(auth.uid()));

-- 6) Update admin policies in lessons table
DROP POLICY IF EXISTS "Admins can manage lessons" ON public.lessons;
CREATE POLICY "Admins can manage lessons"
ON public.lessons
FOR ALL
USING (public.is_admin(auth.uid()));

-- 7) Update admin policies in enrollments table
DROP POLICY IF EXISTS "Admins can view all enrollments" ON public.enrollments;
CREATE POLICY "Admins can view all enrollments"
ON public.enrollments
FOR SELECT
USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage enrollments" ON public.enrollments;
CREATE POLICY "Admins can manage enrollments"
ON public.enrollments
FOR ALL
USING (public.is_admin(auth.uid()));

-- 8) Update admin policies in lesson_progress table
DROP POLICY IF EXISTS "Admins can view all progress" ON public.lesson_progress;
CREATE POLICY "Admins can view all progress"
ON public.lesson_progress
FOR SELECT
USING (public.is_admin(auth.uid()));