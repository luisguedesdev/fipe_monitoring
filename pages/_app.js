import { useEffect } from "react";
import Head from "next/head";
import { AuthProvider } from "../contexts/AuthContext";
import "../styles/globals.css";

export default function App({ Component, pageProps }) {
  useEffect(() => {
    // Registrar Service Worker para funcionalidade offline
    if ("serviceWorker" in navigator) {
      // Flag para evitar registros múltiplos
      const SW_REGISTERED_KEY = "sw_registered_version";
      const CURRENT_VERSION = "20241203-3";
      
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("[App] Service Worker registrado:", registration.scope);

          // Verificar se é primeira vez ou versão diferente
          const registeredVersion = sessionStorage.getItem(SW_REGISTERED_KEY);
          
          if (registeredVersion === CURRENT_VERSION) {
            // Já registrado nesta sessão, não verificar atualizações
            console.log("[App] SW já verificado nesta sessão");
            return;
          }

          // Marcar como registrado
          sessionStorage.setItem(SW_REGISTERED_KEY, CURRENT_VERSION);

          // Quando encontrar atualização
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            console.log("[App] Nova versão encontrada, instalando...");

            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed") {
                if (navigator.serviceWorker.controller) {
                  // Há uma versão anterior - mostrar notificação (não forçar reload)
                  console.log("[App] Nova versão disponível");
                  // Opcional: mostrar um toast ou banner para o usuário
                }
              }
            });
          });
        })
        .catch((error) => {
          console.error("[App] Erro ao registrar Service Worker:", error);
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
