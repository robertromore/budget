/**
 * Text Similarity Utilities
 *
 * Provides TF-IDF vectorization, n-gram similarity, and other text
 * matching algorithms for payee name matching and canonicalization.
 */

import { distance as levenshteinDistance } from "fastest-levenshtein";
import { normalizeText as baseNormalizeText } from "$lib/server/import/utils";

// =============================================================================
// Text Preprocessing
// =============================================================================

/**
 * Normalize text for similarity comparison.
 * Extends base normalization with punctuation stripping for better fuzzy matching.
 */
export function normalizeText(text: string): string {
  // First apply base normalization (lowercase, collapse whitespace, trim)
  // Then strip punctuation for similarity matching
  return baseNormalizeText(text.replace(/[^\w\s]/g, " "));
}

/**
 * Tokenize text into words
 */
export function tokenize(text: string): string[] {
  return normalizeText(text).split(" ").filter(Boolean);
}

/**
 * Generate character n-grams from text
 */
export function generateNGrams(text: string, n: number): string[] {
  const normalized = normalizeText(text).replace(/\s/g, ""); // Remove spaces for char n-grams
  const ngrams: string[] = [];

  for (let i = 0; i <= normalized.length - n; i++) {
    ngrams.push(normalized.substring(i, i + n));
  }

  return ngrams;
}

/**
 * Generate word n-grams from text
 */
export function generateWordNGrams(text: string, n: number): string[] {
  const tokens = tokenize(text);
  const ngrams: string[] = [];

  for (let i = 0; i <= tokens.length - n; i++) {
    ngrams.push(tokens.slice(i, i + n).join(" "));
  }

  return ngrams;
}

// =============================================================================
// TF-IDF Vectorizer
// =============================================================================

export interface TFIDFVector {
  terms: Map<string, number>;
  magnitude: number;
}

export interface TFIDFVectorizer {
  documentFrequency: Map<string, number>;
  documentCount: number;
  vocabulary: Set<string>;
}

/**
 * Create a TF-IDF vectorizer from a corpus of documents
 */
export function createTFIDFVectorizer(documents: string[]): TFIDFVectorizer {
  const documentFrequency = new Map<string, number>();
  const vocabulary = new Set<string>();

  for (const doc of documents) {
    const tokens = new Set(tokenize(doc)); // Unique tokens per document

    for (const token of tokens) {
      vocabulary.add(token);
      documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1);
    }
  }

  return {
    documentFrequency,
    documentCount: documents.length,
    vocabulary,
  };
}

/**
 * Compute TF-IDF vector for a document
 */
export function computeTFIDF(vectorizer: TFIDFVectorizer, document: string): TFIDFVector {
  const tokens = tokenize(document);
  const termFrequency = new Map<string, number>();

  // Count term frequencies
  for (const token of tokens) {
    termFrequency.set(token, (termFrequency.get(token) ?? 0) + 1);
  }

  // Compute TF-IDF scores
  const terms = new Map<string, number>();
  let magnitudeSquared = 0;

  for (const [term, tf] of termFrequency) {
    const df = vectorizer.documentFrequency.get(term) ?? 1;
    const idf = Math.log((vectorizer.documentCount + 1) / (df + 1)) + 1; // Smoothed IDF
    const tfidf = tf * idf;

    terms.set(term, tfidf);
    magnitudeSquared += tfidf * tfidf;
  }

  return {
    terms,
    magnitude: Math.sqrt(magnitudeSquared),
  };
}

/**
 * Compute cosine similarity between two TF-IDF vectors
 */
export function cosineSimilarity(vec1: TFIDFVector, vec2: TFIDFVector): number {
  if (vec1.magnitude === 0 || vec2.magnitude === 0) {
    return 0;
  }

  let dotProduct = 0;

  for (const [term, value1] of vec1.terms) {
    const value2 = vec2.terms.get(term);
    if (value2 !== undefined) {
      dotProduct += value1 * value2;
    }
  }

  return dotProduct / (vec1.magnitude * vec2.magnitude);
}

// =============================================================================
// N-Gram Similarity
// =============================================================================

/**
 * Compute Jaccard similarity between two sets
 */
export function jaccardSimilarity(set1: Set<string>, set2: Set<string>): number {
  if (set1.size === 0 && set2.size === 0) {
    return 1;
  }

  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size;
}

/**
 * Compute n-gram similarity (Jaccard similarity of character n-grams)
 */
export function ngramSimilarity(text1: string, text2: string, n: number = 3): number {
  const ngrams1 = new Set(generateNGrams(text1, n));
  const ngrams2 = new Set(generateNGrams(text2, n));

  return jaccardSimilarity(ngrams1, ngrams2);
}

/**
 * Compute Dice coefficient (similar to Jaccard but weights overlap more)
 */
export function diceCoefficient(set1: Set<string>, set2: Set<string>): number {
  if (set1.size === 0 && set2.size === 0) {
    return 1;
  }

  const intersection = new Set([...set1].filter((x) => set2.has(x)));

  return (2 * intersection.size) / (set1.size + set2.size);
}

/**
 * Compute n-gram Dice coefficient
 */
export function ngramDiceCoefficient(text1: string, text2: string, n: number = 3): number {
  const ngrams1 = new Set(generateNGrams(text1, n));
  const ngrams2 = new Set(generateNGrams(text2, n));

  return diceCoefficient(ngrams1, ngrams2);
}

// =============================================================================
// Edit Distance Similarity
// =============================================================================

/**
 * Compute normalized Levenshtein similarity (0-1)
 */
export function levenshteinSimilarity(text1: string, text2: string): number {
  const normalized1 = normalizeText(text1);
  const normalized2 = normalizeText(text2);

  if (normalized1 === normalized2) {
    return 1;
  }

  const maxLength = Math.max(normalized1.length, normalized2.length);
  if (maxLength === 0) {
    return 1;
  }

  const distance = levenshteinDistance(normalized1, normalized2);
  return 1 - distance / maxLength;
}

/**
 * Compute Jaro-Winkler similarity
 */
export function jaroWinklerSimilarity(text1: string, text2: string): number {
  const s1 = normalizeText(text1);
  const s2 = normalizeText(text2);

  if (s1 === s2) {
    return 1;
  }

  if (s1.length === 0 || s2.length === 0) {
    return 0;
  }

  // Jaro similarity
  const matchWindow = Math.floor(Math.max(s1.length, s2.length) / 2) - 1;
  const s1Matches = new Array(s1.length).fill(false);
  const s2Matches = new Array(s2.length).fill(false);

  let matches = 0;
  let transpositions = 0;

  // Find matches
  for (let i = 0; i < s1.length; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, s2.length);

    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) {
    return 0;
  }

  // Count transpositions
  let k = 0;
  for (let i = 0; i < s1.length; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  const jaro = (matches / s1.length + matches / s2.length + (matches - transpositions / 2) / matches) / 3;

  // Winkler modification (boost for common prefix)
  let prefix = 0;
  for (let i = 0; i < Math.min(4, Math.min(s1.length, s2.length)); i++) {
    if (s1[i] === s2[i]) {
      prefix++;
    } else {
      break;
    }
  }

  return jaro + prefix * 0.1 * (1 - jaro);
}

// =============================================================================
// Composite Similarity
// =============================================================================

export interface SimilarityScores {
  exact: boolean;
  normalized: boolean;
  levenshtein: number;
  jaroWinkler: number;
  ngram: number;
  dice: number;
  tfidf?: number;
  composite: number;
}

export interface SimilarityWeights {
  levenshtein: number;
  jaroWinkler: number;
  ngram: number;
  dice: number;
  tfidf: number;
}

const DEFAULT_WEIGHTS: SimilarityWeights = {
  levenshtein: 0.2,
  jaroWinkler: 0.25,
  ngram: 0.2,
  dice: 0.15,
  tfidf: 0.2,
};

/**
 * Compute composite similarity score using multiple algorithms
 */
export function computeCompositeSimilarity(
  text1: string,
  text2: string,
  vectorizer?: TFIDFVectorizer,
  weights: SimilarityWeights = DEFAULT_WEIGHTS
): SimilarityScores {
  const normalized1 = normalizeText(text1);
  const normalized2 = normalizeText(text2);

  // Exact match shortcuts
  if (text1 === text2) {
    return {
      exact: true,
      normalized: true,
      levenshtein: 1,
      jaroWinkler: 1,
      ngram: 1,
      dice: 1,
      tfidf: 1,
      composite: 1,
    };
  }

  if (normalized1 === normalized2) {
    return {
      exact: false,
      normalized: true,
      levenshtein: 1,
      jaroWinkler: 1,
      ngram: 1,
      dice: 1,
      tfidf: 1,
      composite: 1,
    };
  }

  // Compute individual scores
  const levenshtein = levenshteinSimilarity(text1, text2);
  const jaroWinkler = jaroWinklerSimilarity(text1, text2);
  const ngram = ngramSimilarity(text1, text2, 3);
  const dice = ngramDiceCoefficient(text1, text2, 2);

  let tfidf: number | undefined;
  if (vectorizer) {
    const vec1 = computeTFIDF(vectorizer, text1);
    const vec2 = computeTFIDF(vectorizer, text2);
    tfidf = cosineSimilarity(vec1, vec2);
  }

  // Compute weighted composite
  let composite =
    weights.levenshtein * levenshtein +
    weights.jaroWinkler * jaroWinkler +
    weights.ngram * ngram +
    weights.dice * dice;

  if (tfidf !== undefined) {
    composite += weights.tfidf * tfidf;
  } else {
    // Redistribute TF-IDF weight if not available
    const redistribution = weights.tfidf / 4;
    composite +=
      redistribution * levenshtein +
      redistribution * jaroWinkler +
      redistribution * ngram +
      redistribution * dice;
  }

  return {
    exact: false,
    normalized: false,
    levenshtein,
    jaroWinkler,
    ngram,
    dice,
    tfidf,
    composite,
  };
}

// =============================================================================
// Merchant Name Specific Utilities
// =============================================================================

/**
 * Common merchant name patterns to strip
 */
const MERCHANT_PATTERNS = [
  /\s*#\d+\s*/g, // Store numbers like "#1234"
  /\s*\d{4,}\s*/g, // Long numeric sequences (transaction IDs, etc.)
  /\*[A-Z0-9]{6,}\s*/gi, // Order IDs after asterisk like "*B21QM4GL0" (Amazon, etc.)
  /\s*\*+\s*/g, // Asterisks used as separators
  /\s+(?:store|loc|location)\s*\d*\s*/gi, // "STORE 123"
  /\s+(?:pos|debit|purchase)\s*/gi, // Transaction type indicators
  /\s+\d{2}\/\d{2}\s*/g, // Date patterns MM/DD
  /\s+\d{2}-\d{2}\s*/g, // Date patterns MM-DD
  /\s+\d{1,2}:\d{2}(?::\d{2})?\s*/g, // Time patterns HH:MM or HH:MM:SS
  /\s+[A-Z]{2}\s+\d{5}(?:-\d{4})?\s*/g, // State + ZIP code patterns
  /\s+(?:usa?|united states)\s*/gi, // Country indicators
  /\s+(?:ca|ny|tx|fl|wa|or|il|pa|oh|ga|nc|nj|va|ma|az|co|tn|mo|md|wi|mn|in|sc|al|ky|la|ok|ct|ia|ut|ar|ms|ks|nv|nm|ne|wv|id|hi|me|nh|ri|mt|de|sd|nd|ak|vt|dc|wy)\b/gi, // US state abbreviations at end
  /\s+(?:nyc|sf|la|chi|phx|hou|phi|san|dal|aus|jax|ind|col|cha|sea|den|dc|bos|nas|det|mem|por|okc|lv|bal|mil|abq|tuc|fre|sac|kc|mes|atl|mia|cle|oak|min|tul|hon|arl|ana|tam|nol|bak|aur|stl|pit|anc|lex|stk|cor|new|tok|riv|jer|dur|nor|lub|stp|lrd|mad|plno|gar|hen|lak|irv|sce|fre|gib|nrb|nwb|spf|ftw|rno|buff)\b/gi, // Common city abbreviations
];

/**
 * Payment processor prefixes to strip (captures the merchant name after)
 */
const PAYMENT_PROCESSOR_PATTERNS: Array<{ pattern: RegExp; extractGroup?: number }> = [
  { pattern: /^paypal\s*\*?\s*/i }, // PAYPAL *MERCHANT
  { pattern: /^pp\s*\*?\s*/i }, // PP*MERCHANT
  { pattern: /^sq\s*\*?\s*/i }, // SQ *MERCHANT (Square)
  { pattern: /^square\s*\*?\s*/i }, // SQUARE *MERCHANT
  { pattern: /^venmo\s*\*?\s*/i }, // VENMO *MERCHANT
  { pattern: /^zelle\s*\*?\s*/i }, // ZELLE *MERCHANT
  { pattern: /^cashapp\s*\*?\s*/i }, // CASHAPP *MERCHANT
  { pattern: /^cash\s*app\s*\*?\s*/i }, // CASH APP *MERCHANT
  { pattern: /^apple\s*pay\s*\*?\s*/i }, // APPLE PAY *MERCHANT
  { pattern: /^google\s*pay\s*\*?\s*/i }, // GOOGLE PAY *MERCHANT
  { pattern: /^gpay\s*\*?\s*/i }, // GPAY *MERCHANT
  { pattern: /^samsung\s*pay\s*\*?\s*/i }, // SAMSUNG PAY *MERCHANT
  { pattern: /^tst\s*\*?\s*/i }, // TST* (Toast POS)
  { pattern: /^toast\s*\*?\s*/i }, // TOAST *MERCHANT
  { pattern: /^doordash\s*\*?\s*/i }, // DOORDASH *MERCHANT
  { pattern: /^dd\s*\*?\s*/i }, // DD* (DoorDash)
  { pattern: /^uber\s*eats?\s*\*?\s*/i }, // UBER EATS *MERCHANT
  { pattern: /^grubhub\s*\*?\s*/i }, // GRUBHUB *MERCHANT
  { pattern: /^gh\s*\*?\s*/i }, // GH* (Grubhub)
  { pattern: /^ck\s*\*?\s*/i }, // CK* (CheckFreePay)
  { pattern: /^bill\s*pay\s*\*?\s*/i }, // BILL PAY *MERCHANT
  { pattern: /^online\s*payment\s*\*?\s*/i }, // ONLINE PAYMENT *MERCHANT
  { pattern: /^ach\s*(?:payment|debit|credit)?\s*\*?\s*/i }, // ACH PAYMENT *MERCHANT
  { pattern: /^wire\s*(?:transfer)?\s*\*?\s*/i }, // WIRE TRANSFER *MERCHANT
];

/**
 * Known merchant abbreviations and expansions
 */
const MERCHANT_ABBREVIATIONS: Record<string, string> = {
  // Retail
  wm: "walmart",
  wal: "walmart",
  walmart: "walmart",
  amzn: "amazon",
  amazn: "amazon",
  amznmktplace: "amazon",
  "amazon mktplace": "amazon",
  "amzn mktp": "amazon",
  "amzn mktplace": "amazon",
  costco: "costco",
  costcowholesale: "costco",
  tgt: "target",
  target: "target",
  cvs: "cvs",
  cvspharmacy: "cvs",
  wgns: "walgreens",
  walgreens: "walgreens",
  wag: "walgreens",
  bbby: "bed bath beyond",
  bedbath: "bed bath beyond",
  kohls: "kohls",
  macys: "macys",
  nordstrom: "nordstrom",
  ross: "ross",
  tjmaxx: "tj maxx",
  tjx: "tj maxx",
  marshalls: "marshalls",
  homegoods: "homegoods",
  oldnavy: "old navy",
  gap: "gap",
  hm: "h&m",
  zara: "zara",
  bestbuy: "best buy",
  bby: "best buy",
  gamestop: "gamestop",

  // Food & Coffee
  sbux: "starbucks",
  starbucks: "starbucks",
  mcd: "mcdonalds",
  mcds: "mcdonalds",
  mcdonalds: "mcdonalds",
  dq: "dairy queen",
  bk: "burger king",
  burgerking: "burger king",
  chkfila: "chick fil a",
  cfila: "chick fil a",
  chickfila: "chick fil a",
  cfa: "chick fil a",
  wendys: "wendys",
  wdy: "wendys",
  tacobell: "taco bell",
  tb: "taco bell",
  chipotle: "chipotle",
  cmg: "chipotle",
  panera: "panera",
  panerabread: "panera",
  subway: "subway",
  dominos: "dominos",
  pizzahut: "pizza hut",
  ph: "pizza hut",
  papajohns: "papa johns",
  dd: "dunkin",
  dunkin: "dunkin",
  dunkindonuts: "dunkin",
  kfc: "kfc",
  popeyes: "popeyes",
  sonic: "sonic",
  arbys: "arbys",
  fiveguys: "five guys",
  innout: "in n out",
  shakeshack: "shake shack",
  whataburger: "whataburger",
  jitb: "jack in the box",

  // Grocery
  kroger: "kroger",
  safeway: "safeway",
  publix: "publix",
  wholefoods: "whole foods",
  wf: "whole foods",
  wfm: "whole foods",
  wholefds: "whole foods",
  tj: "trader joes",
  traderjoes: "trader joes",
  aldi: "aldi",
  heb: "heb",
  wegmans: "wegmans",
  sprouts: "sprouts",
  "giant eagle": "giant eagle",
  "food lion": "food lion",
  albertsons: "albertsons",
  vons: "vons",
  ralphs: "ralphs",
  smiths: "smiths",
  meijer: "meijer",
  winco: "winco",

  // Home Improvement
  homedpt: "home depot",
  hd: "home depot",
  homedepot: "home depot",
  lowes: "lowes",
  menards: "menards",
  acehardware: "ace hardware",

  // Shipping
  ups: "ups",
  usps: "usps",
  fedex: "fedex",
  dhl: "dhl",

  // Gas Stations
  chevron: "chevron",
  shell: "shell",
  exxon: "exxon",
  exxonmobil: "exxon",
  bp: "bp",
  mobil: "mobil",
  arco: "arco",
  "76": "76",
  phillips66: "phillips 66",
  sunoco: "sunoco",
  valero: "valero",
  marathon: "marathon",
  speedway: "speedway",
  quiktrip: "quiktrip",
  qt: "quiktrip",
  racetrac: "racetrac",
  wawa: "wawa",
  sheetz: "sheetz",
  caseys: "caseys",

  // Streaming & Entertainment
  netflix: "netflix",
  nflx: "netflix",
  spotify: "spotify",
  hulu: "hulu",
  disney: "disney",
  disneyplus: "disney plus",
  hbomax: "hbo max",
  hbo: "hbo",
  peacock: "peacock",
  paramount: "paramount plus",
  appletv: "apple tv",
  amazonprime: "amazon prime",
  primevideo: "prime video",
  youtube: "youtube",
  yt: "youtube",
  youtubepremium: "youtube premium",
  twitch: "twitch",
  audible: "audible",

  // Tech
  apple: "apple",
  applecom: "apple",
  google: "google",
  googl: "google",
  microsoft: "microsoft",
  msft: "microsoft",
  adobe: "adobe",
  dropbox: "dropbox",
  zoom: "zoom",
  slack: "slack",
  github: "github",

  // Rideshare & Delivery
  uber: "uber",
  lyft: "lyft",
  doordash: "doordash",
  grubhub: "grubhub",
  ubereats: "uber eats",
  postmates: "postmates",
  instacart: "instacart",
  shipt: "shipt",

  // Utilities & Services
  att: "at&t",
  atnt: "at&t",
  verizon: "verizon",
  vzw: "verizon",
  tmobile: "t-mobile",
  tmo: "t-mobile",
  sprint: "sprint",
  comcast: "comcast",
  xfinity: "xfinity",
  spectrum: "spectrum",
  cox: "cox",
  directv: "directv",
  dish: "dish",
  pge: "pg&e",
  sce: "sce",
  duke: "duke energy",

  // Fitness
  planetfitness: "planet fitness",
  pf: "planet fitness",
  lafitness: "la fitness",
  equinox: "equinox",
  orangetheory: "orangetheory",
  otf: "orangetheory",
  crunchfitness: "crunch fitness",
  ymca: "ymca",

  // Travel
  airbnb: "airbnb",
  vrbo: "vrbo",
  marriott: "marriott",
  hilton: "hilton",
  hyatt: "hyatt",
  ihg: "ihg",
  expedia: "expedia",
  booking: "booking.com",
  hotels: "hotels.com",
  southwest: "southwest",
  swa: "southwest",
  delta: "delta",
  united: "united",
  aa: "american airlines",
  american: "american airlines",
  jetblue: "jetblue",
  spirit: "spirit",
  frontier: "frontier",
  allegiant: "allegiant",
};

/**
 * Extract canonical merchant name from transaction description
 */
export function extractMerchantName(description: string): string {
  let name = description;

  // Strip payment processor prefixes first
  for (const { pattern } of PAYMENT_PROCESSOR_PATTERNS) {
    name = name.replace(pattern, "");
  }

  name = name.toUpperCase();

  // Apply pattern removal
  for (const pattern of MERCHANT_PATTERNS) {
    name = name.replace(pattern, " ");
  }

  // Normalize
  name = normalizeText(name);

  // Check for known abbreviations - try multi-word matches first
  const tokens = name.split(" ").filter(Boolean);

  // Try matching progressively smaller token sequences
  for (let length = Math.min(3, tokens.length); length >= 1; length--) {
    const phrase = tokens.slice(0, length).join(" ");
    const phraseNoSpaces = tokens.slice(0, length).join("");

    // Check both with and without spaces
    if (MERCHANT_ABBREVIATIONS[phrase]) {
      tokens.splice(0, length, MERCHANT_ABBREVIATIONS[phrase]);
      name = tokens.join(" ");
      break;
    } else if (MERCHANT_ABBREVIATIONS[phraseNoSpaces]) {
      tokens.splice(0, length, MERCHANT_ABBREVIATIONS[phraseNoSpaces]);
      name = tokens.join(" ");
      break;
    }
  }

  // If no match found, check just the first token
  if (tokens.length > 0 && MERCHANT_ABBREVIATIONS[tokens[0]]) {
    tokens[0] = MERCHANT_ABBREVIATIONS[tokens[0]];
    name = tokens.join(" ");
  }

  return name.trim();
}

/**
 * Normalize a merchant name to its canonical form with title case
 */
export function normalizeMerchantName(description: string): string {
  const extracted = extractMerchantName(description);
  return toTitleCase(extracted);
}

/**
 * Convert string to title case
 */
function toTitleCase(str: string): string {
  // List of words that should remain lowercase (unless first word)
  const lowercaseWords = new Set(["a", "an", "and", "as", "at", "but", "by", "for", "in", "of", "on", "or", "the", "to"]);

  return str
    .split(" ")
    .map((word, index) => {
      if (index > 0 && lowercaseWords.has(word.toLowerCase())) {
        return word.toLowerCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

/**
 * Compute merchant-specific similarity with preprocessing
 */
export function merchantSimilarity(merchant1: string, merchant2: string): number {
  const clean1 = extractMerchantName(merchant1);
  const clean2 = extractMerchantName(merchant2);

  // Exact match after cleaning
  if (clean1 === clean2) {
    return 1;
  }

  // Prefix match (often most of merchant name is in first few chars)
  const minLength = Math.min(clean1.length, clean2.length);
  let prefixLength = 0;
  for (let i = 0; i < minLength; i++) {
    if (clean1[i] === clean2[i]) {
      prefixLength++;
    } else {
      break;
    }
  }

  const prefixScore = prefixLength > 3 ? prefixLength / Math.max(clean1.length, clean2.length) : 0;

  // Composite similarity
  const composite = computeCompositeSimilarity(clean1, clean2);

  // Boost score if there's a strong prefix match
  return Math.min(1, composite.composite + prefixScore * 0.2);
}
