import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, LogOut, User, List, X, Phone, Wallet, ShieldCheck } from "lucide-react";

const ClientDashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [needs, setNeeds] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string>("needs");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    country: "Cameroun", city: "", neighborhood: "", whatsapp_contact: "",
    type_needed: "appartement", capacity: 1, check_in: "", check_out: "",
    budget: 0, description: "",
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
      else { setUser(session.user); fetchAll(session.user.id); }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchAll = async (userId: string) => {
    const [profR, needsR, adminR] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", userId).single(),
      supabase.from("needs").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
    ]);
    if (profR.data) setProfile(profR.data);
    if (needsR.data) setNeeds(needsR.data);
    if (adminR.data) setIsAdmin(adminR.data);
    setLoading(false);
  };

  const handleSubmitNeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.whatsapp_contact) {
      toast({ title: "Erreur", description: "Le contact WhatsApp est obligatoire.", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("needs").insert({
      ...form, user_id: user.id,
      check_in: form.check_in || null, check_out: form.check_out || null,
    });
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Besoin publié", description: "Les hôtels seront notifiés." });
    setShowForm(false);
    setForm({ country: "Cameroun", city: "", neighborhood: "", whatsapp_contact: "", type_needed: "appartement", capacity: 1, check_in: "", check_out: "", budget: 0, description: "" });
    fetchAll(user.id);
  };

  const handleDeleteNeed = async (id: string) => {
    await supabase.from("needs").delete().eq("id", id);
    toast({ title: "Besoin supprimé" });
    if (user) fetchAll(user.id);
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

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground font-body">Chargement...</p></div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="glass-dark sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <span className="text-xl font-heading font-bold text-gradient-gold cursor-pointer" onClick={() => navigate("/")}>Moisson</span>
          <div className="flex items-center gap-1">
            {[
              { key: "needs", label: "Mes Besoins", icon: List },
              { key: "wallet", label: "Wallet", icon: Wallet },
              { key: "profile", label: "Profil", icon: User },
            ].map(t => (
              <Button key={t.key} variant={activeTab === t.key ? "gold" : "ghost"} size="sm" onClick={() => setActiveTab(t.key)}>
                <t.icon className="w-4 h-4 mr-1" /><span className="hidden sm:inline">{t.label}</span>
              </Button>
            ))}
            {isAdmin && (
              <Button variant="ghost" size="sm" onClick={() => navigate("/admin")} className="text-primary">
                <ShieldCheck className="w-4 h-4 mr-1" /><span className="hidden sm:inline">Admin</span>
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={handleSignOut}><LogOut className="w-4 h-4" /></Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* PROFILE */}
        {activeTab === "profile" && profile && (
          <div className="space-y-6">
            <h1 className="text-2xl font-heading font-bold text-foreground">Mon Profil</h1>
            <div className="p-6 rounded-xl bg-card border border-border shadow-card">
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-muted-foreground text-xs">Nom</Label><p className="text-foreground font-body">{profile.full_name || "—"}</p></div>
                <div><Label className="text-muted-foreground text-xs">Email</Label><p className="text-foreground font-body">{user?.email}</p></div>
                <div><Label className="text-muted-foreground text-xs">Code Moissonneur</Label><p className="text-primary font-bold font-body">{profile.moissonneur_code}</p></div>
                <div><Label className="text-muted-foreground text-xs">Solde Portefeuille</Label><p className="text-primary font-bold font-body">{profile.wallet_balance} FCFA</p></div>
                <div><Label className="text-muted-foreground text-xs">Rôle</Label><p className="text-foreground font-body capitalize">{profile.role}</p></div>
                <div><Label className="text-muted-foreground text-xs">Téléphone</Label><p className="text-foreground font-body">{profile.phone || "—"}</p></div>
              </div>
            </div>
            <div className="p-6 rounded-xl bg-card border border-border shadow-card">
              <h2 className="text-lg font-heading font-semibold text-foreground mb-4">Modifier le mot de passe</h2>
              <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-sm">
                <div><Label className="font-body">Nouveau mot de passe</Label><Input type="password" name="newPassword" required minLength={6} className="mt-1" /></div>
                <Button type="submit" variant="gold">Mettre à jour</Button>
              </form>
            </div>
          </div>
        )}

        {/* WALLET */}
        {activeTab === "wallet" && <ClientWallet user={user} profile={profile} />}

        {/* NEEDS */}
        {activeTab === "needs" && (
          <>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground">Mes Besoins</h1>
                <p className="text-muted-foreground font-body text-sm mt-1">Émettez vos besoins en logement.</p>
              </div>
              <Button variant="gold" onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-2" /> Émettre un besoin</Button>
            </div>

            {showForm && (
              <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="w-full max-w-lg bg-card border border-border rounded-xl p-6 shadow-card max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-heading font-semibold text-foreground">Nouveau Besoin</h2>
                    <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}><X className="w-4 h-4" /></Button>
                  </div>
                  <form onSubmit={handleSubmitNeed} className="space-y-4">
                    <div><Label className="font-body">Contact WhatsApp *</Label><Input value={form.whatsapp_contact} onChange={e => setForm({ ...form, whatsapp_contact: e.target.value })} required className="mt-1" placeholder="+237 6XX XXX XXX" /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label className="font-body">Pays</Label><Input value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} required className="mt-1" /></div>
                      <div><Label className="font-body">Ville</Label><Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} required className="mt-1" placeholder="Douala" /></div>
                    </div>
                    <div><Label className="font-body">Quartier</Label><Input value={form.neighborhood} onChange={e => setForm({ ...form, neighborhood: e.target.value })} required className="mt-1" placeholder="Bonanjo" /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="font-body">Type de logement</Label>
                        <select value={form.type_needed} onChange={e => setForm({ ...form, type_needed: e.target.value })} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground font-body">
                          {typeOptions.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                        </select>
                      </div>
                      <div><Label className="font-body">Capacité (pers.)</Label><Input type="number" value={form.capacity} onChange={e => setForm({ ...form, capacity: Number(e.target.value) })} min={1} className="mt-1" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label className="font-body">Date d'arrivée</Label><Input type="date" value={form.check_in} onChange={e => setForm({ ...form, check_in: e.target.value })} className="mt-1" /></div>
                      <div><Label className="font-body">Date de départ</Label><Input type="date" value={form.check_out} onChange={e => setForm({ ...form, check_out: e.target.value })} className="mt-1" /></div>
                    </div>
                    <div><Label className="font-body">Budget (FCFA)</Label><Input type="number" value={form.budget} onChange={e => setForm({ ...form, budget: Number(e.target.value) })} min={0} className="mt-1" /></div>
                    <div><Label className="font-body">Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="mt-1" rows={3} placeholder="Décrivez votre besoin..." /></div>
                    <div className="flex gap-3 pt-2">
                      <Button type="button" variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Annuler</Button>
                      <Button type="submit" variant="gold" className="flex-1">Publier le besoin</Button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {needs.length === 0 ? (
              <div className="text-center py-16"><List className="w-12 h-12 text-muted-foreground mx-auto mb-4" /><p className="text-muted-foreground font-body">Aucun besoin émis.</p></div>
            ) : (
              <div className="grid gap-4">
                {needs.map(n => (
                  <div key={n.id} className="p-5 rounded-xl bg-card border border-border hover:border-primary/20 transition-colors shadow-card">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-heading font-semibold text-foreground capitalize">{n.type_needed}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-body ${n.status === "active" ? "bg-green-500/20 text-green-400" : "bg-muted text-muted-foreground"}`}>{n.status}</span>
                        </div>
                        <p className="text-sm text-muted-foreground font-body mb-1">{n.neighborhood}, {n.city} — {n.country}</p>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground font-body">
                          <span>{n.capacity} pers.</span>
                          {n.check_in && <span>Du {n.check_in}</span>}
                          {n.check_out && <span>au {n.check_out}</span>}
                          <span className="text-primary font-semibold">{n.budget} FCFA</span>
                        </div>
                        <a href={`https://wa.me/${n.whatsapp_contact.replace(/[^0-9+]/g, "")}`} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-2 text-sm text-green-400 hover:underline font-body">
                          <Phone className="w-3 h-3" /> {n.whatsapp_contact}
                        </a>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteNeed(n.id)}><X className="w-4 h-4 text-destructive" /></Button>
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

// Client Wallet Component
const ClientWallet = ({ user, profile }: { user: any; profile: any }) => {
  const [tab, setTab] = useState<"history" | "recharge" | "transfer">("history");
  const [transactions, setTransactions] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const [rechargeForm, setRechargeForm] = useState({ amount: 0, payment_method_id: "", transaction_id_external: "", description: "" });
  const [transferForm, setTransferForm] = useState({ recipient: "", amount: 0 });

  useEffect(() => { fetchData(); }, []);

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
      transaction_id_external: rechargeForm.transaction_id_external, description: rechargeForm.description,
    });
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else { toast({ title: "Demande envoyée", description: "L'admin validera votre recharge." }); setRechargeForm({ amount: 0, payment_method_id: "", transaction_id_external: "", description: "" }); fetchData(); }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data, error } = await supabase.rpc("process_wallet_transfer", {
      sender_id: user.id, recipient_identifier: transferForm.recipient, transfer_amount: transferForm.amount,
    });
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else if (data === "recipient_not_found") toast({ title: "Erreur", description: "Destinataire introuvable.", variant: "destructive" });
    else if (data === "insufficient_balance") toast({ title: "Erreur", description: "Solde insuffisant.", variant: "destructive" });
    else if (data === "cannot_transfer_to_self") toast({ title: "Erreur", description: "Impossible.", variant: "destructive" });
    else { toast({ title: "Transfert réussi !" }); setTransferForm({ recipient: "", amount: 0 }); fetchData(); }
  };

  const copyToClipboard = (text: string) => { navigator.clipboard.writeText(text); toast({ title: "Copié !" }); };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-heading font-bold text-foreground">Portefeuille</h1>
        <div className="text-right">
          <p className="text-sm text-muted-foreground font-body">Solde</p>
          <p className="text-2xl font-bold text-primary font-heading">{profile?.wallet_balance || 0} FCFA</p>
        </div>
      </div>
      <div className="flex gap-2 mb-6">
        {[{ k: "history", l: "Historique" }, { k: "recharge", l: "Recharger" }, { k: "transfer", l: "Transférer" }].map(t => (
          <Button key={t.k} variant={tab === t.k ? "gold" : "outline"} size="sm" onClick={() => setTab(t.k as any)}>{t.l}</Button>
        ))}
      </div>

      {tab === "history" && (
        <div className="grid gap-3">
          {transactions.length === 0 ? <p className="text-center py-8 text-muted-foreground font-body">Aucune transaction.</p> :
            transactions.map(tx => (
              <div key={tx.id} className="p-4 rounded-xl bg-card border border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <span className={`text-sm font-semibold font-body ${tx.type.includes("in") || tx.type === "recharge" ? "text-green-400" : "text-destructive"}`}>
                      {tx.type === "recharge" ? "Recharge" : tx.type === "transfer_out" ? "Envoyé" : tx.type === "transfer_in" ? "Reçu" : tx.type}
                    </span>
                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-body ${tx.status === "approved" ? "bg-green-500/20 text-green-400" : tx.status === "pending" ? "bg-yellow-500/20 text-yellow-400" : "bg-destructive/20 text-destructive"}`}>{tx.status}</span>
                  </div>
                  <span className="font-bold font-body text-foreground">{tx.amount} FCFA</span>
                </div>
                {tx.description && <p className="text-xs text-muted-foreground font-body mt-1">{tx.description}</p>}
                <p className="text-xs text-muted-foreground font-body mt-1">{new Date(tx.created_at).toLocaleString("fr-FR")}</p>
              </div>
            ))
          }
        </div>
      )}

      {tab === "recharge" && (
        <div className="max-w-md">
          {paymentMethods.length > 0 && (
            <div className="mb-6 space-y-3">
              <h3 className="text-sm font-semibold text-foreground font-body">Moyens de paiement :</h3>
              {paymentMethods.map(pm => (
                <div key={pm.id} className="p-3 rounded-lg bg-secondary border border-border">
                  <div className="flex items-center justify-between">
                    <div><p className="text-sm font-semibold text-foreground font-body">{pm.name}</p><p className="text-xs text-muted-foreground font-body">{pm.details}</p></div>
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
            <div><Label className="font-body">ID de transaction</Label><Input value={rechargeForm.transaction_id_external} onChange={e => setRechargeForm({ ...rechargeForm, transaction_id_external: e.target.value })} className="mt-1" /></div>
            <div><Label className="font-body">Description</Label><Textarea value={rechargeForm.description} onChange={e => setRechargeForm({ ...rechargeForm, description: e.target.value })} className="mt-1" rows={2} /></div>
            <Button type="submit" variant="gold" className="w-full">Envoyer la demande</Button>
          </form>
        </div>
      )}

      {tab === "transfer" && (
        <form onSubmit={handleTransfer} className="max-w-md space-y-4 p-6 rounded-xl bg-card border border-border shadow-card">
          <h3 className="font-heading font-semibold text-foreground">Transférer</h3>
          <div><Label className="font-body">Code MSN ou email</Label><Input value={transferForm.recipient} onChange={e => setTransferForm({ ...transferForm, recipient: e.target.value })} required className="mt-1" placeholder="MSN123456 ou email" /></div>
          <div><Label className="font-body">Montant (FCFA)</Label><Input type="number" value={transferForm.amount} onChange={e => setTransferForm({ ...transferForm, amount: Number(e.target.value) })} required min={1} className="mt-1" /></div>
          <Button type="submit" variant="gold" className="w-full">Transférer</Button>
        </form>
      )}
    </div>
  );
};

export default ClientDashboard;
