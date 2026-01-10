-- Add blocked column to enrollments table for temporary access blocking
ALTER TABLE public.enrollments 
ADD COLUMN blocked boolean NOT NULL DEFAULT false;

-- Add blocked_at timestamp to track when blocking occurred
ALTER TABLE public.enrollments 
ADD COLUMN blocked_at timestamp with time zone DEFAULT NULL;