const VAPID_PUBLIC_KEY = 'REEMPLAZAR_CON_APPLICATION_SERVER_KEY';

const enableNotificationsButton = document.querySelector('#enable-notifications');
const downloadSubscriptionButton = document.querySelector('#download-subscription');
const notificationsStatus = document.querySelector('#notifications-status');

const pushSupported =
  window.isSecureContext &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window;

function updateNotificationInterface() {
  if (!pushSupported) {
    notificationsStatus.textContent = 'Este navegador no ofrece las capacidades requeridas.';
    enableNotificationsButton.disabled = true;
    downloadSubscriptionButton.disabled = true;
    return;
  }

  const messages = {
    default: 'El permiso de notificaciones aún no ha sido solicitado.',
    granted: 'El permiso de notificaciones se encuentra concedido.',
    denied: 'El permiso fue rechazado y debe restablecerse desde la configuración del sitio.'
  };

  notificationsStatus.textContent = messages[Notification.permission];
  enableNotificationsButton.disabled = Notification.permission !== 'default';
  downloadSubscriptionButton.disabled = Notification.permission !== 'granted';
}

async function requestNotificationPermission() {
  // TODO: retornar el permiso vigente o solicitarlo si todavía está en default.
}

async function showConnectionNotification(message) {
  // TODO: obtener el registro activo y presentar una notificación local.
}

async function getOrCreatePushSubscription() {
  // TODO: recuperar la suscripción vigente o crear una con la clave VAPID.
}

function downloadSubscription(subscription) {
  const content = JSON.stringify(subscription, null, 2);
  const objectUrl = URL.createObjectURL(
    new Blob([content], { type: 'application/json' })
  );
  const link = document.createElement('a');

  link.href = objectUrl;
  link.download = 'subscription.json';
  link.click();
  URL.revokeObjectURL(objectUrl);
}

enableNotificationsButton.addEventListener('click', async () => {
  await requestNotificationPermission();
  updateNotificationInterface();
});

downloadSubscriptionButton.addEventListener('click', async () => {
  const subscription = await getOrCreatePushSubscription();

  if (subscription) {
    downloadSubscription(subscription);
  }
});

window.addEventListener('offline', () => {
  showConnectionNotification('Se ha perdido la conexión.');
});

window.addEventListener('online', () => {
  showConnectionNotification('Se ha restablecido la conexión.');
});

updateNotificationInterface();
