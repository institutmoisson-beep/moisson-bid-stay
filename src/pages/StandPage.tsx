import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, Users, Home } from "lucide-react";

const StandPage = () => {
  const { code } = useParams<{ code: string }>();
  const [profile, setProfile] = useState<any>(null);
  const [residences, setResidences] = useState<any[]>([]);
  const [images, setImages] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      if (!code) return;
      const { data: prof } = await supabase.from("profiles").select("*").eq("moissonneur_code", code).single();
      if (!prof) { setLoading(false); return; }
      setProfile(prof);

      const { data: res } = await supabase.from("residences").select("*").eq("host_id", prof.user_id).eq("is_published", true).order("created_at", { ascending: false });
      if (res) {
        setResidences(res);
        const imgPromises = res.map((r: any) => supabase.from("residence_images").select("*").eq("residence_id", r.id).order("display_order"));
        const imgResults = await Promise.all(imgPromises);
        const imgMap: Record<string, any[]> = {};
        res.forEach((r: any, i: number) => { imgMap[r.id] = imgResults[i].data || []; });
        setImages(imgMap);
      }
      setLoading(false);
    };
    fetch();
  }, [code]);

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground font-body">Chargement...</p></div>;
  if (!profile) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground font-body">Stand introuvable.</p></div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="glass-dark sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <span className="text-xl font-heading font-bold text-gradient-gold cursor-pointer" onClick={() => navigate("/")}>Moisson</span>
          <Button variant="gold-outline" size="sm" onClick={() => navigate("/besoins")}>Voir les besoins</Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="text-center mb-10">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Home className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-heading font-bold text-foreground">{profile.full_name || "Hôtel"}</h1>
          <p className="text-primary font-body font-semibold mt-1">{profile.moissonneur_code}</p>
          <p className="text-sm text-muted-foreground font-body mt-1">{residences.length} bien(s) publié(s)</p>
        </div>

        {residences.length === 0 ? (
          <div className="text-center py-16"><p className="text-muted-foreground font-body">Aucun bien publié.</p></div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {residences.map(r => (
              <div key={r.id} className="rounded-xl bg-card border border-border shadow-card overflow-hidden hover:border-primary/20 transition-colors">
                {images[r.id]?.length > 0 ? (
                  <div className="relative h-48 overflow-hidden">
                    <img src={images[r.id][0].image_url} alt={r.name} className="w-full h-full object-cover" />
                    {images[r.id].length > 1 && (
                      <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full text-xs bg-background/80 text-foreground font-body">+{images[r.id].length - 1} photos</span>
                    )}
                  </div>
                ) : (
                  <div className="h-48 bg-secondary flex items-center justify-center"><Home className="w-12 h-12 text-muted-foreground" /></div>
                )}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-heading font-semibold text-foreground">{r.name}</h3>
                    <span className="text-primary font-bold font-body">{r.min_price} FCFA</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground font-body mb-2">
                    <MapPin className="w-3 h-3" /> {r.neighborhood}, {r.city} — {r.country}
                  </div>
                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground font-body mb-2">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {r.capacity} pers.</span>
                    <span>{r.bedrooms} ch.</span>
                    <span className="px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary">{r.type}</span>
                  </div>
                  {r.description && <p className="text-sm text-muted-foreground font-body mb-2 line-clamp-2">{r.description}</p>}
                  {r.amenities?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {r.amenities.map((a: string) => <span key={a} className="px-2 py-0.5 rounded-full text-xs bg-secondary text-secondary-foreground font-body">{a}</span>)}
                    </div>
                  )}
                  {r.whatsapp_contact && (
                    <a href={`https://wa.me/${r.whatsapp_contact.replace(/[^0-9+]/g, "")}`} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-green-400 hover:underline font-body">
                      <Phone className="w-3 h-3" /> {r.whatsapp_contact}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default StandPage;
