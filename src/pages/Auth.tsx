import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [isSignUp, setIsSignUp] = useState(searchParams.get("tab") === "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"client" | "host">("client");
  const [country, setCountry] = useState("Cameroun");
  const [city, setCity] = useState("");
  const [referralCode, setReferralCode] = useState(searchParams.get("ref") || "");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const redirectByRole = async (userId: string) => {
    const { data: profile } = await supabase.from("profiles").select("role").eq("user_id", userId).single();
    if (profile?.role === "host") {
      navigate("/hotel-dashboard");
    } else {
      navigate("/client-dashboard");
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        redirectByRole(session.user.id);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) redirectByRole(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        if (!city.trim()) {
          toast({ title: "Erreur", description: "La ville est obligatoire.", variant: "destructive" });
          setLoading(false);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName, role, country, city, referral_code: referralCode || undefined },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast({ title: "Inscription réussie", description: "Vérifiez votre email pour confirmer votre compte." });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-heading font-bold text-gradient-gold mb-2">Moisson</h1>
          <p className="text-muted-foreground font-body">
            {isSignUp ? "Créez votre compte" : "Connectez-vous à votre compte"}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4 p-6 rounded-xl bg-card border border-border shadow-card">
          {isSignUp && (
            <>
              <div>
                <Label className="font-body">Nom complet</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jean Dupont" required className="mt-1" />
              </div>
              <div>
                <Label className="font-body">Je suis</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <Button type="button" variant={role === "client" ? "gold" : "outline"} size="sm" onClick={() => setRole("client")}>Client</Button>
                  <Button type="button" variant={role === "host" ? "gold" : "outline"} size="sm" onClick={() => setRole("host")}>Hôte / Hôtel</Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="font-body">Pays</Label>
                  <Input value={country} onChange={(e) => setCountry(e.target.value)} required className="mt-1" />
                </div>
                <div>
                  <Label className="font-body">Ville *</Label>
                  <Input value={city} onChange={(e) => setCity(e.target.value)} required className="mt-1" placeholder="Douala" />
                </div>
              </div>
              <div>
                <Label className="font-body">Code de parrainage (optionnel)</Label>
                <Input value={referralCode} onChange={(e) => setReferralCode(e.target.value)} className="mt-1" placeholder="MSN123456" />
              </div>
            </>
          )}

          <div>
            <Label className="font-body">Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemple.com" required className="mt-1" />
          </div>
          <div>
            <Label className="font-body">Mot de passe</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} className="mt-1" />
          </div>

          <Button type="submit" variant="gold" className="w-full" disabled={loading}>
            {loading ? "Chargement..." : isSignUp ? "S'inscrire" : "Se connecter"}
          </Button>

          <p className="text-center text-sm text-muted-foreground font-body">
            {isSignUp ? "Déjà un compte ?" : "Pas encore de compte ?"}{" "}
            <button type="button" className="text-primary hover:underline" onClick={() => setIsSignUp(!isSignUp)}>
              {isSignUp ? "Se connecter" : "S'inscrire"}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Auth;
