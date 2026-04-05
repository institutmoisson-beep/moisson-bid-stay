import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, LogOut, User, Home, Bell, X, Pencil, Trash2, MapPin, Phone, List } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Residence = Tables<"residences">;
type Need = Tables<"needs">;
type Notification = Tables<"notifications">;
type Profile = Tables<"profiles">;

const HotelDashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [residences, setResidences] = useState<Residence[]>([]);
  const [allNeeds, setAllNeeds] = useState<Need[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeTab, setActiveTab] = useState<"residences" | "needs" | "notifications" | "profile">("residences");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [form, setForm] = useState({
    name: "", address: "", type: "appartement", capacity: 2, bedrooms: 1,
    min_price: 0, description: "", amenities: [] as string[],
  });

  const navigate = useNavigate();
  const { toast } = useToast();

  const amenityOptions = ["WiFi", "Climatisation", "Parking", "Cuisine équipée", "Piscine", "Terrasse", "Lave-linge", "TV"];
  const typeOptions = ["appartement", "chambre", "studio", "villa", "maison"];

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (!session) navigate("/auth");
      else setUser(session.user);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate("/auth");
      else {
        setUser(session.user);
        fetchAll(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Realtime notifications
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("hotel-notifications")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, (payload) => {
        const notif = payload.new as Notification;
        if (notif.user_id === user.id) {
          setNotifications((prev) => [notif, ...prev]);
          playNotificationSound();
          toast({ title: "🔔 Nouveau besoin", description: notif.message });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const playNotificationSound = () => {
    try {
      const ctx = new AudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.frequency.value = 800;
      oscillator.type = "sine";
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.5);
    } catch {}
  };

  const fetchAll = async (userId: string) => {
    const [resResult, needsResult, notifResult, profResult] = await Promise.all([
      supabase.from("residences").select("*").eq("host_id", userId).order("created_at", { ascending: false }),
      supabase.from("needs").select("*").eq("status", "active").order("created_at", { ascending: false }),
      supabase.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").eq("user_id", userId).single(),
    ]);
    if (resResult.data) setResidences(resResult.data);
    if (needsResult.data) setAllNeeds(needsResult.data);
    if (notifResult.data) setNotifications(notifResult.data);
    if (profResult.data) setProfile(profResult.data);
    setLoading(false);
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAllRead = async () => {
    const unread = notifications.filter((n) => !n.is_read);
    if (unread.length === 0) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const payload = { ...form, host_id: user.id };

    if (editingId) {
      const { error } = await supabase.from("residences").update(payload).eq("id", editingId);
      if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Résidence mise à jour" });
    } else {
      const { error } = await supabase.from("residences").insert(payload);
      if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Résidence ajoutée" });
    }
    resetForm();
    fetchAll(user.id);
  };

  const resetForm = () => {
    setForm({ name: "", address: "", type: "appartement", capacity: 2, bedrooms: 1, min_price: 0, description: "", amenities: [] });
    setShowForm(false);
    setEditingId(null);
  };

  const startEdit = (r: Residence) => {
    setForm({ name: r.name, address: r.address, type: r.type, capacity: r.capacity, bedrooms: r.bedrooms, min_price: r.min_price, description: r.description || "", amenities: r.amenities || [] });
    setEditingId(r.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("residences").delete().eq("id", id);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Résidence supprimée" });
    if (user) fetchAll(user.id);
  };

  const toggleAmenity = (a: string) => {
    setForm((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(a) ? prev.amenities.filter((x) => x !== a) : [...prev.amenities, a],
    }));
  };

  const handleSignOut = async () => { await supabase.auth.signOut(); navigate("/"); };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const newPassword = formData.get("newPassword") as string;
    if (newPassword.length < 6) { toast({ title: "Erreur", description: "Min 6 caractères.", variant: "destructive" }); return; }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); }
    else { toast({ title: "Mot de passe mis à jour" }); (e.target as HTMLFormElement).reset(); }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="glass-dark sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <span className="text-xl font-heading font-bold text-gradient-gold cursor-pointer" onClick={() => navigate("/")}>Moisson</span>
          <div className="flex items-center gap-1">
            <Button variant={activeTab === "residences" ? "gold" : "ghost"} size="sm" onClick={() => setActiveTab("residences")}>
              <Home className="w-4 h-4 mr-1" /> Biens
            </Button>
            <Button variant={activeTab === "needs" ? "gold" : "ghost"} size="sm" onClick={() => setActiveTab("needs")}>
              <List className="w-4 h-4 mr-1" /> Besoins
            </Button>
            <Button variant={activeTab === "notifications" ? "gold" : "ghost"} size="sm" onClick={() => { setActiveTab("notifications"); markAllRead(); }} className="relative">
              <Bell className="w-4 h-4 mr-1" /> Notifs
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full text-xs flex items-center justify-center">{unreadCount}</span>
              )}
            </Button>
            <Button variant={activeTab === "profile" ? "gold" : "ghost"} size="sm" onClick={() => setActiveTab("profile")}>
              <User className="w-4 h-4 mr-1" /> Profil
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* PROFILE TAB */}
        {activeTab === "profile" && profile && (
          <div className="space-y-6">
            <h1 className="text-2xl font-heading font-bold text-foreground">Mon Profil Hôtel</h1>
            <div className="p-6 rounded-xl bg-card border border-border shadow-card space-y-4">
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
                <div><Label className="font-body">Nouveau mot de passe</Label><Input type="password" name="newPassword" placeholder="••••••••" required minLength={6} className="mt-1" /></div>
                <Button type="submit" variant="gold">Mettre à jour</Button>
              </form>
            </div>
          </div>
        )}

        {/* NOTIFICATIONS TAB */}
        {activeTab === "notifications" && (
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground mb-6">Notifications</h1>
            {notifications.length === 0 ? (
              <div className="text-center py-16">
                <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground font-body">Aucune notification.</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {notifications.map((n) => (
                  <div key={n.id} className={`p-4 rounded-xl border transition-colors ${n.is_read ? "bg-card border-border" : "bg-primary/5 border-primary/20"}`}>
                    <p className="text-sm font-body text-foreground">{n.message}</p>
                    <p className="text-xs text-muted-foreground font-body mt-1">{new Date(n.created_at).toLocaleString("fr-FR")}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* NEEDS TAB - all active needs */}
        {activeTab === "needs" && (
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground mb-2">Besoins des Clients</h1>
            <p className="text-muted-foreground font-body text-sm mb-6">Tous les besoins actifs émis par les clients.</p>
            {allNeeds.length === 0 ? (
              <div className="text-center py-16">
                <List className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground font-body">Aucun besoin actif pour le moment.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {allNeeds.map((n) => (
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
                    <a
                      href={`https://wa.me/${n.whatsapp_contact.replace(/[^0-9+]/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-3 text-sm text-green-400 hover:underline font-body"
                    >
                      <Phone className="w-3 h-3" /> {n.whatsapp_contact}
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* RESIDENCES TAB */}
        {activeTab === "residences" && (
          <>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground">Mes Biens</h1>
                <p className="text-muted-foreground font-body text-sm mt-1">Gérez vos résidences et annonces.</p>
              </div>
              <Button variant="gold" onClick={() => { resetForm(); setShowForm(true); }}>
                <Plus className="w-4 h-4 mr-2" /> Ajouter
              </Button>
            </div>

            {showForm && (
              <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="w-full max-w-lg bg-card border border-border rounded-xl p-6 shadow-card max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-heading font-semibold text-foreground">{editingId ? "Modifier" : "Nouvelle résidence"}</h2>
                    <Button variant="ghost" size="icon" onClick={resetForm}><X className="w-4 h-4" /></Button>
                  </div>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div><Label className="font-body">Nom</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="mt-1" placeholder="Villa Sunset" /></div>
                    <div><Label className="font-body">Adresse</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required className="mt-1" placeholder="123 Rue, Douala" /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="font-body">Type</Label>
                        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground font-body">
                          {typeOptions.map((t) => (<option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>))}
                        </select>
                      </div>
                      <div><Label className="font-body">Prix min (FCFA)</Label><Input type="number" value={form.min_price} onChange={(e) => setForm({ ...form, min_price: Number(e.target.value) })} min={0} className="mt-1" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label className="font-body">Capacité</Label><Input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} min={1} className="mt-1" /></div>
                      <div><Label className="font-body">Chambres</Label><Input type="number" value={form.bedrooms} onChange={(e) => setForm({ ...form, bedrooms: Number(e.target.value) })} min={0} className="mt-1" /></div>
                    </div>
                    <div>
                      <Label className="font-body">Équipements</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {amenityOptions.map((a) => (
                          <button key={a} type="button" onClick={() => toggleAmenity(a)} className={`px-3 py-1 rounded-full text-xs font-body transition-colors ${form.amenities.includes(a) ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}>{a}</button>
                        ))}
                      </div>
                    </div>
                    <div><Label className="font-body">Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1" rows={3} placeholder="Décrivez..." /></div>
                    <div className="flex gap-3 pt-2">
                      <Button type="button" variant="outline" className="flex-1" onClick={resetForm}>Annuler</Button>
                      <Button type="submit" variant="gold" className="flex-1">{editingId ? "Mettre à jour" : "Ajouter"}</Button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {loading ? (
              <div className="text-center py-16 text-muted-foreground font-body">Chargement...</div>
            ) : residences.length === 0 ? (
              <div className="text-center py-16">
                <Home className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground font-body">Aucun bien ajouté.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {residences.map((r) => (
                  <div key={r.id} className="p-5 rounded-xl bg-card border border-border hover:border-primary/20 transition-colors shadow-card">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-heading font-semibold text-foreground">{r.name}</h3>
                          <span className="px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary font-body">{r.type}</span>
                        </div>
                        <p className="text-sm text-muted-foreground font-body mb-2">{r.address}</p>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground font-body">
                          <span>{r.capacity} pers.</span>
                          <span>{r.bedrooms} chambre{r.bedrooms > 1 ? "s" : ""}</span>
                          <span className="text-primary font-semibold">{r.min_price} FCFA</span>
                        </div>
                        {r.amenities && r.amenities.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {r.amenities.map((a) => (<span key={a} className="px-2 py-0.5 rounded-full text-xs bg-secondary text-secondary-foreground font-body">{a}</span>))}
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

export default HotelDashboard;
