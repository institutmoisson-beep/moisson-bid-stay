
-- Table des besoins clients
CREATE TABLE public.needs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  country TEXT NOT NULL DEFAULT 'Cameroun',
  city TEXT NOT NULL,
  neighborhood TEXT NOT NULL,
  whatsapp_contact TEXT NOT NULL,
  type_needed TEXT NOT NULL DEFAULT 'appartement',
  capacity INTEGER NOT NULL DEFAULT 1,
  check_in DATE,
  check_out DATE,
  budget NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.needs ENABLE ROW LEVEL SECURITY;

-- Tous les utilisateurs connectés peuvent voir les besoins actifs
CREATE POLICY "Anyone can view active needs"
ON public.needs FOR SELECT
TO authenticated
USING (status = 'active' OR auth.uid() = user_id);

-- Les clients peuvent créer leurs besoins
CREATE POLICY "Users can create their own needs"
ON public.needs FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Les clients peuvent modifier leurs besoins
CREATE POLICY "Users can update their own needs"
ON public.needs FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Les clients peuvent supprimer leurs besoins
CREATE POLICY "Users can delete their own needs"
ON public.needs FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Trigger updated_at
CREATE TRIGGER update_needs_updated_at
BEFORE UPDATE ON public.needs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Table des notifications
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  need_id UUID REFERENCES public.needs(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'new_need',
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
ON public.notifications FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- System can insert notifications (via trigger)
CREATE POLICY "System can insert notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (true);

-- Enable realtime on needs for instant notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.needs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Function to notify hotels when a new need is created
CREATE OR REPLACE FUNCTION public.notify_hotels_on_new_need()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Insert notification for all hotel users
  INSERT INTO public.notifications (user_id, need_id, type, message)
  SELECT p.user_id, NEW.id, 'new_need',
    'Nouveau besoin : ' || NEW.type_needed || ' à ' || NEW.city || ', ' || NEW.neighborhood
  FROM public.profiles p
  WHERE p.role = 'host'
    AND p.user_id != NEW.user_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_hotels
AFTER INSERT ON public.needs
FOR EACH ROW
EXECUTE FUNCTION public.notify_hotels_on_new_need();
