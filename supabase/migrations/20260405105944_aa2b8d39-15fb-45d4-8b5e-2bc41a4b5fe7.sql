
-- Add new columns to residences
ALTER TABLE public.residences
  ADD COLUMN IF NOT EXISTS country TEXT NOT NULL DEFAULT 'Cameroun',
  ADD COLUMN IF NOT EXISTS city TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS neighborhood TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS gps_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS gps_lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS whatsapp_contact TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS facebook_url TEXT;

-- Residence images table
CREATE TABLE public.residence_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  residence_id UUID NOT NULL REFERENCES public.residences(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.residence_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view residence images" ON public.residence_images FOR SELECT USING (true);
CREATE POLICY "Hosts can manage their residence images" ON public.residence_images FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.residences WHERE id = residence_id AND host_id = auth.uid()));
CREATE POLICY "Hosts can delete their residence images" ON public.residence_images FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.residences WHERE id = residence_id AND host_id = auth.uid()));

-- Orders table
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  need_id UUID NOT NULL REFERENCES public.needs(id) ON DELETE CASCADE,
  residence_id UUID NOT NULL REFERENCES public.residences(id) ON DELETE CASCADE,
  client_id UUID NOT NULL,
  host_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT NOT NULL DEFAULT 'cash',
  amount NUMERIC NOT NULL DEFAULT 0,
  host_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view their orders" ON public.orders FOR SELECT TO authenticated
  USING (auth.uid() = client_id OR auth.uid() = host_id);
CREATE POLICY "Hosts can create orders" ON public.orders FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Hosts can update their orders" ON public.orders FOR UPDATE TO authenticated
  USING (auth.uid() = host_id OR auth.uid() = client_id);
CREATE POLICY "Admins can view all orders" ON public.orders FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Wallet transactions
CREATE TABLE public.wallet_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reference TEXT,
  recipient_code TEXT,
  recipient_email TEXT,
  withdrawal_method TEXT,
  withdrawal_contact TEXT,
  transaction_id_external TEXT,
  description TEXT,
  payment_method_id UUID,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions" ON public.wallet_transactions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users can create own transactions" ON public.wallet_transactions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all transactions" ON public.wallet_transactions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'financier'));
CREATE POLICY "Admins can update transactions" ON public.wallet_transactions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'financier'));

-- Payment methods
CREATE TABLE public.payment_methods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  details TEXT NOT NULL,
  link TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active payment methods" ON public.payment_methods FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can insert payment methods" ON public.payment_methods FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update payment methods" ON public.payment_methods FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete payment methods" ON public.payment_methods FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admin policies for existing tables
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view all needs" ON public.needs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'needs_manager'));
CREATE POLICY "Admins can view all residences" ON public.residences FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hotel_manager'));
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('residence-images', 'residence-images', true);
CREATE POLICY "Anyone can view residence images storage" ON storage.objects FOR SELECT USING (bucket_id = 'residence-images');
CREATE POLICY "Auth users can upload residence images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'residence-images');
CREATE POLICY "Users can delete residence images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'residence-images');

-- Wallet transfer function
CREATE OR REPLACE FUNCTION public.process_wallet_transfer(
  sender_id UUID, recipient_identifier TEXT, transfer_amount NUMERIC
)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  recipient_profile RECORD;
  sender_balance NUMERIC;
BEGIN
  SELECT p.user_id, p.moissonneur_code, p.full_name INTO recipient_profile
  FROM profiles p LEFT JOIN auth.users u ON u.id = p.user_id
  WHERE p.moissonneur_code = recipient_identifier OR u.email = recipient_identifier LIMIT 1;

  IF recipient_profile IS NULL THEN RETURN 'recipient_not_found'; END IF;
  IF recipient_profile.user_id = sender_id THEN RETURN 'cannot_transfer_to_self'; END IF;

  SELECT wallet_balance INTO sender_balance FROM profiles WHERE user_id = sender_id;
  IF sender_balance < transfer_amount THEN RETURN 'insufficient_balance'; END IF;

  UPDATE profiles SET wallet_balance = wallet_balance - transfer_amount WHERE user_id = sender_id;
  UPDATE profiles SET wallet_balance = wallet_balance + transfer_amount WHERE user_id = recipient_profile.user_id;

  INSERT INTO wallet_transactions (user_id, type, amount, status, recipient_code, description)
  VALUES (sender_id, 'transfer_out', transfer_amount, 'approved', recipient_profile.moissonneur_code, 'Transfert vers ' || recipient_profile.moissonneur_code);
  INSERT INTO wallet_transactions (user_id, type, amount, status, description)
  VALUES (recipient_profile.user_id, 'transfer_in', transfer_amount, 'approved', 'Transfert reçu');

  RETURN 'success';
END;
$$;

-- Approve transaction function
CREATE OR REPLACE FUNCTION public.approve_wallet_transaction(transaction_id UUID, admin_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE tx RECORD;
BEGIN
  SELECT * INTO tx FROM wallet_transactions WHERE id = transaction_id AND status = 'pending';
  IF tx IS NULL THEN RETURN FALSE; END IF;

  UPDATE wallet_transactions SET status = 'approved', approved_by = admin_id, approved_at = now() WHERE id = transaction_id;

  IF tx.type = 'recharge' THEN
    UPDATE profiles SET wallet_balance = wallet_balance + tx.amount WHERE user_id = tx.user_id;
  ELSIF tx.type = 'withdrawal' THEN
    UPDATE profiles SET wallet_balance = wallet_balance - tx.amount WHERE user_id = tx.user_id;
  END IF;

  RETURN TRUE;
END;
$$;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallet_transactions;
