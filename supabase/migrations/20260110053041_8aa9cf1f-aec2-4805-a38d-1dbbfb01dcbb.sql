-- Drop existing SELECT policies for courses
DROP POLICY IF EXISTS "Anyone can view published courses" ON public.courses;
DROP POLICY IF EXISTS "Professors can view their own courses" ON public.courses;
DROP POLICY IF EXISTS "Admins can view all courses" ON public.courses;

-- Create PERMISSIVE policies for SELECT
-- Anyone can view published courses
CREATE POLICY "Anyone can view published courses"
ON public.courses
FOR SELECT
USING (status = 'published');

-- Admins can view all courses
CREATE POLICY "Admins can view all courses"
ON public.courses
FOR SELECT
USING (is_admin(auth.uid()));

-- Professors can view their own courses (including drafts)
CREATE POLICY "Professors can view their own courses"
ON public.courses
FOR SELECT
USING (is_professor(auth.uid()) AND created_by = auth.uid());