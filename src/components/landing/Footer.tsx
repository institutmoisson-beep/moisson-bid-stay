const Footer = () => {
  return (
    <footer className="py-12 px-4 border-t border-border">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <span className="text-xl font-heading font-bold text-gradient-gold">Moisson</span>
        <p className="text-sm text-muted-foreground font-body">
          © {new Date().getFullYear()} Moisson. Tous droits réservés.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
