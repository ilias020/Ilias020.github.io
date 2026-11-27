import { getLang, ready, t } from "./i18n.js";
import { mapsConfig } from "./maps-config.js";
import { CURRENT_YEAR, DEFAULT_PLACE, HOME, OVERVIEW, SOON, places } from "./travel-data.js";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const SWIPE_THRESHOLD = 40;
const MAP_PADDING = 48;
const MAX_FOCUS_ZOOM = 11;
const FLY_DURATION = 1100;
const ROUTE_SPEED = 0.03;

const placesById = new Map(places.map((place) => [place.id, place]));

const text = (key) => t(key) ?? "";
const localName = (name) => (typeof name === "string" ? name : name[getLang()] ?? name.nl);
const placeName = (place) => text(`travel.places.${place.id}.name`);
const placeTag = (place) => {
  if (place.kind === "home") return text("travel.home");
  if (place.kind === "soon") return text("travel.soon");
  const locale = getLang() === "en" ? "en-GB" : "nl";
  return new Intl.ListFormat(locale, { type: "conjunction" }).format(place.years.map(String));
};
const placeLabel = (place) => `${placeName(place)}, ${placeTag(place)}`;
const pinVariant = (place) => place.kind ?? (place.years.includes(CURRENT_YEAR) ? "recent" : "past");

const average = (cities) => ({
  lat: cities.reduce((sum, city) => sum + city.position.lat, 0) / cities.length,
  lng: cities.reduce((sum, city) => sum + city.position.lng, 0) / cities.length,
});
const pinPosition = (place) => place.pin ?? average(place.cities);
const boundsOf = (cities) => ({
  north: Math.max(...cities.map((city) => city.position.lat)),
  south: Math.min(...cities.map((city) => city.position.lat)),
  east: Math.max(...cities.map((city) => city.position.lng)),
  west: Math.min(...cities.map((city) => city.position.lng)),
});

const pinElement = (variant) => {
  const pin = document.createElement("span");
  pin.className = `map-pin map-pin--${variant}`;
  const dot = document.createElement("span");
  dot.className = "map-pin__dot";
  pin.append(dot);
  return pin;
};

function createCarousel(root, dots) {
  const viewport = root.querySelector("[data-carousel-viewport]");
  const counter = root.querySelector("[data-carousel-counter]");
  const city = root.querySelector("[data-carousel-city]");
  let place = null;
  let slides = [];
  let index = 0;

  const load = (position) => {
    const img = slides[(position + slides.length) % slides.length];
    if (!img.getAttribute("src")) img.src = img.dataset.src;
  };

  const show = (position) => {
    if (!slides.length) return;
    index = (position + slides.length) % slides.length;
    slides.forEach((img, n) => {
      img.classList.toggle("is-active", n === index);
      img.setAttribute("aria-hidden", String(n !== index));
    });
    load(index);
    if (slides.length > 1) load(index + 1);
    counter.textContent = `${index + 1} / ${slides.length}`;
    city.textContent = localName(place.photos[index].city);
    [...dots.children].forEach((dot, n) => dot.setAttribute("aria-current", String(n === index)));
  };

  const translate = () => {
    if (!place) return;
    root.setAttribute("aria-label", `${text("travel.photos")}: ${placeName(place)}`);
    slides.forEach((img, n) => {
      img.alt = text(`travel.places.${place.id}.alts.${n}`);
    });
    [...dots.children].forEach((dot, n) => {
      dot.setAttribute("aria-label", text("travel.photo").replace("{n}", n + 1).replace("{total}", slides.length));
    });
    if (slides.length) city.textContent = localName(place.photos[index].city);
  };

  const render = (nextPlace) => {
    place = nextPlace;
    index = 0;
    slides = place.photos.map((photo) => {
      const img = document.createElement("img");
      img.className = "carousel__slide";
      img.dataset.src = photo.src;
      img.decoding = "async";
      img.alt = "";
      return img;
    });
    viewport.replaceChildren(...slides);
    dots.replaceChildren(
      ...place.photos.map((_, n) => {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.className = "carousel__dot";
        dot.addEventListener("click", () => show(n));
        return dot;
      }),
    );
    root.hidden = !slides.length;
    dots.hidden = slides.length < 2;
    root.classList.toggle("carousel--single", slides.length < 2);
    translate();
    show(0);
  };

  const showCity = (name) => {
    const position = place.photos.findIndex((photo) => localName(photo.city) === localName(name));
    if (position !== -1) show(position);
  };

  root.querySelector("[data-carousel-prev]").addEventListener("click", () => show(index - 1));
  root.querySelector("[data-carousel-next]").addEventListener("click", () => show(index + 1));

  root.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") show(index - 1);
    else if (event.key === "ArrowRight") show(index + 1);
  });

  let startX = null;
  root.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "mouse") startX = event.clientX;
  });
  root.addEventListener("pointerup", (event) => {
    if (startX === null) return;
    const distance = event.clientX - startX;
    startX = null;
    if (Math.abs(distance) > SWIPE_THRESHOLD) show(index + (distance < 0 ? 1 : -1));
  });
  root.addEventListener("pointercancel", () => {
    startX = null;
  });

  return { render, translate, showCity };
}

const loadMapsApi = (apiKey) =>
  new Promise((resolve, reject) => {
    const callback = "__travelMapReady";
    window[callback] = () => {
      delete window[callback];
      resolve();
    };
    const params = new URLSearchParams({ key: apiKey, v: "weekly", loading: "async", callback, language: getLang(), region: "NL" });
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?${params}`;
    script.async = true;
    script.onerror = () => reject(new Error("Google Maps kon niet laden"));
    document.head.append(script);
  });

const mercatorY = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
const inverseMercatorY = (y) => ((2 * Math.atan(Math.exp(y)) - Math.PI / 2) * 180) / Math.PI;
const lerp = (from, to, progress) => from + (to - from) * progress;
const easeInOut = (progress) => (progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2);

async function createMap(container, { onSelect, onCity }) {
  await loadMapsApi(mapsConfig.apiKey);
  const [{ Map, Polyline }, { AdvancedMarkerElement }] = await Promise.all([
    google.maps.importLibrary("maps"),
    google.maps.importLibrary("marker"),
  ]);

  const cameraFor = (bounds) => {
    const width = Math.max(container.clientWidth - 2 * MAP_PADDING, 1);
    const height = Math.max(container.clientHeight - 2 * MAP_PADDING, 1);
    const lngSpan = Math.max(bounds.east - bounds.west, 1e-4);
    const latSpan = Math.max(mercatorY(bounds.north) - mercatorY(bounds.south), 1e-4);
    const zoom = Math.min(
      Math.log2(((width / 256) * 360) / lngSpan),
      Math.log2(((height / 256) * 2 * Math.PI) / latSpan),
      MAX_FOCUS_ZOOM,
    );
    const center = {
      lat: inverseMercatorY((mercatorY(bounds.north) + mercatorY(bounds.south)) / 2),
      lng: (bounds.east + bounds.west) / 2,
    };
    return { center, zoom };
  };

  const map = new Map(container, {
    mapId: mapsConfig.mapId,
    ...cameraFor(OVERVIEW),
    disableDefaultUI: true,
    zoomControl: true,
    clickableIcons: false,
    gestureHandling: "cooperative",
  });

  let frame = 0;
  const fly = (target) => {
    cancelAnimationFrame(frame);
    if (reducedMotion.matches) {
      map.moveCamera(target);
      return;
    }
    const from = { center: map.getCenter().toJSON(), zoom: map.getZoom() };
    const start = performance.now();
    const step = (now) => {
      const progress = Math.min((now - start) / FLY_DURATION, 1);
      const eased = easeInOut(progress);
      map.moveCamera({
        center: { lat: lerp(from.center.lat, target.center.lat, eased), lng: lerp(from.center.lng, target.center.lng, eased) },
        zoom: lerp(from.zoom, target.zoom, eased),
      });
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
  };

  const soonLabels = [];
  const soonLabel = () => {
    const label = document.createElement("span");
    label.className = "map-pin__label";
    label.textContent = text("travel.soon");
    soonLabels.push(label);
    return label;
  };

  const countryMarkers = places.map((place) => {
    const content = pinElement(pinVariant(place));
    if (place.id === SOON) content.append(soonLabel());
    const marker = new AdvancedMarkerElement({ map, position: pinPosition(place), content, gmpClickable: true });
    marker.addEventListener("gmp-click", () => onSelect(place.id, { zoom: true }));
    return { place, marker, content };
  });

  let cityMarkers = [];
  const clearCities = () => {
    cityMarkers.forEach(({ marker }) => {
      marker.map = null;
    });
    cityMarkers = [];
  };

  const accent = getComputedStyle(document.documentElement).getPropertyValue("--color-accent").trim();
  const route = new Polyline({
    map,
    path: [placesById.get(HOME).cities[0].position, placesById.get(SOON).cities[0].position],
    geodesic: true,
    clickable: false,
    strokeOpacity: 0,
    icons: [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 1, strokeColor: accent, scale: 2.5 }, offset: "0", repeat: "10px" }],
  });

  let routeFrame = 0;
  let inView = false;
  let overview = true;
  const animateRoute = () => {
    cancelAnimationFrame(routeFrame);
    if (!inView || !overview || reducedMotion.matches) return;
    const tick = (now) => {
      const icons = route.get("icons");
      icons[0].offset = `${(now * ROUTE_SPEED) % 10}px`;
      route.set("icons", icons);
      routeFrame = requestAnimationFrame(tick);
    };
    routeFrame = requestAnimationFrame(tick);
  };
  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    animateRoute();
  }).observe(container);
  reducedMotion.addEventListener("change", animateRoute);

  const showOverview = () => {
    overview = true;
    clearCities();
    countryMarkers.forEach(({ marker }) => {
      marker.map = map;
    });
    route.setMap(map);
    fly(cameraFor(OVERVIEW));
    animateRoute();
  };

  const focus = (place) => {
    overview = false;
    animateRoute();
    route.setMap(null);
    countryMarkers.forEach(({ marker }) => {
      marker.map = null;
    });
    clearCities();
    cityMarkers = place.cities.map((city) => {
      const content = pinElement(pinVariant(place));
      if (place.id === SOON) content.append(soonLabel());
      const marker = new AdvancedMarkerElement({ map, position: city.position, content, title: localName(city.name), gmpClickable: true });
      marker.addEventListener("gmp-click", () => onCity(city.name));
      return { city, marker };
    });
    fly(cameraFor(boundsOf(place.cities)));
  };

  const highlight = (id) => {
    countryMarkers.forEach(({ place, content }) => content.classList.toggle("is-selected", place.id === id));
  };

  const translate = () => {
    soonLabels.forEach((label) => {
      label.textContent = text("travel.soon");
    });
    countryMarkers.forEach(({ place, marker }) => {
      marker.title = placeLabel(place);
    });
    cityMarkers.forEach(({ city, marker }) => {
      marker.title = localName(city.name);
    });
  };

  translate();
  return { showOverview, focus, highlight, translate };
}

export function initTravel() {
  const section = document.querySelector("[data-travel]");
  if (!section) return;

  const frame = section.querySelector("[data-travel-map]");
  const canvas = section.querySelector("[data-travel-canvas]");
  const list = section.querySelector("[data-travel-list]");
  const back = section.querySelector("[data-travel-back]");
  const card = {
    tag: section.querySelector("[data-travel-tag]"),
    name: section.querySelector("[data-travel-name]"),
    text: section.querySelector("[data-travel-text]"),
    cities: section.querySelector("[data-travel-cities]"),
  };
  const carousel = createCarousel(section.querySelector("[data-carousel]"), section.querySelector("[data-carousel-dots]"));

  let selected = placesById.get(DEFAULT_PLACE);
  let map = null;

  const buttons = places.map((place) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "travel__country";
    button.append(pinElement(pinVariant(place)));
    const name = document.createElement("span");
    name.className = "travel__country-name";
    const tag = document.createElement("span");
    tag.className = "travel__country-tag";
    button.append(name, tag);
    button.addEventListener("click", () => select(place.id));
    const item = document.createElement("li");
    item.append(button);
    list.append(item);
    return { place, button, name, tag };
  });

  const renderCard = () => {
    card.tag.textContent = placeTag(selected);
    card.name.textContent = placeName(selected);
    card.text.textContent = text(`travel.places.${selected.id}.text`);
    card.cities.textContent = selected.cities.map((city) => localName(city.name)).join(" · ");
  };

  const renderList = () => {
    buttons.forEach(({ place, button, name, tag }) => {
      name.textContent = placeName(place);
      tag.textContent = placeTag(place);
      button.setAttribute("aria-pressed", String(place === selected));
    });
  };

  function select(id, { zoom = false } = {}) {
    selected = placesById.get(id);
    renderCard();
    renderList();
    carousel.render(selected);
    map?.highlight(id);
    if (map && zoom) {
      map.focus(selected);
      back.hidden = false;
    }
  }

  back.addEventListener("click", () => {
    back.hidden = true;
    map?.showOverview();
  });

  const useFallback = () => {
    map = null;
    back.hidden = true;
    canvas.hidden = true;
    list.hidden = false;
    frame.classList.add("is-fallback");
  };

  const startMap = async () => {
    try {
      window.gm_authFailure = useFallback;
      map = await createMap(canvas, { onSelect: select, onCity: (name) => carousel.showCity(name) });
      map.highlight(selected.id);
      frame.classList.add("is-ready");
    } catch (error) {
      console.error(error);
      useFallback();
    }
  };

  ready.then(() => {
    select(selected.id);

    if (!mapsConfig.apiKey || !mapsConfig.mapId || !("IntersectionObserver" in window)) {
      useFallback();
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        startMap();
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(section);
  });

  document.addEventListener("languagechange", () => {
    renderCard();
    renderList();
    carousel.translate();
    map?.translate();
  });
}
