
-- Allow admins to delete any need
CREATE POLICY "Admins can delete any need"
ON public.needs
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete any residence
CREATE POLICY "Admins can delete any residence"
ON public.residences
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to update any need
CREATE POLICY "Admins can update any need"
ON public.needs
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to update any residence
CREATE POLICY "Admins can update any residence"
ON public.residences
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));
