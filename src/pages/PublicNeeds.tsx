import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, Users, Calendar, Search, Home } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Need = Tables<"needs">;

const PublicNeeds = () => {
  const [needs, setNeeds] = useState<Need[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
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

    const channel = supabase
      .channel("public-needs")
      .on("postgres_changes", { event: "*", schema: "public", table: "needs" }, () => {
        fetchNeeds();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const countries = [...new Set(needs.map((n) => n.country))].sort();
  const cities = [...new Set(needs.map((n) => n.city))].sort();

  const filteredNeeds = needs.filter((n) => {
    const s = search.toLowerCase();
    const matchSearch = !search ||
      n.city.toLowerCase().includes(s) ||
      n.country.toLowerCase().includes(s) ||
      n.neighborhood.toLowerCase().includes(s) ||
      n.type_needed.toLowerCase().includes(s) ||
      (n.description || "").toLowerCase().includes(s);
    const matchCountry = !countryFilter || n.country === countryFilter;
    const matchCity = !cityFilter || n.city === cityFilter;
    return matchSearch && matchCountry && matchCity;
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="glass-dark sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <span className="text-xl font-heading font-bold text-gradient-gold cursor-pointer" onClick={() => navigate("/")}>Moisson</span>
          <div className="flex items-center gap-2">
            <Button variant="gold-outline" size="sm" onClick={() => navigate("/annuaire")}>Annuaire</Button>
            <Button variant="gold" size="sm" onClick={() => navigate("/auth")}>Connexion</Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground">Besoins en cours</h1>
          <p className="text-muted-foreground font-body text-sm mt-1">Tous les besoins de logement émis par les clients.</p>
        </div>

        {/* Search & filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8 max-w-3xl mx-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher par pays, ville, quartier, type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-card border border-border text-foreground font-body text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            className="px-4 py-2.5 rounded-lg bg-card border border-border text-foreground font-body text-sm focus:border-primary focus:outline-none"
          >
            <option value="">Tous les pays</option>
            {countries.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="px-4 py-2.5 rounded-lg bg-card border border-border text-foreground font-body text-sm focus:border-primary focus:outline-none"
          >
            <option value="">Toutes les villes</option>
            {cities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="text-center py-16 text-muted-foreground font-body">Chargement...</div>
        ) : filteredNeeds.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground font-body">Aucun besoin trouvé.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredNeeds.map((n) => (
              <div key={n.id} className="p-5 rounded-xl bg-card border border-border hover:border-primary/20 transition-colors shadow-card">
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="text-lg font-heading font-semibold text-foreground capitalize">{n.type_needed}</h3>
                  <span className="px-2 py-0.5 rounded-full text-xs bg-primary/20 text-primary font-body">{n.room_standard}</span>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground font-body mb-2">
                  <MapPin className="w-3 h-3 shrink-0" /> {n.neighborhood}, {n.city} — {n.country}
                </div>
                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground font-body mb-2">
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {n.capacity} pers.</span>
                  {n.check_in && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {n.check_in}{n.check_in_time ? ` à ${n.check_in_time}` : ""}</span>}
                  {n.check_out && <span>→ {n.check_out}{n.check_out_time ? ` à ${n.check_out_time}` : ""}</span>}
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
