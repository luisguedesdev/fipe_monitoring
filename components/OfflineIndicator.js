import { useState, useEffect } from 'react';
import styles from '../styles/OfflineIndicator.module.css';

export default function OfflineIndicator({ isOnline, isOfflineData, lastSync, onSync }) {
  const [showBanner, setShowBanner] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    // Mostrar banner quando offline ou usando dados offline
    setShowBanner(!isOnline || isOfflineData);
  }, [isOnline, isOfflineData]);

  const handleSync = async () => {
    if (!isOnline || syncing) return;
    
    setSyncing(true);
    try {
      await onSync();
    } finally {
      setSyncing(false);
    }
  };

  const formatSyncTime = (date) => {
    if (!date) return 'Nunca';
    return new Date(date).toLocaleString('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!showBanner) return null;

  return (
    <div className={`${styles.banner} ${isOnline ? styles.online : styles.offline}`}>
      <div className={styles.content}>
        <div className={styles.status}>
          <span className={styles.icon}>
            {isOnline ? '📶' : '📡'}
          </span>
          <div className={styles.info}>
            <span className={styles.title}>
              {isOnline 
                ? (isOfflineData ? 'Dados salvos localmente' : 'Online')
                : 'Você está offline'
              }
            </span>
            {isOfflineData && lastSync && (
              <span className={styles.subtitle}>
                Última sincronização: {formatSyncTime(lastSync)}
              </span>
            )}
          </div>
        </div>
        
        {isOnline && isOfflineData && (
          <button 
            className={styles.syncButton}
            onClick={handleSync}
            disabled={syncing}
          >
            {syncing ? (
              <>
                <span className={styles.spinnerSmall}></span>
                Sincronizando...
              </>
            ) : (
              <>
                🔄 Atualizar
              </>
            )}
          </button>
        )}
        
        {!isOnline && (
          <span className={styles.offlineMessage}>
            Visualizando dados salvos
          </span>
        )}
      </div>
    </div>
  );
}
