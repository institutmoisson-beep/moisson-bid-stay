import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Users, Home, MapPin, Eye } from "lucide-react";

const CityManagerDashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [zones, setZones] = useState<any[]>([]);
  const [zoneProfiles, setZoneProfiles] = useState<any[]>([]);
  const [zoneResidences, setZoneResidences] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedZone, setSelectedZone] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { navigate("/auth"); return; }
      setUser(session.user);
      const { data: z } = await supabase.from("city_manager_zones").select("*").eq("user_id", session.user.id);
      if (z && z.length > 0) {
        setZones(z);
        setSelectedZone(z[0]);
        await fetchZoneData(z[0]);
      }
      setLoading(false);
    });
  }, [navigate]);

  const fetchZoneData = async (zone: any) => {
    const [profR, resR] = await Promise.all([
      supabase.from("profiles").select("*").eq("city", zone.city).eq("country", zone.country),
      supabase.from("residences").select("*").eq("city", zone.city).eq("country", zone.country),
    ]);
    if (profR.data) setZoneProfiles(profR.data);
    if (resR.data) setZoneResidences(resR.data);
  };

  const selectZone = async (zone: any) => {
    setSelectedZone(zone);
    await fetchZoneData(zone);
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground font-body">Chargement...</p></div>;

  const zoneClients = zoneProfiles.filter(p => p.role === "client");
  const zoneHosts = zoneProfiles.filter(p => p.role === "host");

  return (
    <div className="min-h-screen bg-background">
      <header className="glass-dark sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4" /></Button>
            <span className="text-xl font-heading font-bold text-gradient-gold">Chef de ville</span>
          </div>
          {selectedZone && (
            <span className="text-sm text-primary font-body flex items-center gap-1"><MapPin className="w-3 h-3" />{selectedZone.city}, {selectedZone.country}</span>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {zones.length > 1 && (
          <div className="flex gap-2 mb-6 flex-wrap">
            {zones.map(z => (
              <Button key={z.id} variant={selectedZone?.id === z.id ? "gold" : "outline"} size="sm" onClick={() => selectZone(z)}>
                {z.city}, {z.country}
              </Button>
            ))}
          </div>
        )}

        {selectedZone && (
          <>
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="p-4 rounded-xl bg-card border border-border shadow-card text-center">
                <p className="text-2xl font-heading font-bold text-primary">{zoneClients.length}</p>
                <p className="text-xs text-muted-foreground font-body">Clients</p>
              </div>
              <div className="p-4 rounded-xl bg-card border border-border shadow-card text-center">
                <p className="text-2xl font-heading font-bold text-primary">{zoneHosts.length}</p>
                <p className="text-xs text-muted-foreground font-body">Hôtels</p>
              </div>
              <div className="p-4 rounded-xl bg-card border border-border shadow-card text-center">
                <p className="text-2xl font-heading font-bold text-primary">{zoneResidences.length}</p>
                <p className="text-xs text-muted-foreground font-body">Résidences</p>
              </div>
            </div>

            <h2 className="text-lg font-heading font-bold text-foreground mb-3">Hôtels de la zone</h2>
            <div className="grid gap-3 mb-8">
              {zoneHosts.map(h => (
                <div key={h.id} className="p-4 rounded-xl bg-card border border-border flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground font-body">{h.full_name || "—"}</p>
                    <p className="text-xs text-muted-foreground font-body">{h.moissonneur_code} · Solde: {h.wallet_balance} FCFA</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => navigate(`/stand/${h.moissonneur_code}`)} className="text-xs text-primary"><Eye className="w-3 h-3 mr-1" />Stand</Button>
                </div>
              ))}
              {zoneHosts.length === 0 && <p className="text-sm text-muted-foreground font-body">Aucun hôtel dans cette zone.</p>}
            </div>

            <h2 className="text-lg font-heading font-bold text-foreground mb-3">Résidences de la zone</h2>
            <div className="grid gap-3 mb-8">
              {zoneResidences.map(r => (
                <div key={r.id} className="p-4 rounded-xl bg-card border border-border">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-foreground font-body">{r.name}</span>
                    <span className="text-xs text-primary font-body">{r.min_price} FCFA</span>
                  </div>
                  <p className="text-xs text-muted-foreground font-body">{r.neighborhood} · {r.type} · {r.capacity} pers.</p>
                </div>
              ))}
              {zoneResidences.length === 0 && <p className="text-sm text-muted-foreground font-body">Aucune résidence dans cette zone.</p>}
            </div>

            <h2 className="text-lg font-heading font-bold text-foreground mb-3">Clients de la zone</h2>
            <div className="grid gap-3">
              {zoneClients.map(c => (
                <div key={c.id} className="p-4 rounded-xl bg-card border border-border flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground font-body">{c.full_name || "—"}</p>
                    <p className="text-xs text-muted-foreground font-body">{c.moissonneur_code}</p>
                  </div>
                </div>
              ))}
              {zoneClients.length === 0 && <p className="text-sm text-muted-foreground font-body">Aucun client dans cette zone.</p>}
            </div>
          </>
        )}

        {zones.length === 0 && (
          <div className="text-center py-16">
            <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground font-body">Aucune zone assignée.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default CityManagerDashboard;
