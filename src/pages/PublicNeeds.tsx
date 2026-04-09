import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, Users, Calendar, ArrowLeft } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Need = Tables<"needs">;

const PublicNeeds = () => {
  const [needs, setNeeds] = useState<Need[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchNeeds = async () => {
      const { data } = await supabase
        .from("needs")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (data) setNeeds(data);
      setLoading(false);
    };
    fetchNeeds();

    // Realtime updates
    const channel = supabase
      .channel("public-needs")
      .on("postgres_changes", { event: "*", schema: "public", table: "needs" }, () => {
        fetchNeeds();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="glass-dark sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <span className="text-xl font-heading font-bold text-gradient-gold cursor-pointer" onClick={() => navigate("/")}>Moisson</span>
          <Button variant="gold-outline" size="sm" onClick={() => navigate("/auth")}>Connexion</Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground">Besoins en cours</h1>
          <p className="text-muted-foreground font-body text-sm mt-1">Tous les besoins de logement émis par les clients.</p>
        </div>

        {loading ? (
          <div className="text-center py-16 text-muted-foreground font-body">Chargement...</div>
        ) : needs.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground font-body">Aucun besoin actif pour le moment.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {needs.map((n) => (
              <div key={n.id} className="p-5 rounded-xl bg-card border border-border hover:border-primary/20 transition-colors shadow-card">
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="text-lg font-heading font-semibold text-foreground capitalize">{n.type_needed}</h3>
                  <span className="px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-400 font-body">actif</span>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground font-body mb-2">
                  <MapPin className="w-3 h-3 shrink-0" /> {n.neighborhood}, {n.city} — {n.country}
                </div>
                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground font-body mb-2">
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {n.capacity} pers.</span>
                  {n.check_in && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {n.check_in}{(n as any).check_in_time ? ` à ${(n as any).check_in_time}` : ""}</span>}
                  {n.check_out && <span>→ {n.check_out}{(n as any).check_out_time ? ` à ${(n as any).check_out_time}` : ""}</span>}
                </div>
                <p className="text-primary font-bold font-body text-lg mb-2">{n.budget} FCFA</p>
                {n.description && <p className="text-sm text-muted-foreground font-body mb-3">{n.description}</p>}
                <a
                  href={`https://wa.me/${n.whatsapp_contact.replace(/[^0-9+]/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-green-400 hover:underline font-body"
                >
                  <Phone className="w-3 h-3" /> {n.whatsapp_contact}
                </a>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default PublicNeeds;
