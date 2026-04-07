
-- Add currency column to profiles
ALTER TABLE public.profiles ADD COLUMN currency text NOT NULL DEFAULT 'XAF';

-- Cache table for exchange rates
CREATE TABLE public.exchange_rates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  base_currency text NOT NULL,
  target_currency text NOT NULL,
  rate numeric NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(base_currency, target_currency)
);

ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view exchange rates" ON public.exchange_rates FOR SELECT USING (true);
CREATE POLICY "System can manage rates" ON public.exchange_rates FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Update transfer function to handle currency conversion
CREATE OR REPLACE FUNCTION public.process_wallet_transfer(sender_id uuid, recipient_identifier text, transfer_amount numeric)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  recipient_profile RECORD;
  sender_profile RECORD;
  sender_balance NUMERIC;
  converted_amount NUMERIC;
  exchange_rate NUMERIC;
BEGIN
  SELECT p.user_id, p.moissonneur_code, p.full_name, p.currency INTO recipient_profile
  FROM profiles p LEFT JOIN auth.users u ON u.id = p.user_id
  WHERE p.moissonneur_code = recipient_identifier OR u.email = recipient_identifier LIMIT 1;

  IF recipient_profile IS NULL THEN RETURN 'recipient_not_found'; END IF;
  IF recipient_profile.user_id = sender_id THEN RETURN 'cannot_transfer_to_self'; END IF;

  SELECT currency, wallet_balance INTO sender_profile FROM profiles WHERE user_id = sender_id;
  IF sender_profile.wallet_balance < transfer_amount THEN RETURN 'insufficient_balance'; END IF;

  -- Convert if currencies differ
  IF sender_profile.currency = recipient_profile.currency THEN
    converted_amount := transfer_amount;
  ELSE
    SELECT rate INTO exchange_rate FROM exchange_rates 
    WHERE base_currency = sender_profile.currency AND target_currency = recipient_profile.currency;
    IF exchange_rate IS NULL THEN
      exchange_rate := 1;
    END IF;
    converted_amount := ROUND(transfer_amount * exchange_rate, 2);
  END IF;

  UPDATE profiles SET wallet_balance = wallet_balance - transfer_amount WHERE user_id = sender_id;
  UPDATE profiles SET wallet_balance = wallet_balance + converted_amount WHERE user_id = recipient_profile.user_id;

  INSERT INTO wallet_transactions (user_id, type, amount, status, recipient_code, description)
  VALUES (sender_id, 'transfer_out', transfer_amount, 'approved', recipient_profile.moissonneur_code, 
    'Transfert ' || transfer_amount || ' ' || sender_profile.currency || ' vers ' || recipient_profile.moissonneur_code);
  INSERT INTO wallet_transactions (user_id, type, amount, status, description)
  VALUES (recipient_profile.user_id, 'transfer_in', converted_amount, 'approved', 
    'Transfert reçu: ' || converted_amount || ' ' || recipient_profile.currency);

  RETURN 'success';
END;
$$;
