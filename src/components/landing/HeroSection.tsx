import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import heroBg from "@/assets/hero-bg.jpg";

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0">
        <img
          src={heroBg}
          alt="Résidence de luxe"
          className="w-full h-full object-cover"
          width={1920}
          height={1080}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
      </div>

      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/5 mb-8">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-sm text-primary font-body">Plateforme d'offres inversées</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-heading font-bold mb-6 leading-tight">
          <span className="text-foreground">Proposez votre prix,</span>
          <br />
          <span className="text-gradient-gold">récoltez le meilleur.</span>
        </h1>

        <p className="text-lg md:text-xl text-muted-foreground font-body max-w-2xl mx-auto mb-10 leading-relaxed">
          Moisson révolutionne la réservation de logements. Proposez votre budget,
          et les résidences disponibles vous répondent en temps réel.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button variant="gold" size="lg" className="text-base px-8" onClick={() => navigate("/auth")}>
            Commencer maintenant
          </Button>
          <Button variant="gold-outline" size="lg" className="text-base px-8" onClick={() => navigate("/auth")}>
            Je suis hôte
          </Button>
        </div>

        <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto">
          {[
            { value: "500+", label: "Résidences" },
            { value: "10K+", label: "Réservations" },
            { value: "98%", label: "Satisfaction" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-2xl md:text-3xl font-heading font-bold text-primary">{stat.value}</p>
              <p className="text-sm text-muted-foreground font-body">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
