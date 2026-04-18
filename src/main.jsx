import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// ── Service Worker Registration ──
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").then((reg) => {

      // Check for new version every 30 seconds
      setInterval(() => reg.update(), 30000);

      reg.addEventListener("updatefound", () => {
        const newSW = reg.installing;
        newSW.addEventListener("statechange", () => {
          if (
            newSW.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            // New version found — take over immediately
            newSW.postMessage({ type: "SKIP_WAITING" });
          }
        });
      });

    }).catch((err) => {
      console.log("SW registration failed:", err);
    });

    // When new SW takes control, silently reload
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload();
    });
  });
}
