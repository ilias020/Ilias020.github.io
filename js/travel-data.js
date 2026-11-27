const photo = (file, city) => ({ src: `assets/reizen/${file}.webp`, city });

export const HOME = "amsterdam";
export const SOON = "london";
export const CURRENT_YEAR = 2026;
export const DEFAULT_PLACE = "kroatie";

export const OVERVIEW = { north: 57, south: 25, west: -19, east: 34 };

export const places = [
  {
    id: "amsterdam",
    kind: "home",
    cities: [{ name: "Amsterdam", position: { lat: 52.37, lng: 4.9 } }],
    photos: [
      photo("amsterdam-magere-brug", "Amsterdam"),
      photo("amsterdam-nemo", "Amsterdam"),
      photo("amsterdam-sluishuis", "Amsterdam"),
      photo("amsterdam-zuidas", "Amsterdam"),
      photo("amsterdam-rembrandtplein", "Amsterdam"),
    ],
  },
  {
    id: "london",
    kind: "soon",
    cities: [{ name: { nl: "Londen", en: "London" }, position: { lat: 51.51, lng: -0.13 } }],
    photos: [],
  },
  {
    id: "marokko",
    years: [2023, 2024, 2025],
    pin: { lat: 32.2, lng: -6.6 },
    cities: [
      { name: "Marrakech", position: { lat: 31.63, lng: -8.0 } },
      { name: "Tetouan", position: { lat: 35.57, lng: -5.37 } },
      { name: "Ouarzazate", position: { lat: 30.92, lng: -6.89 } },
    ],
    photos: [
      photo("marokko-marrakech-jemaa", "Marrakech"),
      photo("marokko-marrakech-mural", "Marrakech"),
      photo("marokko-tetouan", "Tetouan"),
      photo("marokko-tetouan-2", "Tetouan"),
      photo("marokko-ouarzazate", "Ouarzazate"),
    ],
  },
  {
    id: "spanje",
    years: [2023],
    cities: [{ name: "Manilva", position: { lat: 36.38, lng: -5.25 } }],
    photos: [
      photo("spanje-manilva-1", "Manilva"),
      photo("spanje-manilva-2", "Manilva"),
      photo("spanje-manilva-3", "Manilva"),
    ],
  },
  {
    id: "turkije",
    years: [2024],
    cities: [{ name: "Konaklı", position: { lat: 36.59, lng: 31.91 } }],
    photos: [1, 2, 3, 4, 5].map((n) => photo(`turkije-konakli-${n}`, "Konaklı")),
  },
  {
    id: "grancanaria",
    years: [2026],
    cities: [{ name: "Maspalomas", position: { lat: 27.76, lng: -15.6 } }],
    photos: [
      photo("gran-canaria-1", "Maspalomas"),
      ...[2, 3, 4, 5].map((n) => photo(`gran-canaria-${n}`, "Gran Canaria")),
    ],
  },
  {
    id: "duitsland",
    years: [2026],
    cities: [
      { name: "Düsseldorf", position: { lat: 51.23, lng: 6.77 } },
      { name: { nl: "Keulen", en: "Cologne" }, position: { lat: 50.94, lng: 6.96 } },
    ],
    photos: [
      photo("duitsland-dusseldorf-1", "Düsseldorf"),
      photo("duitsland-dusseldorf-2", "Düsseldorf"),
      photo("duitsland-keulen", { nl: "Keulen", en: "Cologne" }),
      photo("duitsland-dusseldorf-3", "Düsseldorf"),
      photo("duitsland-dusseldorf-4", "Düsseldorf"),
    ],
  },
  {
    id: "italie",
    years: [2026],
    pin: { lat: 45.6, lng: 12.6 },
    cities: [
      { name: { nl: "Venetië", en: "Venice" }, position: { lat: 45.44, lng: 12.33 } },
      { name: { nl: "Triëst", en: "Trieste" }, position: { lat: 45.65, lng: 13.77 } },
    ],
    photos: [
      ...[1, 2, 3].map((n) => photo(`italie-venetie-${n}`, { nl: "Venetië", en: "Venice" })),
      ...[1, 2].map((n) => photo(`italie-triest-${n}`, { nl: "Triëst", en: "Trieste" })),
    ],
  },
  {
    id: "kroatie",
    years: [2026],
    pin: { lat: 44.6, lng: 15.4 },
    cities: [
      { name: "Plitvice", position: { lat: 44.88, lng: 15.62 } },
      { name: "Rovinj", position: { lat: 45.08, lng: 13.64 } },
      { name: "Zadar", position: { lat: 44.12, lng: 15.23 } },
      { name: "Split", position: { lat: 43.51, lng: 16.44 } },
    ],
    photos: [
      photo("kroatie-plitvice-1", "Plitvice"),
      photo("kroatie-plitvice-2", "Plitvice"),
      photo("kroatie-rovinj-1", "Rovinj"),
      photo("kroatie-zadar-1", "Zadar"),
      photo("kroatie-split-1", "Split"),
    ],
  },
];
