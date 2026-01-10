-- Create storage bucket for course content (videos, images, PDFs, etc.)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'course-content', 
  'course-content', 
  true,
  524288000, -- 500MB limit for videos
  ARRAY[
    'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo',
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    'application/pdf',
    'text/plain',
    'application/vnd.android.package-archive',
    'application/octet-stream'
  ]
);

-- Allow anyone to view course content (since courses can be public)
CREATE POLICY "Course content is publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'course-content');

-- Allow professors and admins to upload course content
CREATE POLICY "Professors can upload course content"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'course-content' 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'professor')
  )
);

-- Allow professors and admins to update their course content
CREATE POLICY "Professors can update course content"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'course-content' 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'professor')
  )
);

-- Allow professors and admins to delete their course content
CREATE POLICY "Professors can delete course content"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'course-content' 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'professor')
  )
);