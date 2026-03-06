import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { useAuthStore } from '@/store/authStore'

export function bootstrapTheme() {
  const stored = localStorage.getItem("theme");
  if (!stored) {
    // use system default
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      document.documentElement.classList.add("dark");
    }
  }
  if (stored === "dark" || stored === "light") {
    document.documentElement.classList.add(stored);
  }
}

(async function startApp() {
  bootstrapTheme();
  useAuthStore.getState().initialize();
  createRoot(document.getElementById("root")!).render(
    <App />
  );
})();