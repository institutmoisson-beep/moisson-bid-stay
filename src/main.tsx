import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// PWA Install prompt
let deferredPrompt: any = null;

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  showInstallBanner();
});

function showInstallBanner() {
  // Don't show in iframe (Lovable preview)
  try {
    if (window.self !== window.top) return;
  } catch { return; }
  
  if (window.location.hostname.includes("id-preview--") || window.location.hostname.includes("lovableproject.com")) return;

  const banner = document.createElement("div");
  banner.id = "pwa-install-banner";
  banner.style.cssText = "position:fixed;bottom:0;left:0;right:0;z-index:9999;padding:16px;background:linear-gradient(135deg,#1a1a1a,#0a0a0a);border-top:1px solid #D4A017;display:flex;align-items:center;justify-content:space-between;gap:12px;font-family:Inter,sans-serif;";
  banner.innerHTML = `
    <div style="flex:1">
      <p style="color:#f5f0e0;font-size:14px;font-weight:600;margin:0">Installer Moisson</p>
      <p style="color:#888;font-size:12px;margin:4px 0 0">Accédez rapidement depuis votre écran d'accueil</p>
    </div>
    <button id="pwa-install-btn" style="background:linear-gradient(135deg,#D4A017,#e6c04a);color:#0a0a0a;border:none;padding:8px 20px;border-radius:8px;font-weight:600;font-size:13px;cursor:pointer">Installer</button>
    <button id="pwa-dismiss-btn" style="background:none;border:none;color:#888;font-size:18px;cursor:pointer;padding:4px 8px">✕</button>
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

createRoot(document.getElementById("root")!).render(<App />);
