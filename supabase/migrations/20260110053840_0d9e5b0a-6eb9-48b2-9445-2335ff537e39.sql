-- Fix: professors should NOT see other professors' published courses
-- We split the public policy into anon-only + authenticated non-professors.

DROP POLICY IF EXISTS "Anyone can view published courses" ON public.courses;
DROP POLICY IF EXISTS "Anyone can view published courses (anon)" ON public.courses;
DROP POLICY IF EXISTS "Students can view published courses" ON public.courses;

-- Anonymous users can view published courses
CREATE POLICY "Anyone can view published courses (anon)"
ON public.courses
FOR SELECT
TO anon
USING (status = 'published');

-- Authenticated users can view published courses only if they are NOT professors
-- (admins are already covered by their own policy; students are covered here)
CREATE POLICY "Students can view published courses"
ON public.courses
FOR SELECT
TO authenticated
USING (status = 'published' AND NOT is_professor(auth.uid()));