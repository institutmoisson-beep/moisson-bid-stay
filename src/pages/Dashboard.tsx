import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, LogOut, Home, Pencil, Trash2, X } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Residence = Tables<"residences">;


const Dashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [residences, setResidences] = useState<Residence[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: "",
    address: "",
    type: "appartement",
    capacity: 2,
    bedrooms: 1,
    min_price: 0,
    description: "",
    amenities: [] as string[],
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  const amenityOptions = ["WiFi", "Climatisation", "Parking", "Cuisine équipée", "Piscine", "Terrasse", "Lave-linge", "TV"];

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (!session) navigate("/auth");
      else setUser(session.user);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate("/auth");
      else {
        setUser(session.user);
        fetchResidences(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchResidences = async (userId: string) => {
    const { data, error } = await supabase
      .from("residences")
      .select("*")
      .eq("host_id", userId)
      .order("created_at", { ascending: false });

    if (!error && data) setResidences(data);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const payload = { ...form, host_id: user.id };

    if (editingId) {
      const { error } = await supabase.from("residences").update(payload).eq("id", editingId);
      if (error) {
        toast({ title: "Erreur", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Résidence mise à jour" });
    } else {
      const { error } = await supabase.from("residences").insert(payload);
      if (error) {
        toast({ title: "Erreur", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Résidence ajoutée" });
    }

    resetForm();
    fetchResidences(user.id);
  };

  const resetForm = () => {
    setForm({ name: "", address: "", type: "appartement", capacity: 2, bedrooms: 1, min_price: 0, description: "", amenities: [] });
    setShowForm(false);
    setEditingId(null);
  };

  const startEdit = (r: Residence) => {
    setForm({
      name: r.name,
      address: r.address,
      type: r.type,
      capacity: r.capacity,
      bedrooms: r.bedrooms,
      min_price: r.min_price,
      description: r.description,
      amenities: r.amenities || [],
    });
    setEditingId(r.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("residences").delete().eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Résidence supprimée" });
    if (user) fetchResidences(user.id);
  };

  const toggleAmenity = (a: string) => {
    setForm((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(a)
        ? prev.amenities.filter((x) => x !== a)
        : [...prev.amenities, a],
    }));
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const typeOptions = ["appartement", "chambre", "studio", "villa", "maison"];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="glass-dark sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <span className="text-xl font-heading font-bold text-gradient-gold cursor-pointer" onClick={() => navigate("/")}>
            Moisson
          </span>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground font-body hidden sm:inline">
              {user?.user_metadata?.full_name || user?.email}
            </span>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground">Mes Résidences</h1>
            <p className="text-muted-foreground font-body text-sm mt-1">Gérez vos annonces et recevez des offres.</p>
          </div>
          <Button variant="gold" onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Ajouter
          </Button>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-card border border-border rounded-xl p-6 shadow-card max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-heading font-semibold text-foreground">
                  {editingId ? "Modifier la résidence" : "Nouvelle résidence"}
                </h2>
                <Button variant="ghost" size="icon" onClick={resetForm}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label className="font-body">Nom</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="mt-1" placeholder="Villa Sunset" />
                </div>

                <div>
                  <Label className="font-body">Adresse</Label>
                  <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required className="mt-1" placeholder="123 Rue de la Paix, Paris" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="font-body">Type</Label>
                    <select
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value })}
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground font-body"
                    >
                      {typeOptions.map((t) => (
                        <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="font-body">Prix minimum (€)</Label>
                    <Input type="number" value={form.min_price} onChange={(e) => setForm({ ...form, min_price: Number(e.target.value) })} min={0} className="mt-1" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="font-body">Capacité</Label>
                    <Input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} min={1} className="mt-1" />
                  </div>
                  <div>
                    <Label className="font-body">Chambres</Label>
                    <Input type="number" value={form.bedrooms} onChange={(e) => setForm({ ...form, bedrooms: Number(e.target.value) })} min={0} className="mt-1" />
                  </div>
                </div>

                <div>
                  <Label className="font-body">Équipements</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {amenityOptions.map((a) => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => toggleAmenity(a)}
                        className={`px-3 py-1 rounded-full text-xs font-body transition-colors ${
                          form.amenities.includes(a)
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                        }`}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="font-body">Description</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="mt-1"
                    rows={3}
                    placeholder="Décrivez votre résidence..."
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={resetForm}>Annuler</Button>
                  <Button type="submit" variant="gold" className="flex-1">
                    {editingId ? "Mettre à jour" : "Ajouter"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Residences List */}
        {loading ? (
          <div className="text-center py-16 text-muted-foreground font-body">Chargement...</div>
        ) : residences.length === 0 ? (
          <div className="text-center py-16">
            <Home className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground font-body">Vous n'avez pas encore de résidence.</p>
            <p className="text-sm text-muted-foreground font-body mt-1">Ajoutez votre première résidence pour commencer.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {residences.map((r) => (
              <div key={r.id} className="p-5 rounded-xl bg-card border border-border hover:border-primary/20 transition-colors shadow-card">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-heading font-semibold text-foreground">{r.name}</h3>
                      <span className="px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary font-body">
                        {r.type}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground font-body mb-2">{r.address}</p>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground font-body">
                      <span>{r.capacity} pers.</span>
                      <span>{r.bedrooms} chambre{r.bedrooms > 1 ? "s" : ""}</span>
                      <span className="text-primary font-semibold">{r.min_price}€ min.</span>
                    </div>
                    {r.amenities && r.amenities.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {r.amenities.map((a) => (
                          <span key={a} className="px-2 py-0.5 rounded-full text-xs bg-secondary text-secondary-foreground font-body">{a}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 ml-4">
                    <Button variant="ghost" size="icon" onClick={() => startEdit(r)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
