import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, Users, Home, ArrowLeft, ChevronLeft, ChevronRight, ShoppingCart, Wallet, X, Star } from "lucide-react";
import { toast } from "sonner";

const ResidenceDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [residence, setResidence] = useState<any>(null);
  const [images, setImages] = useState<any[]>([]);
  const [host, setHost] = useState<any>(null);
  const [ratings, setRatings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentImg, setCurrentImg] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [showReserve, setShowReserve] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "wallet">("cash");
  const [reserving, setReserving] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user);
        supabase.from("profiles").select("*").eq("user_id", data.user.id).single().then(({ data: p }) => setProfile(p));
      }
    });
  }, []);

  useEffect(() => {
    if (!id) return;
    const fetch = async () => {
      const [resR, imgR, ratR] = await Promise.all([
        supabase.from("residences").select("*").eq("id", id).single(),
        supabase.from("residence_images").select("*").eq("residence_id", id).order("display_order"),
        supabase.from("ratings").select("*").eq("residence_id", id),
      ]);
      if (resR.data) {
        setResidence(resR.data);
        const { data: h } = await supabase.from("profiles").select("*").eq("user_id", resR.data.host_id).single();
        if (h) setHost(h);
      }
      setImages(imgR.data || []);
      setRatings(ratR.data || []);
      setLoading(false);
    };
    fetch();
  }, [id]);

  const confirmReservation = async () => {
    if (!residence || !user || !profile) return;
    setReserving(true);
    try {
      if (paymentMethod === "wallet" && profile.wallet_balance < residence.min_price) {
        toast.error("Solde insuffisant dans votre portefeuille");
        setReserving(false);
        return;
      }
      const { data: need, error: needErr } = await supabase.from("needs").insert({
        user_id: user.id, city: residence.city, country: residence.country,
        neighborhood: residence.neighborhood, type_needed: residence.type,
        capacity: residence.capacity, budget: residence.min_price,
        room_standard: residence.room_standard,
        whatsapp_contact: profile.phone || "Non renseigné",
        description: `Réservation directe: ${residence.name}`, status: "active",
      }).select().single();
      if (needErr) throw needErr;

      const { error: orderErr } = await supabase.from("orders").insert({
        client_id: user.id, host_id: residence.host_id, residence_id: residence.id,
        need_id: need.id, amount: residence.min_price, payment_method: paymentMethod, status: "pending",
      });
      if (orderErr) throw orderErr;
      toast.success("Réservation envoyée !");
      setShowReserve(false);
    } catch (e: any) { toast.error("Erreur: " + e.message); }
    setReserving(false);
  };

  const avgRating = ratings.length > 0
    ? (ratings.reduce((s, r) => s + (r.rating_hotel + r.rating_accueil + r.rating_restauration) / 3, 0) / ratings.length).toFixed(1)
    : null;

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground font-body">Chargement...</p></div>;
  if (!residence) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground font-body">Résidence introuvable.</p></div>;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="glass-dark sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" /> <span className="text-sm font-body">Retour</span>
          </button>
          <span className="text-lg font-heading font-bold text-gradient-gold cursor-pointer" onClick={() => navigate("/")}>Moisson</span>
        </div>
      </header>

      {/* Image gallery */}
      <div className="relative bg-secondary">
        {images.length > 0 ? (
          <div className="relative max-w-5xl mx-auto">
            <img
              src={images[currentImg].image_url}
              alt={`${residence.name} - Photo ${currentImg + 1}`}
              className="w-full h-64 sm:h-80 md:h-96 object-cover cursor-pointer"
              onClick={() => setFullscreen(true)}
              loading="lazy"
              decoding="async"
            />
            {images.length > 1 && (
              <>
                <button onClick={() => setCurrentImg(i => (i - 1 + images.length) % images.length)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/80 flex items-center justify-center hover:bg-background transition-colors">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button onClick={() => setCurrentImg(i => (i + 1) % images.length)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/80 flex items-center justify-center hover:bg-background transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {images.map((_, i) => (
                    <button key={i} onClick={() => setCurrentImg(i)}
                      className={`w-2.5 h-2.5 rounded-full transition-colors ${i === currentImg ? "bg-primary" : "bg-background/60"}`} />
                  ))}
                </div>
              </>
            )}
            <span className="absolute top-3 right-3 px-2 py-1 rounded-full text-xs bg-background/80 text-foreground font-body">
              {currentImg + 1}/{images.length}
            </span>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center max-w-5xl mx-auto"><Home className="w-16 h-16 text-muted-foreground" /></div>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="max-w-5xl mx-auto px-4 py-3 flex gap-2 overflow-x-auto scrollbar-hide">
          {images.map((img, i) => (
            <button key={img.id} onClick={() => setCurrentImg(i)}
              className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${i === currentImg ? "border-primary" : "border-transparent opacity-60 hover:opacity-100"}`}>
              <img src={img.image_url} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
            </button>
          ))}
        </div>
      )}

      {/* Details */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            {/* Title & badges */}
            <div>
              <div className="flex items-start justify-between gap-3 mb-2">
                <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground">{residence.name}</h1>
                <span className="shrink-0 px-3 py-1 rounded-full text-sm bg-primary text-primary-foreground font-body font-bold">
                  {residence.min_price} FCFA
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground font-body">
                <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{residence.neighborhood}, {residence.city} — {residence.country}</span>
                {avgRating && <span className="flex items-center gap-1 text-primary"><Star className="w-4 h-4 fill-primary" />{avgRating}</span>}
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="px-3 py-1 rounded-full text-xs bg-secondary text-secondary-foreground font-body">{residence.type}</span>
                <span className="px-3 py-1 rounded-full text-xs bg-primary/10 text-primary font-body font-semibold">{residence.room_standard}</span>
                <span className="px-3 py-1 rounded-full text-xs bg-secondary text-secondary-foreground font-body flex items-center gap-1"><Users className="w-3 h-3" />{residence.capacity} pers.</span>
                <span className="px-3 py-1 rounded-full text-xs bg-secondary text-secondary-foreground font-body">{residence.bedrooms} chambre(s)</span>
              </div>
            </div>

            {/* Description */}
            {residence.description && (
              <div>
                <h2 className="text-lg font-heading font-semibold text-foreground mb-2">Description</h2>
                <p className="text-muted-foreground font-body whitespace-pre-line">{residence.description}</p>
              </div>
            )}

            {/* Amenities */}
            {residence.amenities?.length > 0 && (
              <div>
                <h2 className="text-lg font-heading font-semibold text-foreground mb-2">Équipements</h2>
                <div className="flex flex-wrap gap-2">
                  {residence.amenities.map((a: string) => (
                    <span key={a} className="px-3 py-1 rounded-full text-xs bg-secondary text-secondary-foreground font-body">{a}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Ratings */}
            {ratings.length > 0 && (
              <div>
                <h2 className="text-lg font-heading font-semibold text-foreground mb-3">Avis ({ratings.length})</h2>
                <div className="space-y-3">
                  {ratings.slice(0, 5).map(r => (
                    <div key={r.id} className="p-3 rounded-lg bg-secondary/50 border border-border">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground font-body mb-1">
                        <span>Hôtel: {r.rating_hotel}/5</span>
                        <span>Accueil: {r.rating_accueil}/5</span>
                        <span>Restauration: {r.rating_restauration}/5</span>
                      </div>
                      {r.comment && <p className="text-sm text-foreground font-body">{r.comment}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Host card */}
            {host && (
              <div className="p-4 rounded-xl bg-card border border-border shadow-card cursor-pointer hover:border-primary/30 transition-colors"
                onClick={() => navigate(`/stand/${host.moissonneur_code}`)}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Home className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-heading font-semibold text-foreground">{host.full_name || "Hôtel"}</p>
                    <p className="text-xs text-primary font-body">{host.moissonneur_code}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground font-body">Voir le stand →</p>
              </div>
            )}

            {/* Actions */}
            <div className="p-4 rounded-xl bg-card border border-border shadow-card space-y-3">
              <Button variant="gold" className="w-full" onClick={() => {
                if (!user) { toast.error("Connectez-vous pour réserver"); navigate("/auth"); return; }
                setShowReserve(true);
              }}>
                <ShoppingCart className="w-4 h-4 mr-2" /> Réserver maintenant
              </Button>
              {residence.whatsapp_contact && (
                <a href={`https://wa.me/${residence.whatsapp_contact.replace(/[^0-9+]/g, "")}`} target="_blank" rel="noopener noreferrer">
                  <Button variant="gold-outline" className="w-full">
                    <Phone className="w-4 h-4 mr-2" /> Contacter via WhatsApp
                  </Button>
                </a>
              )}
            </div>

            {/* Address */}
            {residence.address && (
              <div className="p-4 rounded-xl bg-card border border-border shadow-card">
                <h3 className="text-sm font-heading font-semibold text-foreground mb-1">Adresse</h3>
                <p className="text-sm text-muted-foreground font-body">{residence.address}</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Fullscreen image viewer */}
      {fullscreen && (
        <div className="fixed inset-0 z-[70] bg-black flex items-center justify-center" onClick={() => setFullscreen(false)}>
          <button className="absolute top-4 right-4 text-white/80 hover:text-white z-10"><X className="w-8 h-8" /></button>
          <img src={images[currentImg].image_url} alt="" className="max-w-full max-h-full object-contain" onClick={e => e.stopPropagation()} />
          {images.length > 1 && (
            <>
              <button onClick={e => { e.stopPropagation(); setCurrentImg(i => (i - 1 + images.length) % images.length); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20">
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
              <button onClick={e => { e.stopPropagation(); setCurrentImg(i => (i + 1) % images.length); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20">
                <ChevronRight className="w-6 h-6 text-white" />
              </button>
            </>
          )}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-sm font-body">{currentImg + 1} / {images.length}</div>
        </div>
      )}

      {/* Reservation modal */}
      {showReserve && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-card rounded-xl border border-border shadow-card max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-heading font-bold text-foreground">Réserver</h2>
              <button onClick={() => setShowReserve(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="mb-4 p-3 rounded-lg bg-secondary/50">
              <p className="font-heading font-semibold text-foreground">{residence.name}</p>
              <p className="text-sm text-muted-foreground font-body">{residence.neighborhood}, {residence.city}</p>
              <p className="text-primary font-bold font-body text-lg mt-1">{residence.min_price} FCFA</p>
            </div>
            <div className="mb-4">
              <label className="text-sm font-body font-semibold text-foreground block mb-2">Mode de paiement</label>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setPaymentMethod("cash")}
                  className={`p-3 rounded-lg border text-sm font-body font-semibold text-center transition-colors ${paymentMethod === "cash" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30"}`}>
                  💵 Cash
                </button>
                <button onClick={() => setPaymentMethod("wallet")}
                  className={`p-3 rounded-lg border text-sm font-body font-semibold text-center transition-colors ${paymentMethod === "wallet" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30"}`}>
                  <span className="flex items-center justify-center gap-1"><Wallet className="w-4 h-4" /> Portefeuille</span>
                  {profile && <span className="text-xs font-normal block mt-1">{profile.wallet_balance} FCFA</span>}
                </button>
              </div>
            </div>
            {paymentMethod === "wallet" && profile && profile.wallet_balance < residence.min_price && (
              <p className="text-xs text-destructive font-body mb-3">⚠️ Solde insuffisant.</p>
            )}
            <Button variant="gold" className="w-full"
              disabled={reserving || (paymentMethod === "wallet" && profile && profile.wallet_balance < residence.min_price)}
              onClick={confirmReservation}>
              {reserving ? "Envoi..." : "Confirmer la réservation"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResidenceDetail;
