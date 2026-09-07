import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

type JourneyMapPlace = {
  id: string;
  name: string;
  category: 'match' | 'stay' | 'eat' | 'night' | 'sea' | 'history';
  categoryLabel: string;
  lat: number;
  lng: number;
  summary: string;
  mapsUrl: string;
  articleHref?: string;
};

type JourneyMapConfig = {
  center: [number, number];
  zoom: number;
  minZoom?: number;
  maxZoom?: number;
  places: JourneyMapPlace[];
};

const markerGlyph: Record<JourneyMapPlace['category'], string> = {
  match: '⚽',
  stay: '🛏',
  eat: '🍴',
  night: '✦',
  sea: '≈',
  history: '⌛',
};

const escapeHtml = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

document.querySelectorAll<HTMLElement>('[data-journey-live-map]').forEach((container) => {
  const canvas = container.querySelector<HTMLElement>('[data-map-canvas]');
  const configNode = container.querySelector<HTMLScriptElement>('[data-map-config]');
  if (!canvas || !configNode || canvas.dataset.mapReady === 'true') return;

  let config: JourneyMapConfig;
  try {
    config = JSON.parse(configNode.textContent ?? '') as JourneyMapConfig;
  } catch {
    container.classList.add('is-map-unavailable');
    return;
  }

  canvas.dataset.mapReady = 'true';
  const map = L.map(canvas, {
    zoomControl: false,
    scrollWheelZoom: false,
    minZoom: config.minZoom ?? 11,
    maxZoom: config.maxZoom ?? 18,
    attributionControl: true,
  }).setView(config.center, config.zoom);

  L.control.zoom({ position: 'topright', zoomInTitle: '지도 확대', zoomOutTitle: '지도 축소' }).addTo(map);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
  }).addTo(map);

  const markers = config.places.map((place) => {
    const marker = L.marker([place.lat, place.lng], {
      title: `${place.categoryLabel} · ${place.name}`,
      icon: L.divIcon({
        className: `journey-live-map__marker journey-live-map__marker--${place.category}`,
        html: `<span aria-hidden="true"><b>${markerGlyph[place.category]}</b></span>`,
        iconSize: [38, 46],
        iconAnchor: [19, 42],
        popupAnchor: [0, -40],
      }),
    });

    const articleLink = place.articleHref
      ? `<a class="journey-live-map__popup-article" href="${escapeHtml(place.articleHref)}">본문에서 보기</a>`
      : '';
    marker.bindTooltip(escapeHtml(place.name), { direction: 'top', offset: [0, -38], opacity: 0.96 });
    marker.bindPopup(
      `<div class="journey-live-map__popup"><span>${escapeHtml(place.categoryLabel)}</span><strong>${escapeHtml(place.name)}</strong><p>${escapeHtml(place.summary)}</p><div>${articleLink}<a href="${escapeHtml(place.mapsUrl)}" target="_blank" rel="noopener noreferrer">Google Maps 열기 ↗</a></div></div>`,
      { maxWidth: 270, minWidth: 210 }
    );
    marker.addTo(map);
    return { place, marker };
  });

  const applyFilter = (category: string) => {
    const visible: L.Marker[] = [];
    markers.forEach(({ place, marker }) => {
      const show = category === 'all' || place.category === category;
      if (show && !map.hasLayer(marker)) marker.addTo(map);
      if (!show && map.hasLayer(marker)) marker.removeFrom(map);
      if (show) visible.push(marker);
    });

    container.querySelectorAll<HTMLButtonElement>('[data-map-filter]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.mapFilter === category));
    });

    if (category === 'all') {
      map.setView(config.center, config.zoom, { animate: true });
    } else if (visible.length === 1) {
      map.setView(visible[0].getLatLng(), 15, { animate: true });
    } else if (visible.length > 1) {
      map.fitBounds(L.featureGroup(visible).getBounds(), { padding: [42, 42], maxZoom: 14, animate: true });
    }
  };

  container.querySelectorAll<HTMLButtonElement>('[data-map-filter]').forEach((button) => {
    button.addEventListener('click', () => applyFilter(button.dataset.mapFilter ?? 'all'));
  });

  const resetButton = container.querySelector<HTMLButtonElement>('[data-map-reset]');
  resetButton?.addEventListener('click', () => applyFilter('all'));

  const enableWheel = container.querySelector<HTMLButtonElement>('[data-map-wheel]');
  enableWheel?.addEventListener('click', () => {
    const enabled = enableWheel.getAttribute('aria-pressed') === 'true';
    if (enabled) {
      map.scrollWheelZoom.disable();
      enableWheel.setAttribute('aria-pressed', 'false');
      enableWheel.textContent = '마우스 휠 확대 켜기';
    } else {
      map.scrollWheelZoom.enable();
      enableWheel.setAttribute('aria-pressed', 'true');
      enableWheel.textContent = '마우스 휠 확대 끄기';
    }
  });

  window.setTimeout(() => map.invalidateSize(), 80);
});
