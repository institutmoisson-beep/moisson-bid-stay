import { createRoot } from "react-dom/client";
import { Component, ErrorInfo, ReactNode } from "react";
import App from "./App.tsx";
import "./index.css";

// ErrorBoundary global - affiche un message utile au lieu d'un écran blanc
class GlobalErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Erreur globale:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            background: "#0a0a0a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            fontFamily: "Inter, sans-serif",
          }}
        >
          <div style={{ textAlign: "center", maxWidth: "400px" }}>
            <h1
              style={{
                fontSize: "1.8rem",
                fontWeight: "700",
                background: "linear-gradient(135deg, #D4A017, #e6c04a)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                marginBottom: "16px",
              }}
            >
              Moisson
            </h1>
            <p style={{ color: "#888", marginBottom: "24px", fontSize: "15px" }}>
              Une erreur est survenue. Veuillez rafraîchir la page.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: "linear-gradient(135deg, #D4A017, #e6c04a)",
                color: "#0a0a0a",
                border: "none",
                padding: "12px 32px",
                borderRadius: "8px",
                fontWeight: "600",
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              Rafraîchir
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// PWA Install prompt
let deferredPrompt: any = null;

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  showInstallBanner();
});

function showInstallBanner() {
  try {
    if (window.self !== window.top) return;
  } catch { return; }

  if (
    window.location.hostname.includes("id-preview--") ||
    window.location.hostname.includes("lovableproject.com")
  ) return;

  const banner = document.createElement("div");
  banner.id = "pwa-install-banner";
  banner.style.cssText =
    "position:fixed;bottom:0;left:0;right:0;z-index:9999;padding:16px;background:linear-gradient(135deg,#1a1a1a,#0a0a0a);border-top:1px solid #D4A017;display:flex;align-items:center;justify-content:space-between;gap:12px;font-family:Inter,sans-serif;";
  banner.innerHTML = `
    <div style="flex:1">
      <p style="color:#f5f0e0;font-size:14px;font-weight:600;margin:0">Installer Moisson</p>
      <p style="color:#888;font-size:12px;margin:4px 0 0">Accédez rapidement depuis votre écran d'accueil</p>
    </div>
    <button id="pwa-install-btn" style="background:linear-gradient(135deg,#D4A017,#e6c04a);color:#0a0a0a;border:none;padding:8px 20px;border-radius:8px;font-weight:600;font-size:13px;cursor:pointer;min-height:36px">Installer</button>
    <button id="pwa-dismiss-btn" style="background:none;border:none;color:#888;font-size:18px;cursor:pointer;padding:4px 8px;min-height:36px">✕</button>
  `;
  document.body.appendChild(banner);

  document.getElementById("pwa-install-btn")?.addEventListener("click", async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
    }
    banner.remove();
  });

  document.getElementById("pwa-dismiss-btn")?.addEventListener("click", () => {
    banner.remove();
  });
}

const container = document.getElementById("root");
if (container) {
  createRoot(container).render(
    <GlobalErrorBoundary>
      <App />
    </GlobalErrorBoundary>
  );
}
