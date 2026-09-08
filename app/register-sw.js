if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('./sw.js', {
        scope: './'
      });

      console.info('Service worker registrado', registration.scope);
    } catch (error) {
      console.error('No fue posible registrar el service worker', error);
    }
  });
}
