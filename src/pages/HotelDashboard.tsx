import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, LogOut, User, Home, Bell, X, Pencil, Trash2, MapPin,
  Phone, List, Check, XCircle, Eye, Locate, Image as ImageIcon, Wallet, ShieldCheck
} from "lucide-react";

const HotelDashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [residences, setResidences] = useState<any[]>([]);
  const [allNeeds, setAllNeeds] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string>("residences");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [residenceImages, setResidenceImages] = useState<Record<string, any[]>>({});
  const [orderFilter, setOrderFilter] = useState("all");

  const [form, setForm] = useState({
    name: "", address: "", type: "appartement", capacity: 2, bedrooms: 1,
    min_price: 0, description: "", amenities: [] as string[],
    country: "Cameroun", city: "", neighborhood: "",
    gps_lat: null as number | null, gps_lng: null as number | null,
    whatsapp_contact: "", facebook_url: "", room_standard: "standard",
  });
  const [newImages, setNewImages] = useState<File[]>([]);

  const navigate = useNavigate();
  const { toast } = useToast();

  const amenityOptions = ["WiFi", "Climatisation", "Parking", "Cuisine équipée", "Piscine", "Terrasse", "Lave-linge", "TV"];
  const typeOptions = ["appartement", "chambre", "studio", "villa", "maison", "hôtel", "2 pièces", "3 pièces"];
  const standardOptions = ["standard", "économique", "confort", "premium", "luxe"];

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (!session) navigate("/auth");
      else setUser(session.user);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate("/auth");
      else { setUser(session.user); fetchAll(session.user.id); }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("hotel-notifs")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, (payload) => {
        const notif = payload.new as any;
        if (notif.user_id === user.id) {
          setNotifications((prev) => [notif, ...prev]);
          playSound();
          toast({ title: "🔔 Nouveau besoin", description: notif.message });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const playSound = () => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 800; osc.type = "sine";
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.5);
    } catch {}
  };

  const fetchAll = async (userId: string) => {
    const [resR, needsR, notifR, profR, ordR, adminR] = await Promise.all([
      supabase.from("residences").select("*").eq("host_id", userId).order("created_at", { ascending: false }),
      supabase.from("needs").select("*").eq("status", "active").order("created_at", { ascending: false }),
      supabase.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").eq("user_id", userId).single(),
      supabase.from("orders").select("*").eq("host_id", userId).order("created_at", { ascending: false }),
      supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
    ]);
    if (resR.data) {
      setResidences(resR.data);
      // Fetch images for each residence
      const imgPromises = resR.data.map((r: any) =>
        supabase.from("residence_images").select("*").eq("residence_id", r.id).order("display_order")
      );
      const imgResults = await Promise.all(imgPromises);
      const imgMap: Record<string, any[]> = {};
      resR.data.forEach((r: any, i: number) => {
        imgMap[r.id] = imgResults[i].data || [];
      });
      setResidenceImages(imgMap);
    }
    if (needsR.data) setAllNeeds(needsR.data);
    if (notifR.data) setNotifications(notifR.data);
    if (profR.data) setProfile(profR.data);
    if (ordR.data) setOrders(ordR.data);
    if (adminR.data) setIsAdmin(adminR.data);
    setLoading(false);
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAllRead = async () => {
    if (notifications.filter(n => !n.is_read).length === 0) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const getLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: "Erreur", description: "Géolocalisation non supportée.", variant: "destructive" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm(prev => ({ ...prev, gps_lat: pos.coords.latitude, gps_lng: pos.coords.longitude }));
        toast({ title: "Localisation récupérée" });
      },
      () => toast({ title: "Erreur", description: "Impossible d'obtenir la localisation.", variant: "destructive" })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.whatsapp_contact) {
      toast({ title: "Erreur", description: "Le WhatsApp est obligatoire.", variant: "destructive" });
      return;
    }

    const payload = {
      name: form.name, address: form.address, type: form.type, capacity: form.capacity,
      bedrooms: form.bedrooms, min_price: form.min_price, description: form.description,
      amenities: form.amenities, country: form.country, city: form.city,
      neighborhood: form.neighborhood, gps_lat: form.gps_lat, gps_lng: form.gps_lng,
      whatsapp_contact: form.whatsapp_contact, facebook_url: form.facebook_url,
      host_id: user.id,
    };

    let residenceId = editingId;

    if (editingId) {
      const { error } = await supabase.from("residences").update(payload).eq("id", editingId);
      if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Résidence mise à jour" });
    } else {
      const { data, error } = await supabase.from("residences").insert(payload).select().single();
      if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
      residenceId = data.id;
      toast({ title: "Résidence ajoutée" });
    }

    // Upload images
    if (newImages.length > 0 && residenceId) {
      setUploadingImages(true);
      for (let i = 0; i < newImages.length; i++) {
        const file = newImages[i];
        const path = `${residenceId}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage.from("residence-images").upload(path, file);
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from("residence-images").getPublicUrl(path);
          await supabase.from("residence_images").insert({
            residence_id: residenceId, image_url: urlData.publicUrl, display_order: i,
          });
        }
      }
      setUploadingImages(false);
    }

    resetForm();
    fetchAll(user.id);
  };

  const resetForm = () => {
    setForm({ name: "", address: "", type: "appartement", capacity: 2, bedrooms: 1, min_price: 0, description: "", amenities: [], country: "Cameroun", city: "", neighborhood: "", gps_lat: null, gps_lng: null, whatsapp_contact: "", facebook_url: "" });
    setNewImages([]);
    setShowForm(false);
    setEditingId(null);
  };

  const startEdit = (r: any) => {
    setForm({
      name: r.name, address: r.address, type: r.type, capacity: r.capacity, bedrooms: r.bedrooms,
      min_price: r.min_price, description: r.description || "", amenities: r.amenities || [],
      country: r.country || "Cameroun", city: r.city || "", neighborhood: r.neighborhood || "",
      gps_lat: r.gps_lat, gps_lng: r.gps_lng, whatsapp_contact: r.whatsapp_contact || "",
      facebook_url: r.facebook_url || "",
    });
    setEditingId(r.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("residences").delete().eq("id", id);
    toast({ title: "Résidence supprimée" });
    if (user) fetchAll(user.id);
  };

  const handleDeleteImage = async (imgId: string) => {
    await supabase.from("residence_images").delete().eq("id", imgId);
    if (user) fetchAll(user.id);
  };

  const toggleAmenity = (a: string) => {
    setForm(prev => ({ ...prev, amenities: prev.amenities.includes(a) ? prev.amenities.filter(x => x !== a) : [...prev.amenities, a] }));
  };

  const handleOrderAction = async (orderId: string, action: "accepted" | "refused") => {
    const { error } = await supabase.from("orders").update({ status: action }).eq("id", orderId);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else { toast({ title: action === "accepted" ? "Commande acceptée" : "Commande refusée" }); fetchAll(user.id); }
  };

  const handleSignOut = async () => { await supabase.auth.signOut(); navigate("/"); };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    const np = fd.get("newPassword") as string;
    if (np.length < 6) { toast({ title: "Erreur", description: "Min 6 caractères.", variant: "destructive" }); return; }
    const { error } = await supabase.auth.updateUser({ password: np });
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else { toast({ title: "Mot de passe mis à jour" }); (e.target as HTMLFormElement).reset(); }
  };

  const filteredOrders = orderFilter === "all" ? orders : orders.filter(o => o.status === orderFilter);

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground font-body">Chargement...</p></div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="glass-dark sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <span className="text-xl font-heading font-bold text-gradient-gold cursor-pointer" onClick={() => navigate("/")}>Moisson</span>
          <div className="flex items-center gap-1 overflow-x-auto">
            {[
              { key: "residences", label: "Biens", icon: Home },
              { key: "orders", label: "Commandes", icon: List },
              { key: "needs", label: "Besoins", icon: Eye },
              { key: "notifications", label: "Notifs", icon: Bell, badge: unreadCount },
              { key: "wallet", label: "Wallet", icon: Wallet },
              { key: "profile", label: "Profil", icon: User },
            ].map(tab => (
              <Button key={tab.key} variant={activeTab === tab.key ? "gold" : "ghost"} size="sm"
                onClick={() => { setActiveTab(tab.key); if (tab.key === "notifications") markAllRead(); }}
                className="relative shrink-0">
                <tab.icon className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.badge && tab.badge > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full text-xs flex items-center justify-center">{tab.badge}</span>
                )}
              </Button>
            ))}
            {isAdmin && (
              <Button variant={activeTab === "admin" ? "gold" : "ghost"} size="sm" onClick={() => navigate("/admin")} className="shrink-0">
                <ShieldCheck className="w-4 h-4 mr-1" /> <span className="hidden sm:inline">Admin</span>
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={handleSignOut} className="shrink-0"><LogOut className="w-4 h-4" /></Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* PROFILE */}
        {activeTab === "profile" && profile && (
          <div className="space-y-6">
            <h1 className="text-2xl font-heading font-bold text-foreground">Mon Profil Hôtel</h1>
            <div className="p-6 rounded-xl bg-card border border-border shadow-card">
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-muted-foreground text-xs">Nom</Label><p className="text-foreground font-body">{profile.full_name || "—"}</p></div>
                <div><Label className="text-muted-foreground text-xs">Email</Label><p className="text-foreground font-body">{user?.email}</p></div>
                <div><Label className="text-muted-foreground text-xs">Code Moissonneur</Label><p className="text-primary font-bold font-body">{profile.moissonneur_code}</p></div>
                <div><Label className="text-muted-foreground text-xs">Solde</Label><p className="text-primary font-bold font-body">{profile.wallet_balance} FCFA</p></div>
              </div>
            </div>
            <div className="p-6 rounded-xl bg-card border border-border shadow-card">
              <h2 className="text-lg font-heading font-semibold text-foreground mb-4">Modifier le mot de passe</h2>
              <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-sm">
                <div><Label className="font-body">Nouveau mot de passe</Label><Input type="password" name="newPassword" required minLength={6} className="mt-1" /></div>
                <Button type="submit" variant="gold">Mettre à jour</Button>
              </form>
            </div>
            <div className="p-6 rounded-xl bg-card border border-border shadow-card">
              <h2 className="text-lg font-heading font-semibold text-foreground mb-2">Ma page stand</h2>
              <p className="text-sm text-muted-foreground font-body mb-3">Partagez votre page vitrine avec vos clients.</p>
              <Button variant="gold-outline" onClick={() => navigate(`/stand/${profile.moissonneur_code}`)}>
                Voir mon stand
              </Button>
            </div>
          </div>
        )}

        {/* WALLET */}
        {activeTab === "wallet" && <WalletSection user={user} profile={profile} />}

        {/* NOTIFICATIONS */}
        {activeTab === "notifications" && (
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground mb-6">Notifications</h1>
            {notifications.length === 0 ? (
              <div className="text-center py-16"><Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" /><p className="text-muted-foreground font-body">Aucune notification.</p></div>
            ) : (
              <div className="grid gap-3">
                {notifications.map(n => (
                  <div key={n.id} className={`p-4 rounded-xl border transition-colors ${n.is_read ? "bg-card border-border" : "bg-primary/5 border-primary/20"}`}>
                    <p className="text-sm font-body text-foreground">{n.message}</p>
                    <p className="text-xs text-muted-foreground font-body mt-1">{new Date(n.created_at).toLocaleString("fr-FR")}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ORDERS */}
        {activeTab === "orders" && (
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground mb-4">Commandes</h1>
            <div className="flex gap-2 mb-6 flex-wrap">
              {[{ k: "all", l: "Toutes" }, { k: "pending", l: "En attente" }, { k: "accepted", l: "Acceptées" }, { k: "refused", l: "Refusées" }].map(f => (
                <Button key={f.k} variant={orderFilter === f.k ? "gold" : "outline"} size="sm" onClick={() => setOrderFilter(f.k)}>{f.l}</Button>
              ))}
            </div>
            {filteredOrders.length === 0 ? (
              <div className="text-center py-16"><List className="w-12 h-12 text-muted-foreground mx-auto mb-4" /><p className="text-muted-foreground font-body">Aucune commande.</p></div>
            ) : (
              <div className="grid gap-4">
                {filteredOrders.map(o => (
                  <div key={o.id} className="p-5 rounded-xl bg-card border border-border shadow-card">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-body ${
                        o.status === "pending" ? "bg-yellow-500/20 text-yellow-400" :
                        o.status === "accepted" ? "bg-green-500/20 text-green-400" :
                        "bg-destructive/20 text-destructive"
                      }`}>{o.status}</span>
                      <span className="text-primary font-bold font-body">{o.amount} FCFA</span>
                    </div>
                    <p className="text-sm text-muted-foreground font-body">Paiement : {o.payment_method}</p>
                    {o.host_message && <p className="text-sm text-foreground font-body mt-1">{o.host_message}</p>}
                    <p className="text-xs text-muted-foreground font-body mt-2">{new Date(o.created_at).toLocaleString("fr-FR")}</p>
                    {o.status === "pending" && (
                      <div className="flex gap-2 mt-3">
                        <Button variant="gold" size="sm" onClick={() => handleOrderAction(o.id, "accepted")}><Check className="w-3 h-3 mr-1" /> Accepter</Button>
                        <Button variant="destructive" size="sm" onClick={() => handleOrderAction(o.id, "refused")}><XCircle className="w-3 h-3 mr-1" /> Refuser</Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* NEEDS */}
        {activeTab === "needs" && (
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground mb-2">Besoins des Clients</h1>
            <p className="text-muted-foreground font-body text-sm mb-6">Tous les besoins actifs.</p>
            {allNeeds.length === 0 ? (
              <div className="text-center py-16"><List className="w-12 h-12 text-muted-foreground mx-auto mb-4" /><p className="text-muted-foreground font-body">Aucun besoin actif.</p></div>
            ) : (
              <div className="grid gap-4">
                {allNeeds.map(n => (
                  <div key={n.id} className="p-5 rounded-xl bg-card border border-border hover:border-primary/20 transition-colors shadow-card">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-heading font-semibold text-foreground capitalize">{n.type_needed}</h3>
                      <span className="px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-400 font-body">actif</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground font-body mb-2">
                      <MapPin className="w-3 h-3" /> {n.neighborhood}, {n.city} — {n.country}
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground font-body">
                      <span>{n.capacity} pers.</span>
                      {n.check_in && <span>Du {n.check_in}</span>}
                      {n.check_out && <span>au {n.check_out}</span>}
                      <span className="text-primary font-semibold">{n.budget} FCFA</span>
                    </div>
                    {n.description && <p className="text-sm text-muted-foreground font-body mt-2">{n.description}</p>}
                    <a href={`https://wa.me/${n.whatsapp_contact.replace(/[^0-9+]/g, "")}`} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-3 text-sm text-green-400 hover:underline font-body">
                      <Phone className="w-3 h-3" /> {n.whatsapp_contact}
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* RESIDENCES */}
        {activeTab === "residences" && (
          <>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground">Mes Biens</h1>
                <p className="text-muted-foreground font-body text-sm mt-1">Gérez vos résidences et annonces.</p>
              </div>
              <Button variant="gold" onClick={() => { resetForm(); setShowForm(true); }}><Plus className="w-4 h-4 mr-2" /> Ajouter</Button>
            </div>

            {showForm && (
              <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="w-full max-w-lg bg-card border border-border rounded-xl p-6 shadow-card max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-heading font-semibold text-foreground">{editingId ? "Modifier" : "Nouveau bien"}</h2>
                    <Button variant="ghost" size="icon" onClick={resetForm}><X className="w-4 h-4" /></Button>
                  </div>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div><Label className="font-body">Nom *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required className="mt-1" /></div>

                    <div><Label className="font-body">Contact WhatsApp *</Label><Input value={form.whatsapp_contact} onChange={e => setForm({ ...form, whatsapp_contact: e.target.value })} required className="mt-1" placeholder="+237 6XX XXX XXX" /></div>

                    <div><Label className="font-body">Facebook</Label><Input value={form.facebook_url} onChange={e => setForm({ ...form, facebook_url: e.target.value })} className="mt-1" placeholder="https://facebook.com/..." /></div>

                    <div className="grid grid-cols-3 gap-3">
                      <div><Label className="font-body">Pays</Label><Input value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} required className="mt-1" /></div>
                      <div><Label className="font-body">Ville</Label><Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} required className="mt-1" /></div>
                      <div><Label className="font-body">Quartier</Label><Input value={form.neighborhood} onChange={e => setForm({ ...form, neighborhood: e.target.value })} required className="mt-1" /></div>
                    </div>

                    <div><Label className="font-body">Adresse complète</Label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} required className="mt-1" /></div>

                    <div>
                      <Label className="font-body">Coordonnées GPS</Label>
                      <div className="flex gap-2 mt-1">
                        <Input placeholder="Latitude" value={form.gps_lat ?? ""} onChange={e => setForm({ ...form, gps_lat: e.target.value ? Number(e.target.value) : null })} className="flex-1" />
                        <Input placeholder="Longitude" value={form.gps_lng ?? ""} onChange={e => setForm({ ...form, gps_lng: e.target.value ? Number(e.target.value) : null })} className="flex-1" />
                        <Button type="button" variant="outline" size="icon" onClick={getLocation} title="Récupérer ma position"><Locate className="w-4 h-4" /></Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="font-body">Type</Label>
                        <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground font-body">
                          {typeOptions.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                        </select>
                      </div>
                      <div><Label className="font-body">Prix min (FCFA)</Label><Input type="number" value={form.min_price} onChange={e => setForm({ ...form, min_price: Number(e.target.value) })} min={0} className="mt-1" /></div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div><Label className="font-body">Capacité</Label><Input type="number" value={form.capacity} onChange={e => setForm({ ...form, capacity: Number(e.target.value) })} min={1} className="mt-1" /></div>
                      <div><Label className="font-body">Chambres</Label><Input type="number" value={form.bedrooms} onChange={e => setForm({ ...form, bedrooms: Number(e.target.value) })} min={0} className="mt-1" /></div>
                    </div>

                    <div>
                      <Label className="font-body">Équipements</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {amenityOptions.map(a => (
                          <button key={a} type="button" onClick={() => toggleAmenity(a)} className={`px-3 py-1 rounded-full text-xs font-body transition-colors ${form.amenities.includes(a) ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}>{a}</button>
                        ))}
                      </div>
                    </div>

                    <div><Label className="font-body">Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="mt-1" rows={3} /></div>

                    <div>
                      <Label className="font-body">Images</Label>
                      <input type="file" accept="image/*" multiple onChange={e => setNewImages(Array.from(e.target.files || []))} className="mt-1 w-full text-sm text-muted-foreground font-body file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:opacity-90" />
                      {newImages.length > 0 && <p className="text-xs text-muted-foreground mt-1">{newImages.length} image(s) sélectionnée(s)</p>}
                    </div>

                    <div className="flex gap-3 pt-2">
                      <Button type="button" variant="outline" className="flex-1" onClick={resetForm}>Annuler</Button>
                      <Button type="submit" variant="gold" className="flex-1" disabled={uploadingImages}>
                        {uploadingImages ? "Upload..." : editingId ? "Mettre à jour" : "Publier"}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {residences.length === 0 ? (
              <div className="text-center py-16"><Home className="w-12 h-12 text-muted-foreground mx-auto mb-4" /><p className="text-muted-foreground font-body">Aucun bien ajouté.</p></div>
            ) : (
              <div className="grid gap-4">
                {residences.map(r => (
                  <div key={r.id} className="p-5 rounded-xl bg-card border border-border hover:border-primary/20 transition-colors shadow-card">
                    {/* Images */}
                    {residenceImages[r.id]?.length > 0 && (
                      <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
                        {residenceImages[r.id].map((img: any) => (
                          <div key={img.id} className="relative shrink-0">
                            <img src={img.image_url} alt="" className="w-24 h-24 object-cover rounded-lg" />
                            <button onClick={() => handleDeleteImage(img.id)} className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full text-xs flex items-center justify-center">×</button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-heading font-semibold text-foreground">{r.name}</h3>
                          <span className="px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary font-body">{r.type}</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground font-body mb-1">
                          <MapPin className="w-3 h-3" /> {r.neighborhood}, {r.city} — {r.country}
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground font-body">
                          <span>{r.capacity} pers.</span>
                          <span>{r.bedrooms} ch.</span>
                          <span className="text-primary font-semibold">{r.min_price} FCFA</span>
                        </div>
                        {r.whatsapp_contact && (
                          <a href={`https://wa.me/${r.whatsapp_contact.replace(/[^0-9+]/g, "")}`} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 mt-2 text-sm text-green-400 hover:underline font-body">
                            <Phone className="w-3 h-3" /> {r.whatsapp_contact}
                          </a>
                        )}
                        {r.amenities?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {r.amenities.map((a: string) => <span key={a} className="px-2 py-0.5 rounded-full text-xs bg-secondary text-secondary-foreground font-body">{a}</span>)}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 ml-4">
                        <Button variant="ghost" size="icon" onClick={() => startEdit(r)}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

// Wallet Section Component
const WalletSection = ({ user, profile }: { user: any; profile: any }) => {
  const [tab, setTab] = useState<"history" | "recharge" | "transfer" | "withdraw">("history");
  const [transactions, setTransactions] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const [rechargeForm, setRechargeForm] = useState({ amount: 0, payment_method_id: "", transaction_id_external: "", description: "" });
  const [transferForm, setTransferForm] = useState({ recipient: "", amount: 0 });
  const [withdrawForm, setWithdrawForm] = useState({ amount: 0, method: "", contact: "" });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [txR, pmR] = await Promise.all([
      supabase.from("wallet_transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("payment_methods").select("*").eq("is_active", true),
    ]);
    if (txR.data) setTransactions(txR.data);
    if (pmR.data) setPaymentMethods(pmR.data);
    setLoading(false);
  };

  const handleRecharge = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("wallet_transactions").insert({
      user_id: user.id, type: "recharge", amount: rechargeForm.amount, status: "pending",
      payment_method_id: rechargeForm.payment_method_id || null,
      transaction_id_external: rechargeForm.transaction_id_external,
      description: rechargeForm.description,
    });
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else { toast({ title: "Demande de recharge envoyée", description: "L'admin vérifiera et validera votre recharge." }); setRechargeForm({ amount: 0, payment_method_id: "", transaction_id_external: "", description: "" }); fetchData(); }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data, error } = await supabase.rpc("process_wallet_transfer", {
      sender_id: user.id, recipient_identifier: transferForm.recipient, transfer_amount: transferForm.amount,
    });
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else if (data === "recipient_not_found") toast({ title: "Erreur", description: "Destinataire introuvable.", variant: "destructive" });
    else if (data === "insufficient_balance") toast({ title: "Erreur", description: "Solde insuffisant.", variant: "destructive" });
    else if (data === "cannot_transfer_to_self") toast({ title: "Erreur", description: "Impossible de transférer à vous-même.", variant: "destructive" });
    else { toast({ title: "Transfert réussi !" }); setTransferForm({ recipient: "", amount: 0 }); fetchData(); }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("wallet_transactions").insert({
      user_id: user.id, type: "withdrawal", amount: withdrawForm.amount, status: "pending",
      withdrawal_method: withdrawForm.method, withdrawal_contact: withdrawForm.contact,
    });
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else { toast({ title: "Demande de retrait envoyée" }); setWithdrawForm({ amount: 0, method: "", contact: "" }); fetchData(); }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copié !" });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-heading font-bold text-foreground">Portefeuille</h1>
        <div className="text-right">
          <p className="text-sm text-muted-foreground font-body">Solde disponible</p>
          <p className="text-2xl font-bold text-primary font-heading">{profile?.wallet_balance || 0} FCFA</p>
        </div>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {[{ k: "history", l: "Historique" }, { k: "recharge", l: "Recharger" }, { k: "transfer", l: "Transférer" }, { k: "withdraw", l: "Retirer" }].map(t => (
          <Button key={t.k} variant={tab === t.k ? "gold" : "outline"} size="sm" onClick={() => setTab(t.k as any)}>{t.l}</Button>
        ))}
      </div>

      {tab === "history" && (
        <div className="grid gap-3">
          {transactions.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground font-body">Aucune transaction.</p>
          ) : transactions.map(tx => (
            <div key={tx.id} className="p-4 rounded-xl bg-card border border-border">
              <div className="flex items-center justify-between">
                <div>
                  <span className={`text-sm font-semibold font-body ${tx.type.includes("in") || tx.type === "recharge" || tx.type === "received" ? "text-green-400" : "text-destructive"}`}>
                    {tx.type === "recharge" ? "Recharge" : tx.type === "transfer_out" ? "Transfert envoyé" : tx.type === "transfer_in" ? "Transfert reçu" : tx.type === "withdrawal" ? "Retrait" : tx.type}
                  </span>
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-body ${tx.status === "approved" ? "bg-green-500/20 text-green-400" : tx.status === "pending" ? "bg-yellow-500/20 text-yellow-400" : "bg-destructive/20 text-destructive"}`}>{tx.status}</span>
                </div>
                <span className="font-bold font-body text-foreground">{tx.amount} FCFA</span>
              </div>
              {tx.description && <p className="text-xs text-muted-foreground font-body mt-1">{tx.description}</p>}
              <p className="text-xs text-muted-foreground font-body mt-1">{new Date(tx.created_at).toLocaleString("fr-FR")}</p>
            </div>
          ))}
        </div>
      )}

      {tab === "recharge" && (
        <div className="max-w-md">
          {paymentMethods.length > 0 && (
            <div className="mb-6 space-y-3">
              <h3 className="text-sm font-semibold text-foreground font-body">Moyens de paiement disponibles :</h3>
              {paymentMethods.map(pm => (
                <div key={pm.id} className="p-3 rounded-lg bg-secondary border border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground font-body">{pm.name}</p>
                      <p className="text-xs text-muted-foreground font-body">{pm.details}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => copyToClipboard(pm.details)} className="text-xs">Copier</Button>
                      {pm.link && <a href={pm.link} target="_blank" rel="noopener noreferrer"><Button variant="ghost" size="sm" className="text-xs text-primary">Lien</Button></a>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <form onSubmit={handleRecharge} className="space-y-4 p-6 rounded-xl bg-card border border-border shadow-card">
            <h3 className="font-heading font-semibold text-foreground">Demande de recharge</h3>
            <div><Label className="font-body">Montant (FCFA)</Label><Input type="number" value={rechargeForm.amount} onChange={e => setRechargeForm({ ...rechargeForm, amount: Number(e.target.value) })} required min={1} className="mt-1" /></div>
            {paymentMethods.length > 0 && (
              <div>
                <Label className="font-body">Moyen de paiement utilisé</Label>
                <select value={rechargeForm.payment_method_id} onChange={e => setRechargeForm({ ...rechargeForm, payment_method_id: e.target.value })} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground font-body">
                  <option value="">Sélectionner...</option>
                  {paymentMethods.map(pm => <option key={pm.id} value={pm.id}>{pm.name}</option>)}
                </select>
              </div>
            )}
            <div><Label className="font-body">ID de transaction</Label><Input value={rechargeForm.transaction_id_external} onChange={e => setRechargeForm({ ...rechargeForm, transaction_id_external: e.target.value })} className="mt-1" placeholder="ID de votre paiement" /></div>
            <div><Label className="font-body">Description</Label><Textarea value={rechargeForm.description} onChange={e => setRechargeForm({ ...rechargeForm, description: e.target.value })} className="mt-1" rows={2} /></div>
            <Button type="submit" variant="gold" className="w-full">Envoyer la demande</Button>
          </form>
        </div>
      )}

      {tab === "transfer" && (
        <form onSubmit={handleTransfer} className="max-w-md space-y-4 p-6 rounded-xl bg-card border border-border shadow-card">
          <h3 className="font-heading font-semibold text-foreground">Transférer</h3>
          <div><Label className="font-body">Code Moissonneur ou email du destinataire</Label><Input value={transferForm.recipient} onChange={e => setTransferForm({ ...transferForm, recipient: e.target.value })} required className="mt-1" placeholder="MSN123456 ou email@..." /></div>
          <div><Label className="font-body">Montant (FCFA)</Label><Input type="number" value={transferForm.amount} onChange={e => setTransferForm({ ...transferForm, amount: Number(e.target.value) })} required min={1} className="mt-1" /></div>
          <Button type="submit" variant="gold" className="w-full">Transférer</Button>
        </form>
      )}

      {tab === "withdraw" && (
        <form onSubmit={handleWithdraw} className="max-w-md space-y-4 p-6 rounded-xl bg-card border border-border shadow-card">
          <h3 className="font-heading font-semibold text-foreground">Demande de retrait</h3>
          <div><Label className="font-body">Montant (FCFA)</Label><Input type="number" value={withdrawForm.amount} onChange={e => setWithdrawForm({ ...withdrawForm, amount: Number(e.target.value) })} required min={1} className="mt-1" /></div>
          <div>
            <Label className="font-body">Moyen de retrait</Label>
            <select value={withdrawForm.method} onChange={e => setWithdrawForm({ ...withdrawForm, method: e.target.value })} required className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground font-body">
              <option value="">Sélectionner...</option>
              <option value="mobile_money">Mobile Money</option>
              <option value="bank">Virement bancaire</option>
              <option value="crypto">Crypto</option>
            </select>
          </div>
          <div><Label className="font-body">Contact / Adresse</Label><Input value={withdrawForm.contact} onChange={e => setWithdrawForm({ ...withdrawForm, contact: e.target.value })} required className="mt-1" placeholder="Numéro, IBAN, ou adresse crypto" /></div>
          <Button type="submit" variant="gold" className="w-full">Envoyer la demande</Button>
        </form>
      )}
    </div>
  );
};

export default HotelDashboard;
