-- Add price column to courses table
ALTER TABLE public.courses ADD COLUMN price DECIMAL(10,2) DEFAULT 0.00;

-- Add comment to explain the column
COMMENT ON COLUMN public.courses.price IS 'Course price in BRL. 0 means free course.';