import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Phone, Users, Home, Search, Star, ShoppingCart, Wallet, X } from "lucide-react";
import { toast } from "sonner";

const Annuaire = () => {
  const [residences, setResidences] = useState<any[]>([]);
  const [images, setImages] = useState<Record<string, any[]>>({});
  const [hosts, setHosts] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [selectedResidence, setSelectedResidence] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "wallet">("cash");
  const [reserving, setReserving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user);
        supabase.from("profiles").select("*").eq("user_id", data.user.id).single().then(({ data: p }) => setProfile(p));
      }
    });
  }, []);

  useEffect(() => {
    const fetchAll = async () => {
      const { data: res } = await supabase
        .from("residences")
        .select("*")
        .eq("is_published", true)
        .order("created_at", { ascending: false });

      if (!res) { setLoading(false); return; }
      setResidences(res);

      // Fetch images
      const imgPromises = res.map((r: any) =>
        supabase.from("residence_images").select("*").eq("residence_id", r.id).order("display_order")
      );
      const imgResults = await Promise.all(imgPromises);
      const imgMap: Record<string, any[]> = {};
      res.forEach((r: any, i: number) => { imgMap[r.id] = imgResults[i].data || []; });
      setImages(imgMap);

      // Fetch host profiles
      const hostIds = [...new Set(res.map((r: any) => r.host_id))];
      if (hostIds.length > 0) {
        const { data: hostData } = await supabase
          .from("profiles")
          .select("*")
          .in("user_id", hostIds);
        if (hostData) {
          const hMap: Record<string, any> = {};
          hostData.forEach((h: any) => { hMap[h.user_id] = h; });
          setHosts(hMap);
        }
      }
      setLoading(false);
    };
    fetchAll();
  }, []);

  const [countryFilter, setCountryFilter] = useState("");

  const filteredResidences = residences.filter((r) => {
    const matchSearch = !search || r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.neighborhood.toLowerCase().includes(search.toLowerCase()) ||
      r.city.toLowerCase().includes(search.toLowerCase()) ||
      r.country.toLowerCase().includes(search.toLowerCase()) ||
      r.type.toLowerCase().includes(search.toLowerCase());
    const matchCity = !cityFilter || r.city.toLowerCase().includes(cityFilter.toLowerCase());
    const matchCountry = !countryFilter || r.country.toLowerCase().includes(countryFilter.toLowerCase());
    return matchSearch && matchCity && matchCountry;
  });

  const countries = [...new Set(residences.map((r) => r.country))].sort();
  const cities = [...new Set(residences.map((r) => r.city))].sort();

  const handleReserve = async (residence: any) => {
    if (!user) {
      toast.error("Veuillez vous connecter pour réserver");
      navigate("/auth");
      return;
    }
    setSelectedResidence(residence);
  };

  const confirmReservation = async () => {
    if (!selectedResidence || !user || !profile) return;
    setReserving(true);

    try {
      if (paymentMethod === "wallet") {
        if (profile.wallet_balance < selectedResidence.min_price) {
          toast.error("Solde insuffisant dans votre portefeuille");
          setReserving(false);
          return;
        }
      }

      // Create a need entry for the reservation
      const { data: need, error: needErr } = await supabase.from("needs").insert({
        user_id: user.id,
        city: selectedResidence.city,
        country: selectedResidence.country,
        neighborhood: selectedResidence.neighborhood,
        type_needed: selectedResidence.type,
        capacity: selectedResidence.capacity,
        budget: selectedResidence.min_price,
        room_standard: selectedResidence.room_standard,
        whatsapp_contact: profile.phone || "Non renseigné",
        description: `Réservation directe: ${selectedResidence.name}`,
        status: "active",
      }).select().single();

      if (needErr) throw needErr;

      // Create order
      const { error: orderErr } = await supabase.from("orders").insert({
        client_id: user.id,
        host_id: selectedResidence.host_id,
        residence_id: selectedResidence.id,
        need_id: need.id,
        amount: selectedResidence.min_price,
        payment_method: paymentMethod,
        status: "pending",
      });

      if (orderErr) throw orderErr;

      toast.success("Réservation envoyée avec succès ! L'hôtel sera notifié.");
      setSelectedResidence(null);
    } catch (e: any) {
      toast.error("Erreur: " + e.message);
    }
    setReserving(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="glass-dark sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <span className="text-xl font-heading font-bold text-gradient-gold cursor-pointer" onClick={() => navigate("/")}>Moisson</span>
          <div className="flex items-center gap-2">
            <Button variant="gold-outline" size="sm" onClick={() => navigate("/besoins")}>Besoins</Button>
            <Button variant="gold" size="sm" onClick={() => navigate("/auth")}>Connexion</Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-heading font-bold text-foreground">Annuaire des résidences</h1>
          <p className="text-muted-foreground font-body mt-2">Découvrez et réservez parmi toutes les résidences disponibles</p>
        </div>

        {/* Search & filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8 max-w-3xl mx-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher par nom, pays, ville, quartier, type..."
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
        ) : filteredResidences.length === 0 ? (
          <div className="text-center py-16">
            <Home className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground font-body">Aucune résidence trouvée.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredResidences.map((r) => {
              const host = hosts[r.host_id];
              return (
                <Card key={r.id} className="overflow-hidden hover:border-primary/30 transition-colors bg-card border-border">
                  {/* Image */}
                  {images[r.id]?.length > 0 ? (
                    <div className="relative h-48 overflow-hidden bg-secondary">
                      <img src={images[r.id][0].image_url} alt={r.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                      {images[r.id].length > 1 && (
                        <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full text-xs bg-background/80 text-foreground font-body">
                          +{images[r.id].length - 1} photos
                        </span>
                      )}
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs bg-primary text-primary-foreground font-body font-semibold">
                        {r.room_standard}
                      </span>
                    </div>
                  ) : (
                    <div className="h-48 bg-secondary flex items-center justify-center relative">
                      <Home className="w-12 h-12 text-muted-foreground" />
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs bg-primary text-primary-foreground font-body font-semibold">
                        {r.room_standard}
                      </span>
                    </div>
                  )}

                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-lg font-heading font-semibold text-foreground line-clamp-1">{r.name}</h3>
                      <span className="text-primary font-bold font-body whitespace-nowrap ml-2">{r.min_price} FCFA</span>
                    </div>

                    <div className="flex items-center gap-1 text-sm text-muted-foreground font-body mb-2">
                      <MapPin className="w-3 h-3 shrink-0" /> {r.neighborhood}, {r.city}
                    </div>

                    <div className="flex flex-wrap gap-2 text-sm text-muted-foreground font-body mb-3">
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {r.capacity} pers.</span>
                      <span>{r.bedrooms} ch.</span>
                      <span className="px-2 py-0.5 rounded-full text-xs bg-secondary text-secondary-foreground">{r.type}</span>
                    </div>

                    {r.description && <p className="text-sm text-muted-foreground font-body mb-3 line-clamp-2">{r.description}</p>}

                    {/* Host info */}
                    {host && (
                      <div
                        className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-secondary/50 cursor-pointer hover:bg-secondary transition-colors"
                        onClick={() => navigate(`/stand/${host.moissonneur_code}`)}
                      >
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Home className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-body font-semibold text-foreground">{host.full_name || "Hôtel"}</p>
                          <p className="text-xs text-muted-foreground font-body">Voir le stand →</p>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      {r.whatsapp_contact && (
                        <a
                          href={`https://wa.me/${r.whatsapp_contact.replace(/[^0-9+]/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1"
                        >
                          <Button variant="gold-outline" size="sm" className="w-full">
                            <Phone className="w-3 h-3" /> WhatsApp
                          </Button>
                        </a>
                      )}
                      <Button variant="gold" size="sm" className="flex-1" onClick={() => handleReserve(r)}>
                        <ShoppingCart className="w-3 h-3" /> Réserver
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Reservation modal */}
      {selectedResidence && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-card rounded-xl border border-border shadow-card max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-heading font-bold text-foreground">Réserver</h2>
              <button onClick={() => setSelectedResidence(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4 p-3 rounded-lg bg-secondary/50">
              <p className="font-heading font-semibold text-foreground">{selectedResidence.name}</p>
              <p className="text-sm text-muted-foreground font-body">{selectedResidence.neighborhood}, {selectedResidence.city}</p>
              <p className="text-primary font-bold font-body text-lg mt-1">{selectedResidence.min_price} FCFA</p>
            </div>

            <div className="mb-4">
              <label className="text-sm font-body font-semibold text-foreground block mb-2">Mode de paiement</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setPaymentMethod("cash")}
                  className={`p-3 rounded-lg border text-sm font-body font-semibold text-center transition-colors ${
                    paymentMethod === "cash"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  💵 Cash
                </button>
                <button
                  onClick={() => setPaymentMethod("wallet")}
                  className={`p-3 rounded-lg border text-sm font-body font-semibold text-center transition-colors ${
                    paymentMethod === "wallet"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  <span className="flex items-center justify-center gap-1"><Wallet className="w-4 h-4" /> Portefeuille</span>
                  {profile && <span className="text-xs font-normal block mt-1">{profile.wallet_balance} FCFA</span>}
                </button>
              </div>
            </div>

            {paymentMethod === "wallet" && profile && profile.wallet_balance < selectedResidence.min_price && (
              <p className="text-xs text-destructive font-body mb-3">⚠️ Solde insuffisant. Rechargez votre portefeuille.</p>
            )}

            <Button
              variant="gold"
              className="w-full"
              disabled={reserving || (paymentMethod === "wallet" && profile && profile.wallet_balance < selectedResidence.min_price)}
              onClick={confirmReservation}
            >
              {reserving ? "Envoi..." : "Confirmer la réservation"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Annuaire;
