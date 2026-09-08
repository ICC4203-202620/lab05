const DB_NAME = 'distance-app';
const DB_VERSION = 2;

function configureDatabase(event) {
  const database = event.target.result;

  if (event.oldVersion < 1) {
    const store = database.createObjectStore('restaurants', {
      keyPath: 'id'
    });

    store.createIndex('name', 'name', {
      unique: false
    });
  }

  if (event.oldVersion < 2) {
    const store = database.createObjectStore('metroStations', {
      keyPath: 'id'
    });

    store.createIndex('name', 'name', {
      unique: false
    });
  }
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.addEventListener('upgradeneeded', (event) => {
      configureDatabase(event);
    });

    request.addEventListener('success', (event) => {
      const database = event.target.result;

      database.addEventListener('versionchange', () => {
        database.close();
      });

      resolve(database);
    });

    request.addEventListener('error', (event) => {
      reject(event.target.error);
    });

    request.addEventListener('blocked', (event) => {
      console.warn(
        `Otra conexión impide actualizar IndexedDB desde la versión ${event.oldVersion} ` +
        `a la versión ${event.newVersion}. Se deben cerrar las demás pestañas de la aplicación.`
      );
    });
  });
}

function readAll(database, storeName) {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const index = store.index('name');
    const request = index.getAll();

    request.addEventListener('success', (event) => {
      resolve(event.target.result);
    });

    request.addEventListener('error', (event) => {
      reject(event.target.error);
    });
  });
}

function storeAll(database, storeName, records) {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);

    transaction.addEventListener('complete', () => {
      resolve();
    });

    transaction.addEventListener('abort', () => {
      reject(transaction.error ?? new Error(`Se abortó la escritura en ${storeName}.`));
    });

    try {
      for (const record of records) {
        store.put(record);
      }
    } catch (error) {
      transaction.abort();
      reject(error);
    }
  });
}
