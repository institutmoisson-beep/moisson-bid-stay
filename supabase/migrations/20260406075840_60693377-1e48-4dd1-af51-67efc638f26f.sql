
DROP POLICY IF EXISTS "System can insert commissions" ON public.referral_commissions;
CREATE POLICY "Admins can insert commissions" ON public.referral_commissions FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
