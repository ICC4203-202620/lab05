const RESTAURANTS_ENDPOINT = 'https://pwa.shareddomain.link/api/restaurants';
const METRO_STATIONS_ENDPOINT = 'https://pwa.shareddomain.link/api/metro-stations';

let restaurants = [];
let metroStations = [];

const restaurantSelect = document.querySelector('#restaurant-select');
const restaurantStatus = document.querySelector('#restaurant-status');
const restaurantCoordinates = document.querySelector('#restaurant-coordinates');
const stationSelect = document.querySelector('#station-select');
const stationStatus = document.querySelector('#station-status');
const stationCoordinates = document.querySelector('#station-coordinates');
const calculateStationButton = document.querySelector('#calculate-station');
const locationSection = document.querySelector('#location-section');
const locationOutput = document.querySelector('#location-output');
const requestLocationButton = document.querySelector('#request-location');
const calculateLocationButton = document.querySelector('#calculate-location');
const distanceSection = document.querySelector('#distance-section');
const distanceResult = document.querySelector('#distance-result');

let currentLocation = null;

function replaceOptions(select, places, emptyLabel, availableLabel) {
  select.replaceChildren();

  const initialOption = document.createElement('option');
  initialOption.value = '';
  initialOption.textContent = places.length > 0 ? availableLabel : emptyLabel;
  select.append(initialOption);

  for (const place of places) {
    const option = document.createElement('option');
    option.value = place.id;
    option.textContent = place.name;
    select.append(option);
  }

  select.disabled = places.length === 0;
}

function showRestaurantCatalog(places) {
  restaurants = places;
  replaceOptions(
    restaurantSelect,
    places,
    'Catálogo de restaurantes no disponible',
    'Seleccionar un restaurante'
  );

  restaurantStatus.textContent = places.length > 0
    ? `${places.length} restaurantes disponibles.`
    : 'El catálogo de restaurantes no se encuentra disponible.';

  restaurantCoordinates.textContent = '';
  restaurantCoordinates.hidden = true;
  clearDistance();
  updateCalculationControls();
}

function showStationCatalog(places) {
  metroStations = places;
  replaceOptions(
    stationSelect,
    places,
    'Catálogo de estaciones no disponible',
    'Seleccionar una estación'
  );

  stationStatus.textContent = places.length > 0
    ? `${places.length} estaciones disponibles.`
    : 'El catálogo de estaciones no se encuentra disponible.';

  stationCoordinates.textContent = '';
  stationCoordinates.hidden = true;
  clearDistance();
  updateCalculationControls();
}

function findPlace(places, id) {
  return places.find((place) => place.id === id) ?? null;
}

function selectFeaturedRestaurantFromUrl() {
  // TODO: obtener el parámetro restaurant, comprobar que exista en el
  // catálogo, seleccionarlo y generar el evento change.
}

function getSelectedRestaurant() {
  return findPlace(restaurants, restaurantSelect.value);
}

function getSelectedStation() {
  return findPlace(metroStations, stationSelect.value);
}

function formatCoordinates(place) {
  return `Latitud: ${place.latitude.toFixed(6)}; longitud: ${place.longitude.toFixed(6)}`;
}

function calculateDistanceKm(origin, destination) {
  const earthRadiusKm = 6371;
  const toRadians = (degrees) => degrees * (Math.PI / 180);
  const latitudeDifference = toRadians(destination.latitude - origin.latitude);
  const longitudeDifference = toRadians(destination.longitude - origin.longitude);
  const originLatitude = toRadians(origin.latitude);
  const destinationLatitude = toRadians(destination.latitude);

  const haversine =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(originLatitude) *
      Math.cos(destinationLatitude) *
      Math.sin(longitudeDifference / 2) ** 2;

  const centralAngle = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  return earthRadiusKm * centralAngle;
}

function formatDistance(distanceKm) {
  return new Intl.NumberFormat('es-CL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(distanceKm);
}

function clearDistance() {
  distanceResult.textContent = '';
  distanceSection.hidden = true;
}

function updateCalculationControls() {
  const restaurantAvailable = getSelectedRestaurant() !== null;
  const stationAvailable = getSelectedStation() !== null;

  calculateStationButton.disabled = !restaurantAvailable || !stationAvailable;
  calculateLocationButton.disabled = !restaurantAvailable || currentLocation === null;
}

restaurantSelect.addEventListener('change', () => {
  const restaurant = getSelectedRestaurant();

  restaurantCoordinates.textContent = restaurant ? formatCoordinates(restaurant) : '';
  restaurantCoordinates.hidden = restaurant === null;
  clearDistance();
  updateCalculationControls();
});

stationSelect.addEventListener('change', () => {
  const station = getSelectedStation();

  stationCoordinates.textContent = station ? formatCoordinates(station) : '';
  stationCoordinates.hidden = station === null;
  clearDistance();
  updateCalculationControls();
});

calculateStationButton.addEventListener('click', () => {
  const restaurant = getSelectedRestaurant();
  const station = getSelectedStation();

  if (!restaurant || !station) {
    return;
  }

  const distanceKm = calculateDistanceKm(station, restaurant);
  distanceResult.textContent =
    `La estación de Metro "${station.name}" se encuentra a ${formatDistance(distanceKm)} km en línea recta del restaurante "${restaurant.name}".`;
  distanceSection.hidden = false;
});

async function fetchCollection(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`La API respondió con el estado ${response.status}.`);
  }

  const collection = await response.json();

  if (!Array.isArray(collection)) {
    throw new TypeError('La respuesta de la API no contiene un arreglo.');
  }

  return collection;
}

async function loadPersistedCollection(database, storeName, endpoint) {
  const storedRecords = await readAll(database, storeName);

  if (storedRecords.length > 0) {
    return storedRecords;
  }

  const downloadedRecords = await fetchCollection(endpoint);
  await storeAll(database, storeName, downloadedRecords);
  return readAll(database, storeName);
}

async function loadRestaurantCatalog(database) {
  return loadPersistedCollection(database, 'restaurants', RESTAURANTS_ENDPOINT);
}

async function loadMetroStationCatalog(database) {
  return loadPersistedCollection(database, 'metroStations', METRO_STATIONS_ENDPOINT);
}

function presentCatalogResult(result, showCatalog, catalogName) {
  if (result.status === 'fulfilled' && Array.isArray(result.value)) {
    showCatalog(result.value);
    return;
  }

  showCatalog([]);

  if (result.status === 'rejected') {
    console.warn(`No fue posible cargar el catálogo de ${catalogName}.`, result.reason);
  }
}

async function initializeCatalogs() {
  let database = null;

  database = await openDatabase();

  const [restaurantsResult, metroStationsResult] = await Promise.allSettled([
    loadRestaurantCatalog(database),
    loadMetroStationCatalog(database)
  ]);

  presentCatalogResult(restaurantsResult, showRestaurantCatalog, 'restaurantes');
  presentCatalogResult(metroStationsResult, showStationCatalog, 'estaciones');
  selectFeaturedRestaurantFromUrl();
}

async function initializeLocation() {
  if (!('geolocation' in navigator)) {
    return;
  }

  locationSection.hidden = false;
  let permissionState = 'prompt';

  function updatePermissionInterface(state) {
    permissionState = state;

    const messages = {
      prompt: 'Aún no se ha solicitado acceso a la ubicación.',
      granted: 'El permiso fue concedido. Puede obtener su ubicación.',
      denied: 'El permiso fue rechazado. Debe restablecerse desde la configuración del sitio.'
    };

    locationOutput.textContent = messages[state] ?? messages.prompt;
    requestLocationButton.disabled = state === 'denied';

    if (state !== 'granted') {
      currentLocation = null;
      updateCalculationControls();
    }
  }

  updatePermissionInterface(permissionState);

  if ('permissions' in navigator) {
    try {
      const permissionStatus = await navigator.permissions.query({
        name: 'geolocation'
      });

      updatePermissionInterface(permissionStatus.state);
      permissionStatus.addEventListener('change', () => {
        updatePermissionInterface(permissionStatus.state);
      });
    } catch {
      updatePermissionInterface('prompt');
    }
  }

  requestLocationButton.addEventListener('click', () => {
    requestLocationButton.disabled = true;
    locationOutput.textContent = permissionState === 'granted'
      ? 'Obteniendo la ubicación…'
      : 'Esperando la respuesta del usuario…';

    navigator.geolocation.getCurrentPosition(
      (position) => {
        permissionState = 'granted';
        currentLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };

        locationOutput.textContent = formatCoordinates(currentLocation);
        requestLocationButton.disabled = false;
        updateCalculationControls();
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          updatePermissionInterface('denied');
          return;
        }

        locationOutput.textContent = `No fue posible obtener la ubicación: ${error.message}`;
        requestLocationButton.disabled = false;
      }
    );
  });

  calculateLocationButton.addEventListener('click', () => {
    const restaurant = getSelectedRestaurant();

    if (!restaurant || !currentLocation) {
      return;
    }

    const distanceKm = calculateDistanceKm(currentLocation, restaurant);
    distanceResult.textContent =
      `Usted se encuentra a una distancia de ${formatDistance(distanceKm)} km en línea recta del restaurante "${restaurant.name}".`;
    distanceSection.hidden = false;
  });
}

initializeCatalogs();
initializeLocation();
