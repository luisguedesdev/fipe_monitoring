// IndexedDB utility for offline storage
const DB_NAME = 'fipe-monitor-db';
const DB_VERSION = 1;
const STORES = {
  VEICULOS: 'veiculos',
  HISTORICO: 'historico',
  SYNC_QUEUE: 'syncQueue'
};

let db = null;

// Inicializar IndexedDB
export async function initDB() {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('[IndexedDB] Error opening database');
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      console.log('[IndexedDB] Database opened successfully');
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      // Store para veículos
      if (!database.objectStoreNames.contains(STORES.VEICULOS)) {
        const veiculosStore = database.createObjectStore(STORES.VEICULOS, {
          keyPath: 'id'
        });
        veiculosStore.createIndex('marca', 'codigoMarca', { unique: false });
        veiculosStore.createIndex('modelo', 'codigoModelo', { unique: false });
        veiculosStore.createIndex('ultimaConsulta', 'ultimaConsulta', { unique: false });
      }

      // Store para histórico de preços
      if (!database.objectStoreNames.contains(STORES.HISTORICO)) {
        const historicoStore = database.createObjectStore(STORES.HISTORICO, {
          keyPath: 'id',
          autoIncrement: true
        });
        historicoStore.createIndex('veiculo', 'veiculoId', { unique: false });
        historicoStore.createIndex('data', 'data', { unique: false });
      }

      // Store para sincronização
      if (!database.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        database.createObjectStore(STORES.SYNC_QUEUE, {
          keyPath: 'id',
          autoIncrement: true
        });
      }

      console.log('[IndexedDB] Database upgraded');
    };
  });
}

// Salvar veículos no IndexedDB
export async function saveVeiculos(veiculos) {
  const database = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORES.VEICULOS, 'readwrite');
    const store = transaction.objectStore(STORES.VEICULOS);

    // Limpar store antes de adicionar novos dados
    store.clear();

    veiculos.forEach((veiculo) => {
      const id = `${veiculo.codigoMarca}-${veiculo.codigoModelo}-${veiculo.anoModelo}`;
      store.put({ ...veiculo, id, savedAt: new Date().toISOString() });
    });

    transaction.oncomplete = () => {
      console.log('[IndexedDB] Veículos saved:', veiculos.length);
      resolve();
    };

    transaction.onerror = () => {
      console.error('[IndexedDB] Error saving veículos');
      reject(transaction.error);
    };
  });
}

// Buscar veículos do IndexedDB
export async function getVeiculos() {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORES.VEICULOS, 'readonly');
    const store = transaction.objectStore(STORES.VEICULOS);
    const request = store.getAll();

    request.onsuccess = () => {
      console.log('[IndexedDB] Veículos loaded:', request.result.length);
      resolve(request.result);
    };

    request.onerror = () => {
      console.error('[IndexedDB] Error loading veículos');
      reject(request.error);
    };
  });
}

// Buscar um veículo específico
export async function getVeiculo(codigoMarca, codigoModelo, anoModelo) {
  const database = await initDB();
  const id = `${codigoMarca}-${codigoModelo}-${anoModelo}`;

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORES.VEICULOS, 'readonly');
    const store = transaction.objectStore(STORES.VEICULOS);
    const request = store.get(id);

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

// Deletar veículo do IndexedDB
export async function deleteVeiculo(codigoMarca, codigoModelo, anoModelo) {
  const database = await initDB();
  const id = `${codigoMarca}-${codigoModelo}-${anoModelo}`;

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORES.VEICULOS, 'readwrite');
    const store = transaction.objectStore(STORES.VEICULOS);
    const request = store.delete(id);

    request.onsuccess = () => {
      console.log('[IndexedDB] Veículo deleted:', id);
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

// Salvar histórico no IndexedDB
export async function saveHistorico(veiculoId, historico) {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORES.HISTORICO, 'readwrite');
    const store = transaction.objectStore(STORES.HISTORICO);

    // Remover histórico antigo deste veículo
    const index = store.index('veiculo');
    const deleteRequest = index.openCursor(IDBKeyRange.only(veiculoId));

    deleteRequest.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      } else {
        // Adicionar novo histórico
        historico.forEach((item) => {
          store.add({ ...item, veiculoId, savedAt: new Date().toISOString() });
        });
      }
    };

    transaction.oncomplete = () => {
      console.log('[IndexedDB] Histórico saved for:', veiculoId);
      resolve();
    };

    transaction.onerror = () => {
      reject(transaction.error);
    };
  });
}

// Buscar histórico do IndexedDB
export async function getHistorico(veiculoId) {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORES.HISTORICO, 'readonly');
    const store = transaction.objectStore(STORES.HISTORICO);
    const index = store.index('veiculo');
    const request = index.getAll(IDBKeyRange.only(veiculoId));

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

// Adicionar ação à fila de sincronização
export async function addToSyncQueue(action) {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORES.SYNC_QUEUE, 'readwrite');
    const store = transaction.objectStore(STORES.SYNC_QUEUE);
    const request = store.add({
      ...action,
      createdAt: new Date().toISOString()
    });

    request.onsuccess = () => {
      console.log('[IndexedDB] Action added to sync queue');
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

// Buscar fila de sincronização
export async function getSyncQueue() {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORES.SYNC_QUEUE, 'readonly');
    const store = transaction.objectStore(STORES.SYNC_QUEUE);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

// Limpar fila de sincronização
export async function clearSyncQueue() {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORES.SYNC_QUEUE, 'readwrite');
    const store = transaction.objectStore(STORES.SYNC_QUEUE);
    const request = store.clear();

    request.onsuccess = () => {
      console.log('[IndexedDB] Sync queue cleared');
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

// Obter timestamp da última sincronização
export async function getLastSyncTime() {
  try {
    const veiculos = await getVeiculos();
    if (veiculos.length === 0) return null;
    
    const dates = veiculos.map(v => new Date(v.savedAt));
    return new Date(Math.max(...dates));
  } catch {
    return null;
  }
}

// Verificar se há dados offline
export async function hasOfflineData() {
  try {
    const veiculos = await getVeiculos();
    return veiculos.length > 0;
  } catch {
    return false;
  }
}
