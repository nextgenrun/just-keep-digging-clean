import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const sourcePath = process.argv[2] ?? 'C:/Users/Mila/Downloads/storepage_1253785_all.json';
const translationsPath = path.join(scriptDir, '2026-08-18-storepage-translations.json');
const outputPath = path.join(scriptDir, 'storepage_1253785_localized_en_nl_de_fr_es.json');

const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const translations = JSON.parse(fs.readFileSync(translationsPath, 'utf8'));

if (source.itemid !== '1253785') {
  throw new Error(`Unexpected Steam app ID: ${source.itemid}`);
}

const sourceSnapshot = JSON.parse(JSON.stringify(source));
const englishFields = Object.keys(source.languages.english);

for (const [language, fields] of Object.entries(translations.languages)) {
  if (!source.languages[language]) {
    throw new Error(`Unknown Steam language key: ${language}`);
  }

  const translatedFields = Object.keys(fields);
  if (JSON.stringify(translatedFields) !== JSON.stringify(englishFields)) {
    throw new Error(`Field keys or ordering differ for ${language}`);
  }

  for (const [field, value] of Object.entries(fields)) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new Error(`Empty translated value: ${language} / ${field}`);
    }
    source.languages[language][field] = value;
  }
}

const untouchedLanguages = Object.keys(source.languages).filter(
  (language) => !Object.hasOwn(translations.languages, language),
);

for (const language of untouchedLanguages) {
  if (JSON.stringify(source.languages[language]) !== JSON.stringify(sourceSnapshot.languages[language])) {
    throw new Error(`Untouched language changed: ${language}`);
  }
}

const bbcodeTags = new Set(['h2', 'b', 'p']);
for (const language of Object.keys(translations.languages)) {
  const about = source.languages[language]['app[content][about]'];
  const shortDescription = source.languages[language]['app[content][short_description]'];
  const stack = [];

  if (shortDescription.length > 300) {
    throw new Error(`Short description exceeds 300 characters in ${language}`);
  }
  if (/<\/?(?:h2|b|p)>/i.test(about)) {
    throw new Error(`HTML-style tags found instead of Steam BBCode in ${language}`);
  }

  for (const match of about.matchAll(/\[(\/)?([a-z0-9]+)\]/gi)) {
    const closing = Boolean(match[1]);
    const tag = match[2].toLowerCase();
    if (!bbcodeTags.has(tag)) {
      throw new Error(`Unexpected BBCode tag [${closing ? '/' : ''}${tag}] in ${language}`);
    }
    if (!closing) {
      stack.push(tag);
    } else if (stack.pop() !== tag) {
      throw new Error(`Incorrectly nested [${tag}] BBCode in ${language}`);
    }
  }
  if (stack.length > 0) {
    throw new Error(`Unclosed [${stack.at(-1)}] BBCode in ${language}`);
  }
}

fs.writeFileSync(outputPath, `${JSON.stringify(source, null, 2)}\n`, 'utf8');

const result = {
  output: outputPath,
  appId: source.itemid,
  totalLanguageSlots: Object.keys(source.languages).length,
  completedLanguages: Object.keys(translations.languages),
  untouchedLanguageSlots: untouchedLanguages.length,
  fieldsPerCompletedLanguage: englishFields.length,
};

console.log(JSON.stringify(result, null, 2));
