import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, LogOut, User, List, X, Phone } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Need = Tables<"needs">;
type Profile = Tables<"profiles">;

const ClientDashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [needs, setNeeds] = useState<Need[]>([]);
  const [activeTab, setActiveTab] = useState<"needs" | "profile">("needs");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    country: "Cameroun",
    city: "",
    neighborhood: "",
    whatsapp_contact: "",
    type_needed: "appartement",
    capacity: 1,
    check_in: "",
    check_out: "",
    budget: 0,
    description: "",
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  const typeOptions = ["appartement", "chambre", "studio", "villa", "maison", "hôtel"];

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (!session) navigate("/auth");
      else setUser(session.user);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate("/auth");
      else {
        setUser(session.user);
        fetchProfile(session.user.id);
        fetchNeeds(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase.from("profiles").select("*").eq("user_id", userId).single();
    if (data) setProfile(data);
  };

  const fetchNeeds = async (userId: string) => {
    const { data } = await supabase.from("needs").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    if (data) setNeeds(data);
    setLoading(false);
  };

  const handleSubmitNeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.whatsapp_contact) {
      toast({ title: "Erreur", description: "Le contact WhatsApp est obligatoire.", variant: "destructive" });
      return;
    }

    const payload = {
      ...form,
      user_id: user.id,
      check_in: form.check_in || null,
      check_out: form.check_out || null,
    };

    const { error } = await supabase.from("needs").insert(payload);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Besoin publié", description: "Les hôtels seront notifiés de votre besoin." });
    setShowForm(false);
    setForm({ country: "Cameroun", city: "", neighborhood: "", whatsapp_contact: "", type_needed: "appartement", capacity: 1, check_in: "", check_out: "", budget: 0, description: "" });
    fetchNeeds(user.id);
  };

  const handleDeleteNeed = async (id: string) => {
    const { error } = await supabase.from("needs").delete().eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Besoin supprimé" });
    if (user) fetchNeeds(user.id);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const newPassword = formData.get("newPassword") as string;
    if (newPassword.length < 6) {
      toast({ title: "Erreur", description: "Le mot de passe doit contenir au moins 6 caractères.", variant: "destructive" });
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Mot de passe mis à jour" });
      (e.target as HTMLFormElement).reset();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="glass-dark sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <span className="text-xl font-heading font-bold text-gradient-gold cursor-pointer" onClick={() => navigate("/")}>
            Moisson
          </span>
          <div className="flex items-center gap-2">
            <Button variant={activeTab === "needs" ? "gold" : "ghost"} size="sm" onClick={() => setActiveTab("needs")}>
              <List className="w-4 h-4 mr-1" /> Mes Besoins
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
        {activeTab === "profile" && profile && (
          <div className="space-y-6">
            <h1 className="text-2xl font-heading font-bold text-foreground">Mon Profil</h1>
            <div className="p-6 rounded-xl bg-card border border-border shadow-card space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Nom</Label>
                  <p className="text-foreground font-body">{profile.full_name || "—"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Email</Label>
                  <p className="text-foreground font-body">{user?.email}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Code Moissonneur</Label>
                  <p className="text-primary font-bold font-body">{profile.moissonneur_code}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Solde Portefeuille</Label>
                  <p className="text-primary font-bold font-body">{profile.wallet_balance} FCFA</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Rôle</Label>
                  <p className="text-foreground font-body capitalize">{profile.role}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Téléphone</Label>
                  <p className="text-foreground font-body">{profile.phone || "—"}</p>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-xl bg-card border border-border shadow-card">
              <h2 className="text-lg font-heading font-semibold text-foreground mb-4">Modifier le mot de passe</h2>
              <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-sm">
                <div>
                  <Label className="font-body">Nouveau mot de passe</Label>
                  <Input type="password" name="newPassword" placeholder="••••••••" required minLength={6} className="mt-1" />
                </div>
                <Button type="submit" variant="gold">Mettre à jour</Button>
              </form>
            </div>
          </div>
        )}

        {activeTab === "needs" && (
          <>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground">Mes Besoins</h1>
                <p className="text-muted-foreground font-body text-sm mt-1">Émettez vos besoins en logement.</p>
              </div>
              <Button variant="gold" onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-2" /> Émettre un besoin
              </Button>
            </div>

            {/* Form Modal */}
            {showForm && (
              <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="w-full max-w-lg bg-card border border-border rounded-xl p-6 shadow-card max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-heading font-semibold text-foreground">Nouveau Besoin</h2>
                    <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  <form onSubmit={handleSubmitNeed} className="space-y-4">
                    <div>
                      <Label className="font-body">Contact WhatsApp *</Label>
                      <Input value={form.whatsapp_contact} onChange={(e) => setForm({ ...form, whatsapp_contact: e.target.value })} required className="mt-1" placeholder="+237 6XX XXX XXX" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="font-body">Pays</Label>
                        <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} required className="mt-1" />
                      </div>
                      <div>
                        <Label className="font-body">Ville</Label>
                        <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required className="mt-1" placeholder="Douala" />
                      </div>
                    </div>

                    <div>
                      <Label className="font-body">Quartier</Label>
                      <Input value={form.neighborhood} onChange={(e) => setForm({ ...form, neighborhood: e.target.value })} required className="mt-1" placeholder="Bonanjo" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="font-body">Type de logement</Label>
                        <select
                          value={form.type_needed}
                          onChange={(e) => setForm({ ...form, type_needed: e.target.value })}
                          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground font-body"
                        >
                          {typeOptions.map((t) => (
                            <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label className="font-body">Capacité (pers.)</Label>
                        <Input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} min={1} className="mt-1" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="font-body">Date d'arrivée</Label>
                        <Input type="date" value={form.check_in} onChange={(e) => setForm({ ...form, check_in: e.target.value })} className="mt-1" />
                      </div>
                      <div>
                        <Label className="font-body">Date de départ</Label>
                        <Input type="date" value={form.check_out} onChange={(e) => setForm({ ...form, check_out: e.target.value })} className="mt-1" />
                      </div>
                    </div>

                    <div>
                      <Label className="font-body">Budget (FCFA)</Label>
                      <Input type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: Number(e.target.value) })} min={0} className="mt-1" />
                    </div>

                    <div>
                      <Label className="font-body">Description</Label>
                      <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1" rows={3} placeholder="Décrivez votre besoin..." />
                    </div>

                    <div className="flex gap-3 pt-2">
                      <Button type="button" variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Annuler</Button>
                      <Button type="submit" variant="gold" className="flex-1">Publier le besoin</Button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Needs List */}
            {loading ? (
              <div className="text-center py-16 text-muted-foreground font-body">Chargement...</div>
            ) : needs.length === 0 ? (
              <div className="text-center py-16">
                <List className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground font-body">Vous n'avez pas encore émis de besoin.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {needs.map((n) => (
                  <div key={n.id} className="p-5 rounded-xl bg-card border border-border hover:border-primary/20 transition-colors shadow-card">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-heading font-semibold text-foreground capitalize">{n.type_needed}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-body ${n.status === "active" ? "bg-green-500/20 text-green-400" : "bg-muted text-muted-foreground"}`}>
                            {n.status}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground font-body mb-1">{n.neighborhood}, {n.city} — {n.country}</p>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground font-body">
                          <span>{n.capacity} pers.</span>
                          {n.check_in && <span>Du {n.check_in}</span>}
                          {n.check_out && <span>au {n.check_out}</span>}
                          <span className="text-primary font-semibold">{n.budget} FCFA</span>
                        </div>
                        <a
                          href={`https://wa.me/${n.whatsapp_contact.replace(/[^0-9+]/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-2 text-sm text-green-400 hover:underline font-body"
                        >
                          <Phone className="w-3 h-3" /> {n.whatsapp_contact}
                        </a>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteNeed(n.id)}>
                        <X className="w-4 h-4 text-destructive" />
                      </Button>
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

export default ClientDashboard;
