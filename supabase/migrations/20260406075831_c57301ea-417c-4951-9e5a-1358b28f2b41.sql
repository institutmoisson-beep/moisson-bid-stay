
-- Add city_manager to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'city_manager';

-- Add country, city, status, referred_by, referral_code to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT 'Cameroun',
  ADD COLUMN IF NOT EXISTS city text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS referred_by uuid,
  ADD COLUMN IF NOT EXISTS referral_code text;

-- Generate unique referral codes for existing profiles
UPDATE public.profiles SET referral_code = moissonneur_code WHERE referral_code IS NULL;

-- Make referral_code unique
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);

-- Add room_standard to residences
ALTER TABLE public.residences ADD COLUMN IF NOT EXISTS room_standard text NOT NULL DEFAULT 'standard';

-- Add room_standard to needs
ALTER TABLE public.needs ADD COLUMN IF NOT EXISTS room_standard text NOT NULL DEFAULT 'standard';

-- Add booking_fee and client_confirmed to orders
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS booking_fee numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS client_confirmed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS client_rating_done boolean NOT NULL DEFAULT false;

-- Platform settings table (admin-configurable fees)
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text NOT NULL,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view settings" ON public.platform_settings FOR SELECT TO public USING (true);
CREATE POLICY "Admins can manage settings" ON public.platform_settings FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Insert default settings
INSERT INTO public.platform_settings (key, value, description) VALUES
  ('booking_fee', '1000', 'Frais de réservation par commande validée (FCFA)'),
  ('withdrawal_fee_percent', '0', 'Frais de retrait en pourcentage'),
  ('withdrawal_fee_fixed', '0', 'Frais de retrait fixe (FCFA)'),
  ('transfer_fee_percent', '0', 'Frais de transfert en pourcentage'),
  ('transfer_fee_fixed', '0', 'Frais de transfert fixe (FCFA)'),
  ('referral_level_1', '10', 'Commission parrainage niveau 1 (%)'),
  ('referral_level_2', '5', 'Commission parrainage niveau 2 (%)'),
  ('referral_level_3', '3', 'Commission parrainage niveau 3 (%)'),
  ('referral_level_4', '2', 'Commission parrainage niveau 4 (%)'),
  ('referral_level_5', '1', 'Commission parrainage niveau 5 (%)')
ON CONFLICT (key) DO NOTHING;

-- Referral commissions table
CREATE TABLE IF NOT EXISTS public.referral_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficiary_id uuid NOT NULL,
  source_user_id uuid NOT NULL,
  order_id uuid,
  level integer NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.referral_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own commissions" ON public.referral_commissions FOR SELECT TO authenticated USING (auth.uid() = beneficiary_id);
CREATE POLICY "Admins can view all commissions" ON public.referral_commissions FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "System can insert commissions" ON public.referral_commissions FOR INSERT TO authenticated WITH CHECK (true);

-- Ratings table
CREATE TABLE IF NOT EXISTS public.ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  client_id uuid NOT NULL,
  host_id uuid NOT NULL,
  residence_id uuid NOT NULL,
  rating_hotel integer NOT NULL CHECK (rating_hotel >= 1 AND rating_hotel <= 5),
  rating_accueil integer NOT NULL CHECK (rating_accueil >= 1 AND rating_accueil <= 5),
  rating_restauration integer NOT NULL CHECK (rating_restauration >= 1 AND rating_restauration <= 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view ratings" ON public.ratings FOR SELECT TO public USING (true);
CREATE POLICY "Clients can create ratings" ON public.ratings FOR INSERT TO authenticated WITH CHECK (auth.uid() = client_id);
CREATE POLICY "Admins can manage ratings" ON public.ratings FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

-- City manager assignment table
CREATE TABLE IF NOT EXISTS public.city_manager_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  country text NOT NULL,
  city text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, country, city)
);

ALTER TABLE public.city_manager_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage zones" ON public.city_manager_zones FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "City managers can view own zones" ON public.city_manager_zones FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Update handle_new_user to include country, city, referral
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  ref_user_id uuid;
  msn_code text;
BEGIN
  msn_code := public.generate_moissonneur_code();
  
  -- Find referrer if referral code provided
  IF NEW.raw_user_meta_data->>'referral_code' IS NOT NULL AND NEW.raw_user_meta_data->>'referral_code' != '' THEN
    SELECT user_id INTO ref_user_id FROM public.profiles WHERE referral_code = NEW.raw_user_meta_data->>'referral_code' LIMIT 1;
  END IF;

  INSERT INTO public.profiles (user_id, full_name, role, moissonneur_code, referral_code, country, city, referred_by)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'client'),
    msn_code,
    msn_code,
    COALESCE(NEW.raw_user_meta_data->>'country', 'Cameroun'),
    COALESCE(NEW.raw_user_meta_data->>'city', ''),
    ref_user_id
  );
  RETURN NEW;
END;
$$;
