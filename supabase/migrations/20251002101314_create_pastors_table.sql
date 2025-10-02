-- Create custom types for pastor-specific fields
CREATE TYPE office_role AS ENUM ('Pastor');
CREATE TYPE presbytery_type AS ENUM ('PANA', 'PNAN');

-- Create the pastors table
CREATE TABLE IF NOT EXISTS public.pastors (
  -- Primary identifier
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Photo stored in Supabase Storage
  photo_url TEXT,

  -- Basic information
  office office_role NOT NULL DEFAULT 'Pastor',
  name TEXT NOT NULL,
  wife TEXT,

  -- Address fields
  address TEXT NOT NULL,
  address_line_2 TEXT,
  neighborhood TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL, -- Brazilian state (UF)
  country TEXT NOT NULL DEFAULT 'Brazil',
  postal_code TEXT NOT NULL, -- CEP in format: 12345-678

  -- Contact information
  phone TEXT NOT NULL,
  mobile TEXT NOT NULL,
  email TEXT NOT NULL,

  -- Personal identifiers
  cpf TEXT NOT NULL, -- Brazilian CPF in format: 123.456.789-00
  date_of_birth DATE NOT NULL,

  -- Ministry information
  ordination_date DATE NOT NULL,
  presbytery presbytery_type NOT NULL DEFAULT 'PANA',

  -- Status fields
  retired BOOLEAN NOT NULL DEFAULT FALSE,
  retirement_date DATE,
  released_from_office BOOLEAN NOT NULL DEFAULT FALSE,
  released_date DATE,
  deceased BOOLEAN NOT NULL DEFAULT FALSE,
  deceased_date DATE,

  -- Additional information
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add constraints
ALTER TABLE public.pastors
  ADD CONSTRAINT pastors_email_unique UNIQUE (email),
  ADD CONSTRAINT pastors_cpf_unique UNIQUE (cpf),
  ADD CONSTRAINT pastors_cpf_format CHECK (cpf ~ '^\d{3}\.\d{3}\.\d{3}-\d{2}$'),
  ADD CONSTRAINT pastors_postal_code_format CHECK (postal_code ~ '^\d{5}-\d{3}$'),
  ADD CONSTRAINT pastors_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  ADD CONSTRAINT pastors_retirement_date_check CHECK (
    (retired = FALSE AND retirement_date IS NULL) OR
    (retired = TRUE AND retirement_date IS NOT NULL)
  ),
  ADD CONSTRAINT pastors_released_date_check CHECK (
    (released_from_office = FALSE AND released_date IS NULL) OR
    (released_from_office = TRUE AND released_date IS NOT NULL)
  ),
  ADD CONSTRAINT pastors_deceased_date_check CHECK (
    (deceased = FALSE AND deceased_date IS NULL) OR
    (deceased = TRUE AND deceased_date IS NOT NULL)
  );

-- Create indexes for frequently queried fields
CREATE INDEX idx_pastors_name ON public.pastors (name);
CREATE INDEX idx_pastors_email ON public.pastors (email);
CREATE INDEX idx_pastors_cpf ON public.pastors (cpf);
CREATE INDEX idx_pastors_presbytery ON public.pastors (presbytery);
CREATE INDEX idx_pastors_city ON public.pastors (city);
CREATE INDEX idx_pastors_state ON public.pastors (state);
CREATE INDEX idx_pastors_retired ON public.pastors (retired);
CREATE INDEX idx_pastors_deceased ON public.pastors (deceased);
CREATE INDEX idx_pastors_created_at ON public.pastors (created_at DESC);

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for updated_at
CREATE TRIGGER pastors_updated_at
  BEFORE UPDATE ON public.pastors
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.pastors ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow authenticated users to view all pastors
CREATE POLICY "Authenticated users can view all pastors"
  ON public.pastors
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- RLS Policy: Allow authenticated users to insert pastors
CREATE POLICY "Authenticated users can insert pastors"
  ON public.pastors
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- RLS Policy: Allow authenticated users to update pastors
CREATE POLICY "Authenticated users can update pastors"
  ON public.pastors
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- RLS Policy: Allow authenticated users to delete pastors
CREATE POLICY "Authenticated users can delete pastors"
  ON public.pastors
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- Create storage bucket for pastor photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pastor-photos',
  'pastor-photos',
  TRUE, -- Public read access
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for storage bucket
CREATE POLICY "Authenticated users can upload pastor photos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'pastor-photos');

CREATE POLICY "Anyone can view pastor photos"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'pastor-photos');

CREATE POLICY "Authenticated users can update pastor photos"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'pastor-photos')
  WITH CHECK (bucket_id = 'pastor-photos');

CREATE POLICY "Authenticated users can delete pastor photos"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'pastor-photos');
