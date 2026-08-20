-- ==============================================================================
-- Supabase Schema for NINTM Registrations
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New query)
-- ==============================================================================

-- 1. Create registrations table
CREATE TABLE IF NOT EXISTS public.registrations (
    registration_id TEXT PRIMARY KEY,
    name TEXT DEFAULT '',
    instagram_username TEXT DEFAULT '',
    date_of_birth TEXT DEFAULT '',
    email TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    whatsapp TEXT DEFAULT '',
    height TEXT DEFAULT '',
    state TEXT DEFAULT '',
    city TEXT DEFAULT '',
    pincode TEXT DEFAULT '',
    full_length_photo TEXT DEFAULT '',
    close_up_photo TEXT DEFAULT '',
    payment_status TEXT DEFAULT 'PENDING',
    payment_amount NUMERIC DEFAULT 0,
    razorpay_order_id TEXT DEFAULT '',
    razorpay_payment_id TEXT DEFAULT '',
    razorpay_signature TEXT DEFAULT '',
    payment_date TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    application_status TEXT DEFAULT 'Payment Pending',
    message TEXT DEFAULT '',
    course TEXT DEFAULT '',
    service TEXT DEFAULT '',
    address TEXT DEFAULT '',
    type TEXT DEFAULT 'registration',
    admin_notes TEXT DEFAULT ''
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies if any to avoid duplication
DROP POLICY IF EXISTS "Allow public read access" ON public.registrations;
DROP POLICY IF EXISTS "Allow public insert access" ON public.registrations;
DROP POLICY IF EXISTS "Allow public update access" ON public.registrations;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.registrations;

-- 4. Create public policies (allowing anon key to perform registration, checkout lookups, and payment updates)
CREATE POLICY "Allow public read access"
ON public.registrations
FOR SELECT
TO anon, authenticated, public
USING (true);

CREATE POLICY "Allow public insert access"
ON public.registrations
FOR INSERT
TO anon, authenticated, public
WITH CHECK (true);

CREATE POLICY "Allow public update access"
ON public.registrations
FOR UPDATE
TO anon, authenticated, public
USING (true)
WITH CHECK (true);

-- 5. Create performance indexes for lookups
CREATE INDEX IF NOT EXISTS idx_registrations_id ON public.registrations (registration_id);
CREATE INDEX IF NOT EXISTS idx_registrations_email ON public.registrations (email);
CREATE INDEX IF NOT EXISTS idx_registrations_phone ON public.registrations (phone);
CREATE INDEX IF NOT EXISTS idx_registrations_payment_status ON public.registrations (payment_status);
CREATE INDEX IF NOT EXISTS idx_registrations_created_at ON public.registrations (created_at DESC);
