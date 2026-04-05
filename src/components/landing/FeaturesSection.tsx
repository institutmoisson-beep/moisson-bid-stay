import { Search, DollarSign, Shield, Bell, MapPin, Star } from "lucide-react";

const features = [
  {
    icon: DollarSign,
    title: "Offres inversées",
    description: "Proposez votre budget et recevez des réponses des résidences en temps réel.",
  },
  {
    icon: MapPin,
    title: "Géolocalisation",
    description: "Trouvez des logements à proximité grâce à la carte interactive.",
  },
  {
    icon: Bell,
    title: "Temps réel",
    description: "Notifications instantanées pour chaque acceptation ou nouvelle offre.",
  },
  {
    icon: Shield,
    title: "Paiement sécurisé",
    description: "Wallet intégré avec fonds bloqués jusqu'à la fin du séjour.",
  },
  {
    icon: Star,
    title: "Évaluations",
    description: "Système de notation mutuelle pour une confiance garantie.",
  },
  {
    icon: Search,
    title: "Matching intelligent",
    description: "Recommandations automatiques basées sur vos préférences.",
  },
];

const FeaturesSection = () => {
  return (
    <section className="py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-heading font-bold mb-4">
            Pourquoi choisir <span className="text-gradient-gold">Moisson</span> ?
          </h2>
          <p className="text-muted-foreground font-body max-w-xl mx-auto">
            Une expérience de réservation unique, pensée pour vous.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group p-6 rounded-xl bg-card border border-border hover:border-primary/30 transition-all duration-300 shadow-card hover:shadow-gold"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-heading font-semibold mb-2 text-foreground">{feature.title}</h3>
              <p className="text-sm text-muted-foreground font-body leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
