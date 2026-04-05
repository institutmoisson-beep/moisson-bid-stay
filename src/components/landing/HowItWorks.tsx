const steps = [
  {
    number: "01",
    title: "Créez votre offre",
    description: "Indiquez vos dates, le nombre de personnes, la localisation souhaitée et proposez votre prix.",
  },
  {
    number: "02",
    title: "Recevez des réponses",
    description: "Les résidences disponibles acceptent ou refusent votre offre en temps réel.",
  },
  {
    number: "03",
    title: "Confirmez et payez",
    description: "Confirmez la réservation et le paiement est automatiquement sécurisé via votre wallet.",
  },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-24 px-4 bg-card/50">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-heading font-bold mb-4">
            Comment ça <span className="text-gradient-gold">marche</span> ?
          </h2>
          <p className="text-muted-foreground font-body">
            Trois étapes simples pour réserver au meilleur prix.
          </p>
        </div>

        <div className="space-y-8">
          {steps.map((step, i) => (
            <div key={step.number} className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-gradient-gold flex items-center justify-center">
                <span className="text-xl font-heading font-bold text-primary-foreground">{step.number}</span>
              </div>
              <div className="pt-2">
                <h3 className="text-xl font-heading font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-muted-foreground font-body leading-relaxed">{step.description}</p>
              </div>
              {i < steps.length - 1 && (
                <div className="hidden" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
