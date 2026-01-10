-- Drop existing SELECT policies for courses
DROP POLICY IF EXISTS "Anyone can view published courses" ON public.courses;
DROP POLICY IF EXISTS "Professors can view their own courses" ON public.courses;
DROP POLICY IF EXISTS "Admins can view all courses" ON public.courses;

-- Create PERMISSIVE policies for SELECT (default behavior is PERMISSIVE, meaning OR between policies)
-- Admins can view all courses
CREATE POLICY "Admins can view all courses"
ON public.courses
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

-- Professors can view ONLY their own courses (in admin panel)
CREATE POLICY "Professors can view their own courses"
ON public.courses
FOR SELECT
TO authenticated
USING (is_professor(auth.uid()) AND created_by = auth.uid());

-- Anyone (including anonymous) can view published courses (for public catalog)
CREATE POLICY "Anyone can view published courses"
ON public.courses
FOR SELECT
TO anon, authenticated
USING (status = 'published');