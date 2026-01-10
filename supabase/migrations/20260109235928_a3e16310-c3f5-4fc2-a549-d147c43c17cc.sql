-- Add blocked column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS blocked boolean NOT NULL DEFAULT false;

-- Allow admins to update any profile
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
USING (is_admin(auth.uid()));

-- Allow admins to delete any profile
CREATE POLICY "Admins can delete all profiles"
ON public.profiles
FOR DELETE
USING (is_admin(auth.uid()));

-- Create function to check if user is professor
CREATE OR REPLACE FUNCTION public.is_professor(user_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = user_uuid AND role = 'professor'
  );
$$;

-- Update courses policy to allow professors to create courses
DROP POLICY IF EXISTS "Admins can create courses" ON public.courses;
CREATE POLICY "Admins and professors can create courses"
ON public.courses
FOR INSERT
WITH CHECK (is_admin(auth.uid()) OR is_professor(auth.uid()));

-- Update courses policy to allow professors to update their own courses
DROP POLICY IF EXISTS "Admins can update courses" ON public.courses;
CREATE POLICY "Admins can update any course, professors their own"
ON public.courses
FOR UPDATE
USING (is_admin(auth.uid()) OR (is_professor(auth.uid()) AND created_by = auth.uid()));

-- Update courses policy to allow professors to delete their own courses
DROP POLICY IF EXISTS "Admins can delete courses" ON public.courses;
CREATE POLICY "Admins can delete any course, professors their own"
ON public.courses
FOR DELETE
USING (is_admin(auth.uid()) OR (is_professor(auth.uid()) AND created_by = auth.uid()));

-- Allow professors to view their own courses (draft or published)
CREATE POLICY "Professors can view their own courses"
ON public.courses
FOR SELECT
USING (is_professor(auth.uid()) AND created_by = auth.uid());

-- Allow professors to manage modules for their own courses
DROP POLICY IF EXISTS "Admins can manage modules" ON public.modules;
CREATE POLICY "Admins and course owners can manage modules"
ON public.modules
FOR ALL
USING (
  is_admin(auth.uid()) OR 
  (is_professor(auth.uid()) AND EXISTS (
    SELECT 1 FROM courses WHERE courses.id = modules.course_id AND courses.created_by = auth.uid()
  ))
);

-- Allow professors to manage lessons for their own courses
DROP POLICY IF EXISTS "Admins can manage lessons" ON public.lessons;
CREATE POLICY "Admins and course owners can manage lessons"
ON public.lessons
FOR ALL
USING (
  is_admin(auth.uid()) OR 
  (is_professor(auth.uid()) AND EXISTS (
    SELECT 1 FROM modules m
    JOIN courses c ON c.id = m.course_id
    WHERE m.id = lessons.module_id AND c.created_by = auth.uid()
  ))
);