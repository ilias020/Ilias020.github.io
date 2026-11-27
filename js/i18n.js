const STORAGE_KEY = "lang";
const SUPPORTED = ["nl", "en"];
const DEFAULT_LANG = "nl";

const dictionaries = new Map();
let currentLang = DEFAULT_LANG;
let currentDict = null;
let markReady;

export const ready = new Promise((resolve) => {
  markReady = resolve;
});

const readStoredLang = () => {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

const storeLang = (lang) => {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {}
};

const load = (lang) => {
  if (!dictionaries.has(lang)) {
    const request = fetch(`i18n/${lang}.json`).then((response) => {
      if (!response.ok) throw new Error(`i18n/${lang}.json: ${response.status}`);
      return response.json();
    });
    request.catch(() => dictionaries.delete(lang));
    dictionaries.set(lang, request);
  }
  return dictionaries.get(lang);
};

const lookup = (dict, key) => key.split(".").reduce((node, part) => node?.[part], dict);

const translate = (dict, key) => {
  const value = lookup(dict, key);
  if (typeof value !== "string") {
    console.warn(`i18n: ontbrekende sleutel "${key}"`);
    return null;
  }
  return value;
};

const apply = (dict) => {
  for (const element of document.querySelectorAll("[data-i18n]")) {
    const value = translate(dict, element.dataset.i18n);
    if (value !== null) element.textContent = value;
  }
  for (const element of document.querySelectorAll("[data-i18n-html]")) {
    const value = translate(dict, element.dataset.i18nHtml);
    if (value !== null) element.innerHTML = value;
  }
  for (const element of document.querySelectorAll("[data-i18n-attr]")) {
    for (const pair of element.dataset.i18nAttr.split(";")) {
      const [attribute, key] = pair.split(":").map((part) => part.trim());
      const value = translate(dict, key);
      if (value !== null) element.setAttribute(attribute, value);
    }
  }
};

const syncSwitch = (lang) => {
  const group = document.querySelector("[data-lang-switch]");
  if (!group) return;
  group.querySelectorAll("[data-lang]").forEach((button, index) => {
    const active = button.dataset.lang === lang;
    button.setAttribute("aria-pressed", String(active));
    if (active) group.style.setProperty("--segmented-active", index);
  });
};

export const getLang = () => currentLang;

export const t = (key) => (currentDict ? translate(currentDict, key) : null);

export async function setLang(lang, { persist = true } = {}) {
  if (!SUPPORTED.includes(lang)) lang = DEFAULT_LANG;
  try {
    const dict = await load(lang);
    apply(dict);
    currentLang = lang;
    currentDict = dict;
    document.documentElement.lang = lang;
    syncSwitch(lang);
    if (persist) storeLang(lang);
    document.dispatchEvent(new CustomEvent("languagechange", { detail: { lang } }));
  } catch (error) {
    console.error(error);
    syncSwitch(currentLang);
  } finally {
    document.documentElement.classList.remove("i18n-pending");
    markReady();
  }
}

export async function initI18n() {
  const group = document.querySelector("[data-lang-switch]");
  group?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-lang]");
    if (button && button.dataset.lang !== currentLang) setLang(button.dataset.lang);
  });

  const stored = readStoredLang();
  const initial = SUPPORTED.includes(stored) ? stored : DEFAULT_LANG;
  if (initial === DEFAULT_LANG) {
    document.documentElement.classList.remove("i18n-pending");
    syncSwitch(DEFAULT_LANG);
    load(DEFAULT_LANG).then((dict) => {
      if (currentLang === DEFAULT_LANG) currentDict = dict;
    }).catch(() => {}).finally(markReady);
    return;
  }
  await setLang(initial, { persist: false });
}
