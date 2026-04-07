import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Users, Home, List, ArrowLeft, ShieldCheck, Wallet, Eye,
  Check, XCircle, Plus, Trash2, CreditCard, UserCog, Settings,
  Ban, Power, MapPin
} from "lucide-react";
import { getCurrencySymbol, formatAmount } from "@/lib/currencies";

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrateur",
  city_manager: "Chef de ville",
  financier: "Financier",
  hotel_manager: "Gestion des hôtels",
  stand_manager: "Gestion des stands",
  needs_manager: "Gestion des besoins",
  commercial: "Commercial",
  communication: "Communication",
  it_manager: "Informaticien",
  moderator: "Modérateur",
  user: "Utilisateur",
};

const AdminDashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("users");
  const [clients, setClients] = useState<any[]>([]);
  const [hosts, setHosts] = useState<any[]>([]);
  const [allNeeds, setAllNeeds] = useState<any[]>([]);
  const [allResidences, setAllResidences] = useState<any[]>([]);
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [userRoles, setUserRoles] = useState<any[]>([]);
  const [platformSettings, setPlatformSettings] = useState<any[]>([]);
  const [pmForm, setPmForm] = useState({ name: "", type: "mobile_money", details: "", link: "" });
  const [showPmForm, setShowPmForm] = useState(false);
  const [roleAssign, setRoleAssign] = useState({ userId: "", role: "financier" });
  const [cityManagerAssign, setCityManagerAssign] = useState({ userId: "", country: "Cameroun", city: "" });

  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (!session) navigate("/auth");
      else setUser(session.user);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate("/auth");
      else { setUser(session.user); checkAdmin(session.user.id); }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkAdmin = async (userId: string) => {
    const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!data) { navigate("/"); return; }
    setIsAdmin(true);
    fetchAll();
  };

  const fetchAll = async () => {
    const [profR, needsR, resR, txR, ordR, pmR, rolesR, settingsR] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("needs").select("*").order("created_at", { ascending: false }),
      supabase.from("residences").select("*").order("created_at", { ascending: false }),
      supabase.from("wallet_transactions").select("*").order("created_at", { ascending: false }),
      supabase.from("orders").select("*").order("created_at", { ascending: false }),
      supabase.from("payment_methods").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("*"),
      supabase.from("platform_settings").select("*"),
    ]);

    if (profR.data) {
      setClients(profR.data.filter((p: any) => p.role === "client"));
      setHosts(profR.data.filter((p: any) => p.role === "host"));
    }
    if (needsR.data) setAllNeeds(needsR.data);
    if (resR.data) setAllResidences(resR.data);
    if (txR.data) setAllTransactions(txR.data);
    if (ordR.data) setAllOrders(ordR.data);
    if (pmR.data) setPaymentMethods(pmR.data);
    if (rolesR.data) setUserRoles(rolesR.data);
    if (settingsR.data) setPlatformSettings(settingsR.data);
    setLoading(false);
  };

  const approveTransaction = async (txId: string) => {
    const { data, error } = await supabase.rpc("approve_wallet_transaction", { transaction_id: txId, admin_id: user.id });
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else if (data) { toast({ title: "Transaction approuvée" }); fetchAll(); }
    else toast({ title: "Erreur", description: "Transaction introuvable ou déjà traitée.", variant: "destructive" });
  };

  const rejectTransaction = async (txId: string) => {
    const { error } = await supabase.from("wallet_transactions").update({ status: "rejected" }).eq("id", txId);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else { toast({ title: "Transaction rejetée" }); fetchAll(); }
  };

  const addPaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("payment_methods").insert(pmForm);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else { toast({ title: "Moyen de paiement ajouté" }); setPmForm({ name: "", type: "mobile_money", details: "", link: "" }); setShowPmForm(false); fetchAll(); }
  };

  const deletePm = async (id: string) => {
    await supabase.from("payment_methods").delete().eq("id", id);
    toast({ title: "Supprimé" }); fetchAll();
  };

  const assignRole = async () => {
    if (!roleAssign.userId) return;
    const profile = [...clients, ...hosts].find(p => p.id === roleAssign.userId || p.user_id === roleAssign.userId);
    if (!profile) { toast({ title: "Utilisateur introuvable", variant: "destructive" }); return; }
    const { error } = await supabase.from("user_roles").insert({ user_id: profile.user_id, role: roleAssign.role as any });
    if (error) {
      if (error.message.includes("duplicate")) toast({ title: "Ce rôle est déjà assigné." });
      else toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else { toast({ title: "Rôle assigné" }); fetchAll(); }
  };

  const assignCityManager = async () => {
    if (!cityManagerAssign.userId || !cityManagerAssign.city) return;
    const profile = [...clients, ...hosts].find(p => p.id === cityManagerAssign.userId || p.user_id === cityManagerAssign.userId);
    if (!profile) { toast({ title: "Utilisateur introuvable", variant: "destructive" }); return; }
    // First assign city_manager role
    await supabase.from("user_roles").insert({ user_id: profile.user_id, role: "city_manager" as any }).select();
    // Then assign zone
    const { error } = await supabase.from("city_manager_zones").insert({ 
      user_id: profile.user_id, country: cityManagerAssign.country, city: cityManagerAssign.city 
    });
    if (error && error.message.includes("duplicate")) toast({ title: "Cette zone est déjà assignée." });
    else if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else { toast({ title: "Chef de ville assigné" }); fetchAll(); }
  };

  const removeRole = async (roleId: string) => {
    await supabase.from("user_roles").delete().eq("id", roleId);
    toast({ title: "Rôle retiré" }); fetchAll();
  };

  // User action buttons
  const updateUserStatus = async (userId: string, status: string) => {
    const { error } = await supabase.from("profiles").update({ status }).eq("user_id", userId);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else { toast({ title: `Utilisateur ${status === "active" ? "activé" : status === "suspended" ? "suspendu" : "supprimé"}` }); fetchAll(); }
  };

  const updateNeedStatus = async (needId: string, status: string) => {
    const { error } = await supabase.from("needs").update({ status }).eq("id", needId);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else { toast({ title: `Besoin ${status}` }); fetchAll(); }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else { toast({ title: `Commande ${status}` }); fetchAll(); }
  };

  const updateSetting = async (key: string, value: string) => {
    const { error } = await supabase.from("platform_settings").update({ value, updated_at: new Date().toISOString() }).eq("key", key);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else { toast({ title: "Paramètre mis à jour" }); fetchAll(); }
  };

  const handleSignOut = async () => { await supabase.auth.signOut(); navigate("/"); };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground font-body">Chargement...</p></div>;
  if (!isAdmin) return null;

  const allProfiles = [...clients, ...hosts];

  const tabs = [
    { key: "users", label: "Utilisateurs", icon: Users },
    { key: "needs", label: "Besoins", icon: List },
    { key: "residences", label: "Résidences", icon: Home },
    { key: "orders", label: "Commandes", icon: Eye },
    { key: "transactions", label: "Transactions", icon: Wallet },
    { key: "payments", label: "Paiements", icon: CreditCard },
    { key: "roles", label: "Rôles", icon: UserCog },
    { key: "settings", label: "Paramètres", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="glass-dark sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4" /></Button>
            <span className="text-xl font-heading font-bold text-gradient-gold">Admin</span>
          </div>
          <Button variant="ghost" size="icon" onClick={handleSignOut}><ShieldCheck className="w-4 h-4" /></Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {tabs.map(t => (
            <Button key={t.key} variant={activeTab === t.key ? "gold" : "outline"} size="sm" onClick={() => setActiveTab(t.key)} className="shrink-0">
              <t.icon className="w-4 h-4 mr-1" /> {t.label}
            </Button>
          ))}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-4">
        {/* STATS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Clients", value: clients.length, color: "text-primary" },
            { label: "Hôtels", value: hosts.length, color: "text-primary" },
            { label: "Besoins", value: allNeeds.length, color: "text-foreground" },
            { label: "Transactions", value: allTransactions.length, color: "text-foreground" },
          ].map(s => (
            <div key={s.label} className="p-4 rounded-xl bg-card border border-border shadow-card text-center">
              <p className={`text-2xl font-heading font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground font-body">{s.label}</p>
            </div>
          ))}
        </div>

        {/* USERS TAB */}
        {activeTab === "users" && (
          <div className="space-y-6">
            <h2 className="text-xl font-heading font-bold text-foreground">Clients ({clients.length})</h2>
            <div className="grid gap-3">
              {clients.map(p => (
                <div key={p.id} className="p-4 rounded-xl bg-card border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground font-body">{p.full_name || "—"}</p>
                       <p className="text-xs text-muted-foreground font-body">{p.moissonneur_code} · {p.city}, {p.country} · Solde: {formatAmount(p.wallet_balance, p.currency || 'XAF')}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-body ${p.status === "active" ? "bg-green-500/20 text-green-400" : p.status === "suspended" ? "bg-yellow-500/20 text-yellow-400" : "bg-destructive/20 text-destructive"}`}>{p.status || "active"}</span>
                  </div>
                  <div className="flex gap-2">
                    {p.status !== "suspended" && <Button variant="outline" size="sm" onClick={() => updateUserStatus(p.user_id, "suspended")} className="text-xs"><Ban className="w-3 h-3 mr-1" />Suspendre</Button>}
                    {p.status === "suspended" && <Button variant="gold" size="sm" onClick={() => updateUserStatus(p.user_id, "active")} className="text-xs"><Power className="w-3 h-3 mr-1" />Activer</Button>}
                    <Button variant="destructive" size="sm" onClick={() => updateUserStatus(p.user_id, "deleted")} className="text-xs"><Trash2 className="w-3 h-3 mr-1" />Supprimer</Button>
                  </div>
                </div>
              ))}
            </div>

            <h2 className="text-xl font-heading font-bold text-foreground mt-8">Hôtels ({hosts.length})</h2>
            <div className="grid gap-3">
              {hosts.map(p => (
                <div key={p.id} className="p-4 rounded-xl bg-card border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground font-body">{p.full_name || "—"}</p>
                      <p className="text-xs text-muted-foreground font-body">{p.moissonneur_code} · {p.city}, {p.country} · Solde: {formatAmount(p.wallet_balance, p.currency || 'XAF')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-body ${p.status === "active" ? "bg-green-500/20 text-green-400" : p.status === "suspended" ? "bg-yellow-500/20 text-yellow-400" : "bg-destructive/20 text-destructive"}`}>{p.status || "active"}</span>
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/stand/${p.moissonneur_code}`)} className="text-xs text-primary">Stand</Button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {p.status !== "suspended" && <Button variant="outline" size="sm" onClick={() => updateUserStatus(p.user_id, "suspended")} className="text-xs"><Ban className="w-3 h-3 mr-1" />Suspendre</Button>}
                    {p.status === "suspended" && <Button variant="gold" size="sm" onClick={() => updateUserStatus(p.user_id, "active")} className="text-xs"><Power className="w-3 h-3 mr-1" />Activer</Button>}
                    <Button variant="destructive" size="sm" onClick={() => updateUserStatus(p.user_id, "deleted")} className="text-xs"><Trash2 className="w-3 h-3 mr-1" />Supprimer</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* NEEDS TAB */}
        {activeTab === "needs" && (
          <div>
            <h2 className="text-xl font-heading font-bold text-foreground mb-4">Tous les besoins ({allNeeds.length})</h2>
            <div className="grid gap-3">
              {allNeeds.map(n => (
                <div key={n.id} className="p-4 rounded-xl bg-card border border-border">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground font-body capitalize">{n.type_needed}</span>
                      {n.room_standard && n.room_standard !== "standard" && <span className="px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary font-body capitalize">{n.room_standard}</span>}
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-body ${n.status === "active" ? "bg-green-500/20 text-green-400" : "bg-muted text-muted-foreground"}`}>{n.status}</span>
                  </div>
                  <p className="text-xs text-muted-foreground font-body">{n.neighborhood}, {n.city} — {n.country} · {n.budget} FCFA · {n.capacity} pers.</p>
                  <p className="text-xs text-muted-foreground font-body mt-1">{new Date(n.created_at).toLocaleString("fr-FR")}</p>
                  <div className="flex gap-2 mt-2">
                    {n.status === "active" && <Button variant="outline" size="sm" onClick={() => updateNeedStatus(n.id, "cancelled")} className="text-xs"><XCircle className="w-3 h-3 mr-1" />Annuler</Button>}
                    {n.status !== "active" && <Button variant="gold" size="sm" onClick={() => updateNeedStatus(n.id, "active")} className="text-xs"><Power className="w-3 h-3 mr-1" />Activer</Button>}
                    <Button variant="destructive" size="sm" onClick={() => updateNeedStatus(n.id, "deleted")} className="text-xs"><Trash2 className="w-3 h-3 mr-1" />Supprimer</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RESIDENCES TAB */}
        {activeTab === "residences" && (
          <div>
            <h2 className="text-xl font-heading font-bold text-foreground mb-4">Toutes les résidences ({allResidences.length})</h2>
            <div className="grid gap-3">
              {allResidences.map(r => (
                <div key={r.id} className="p-4 rounded-xl bg-card border border-border">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground font-body">{r.name}</span>
                      <span className="px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary font-body capitalize">{r.room_standard}</span>
                    </div>
                    <span className="text-xs text-primary font-body">{r.min_price} FCFA</span>
                  </div>
                  <p className="text-xs text-muted-foreground font-body">{r.neighborhood}, {r.city} · {r.type} · {r.capacity} pers.</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ORDERS TAB */}
        {activeTab === "orders" && (
          <div>
            <h2 className="text-xl font-heading font-bold text-foreground mb-4">Toutes les commandes ({allOrders.length})</h2>
            <div className="grid gap-3">
              {allOrders.map(o => (
                <div key={o.id} className="p-4 rounded-xl bg-card border border-border">
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-body ${o.status === "pending" ? "bg-yellow-500/20 text-yellow-400" : o.status === "accepted" ? "bg-green-500/20 text-green-400" : "bg-destructive/20 text-destructive"}`}>{o.status}</span>
                    <span className="text-sm font-bold text-foreground font-body">{o.amount} {(() => { const p = [...clients, ...hosts].find(x => x.user_id === o.client_id); return getCurrencySymbol(p?.currency || 'XAF'); })()}</span>
                  </div>
                  <p className="text-xs text-muted-foreground font-body mt-1">Paiement: {o.payment_method} · {new Date(o.created_at).toLocaleString("fr-FR")}</p>
                  <div className="flex gap-2 mt-2">
                    {o.status === "pending" && (
                      <>
                        <Button variant="gold" size="sm" onClick={() => updateOrderStatus(o.id, "accepted")} className="text-xs"><Check className="w-3 h-3 mr-1" />Accepter</Button>
                        <Button variant="destructive" size="sm" onClick={() => updateOrderStatus(o.id, "refused")} className="text-xs"><XCircle className="w-3 h-3 mr-1" />Refuser</Button>
                      </>
                    )}
                    {o.status !== "cancelled" && <Button variant="outline" size="sm" onClick={() => updateOrderStatus(o.id, "cancelled")} className="text-xs">Annuler</Button>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TRANSACTIONS TAB */}
        {activeTab === "transactions" && (
          <div>
            <h2 className="text-xl font-heading font-bold text-foreground mb-4">Transactions ({allTransactions.length})</h2>
            <div className="grid gap-3">
              {allTransactions.map(tx => (
                <div key={tx.id} className="p-4 rounded-xl bg-card border border-border">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground font-body">{tx.type}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-body ${tx.status === "approved" ? "bg-green-500/20 text-green-400" : tx.status === "pending" ? "bg-yellow-500/20 text-yellow-400" : "bg-destructive/20 text-destructive"}`}>{tx.status}</span>
                    </div>
                    <span className="font-bold text-foreground font-body">{tx.amount} {(() => { const p = [...clients, ...hosts].find(x => x.user_id === tx.user_id); return getCurrencySymbol(p?.currency || 'XAF'); })()}</span>
                  </div>
                  {tx.description && <p className="text-xs text-muted-foreground font-body">{tx.description}</p>}
                  {tx.transaction_id_external && <p className="text-xs text-muted-foreground font-body">ID: {tx.transaction_id_external}</p>}
                  {tx.withdrawal_method && <p className="text-xs text-muted-foreground font-body">Retrait: {tx.withdrawal_method} — {tx.withdrawal_contact}</p>}
                  <p className="text-xs text-muted-foreground font-body mt-1">{new Date(tx.created_at).toLocaleString("fr-FR")}</p>
                  {tx.status === "pending" && (
                    <div className="flex gap-2 mt-2">
                      <Button variant="gold" size="sm" onClick={() => approveTransaction(tx.id)}><Check className="w-3 h-3 mr-1" /> Approuver</Button>
                      <Button variant="destructive" size="sm" onClick={() => rejectTransaction(tx.id)}><XCircle className="w-3 h-3 mr-1" /> Rejeter</Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PAYMENT METHODS TAB */}
        {activeTab === "payments" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-heading font-bold text-foreground">Moyens de paiement</h2>
              <Button variant="gold" size="sm" onClick={() => setShowPmForm(true)}><Plus className="w-4 h-4 mr-1" /> Ajouter</Button>
            </div>

            {showPmForm && (
              <form onSubmit={addPaymentMethod} className="mb-6 p-4 rounded-xl bg-card border border-border space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="font-body">Nom</Label><Input value={pmForm.name} onChange={e => setPmForm({ ...pmForm, name: e.target.value })} required className="mt-1" placeholder="MTN MoMo" /></div>
                  <div>
                    <Label className="font-body">Type</Label>
                    <select value={pmForm.type} onChange={e => setPmForm({ ...pmForm, type: e.target.value })} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground font-body">
                      <option value="mobile_money">Mobile Money</option>
                      <option value="bank">Banque</option>
                      <option value="crypto">Crypto</option>
                      <option value="other">Autre</option>
                    </select>
                  </div>
                </div>
                <div><Label className="font-body">Détails (numéro, IBAN, etc.)</Label><Input value={pmForm.details} onChange={e => setPmForm({ ...pmForm, details: e.target.value })} required className="mt-1" /></div>
                <div><Label className="font-body">Lien (optionnel)</Label><Input value={pmForm.link} onChange={e => setPmForm({ ...pmForm, link: e.target.value })} className="mt-1" placeholder="https://..." /></div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowPmForm(false)}>Annuler</Button>
                  <Button type="submit" variant="gold" size="sm">Ajouter</Button>
                </div>
              </form>
            )}

            <div className="grid gap-3">
              {paymentMethods.map(pm => (
                <div key={pm.id} className="p-4 rounded-xl bg-card border border-border flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground font-body">{pm.name} <span className="text-xs text-muted-foreground">({pm.type})</span></p>
                    <p className="text-xs text-muted-foreground font-body">{pm.details}</p>
                    {pm.link && <a href={pm.link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline font-body">{pm.link}</a>}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deletePm(pm.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ROLES TAB */}
        {activeTab === "roles" && (
          <div>
            <h2 className="text-xl font-heading font-bold text-foreground mb-4">Gestion des rôles</h2>

            <div className="p-4 rounded-xl bg-card border border-border space-y-3 mb-6">
              <h3 className="font-heading font-semibold text-foreground">Assigner un rôle</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="font-body">Utilisateur</Label>
                  <select value={roleAssign.userId} onChange={e => setRoleAssign({ ...roleAssign, userId: e.target.value })} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground font-body">
                    <option value="">Sélectionner...</option>
                    {allProfiles.map(p => <option key={p.id} value={p.id}>{p.full_name || p.moissonneur_code} ({p.role})</option>)}
                  </select>
                </div>
                <div>
                  <Label className="font-body">Rôle</Label>
                  <select value={roleAssign.role} onChange={e => setRoleAssign({ ...roleAssign, role: e.target.value })} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground font-body">
                    {Object.entries(ROLE_LABELS).filter(([k]) => k !== "admin" && k !== "user").map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <Button variant="gold" size="sm" onClick={assignRole}>Assigner</Button>
            </div>

            {/* City Manager Assignment */}
            <div className="p-4 rounded-xl bg-card border border-border space-y-3 mb-6">
              <h3 className="font-heading font-semibold text-foreground flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> Assigner un Chef de ville</h3>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="font-body">Utilisateur</Label>
                  <select value={cityManagerAssign.userId} onChange={e => setCityManagerAssign({ ...cityManagerAssign, userId: e.target.value })} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground font-body">
                    <option value="">Sélectionner...</option>
                    {allProfiles.map(p => <option key={p.id} value={p.id}>{p.full_name || p.moissonneur_code}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="font-body">Pays</Label>
                  <Input value={cityManagerAssign.country} onChange={e => setCityManagerAssign({ ...cityManagerAssign, country: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label className="font-body">Ville</Label>
                  <Input value={cityManagerAssign.city} onChange={e => setCityManagerAssign({ ...cityManagerAssign, city: e.target.value })} className="mt-1" placeholder="Douala" />
                </div>
              </div>
              <Button variant="gold" size="sm" onClick={assignCityManager}>Assigner Chef de ville</Button>
            </div>

            <h3 className="font-heading font-semibold text-foreground mb-3">Rôles attribués</h3>
            <div className="grid gap-3">
              {userRoles.map(ur => {
                const profile = allProfiles.find(p => p.user_id === ur.user_id);
                return (
                  <div key={ur.id} className="p-4 rounded-xl bg-card border border-border flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground font-body">{profile?.full_name || profile?.moissonneur_code || ur.user_id}</p>
                      <p className="text-xs text-primary font-body">{ROLE_LABELS[ur.role] || ur.role}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeRole(ur.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                );
              })}
              {userRoles.length === 0 && <p className="text-sm text-muted-foreground font-body">Aucun rôle assigné.</p>}
            </div>
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === "settings" && (
          <div>
            <h2 className="text-xl font-heading font-bold text-foreground mb-4">Paramètres de la plateforme</h2>
            <div className="grid gap-4">
              {platformSettings.map(s => (
                <div key={s.id} className="p-4 rounded-xl bg-card border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground font-body">{s.description || s.key}</p>
                      <p className="text-xs text-muted-foreground font-body">{s.key}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Input
                      defaultValue={s.value}
                      onBlur={(e) => {
                        if (e.target.value !== s.value) updateSetting(s.key, e.target.value);
                      }}
                      className="max-w-xs"
                    />
                    <span className="text-xs text-muted-foreground font-body">Actuel: {s.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
