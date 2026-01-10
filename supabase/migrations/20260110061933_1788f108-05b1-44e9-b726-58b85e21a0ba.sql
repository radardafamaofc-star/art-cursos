-- Create storage bucket for certificates
INSERT INTO storage.buckets (id, name, public)
VALUES ('certificates', 'certificates', true)
ON CONFLICT (id) DO NOTHING;

-- Create policies for certificates bucket
CREATE POLICY "Certificate images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'certificates');

CREATE POLICY "Professors can upload certificates"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'certificates' AND (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'professor'))
));

CREATE POLICY "Professors can update their certificates"
ON storage.objects FOR UPDATE
USING (bucket_id = 'certificates' AND (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'professor'))
));

CREATE POLICY "Professors can delete their certificates"
ON storage.objects FOR DELETE
USING (bucket_id = 'certificates' AND (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'professor'))
));

-- Create course_certificates table to store certificate templates
CREATE TABLE public.course_certificates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  certificate_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.course_certificates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can view course certificates"
ON public.course_certificates FOR SELECT
USING (true);

CREATE POLICY "Course owners can manage certificates"
ON public.course_certificates FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM courses 
    WHERE courses.id = course_certificates.course_id 
    AND (courses.created_by = auth.uid() OR is_admin(auth.uid()))
  )
);

-- Create student_certificates table to track earned certificates
CREATE TABLE public.student_certificates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  certificate_number TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  UNIQUE(user_id, course_id)
);

-- Enable RLS
ALTER TABLE public.student_certificates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for student_certificates
CREATE POLICY "Users can view their own certificates"
ON public.student_certificates FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can create certificates"
ON public.student_certificates FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all certificates"
ON public.student_certificates FOR SELECT
USING (is_admin(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_course_certificates_updated_at
BEFORE UPDATE ON public.course_certificates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();