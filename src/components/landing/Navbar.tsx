import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Navbar = () => {
  const navigate = useNavigate();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-dark">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
          <span className="text-2xl font-heading font-bold text-gradient-gold">Moisson</span>
        </div>

        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors font-body">
            Fonctionnalités
          </a>
          <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors font-body">
            Comment ça marche
          </a>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>
            Connexion
          </Button>
          <Button variant="gold" size="sm" onClick={() => navigate("/auth?tab=signup")}>
            S'inscrire
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
