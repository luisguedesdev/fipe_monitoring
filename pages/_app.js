import { useEffect } from "react";
import Head from "next/head";
import { AuthProvider } from "../contexts/AuthContext";
import "../styles/globals.css";

export default function App({ Component, pageProps }) {
  useEffect(() => {
    // Registrar Service Worker para funcionalidade offline
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("[App] Service Worker registrado:", registration.scope);

          // Verificar atualizações imediatamente
          registration.update();

          // Verificar atualizações a cada 60 segundos
          setInterval(() => {
            registration.update();
          }, 60 * 1000);

          // Quando encontrar atualização
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            console.log("[App] Nova versão encontrada, instalando...");

            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed") {
                if (navigator.serviceWorker.controller) {
                  // Há uma versão anterior - forçar atualização
                  console.log("[App] Atualizando para nova versão...");
                  newWorker.postMessage({ type: "SKIP_WAITING" });
                }
              }
            });
          });
        })
        .catch((error) => {
          console.error("[App] Erro ao registrar Service Worker:", error);
        });

      // Quando o novo SW assumir, recarregar a página
      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!refreshing) {
          refreshing = true;
          console.log("[App] Recarregando para aplicar atualização...");
          window.location.reload();
        }
      });
    }
  }, []);

  return (
    <AuthProvider>
      <Head>
        {/* PWA Meta Tags */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
        />
        <meta name="theme-color" content="#e63946" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="apple-mobile-web-app-title" content="Drive Price X" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="format-detection" content="telephone=no" />

        {/* PWA Manifest */}
        <link rel="manifest" href="/manifest.json" />

        {/* Apple Touch Icons */}
        <link rel="apple-touch-icon" href="/icons/icon.svg" />

        {/* Favicon */}
        <link rel="icon" type="image/svg+xml" href="/icons/icon.svg" />
      </Head>
      <Component {...pageProps} />
    </AuthProvider>
  );
}
