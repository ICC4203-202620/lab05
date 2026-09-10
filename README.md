# Laboratorio 5: Notificaciones locales y Web Push

Este laboratorio se enfoca en incorporar notificaciones a una PWA y distinguir dos formas de iniciarlas. La primera utiliza eventos producidos por una página abierta para informar cambios de conectividad. La segunda recibe un mensaje Web Push capaz de activar el service worker aunque la página de la aplicación no se encuentre abierta.

La actividad continúa la aplicación completa del Laboratorio 4. El manifest, el registro del service worker, el app shell, la geolocalización, IndexedDB y la carga de los catálogos se encuentran resueltos y no se deben volver a implementar. El trabajo se concentra en el permiso de notificaciones, la suscripción de Push API, los eventos `push` y `notificationclick`, y el vínculo entre una notificación y la interfaz de la aplicación.

En una aplicación real, la suscripción se envía a un backend y se asocia con el usuario correspondiente. Para aislar el funcionamiento de Web Push, en este laboratorio la representación JSON de la suscripción se descarga como un archivo y un programa Python actúa como emisor. Este mecanismo corresponde exclusivamente a una prueba controlada y no reemplaza la arquitectura de una aplicación en producción.

Las habilidades que se espera ejercitar en esta actividad son:

1. Distinguir una notificación iniciada por una página de otra recibida mediante Web Push
2. Consultar y solicitar el permiso de notificaciones desde una acción explícita
3. Presentar una notificación mediante `ServiceWorkerRegistration.showNotification()`
4. Crear y recuperar una suscripción restringida mediante VAPID
5. Procesar el evento `push` y mantener activo el service worker mediante `event.waitUntil()`
6. Enviar un payload Web Push desde Python utilizando una suscripción previamente identificada
7. Procesar `notificationclick` para abrir o reutilizar una ventana de la aplicación
8. Comunicar una intención al contexto de página sin acceder al DOM desde el service worker

## Entorno de trabajo

Para desarrollar el laboratorio se requiere:

1. La versión estable más reciente de Google Chrome para escritorio
2. Un editor de código
3. Python 3.10 o posterior, con soporte para entornos virtuales
4. El portal de publicación y las credenciales entregadas por el equipo docente
5. Las notificaciones de Chrome habilitadas en el sistema operativo

Se puede trabajar en Windows, macOS o Linux. Las instrucciones y verificaciones utilizan los nombres de la interfaz en español de Chrome DevTools. No se requiere un teléfono ni instalar la aplicación.

Se debe trabajar con una sola pestaña de la aplicación durante las comprobaciones de conectividad. Si existen varias páginas abiertas bajo el mismo origen, cada una puede recibir los eventos `online` y `offline` y producir notificaciones repetidas.

## Preparación

El material se divide en dos directorios:

```text
lab05/
├── app/
│   ├── icons/
│   │   ├── icon-192.png
│   │   └── icon-512.png
│   ├── app.js
│   ├── app.webmanifest
│   ├── database.js
│   ├── index.html
│   ├── notifications.js
│   ├── register-sw.js
│   ├── styles.css
│   └── sw.js
└── sender/
    ├── requirements.txt
    └── send_push.py
```

Antes de modificar los archivos, se debe revisar su contenido:

- `app/notifications.js` contiene la interfaz de permiso, los listeners de conectividad y los bloques `TODO` para crear una suscripción; la descarga de su representación JSON se encuentra implementada
- `app/sw.js` conserva la implementación de caché del laboratorio anterior e incorpora bloques `TODO` únicamente para `push` y `notificationclick`
- `app/app.js` conserva la carga desde IndexedDB e incorpora `selectFeaturedRestaurantFromUrl()`, que se debe completar
- `sender/send_push.py` carga los archivos locales y define el payload; solo falta construir el envío mediante `webpush()`
- `sender/requirements.txt` declara la biblioteca utilizada por el emisor

No se deben modificar `database.js`, el manejo de `install`, `activate` o `fetch`, ni la estrategia de almacenamiento. La nueva versión del app shell ya incluye `notifications.js`.

## Flujo que se implementará

### Notificación iniciada localmente

Los eventos `online` y `offline` se producen en el contexto de la página. Cuando el permiso se encuentra concedido, la página obtiene el registro activo y utiliza `registration.showNotification(...)`. Estos eventos solo pueden procesarse mientras la página continúa ejecutándose; no activan por sí mismos al service worker.

El estado `online` indica que el navegador considera disponible una conexión de red. No garantiza que Internet o un servicio específico sean alcanzables. En este laboratorio se utiliza como una señal controlada para practicar Notifications API.

### Notificación iniciada remotamente

El emisor Python envía un payload al endpoint contenido en la suscripción. El push service entrega el mensaje al navegador, el navegador activa el service worker y se produce el evento `push`. El worker presenta una notificación visible y conserva en ella la ruta que se utilizará cuando el usuario la seleccione.

El payload del laboratorio utiliza el siguiente contrato:

```json
{
  "title": "Restaurante destacado",
  "body": "Abre la aplicación para ver la recomendación",
  "url": "./?restaurant=restaurant-4"
}
```

El identificador se recibe como argumento del emisor y se incorpora en `url`. Al seleccionar la notificación, el service worker abre o navega una ventana hacia esa URL. La página lee el parámetro `restaurant` después de cargar el catálogo, selecciona el restaurante correspondiente y genera el evento `change`. El service worker no accede directamente al DOM.

## Procedimiento

### 1. Preparar el emisor Python

Abrir un terminal en `sender/` y crear un entorno virtual:

```sh
python -m venv .venv
```

Activarlo en Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

En macOS o Linux:

```sh
source .venv/bin/activate
```

Instalar la dependencia:

```sh
python -m pip install -r requirements.txt
```

La instalación incorpora `pywebpush` y la herramienta `vapid` utilizada para generar el par de claves.

### 2. Generar el par VAPID

Con el terminal todavía ubicado en `sender/`, ejecutar una sola vez:

```sh
vapid --gen
```

El comando crea `private_key.pem` y `public_key.pem`. Luego, obtener la representación que Push API utiliza como `applicationServerKey`:

```sh
vapid --applicationServerKey
```

Copiar el valor completo presentado por el segundo comando, y si la salida inicia con `Application Server Key`, copiar sólo el código. No se debe volver a ejecutar `vapid --gen`, porque reemplazaría el par y las suscripciones creadas con la clave pública anterior dejarían de corresponder con la clave privada.

La clave pública no es secreta y se entrega al navegador. La clave privada identifica al emisor y debe permanecer en `sender/`. Los archivos de claves están excluidos mediante `.gitignore` y nunca se deben incorporar al ZIP de la aplicación.

### 3. Incorporar la clave pública

Abrir `app/notifications.js` y reemplazar el valor de `VAPID_PUBLIC_KEY` por el resultado de `vapid --applicationServerKey`.

Se debe conservar la clave como una cadena base64url. No se debe copiar el contenido de `public_key.pem`, eliminar manualmente sus encabezados ni incorporar `private_key.pem` al código JavaScript.

### 4. Ejecutar la aplicación localmente

No se debe abrir `index.html` mediante una URL `file://`. Abrir otro terminal dentro de `app/` e iniciar un servidor HTTP local. Por ejemplo:

```sh
python -m http.server 8000
```

Acceder a `http://localhost:8000`. `localhost` se considera un contexto seguro para desarrollo, pero una dirección IP local mediante HTTP no recibe el mismo tratamiento.

Si el origen ya se utilizó en laboratorios anteriores, abrir DevTools y realizar las siguientes acciones:

1. Cerrar las demás pestañas y ventanas que utilicen `http://localhost:8000`
2. En `Aplicación` → `Almacenamiento`, borrar los datos del sitio
3. En `Aplicación` → `Service Workers`, cancelar cualquier registro anterior
4. Recargar con conexión y esperar que el worker nuevo alcance el estado `activated`
5. Recargar una vez más y comprobar que `navigator.serviceWorker.controller` no sea `null`

### 5. Implementar la solicitud del permiso

En `notifications.js`, completar `requestNotificationPermission()` para que:

1. Finalice si las capacidades requeridas no se encuentran disponibles
2. Invoque `Notification.requestPermission()` solamente si `Notification.permission` es `default`
3. Retorne directamente el permiso vigente si su valor es `granted` o `denied`

El listener del botón se encuentra implementado y actualiza la interfaz después de esperar el resultado. No se debe solicitar el permiso durante la carga de la página ni desde los eventos de conectividad.

Presionar `Habilitar notificaciones` y conceder el permiso. Si previamente se había rechazado, se debe restablecer desde la configuración del sitio; la aplicación no puede modificar un permiso `denied`.

### 6. Presentar notificaciones de conectividad

Completar `showConnectionNotification(message)` para que:

1. Finalice si las capacidades no están disponibles o si el permiso no es `granted`
2. Espere `navigator.serviceWorker.ready` en la definición de `registration`
3. Invoque `registration.showNotification(...)` con el título `Estado de conexión`
4. Utilice el argumento `message` como cuerpo
5. Use un mismo `tag` para que un cambio de estado pueda reemplazar la notificación anterior
6. Guarde `"./"` en `data.url`, de modo que seleccionar la notificación abra la aplicación

Los listeners `online` y `offline` ya invocan esta función con los mensajes correspondientes.

Mantener abierta la página y, en DevTools, activar `Sin conexión` desde el panel `Red`. Debe aparecer la notificación `Se ha perdido la conexión`. Desactivar la simulación y comprobar la notificación `Se ha restablecido la conexión`.

Estas notificaciones se producen por eventos de la página. Cerrar la pestaña y modificar la conectividad no debe interpretarse como una prueba de ejecución en segundo plano.

### 7. Crear o recuperar la suscripción

Completar `getOrCreatePushSubscription()` con el siguiente flujo:

1. Espere `navigator.serviceWorker.ready` en la definición de `registration`
2. Consultar la suscripción mediante `registration.pushManager.getSubscription()`
3. Retornar la suscripción si ya existe
4. Si no existe, invocar `registration.pushManager.subscribe(...)`
5. Entregar `userVisibleOnly: true` y `VAPID_PUBLIC_KEY` como `applicationServerKey`

La misma suscripción debe reutilizarse mientras continúe vigente. No se debe crear una suscripción nueva en cada pulsación.

### 8. Obtener la representación JSON

La función `downloadSubscription(subscription)` se encuentra implementada. Serializa la suscripción, construye un archivo temporal y descarga `subscription.json`; su implementación no forma parte del trabajo solicitado.

Después de completar `getOrCreatePushSubscription()`, el botón `Crear y descargar suscripción` debe producir un archivo que contenga `endpoint`, `expirationTime`, `keys.p256dh` y `keys.auth`. El archivo identifica un destino de envío y debe tratarse como información sensible. No se debe incorporar al repositorio.

### 9. Procesar el evento push

En `sw.js`, completar el listener de `push`. La implementación debe:

1. Obtener el objeto JSON mediante `event.data.json()`
2. Definir un mensaje alternativo si el evento no contiene payload
3. Invocar `self.registration.showNotification(...)` con `title` y `body`
4. Conservar `message.url` dentro de `data.url`
5. Entregar la promesa a `event.waitUntil(...)`

Cada mensaje recibido mediante esta suscripción debe producir una notificación visible. El evento no se debe utilizar solamente para actualizar datos en segundo plano.

### 10. Procesar la selección de la notificación

Completar el listener de `notificationclick` para que:

1. Cierre `event.notification`
2. Obtenga `event.notification.data.url` o, si es nulo, utilice `"./"` como alternativa
3. Entregue a `event.waitUntil(...)` una operación que busque las ventanas controladas mediante `clients.matchAll({ type: 'window' })`
4. Si existe una ventana, navegue hacia la ruta y la enfoque
5. Si no existe una ventana, abra una mediante `clients.openWindow(...)`

La ruta relativa se debe resolver contra `self.registration.scope`. No se debe acceder a `document`, `window` ni otros elementos del DOM desde el service worker.

### 11. Seleccionar el restaurante desde la página

En `app.js`, completar `selectFeaturedRestaurantFromUrl()`. La función se invoca después de presentar ambos catálogos y debe:

1. Leer el parámetro `restaurant` desde `window.location.search`
2. Comprobar mediante `findPlace(restaurants, restaurantId)` que el identificador pertenezca al catálogo cargado
3. Asignar `restaurantSelect.value` como el restaurante buscado
4. Generar un evento `change` sobre el selector

La asignación de `value` no genera automáticamente `change`. Este evento es necesario para ejecutar el listener existente, mostrar las coordenadas y actualizar los botones de cálculo.

### 12. Completar el emisor

Abrir `sender/send_push.py`. La carga de `subscription.json`, la ruta de `private_key.pem` y la construcción del payload ya se encuentran definidas. El programa recibe como argumento un identificador entre `restaurant-1` y `restaurant-10`, y lo incorpora en la URL de la notificación.

Completar la llamada a `webpush(...)` utilizando:

- `subscription_info=subscription`
- `data=json.dumps(payload)`
- `vapid_private_key=str(PRIVATE_KEY_FILE)`
- `vapid_claims={"sub": "mailto:notificaciones@ejemplo.cl"}`
- `ttl=300`

El script representa al servidor de aplicación para esta prueba. No debe leer ni modificar IndexedDB y no requiere ejecutarse mediante un servidor HTTP.

### 13. Publicar la aplicación

Crear un ZIP con el contenido de `app/`, sin incluir la carpeta contenedora ni el propio archivo ZIP. La estructura debe ser:

```text
index.html
app.js
app.webmanifest
database.js
notifications.js
register-sw.js
styles.css
sw.js
icons/
```

No se deben incluir `sender/`, `private_key.pem`, `public_key.pem`, `subscription.json`, `.venv/` ni `send_push.py`.

Publicar mediante el portal y abrir la URL HTTPS asignada. Cerrar previamente las demás pestañas que utilicen esa URL. Si existe un registro de laboratorios anteriores, borrar los datos del sitio y cancelar el registro antes de recargar.

En `Aplicación` → `Service Workers`, comprobar que la versión que contiene los listeners `push` y `notificationclick` se encuentre activada. Después, recargar una vez y comprobar que la página esté controlada antes de crear la suscripción.

### 14. Crear la suscripción definitiva

En la URL HTTPS publicada:

1. Presionar `Habilitar notificaciones` y conceder el permiso
2. Presionar `Crear y descargar suscripción`
3. Mover el archivo descargado a `sender/subscription.json`
4. Abrir el archivo y comprobar la presencia de `endpoint` y `keys`

Una suscripción pertenece al origen y al registro desde los cuales fue creada. Si se descargó previamente una suscripción desde `localhost`, no se debe utilizar para comprobar la aplicación publicada.

### 15. Enviar y abrir la notificación remota

Con el entorno virtual activo y el terminal ubicado en `sender/`, realizar un primer envío mediante:

```sh
python send_push.py restaurant-1
```

El comando debe terminar indicando que el push service aceptó el mensaje. Chrome debe presentar una notificación con el título `Restaurante destacado`.

Seleccionar la notificación y comprobar que:

1. La aplicación se abre o reutiliza una ventana existente
2. La URL contiene `?restaurant=restaurant-1`
3. El selector muestra `Restaurant Valle Hermoso`
4. Las coordenadas del restaurante aparecen
5. Los controles de cálculo se actualizan de la misma manera que ante una selección manual

Sin cerrar la aplicación, realizar un segundo envío con otro identificador:

```sh
python send_push.py restaurant-4
```

Seleccionar la nueva notificación y comprobar que la URL cambia a `?restaurant=restaurant-4`, el selector muestra `Del Beto` y las coordenadas cambian. Esta segunda prueba permite descartar una selección fija de `restaurant-1` en el código de la página.

El mensaje Web Push informa la recomendación; no agrega ni modifica registros de IndexedDB.

### 16. Comprobar la recepción sin una página abierta

Cerrar todas las pestañas de la aplicación, pero mantener Chrome en ejecución. Volver a ejecutar:

```sh
python send_push.py restaurant-8
```

La notificación debe aparecer sin una página de la aplicación abierta. Al seleccionarla, Chrome debe abrir la aplicación y seleccionar `Fuente Alemana`.

Esta comprobación establece la diferencia central del laboratorio: los eventos de conectividad requieren una página ejecutándose, mientras que Web Push permite al navegador activar el service worker para procesar un mensaje remoto.

## Problemas frecuentes

### Chrome no presenta notificaciones

Revisar `Notification.permission`, el permiso del sitio y la configuración de notificaciones del sistema operativo. También se debe comprobar que no se encuentre activo un modo que silencie notificaciones.

### El botón de suscripción informa que falta la clave pública

Reemplazar `REEMPLAZAR_CON_APPLICATION_SERVER_KEY` por la salida completa de `vapid --applicationServerKey` y publicar nuevamente. La clave debe permanecer como una cadena base64url.

### El envío informa una clave VAPID inválida

Comprobar que `private_key.pem` pertenezca al mismo par cuya clave pública se utilizó al crear la suscripción. Si se volvió a ejecutar `vapid --gen`, se debe eliminar la suscripción anterior y crear una nueva.

### El mensaje llega al worker anterior

Cerrar las demás pestañas de la aplicación y revisar `Aplicación` → `Service Workers`. La versión nueva debe encontrarse activada antes de crear la suscripción y ejecutar el emisor.

### El script no encuentra un archivo

Comprobar que `private_key.pem` y `subscription.json` se encuentren directamente dentro de `sender/`. La clave pública no reemplaza al archivo privado requerido por el emisor.

### El push service responde 404 o 410

La suscripción dejó de ser válida. Crear y descargar otra desde la aplicación publicada y reemplazar `sender/subscription.json`.

### La aplicación abre, pero no selecciona el restaurante

Comprobar que el argumento entregado al emisor se encuentre entre `restaurant-1` y `restaurant-10`, revisar el parámetro `restaurant`, esperar que el catálogo termine de cargarse y verificar que `selectFeaturedRestaurantFromUrl()` genere el evento `change` después de asignar `restaurantSelect.value`.

### Los eventos de conectividad no producen notificaciones

La página debe permanecer abierta y el permiso debe encontrarse en `granted`. Los eventos `online` y `offline` no activan al service worker cuando no existe una página ejecutándose.
