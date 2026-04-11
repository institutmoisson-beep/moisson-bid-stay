
CREATE POLICY "Hosts can delete their own orders"
ON public.orders
FOR DELETE
TO authenticated
USING (auth.uid() = host_id);
