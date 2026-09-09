// Small, dependency-free ranking shared by the browser and relevance checks.
const STOP_WORDS = new Set("a an the i my me do does how what where why can cannot is are to of in on at for with get more game please".split(" "));
const SYNONYMS = [
  ["gp", "energy", "mana", "power"], ["fly", "flying", "flight"],
  ["run", "sprint", "running"], ["torch", "lamp", "light", "darkness"],
  ["portal", "teleport", "gate"], ["money", "coins", "cash"],
  ["talent", "talents", "skill", "skills", "tp"], ["stars", "star", "sp"],
  ["save", "saves", "backup", "export"], ["inventory", "bag", "holdings"],
  ["worm", "wurm", "graveborer"], ["quake", "earthquake"], ["2", "two"],
];

export function normalizeSearch(value) {
  return String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function queryTerms(query) {
  const words = normalizeSearch(query).split(/\s+/).filter(Boolean);
  const useful = words.filter(word => !STOP_WORDS.has(word));
  return [...new Set(useful.length ? useful : words)];
}

function nearWord(a, b) {
  if (a.length < 4 || b.length < 4 || Math.abs(a.length - b.length) > 1) return false;
  if (a.length === b.length) {
    const differences = [...a].flatMap((letter, i) => letter === b[i] ? [] : [i]);
    return differences.length === 1 || (differences.length === 2
      && differences[1] === differences[0] + 1
      && a[differences[0]] === b[differences[1]] && a[differences[1]] === b[differences[0]]);
  }
  const [short, long] = a.length < b.length ? [a, b] : [b, a];
  let i = 0;
  while (i < short.length && short[i] === long[i]) i++;
  return short.slice(i) === long.slice(i + 1);
}

export function prepareSearchEntry(entry) {
  return { ...entry, searchFields: [entry.title, entry.keywords, entry.body, entry.category]
    .map(value => normalizeSearch(value).split(/\s+/).filter(Boolean)) };
}

export function searchWiki(entries, query) {
  const terms = queryTerms(query);
  if (!terms.length) return [];
  const groups = terms.map(term => [term, ...(SYNONYMS.find(group => group.includes(term)) || []).filter(word => word !== term)]);
  return entries.flatMap(entry => {
    const fields = entry.searchFields || prepareSearchEntry(entry).searchFields;
    let score = 0;
    const matched = new Set();
    for (const group of groups) {
      let best = 0;
      fields.forEach((words, field) => {
        group.forEach((term, alias) => {
          for (const word of words) {
            const exact = word === term;
            const prefix = term.length >= 3 && word.startsWith(term);
            const typo = !exact && !prefix && nearWord(term, word);
            if (!exact && !prefix && !typo) continue;
            matched.add(word);
            best = Math.max(best, [20, 12, 7, 3][field] * (exact ? 1 : prefix ? 0.7 : 0.4) * (alias ? 0.7 : 1));
          }
        });
      });
      if (!best) return [];
      score += best;
    }
    if (normalizeSearch(entry.title).includes(normalizeSearch(query))) score += 30;
    return [{ ...entry, score, matched: [...matched] }];
  }).sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
}
