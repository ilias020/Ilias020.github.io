import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const flatten = (node, prefix = "") =>
  Object.entries(node).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return value !== null && typeof value === "object" ? flatten(value, path) : [[path, value]];
  });

const languages = ["nl", "en"];
const dictionaries = Object.fromEntries(
  languages.map((lang) => [lang, new Map(flatten(JSON.parse(read(`i18n/${lang}.json`))))]),
);

const errors = [];
const [base, ...others] = languages;

for (const lang of others) {
  for (const key of dictionaries[base].keys()) {
    if (!dictionaries[lang].has(key)) errors.push(`${lang}.json mist "${key}"`);
  }
  for (const key of dictionaries[lang].keys()) {
    if (!dictionaries[base].has(key)) errors.push(`${base}.json mist "${key}"`);
  }
}

const html = read("index.html");
const used = new Set();
for (const [, key] of html.matchAll(/data-i18n(?:-html)?="([^"]+)"/g)) used.add(key);
for (const [, pairs] of html.matchAll(/data-i18n-attr="([^"]+)"/g)) {
  for (const pair of pairs.split(";")) used.add(pair.split(":")[1].trim());
}

for (const key of used) {
  for (const lang of languages) {
    if (typeof dictionaries[lang].get(key) !== "string") errors.push(`index.html gebruikt "${key}", maar ${lang}.json heeft die tekst niet`);
  }
}

for (const [, key, text] of html.matchAll(/data-i18n="([^"]+)"[^>]*>([^<]*)</g)) {
  const expected = dictionaries.nl.get(key);
  if (typeof expected === "string" && text.trim() !== expected) {
    errors.push(`index.html wijkt af van nl.json bij "${key}"`);
  }
}

const checkDutch = (key, value) => {
  if (/[–—]/.test(value)) errors.push(`nl.json "${key}" bevat een lang gedachtestreepje`);
  if (/\p{L}- (en|of|tot)\s/u.test(value)) errors.push(`nl.json "${key}" bevat een afgebroken opsomming`);
};
for (const [key, value] of dictionaries.nl) if (typeof value === "string") checkDutch(key, value);

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`i18n in orde: ${dictionaries[base].size} sleutels per taal, ${used.size} gebruikt in index.html`);
