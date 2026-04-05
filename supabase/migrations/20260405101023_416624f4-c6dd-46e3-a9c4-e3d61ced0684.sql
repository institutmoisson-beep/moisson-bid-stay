
CREATE OR REPLACE FUNCTION public.generate_moissonneur_code()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := 'MSN' || lpad(floor(random() * 1000000)::TEXT, 6, '0');
    SELECT EXISTS (SELECT 1 FROM public.profiles WHERE moissonneur_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$;
