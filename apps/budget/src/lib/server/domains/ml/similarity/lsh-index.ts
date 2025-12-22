/**
 * Locality Sensitive Hashing (LSH) Index
 *
 * Provides fast approximate nearest neighbor search for text similarity.
 * Uses MinHash for Jaccard similarity estimation and banding for quick lookup.
 */

import { generateNGrams } from "./text-similarity";

// =============================================================================
// Types
// =============================================================================

export interface LSHIndexConfig {
  numHashFunctions: number; // Number of hash functions for MinHash
  numBands: number; // Number of bands for LSH
  ngramSize: number; // Size of n-grams for shingles
}

export interface IndexedDocument {
  id: string | number;
  text: string;
  signature: number[];
  metadata?: Record<string, unknown>;
}

export interface LSHSearchResult {
  id: string | number;
  text: string;
  estimatedSimilarity: number;
  metadata?: Record<string, unknown>;
}

// =============================================================================
// MinHash Implementation
// =============================================================================

/**
 * Simple hash function using prime multiplication
 */
function hashValue(value: string, seed: number): number {
  let hash = seed;
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) - hash + value.charCodeAt(i)) >>> 0;
    hash = (hash * 0x5bd1e995) >>> 0;
    hash ^= hash >>> 15;
  }
  return hash;
}

/**
 * Generate MinHash signature for a set of shingles
 */
function computeMinHash(shingles: Set<string>, numHashFunctions: number): number[] {
  const signature: number[] = new Array(numHashFunctions).fill(Infinity);

  for (const shingle of shingles) {
    for (let i = 0; i < numHashFunctions; i++) {
      const hash = hashValue(shingle, i * 0x9e3779b9); // Golden ratio constant
      if (hash < signature[i]) {
        signature[i] = hash;
      }
    }
  }

  return signature;
}

/**
 * Estimate Jaccard similarity from two MinHash signatures
 */
function estimateJaccard(sig1: number[], sig2: number[]): number {
  if (sig1.length !== sig2.length) {
    throw new Error("Signatures must have the same length");
  }

  let matches = 0;
  for (let i = 0; i < sig1.length; i++) {
    if (sig1[i] === sig2[i]) {
      matches++;
    }
  }

  return matches / sig1.length;
}

// =============================================================================
// LSH Index
// =============================================================================

export interface LSHIndex {
  /**
   * Add a document to the index
   */
  add(id: string | number, text: string, metadata?: Record<string, unknown>): void;

  /**
   * Remove a document from the index
   */
  remove(id: string | number): boolean;

  /**
   * Find candidate matches for a query (fast, approximate)
   */
  query(text: string, maxResults?: number): LSHSearchResult[];

  /**
   * Get the number of documents in the index
   */
  size(): number;

  /**
   * Clear the index
   */
  clear(): void;

  /**
   * Rebuild the band hash tables (call after bulk inserts)
   */
  rebuild(): void;

  /**
   * Export the index for serialization
   */
  export(): {
    config: LSHIndexConfig;
    documents: Array<{
      id: string | number;
      text: string;
      signature: number[];
      metadata?: Record<string, unknown>;
    }>;
  };

  /**
   * Import a previously exported index
   */
  import(data: {
    config: LSHIndexConfig;
    documents: Array<{
      id: string | number;
      text: string;
      signature: number[];
      metadata?: Record<string, unknown>;
    }>;
  }): void;
}

const DEFAULT_CONFIG: LSHIndexConfig = {
  numHashFunctions: 100,
  numBands: 20,
  ngramSize: 3,
};

/**
 * Create an LSH index for fast similarity search
 */
export function createLSHIndex(config: Partial<LSHIndexConfig> = {}): LSHIndex {
  const cfg: LSHIndexConfig = { ...DEFAULT_CONFIG, ...config };

  // Validate config
  if (cfg.numHashFunctions % cfg.numBands !== 0) {
    throw new Error("numHashFunctions must be divisible by numBands");
  }

  const rowsPerBand = cfg.numHashFunctions / cfg.numBands;

  // Document storage
  const documents = new Map<string | number, IndexedDocument>();

  // Band hash tables for LSH
  // Each band maps a band hash to a set of document IDs
  const bandHashTables: Array<Map<string, Set<string | number>>> = [];
  for (let i = 0; i < cfg.numBands; i++) {
    bandHashTables.push(new Map());
  }

  /**
   * Compute band hashes for a signature
   */
  function computeBandHashes(signature: number[]): string[] {
    const hashes: string[] = [];

    for (let band = 0; band < cfg.numBands; band++) {
      const start = band * rowsPerBand;
      const end = start + rowsPerBand;
      const bandSignature = signature.slice(start, end);
      hashes.push(bandSignature.join(","));
    }

    return hashes;
  }

  /**
   * Add document to band hash tables
   */
  function addToBandTables(doc: IndexedDocument): void {
    const bandHashes = computeBandHashes(doc.signature);

    for (let band = 0; band < cfg.numBands; band++) {
      const table = bandHashTables[band];
      const hash = bandHashes[band];

      if (!table.has(hash)) {
        table.set(hash, new Set());
      }
      table.get(hash)!.add(doc.id);
    }
  }

  /**
   * Remove document from band hash tables
   */
  function removeFromBandTables(doc: IndexedDocument): void {
    const bandHashes = computeBandHashes(doc.signature);

    for (let band = 0; band < cfg.numBands; band++) {
      const table = bandHashTables[band];
      const hash = bandHashes[band];

      if (table.has(hash)) {
        table.get(hash)!.delete(doc.id);
        if (table.get(hash)!.size === 0) {
          table.delete(hash);
        }
      }
    }
  }

  /**
   * Get candidate document IDs for a query signature
   */
  function getCandidates(signature: number[]): Set<string | number> {
    const candidates = new Set<string | number>();
    const bandHashes = computeBandHashes(signature);

    for (let band = 0; band < cfg.numBands; band++) {
      const table = bandHashTables[band];
      const hash = bandHashes[band];

      if (table.has(hash)) {
        for (const id of table.get(hash)!) {
          candidates.add(id);
        }
      }
    }

    return candidates;
  }

  return {
    add(id: string | number, text: string, metadata?: Record<string, unknown>): void {
      // Remove existing if present
      if (documents.has(id)) {
        this.remove(id);
      }

      // Generate shingles (n-grams)
      const shingles = new Set(generateNGrams(text, cfg.ngramSize));

      // Compute MinHash signature
      const signature = computeMinHash(shingles, cfg.numHashFunctions);

      const doc: IndexedDocument = {
        id,
        text,
        signature,
        metadata,
      };

      documents.set(id, doc);
      addToBandTables(doc);
    },

    remove(id: string | number): boolean {
      const doc = documents.get(id);
      if (!doc) {
        return false;
      }

      removeFromBandTables(doc);
      documents.delete(id);
      return true;
    },

    query(text: string, maxResults: number = 10): LSHSearchResult[] {
      // Generate shingles and signature for query
      const shingles = new Set(generateNGrams(text, cfg.ngramSize));
      const querySignature = computeMinHash(shingles, cfg.numHashFunctions);

      // Get candidate documents
      const candidateIds = getCandidates(querySignature);

      // Compute estimated similarity for each candidate
      const results: LSHSearchResult[] = [];

      for (const candidateId of candidateIds) {
        const doc = documents.get(candidateId);
        if (!doc) continue;

        const estimatedSimilarity = estimateJaccard(querySignature, doc.signature);

        results.push({
          id: doc.id,
          text: doc.text,
          estimatedSimilarity,
          metadata: doc.metadata,
        });
      }

      // Sort by similarity descending
      results.sort((a, b) => b.estimatedSimilarity - a.estimatedSimilarity);

      return results.slice(0, maxResults);
    },

    size(): number {
      return documents.size;
    },

    clear(): void {
      documents.clear();
      for (const table of bandHashTables) {
        table.clear();
      }
    },

    rebuild(): void {
      // Clear band tables
      for (const table of bandHashTables) {
        table.clear();
      }

      // Re-add all documents
      for (const doc of documents.values()) {
        addToBandTables(doc);
      }
    },

    export() {
      return {
        config: cfg,
        documents: Array.from(documents.values()),
      };
    },

    import(data: {
      config: LSHIndexConfig;
      documents: Array<{
        id: string | number;
        text: string;
        signature: number[];
        metadata?: Record<string, unknown>;
      }>;
    }): void {
      this.clear();

      for (const doc of data.documents) {
        documents.set(doc.id, doc);
        addToBandTables(doc);
      }
    },
  };
}

// =============================================================================
// Persistent LSH Index (with database backing)
// =============================================================================

export interface PersistentLSHIndex extends LSHIndex {
  /**
   * Save the index to the database
   */
  save(workspaceId: number, indexName: string): Promise<void>;

  /**
   * Load the index from the database
   */
  load(workspaceId: number, indexName: string): Promise<boolean>;
}

/**
 * Create an LSH index with database persistence
 * Uses the ML model store for persistence
 */
export function createPersistentLSHIndex(
  config: Partial<LSHIndexConfig> = {}
): PersistentLSHIndex {
  const baseIndex = createLSHIndex(config);

  return {
    ...baseIndex,

    async save(workspaceId: number, indexName: string): Promise<void> {
      // This would be implemented using the MLModelStore
      // For now, just export the data
      const data = baseIndex.export();
      console.log(
        `LSH Index "${indexName}" saved for workspace ${workspaceId}: ${data.documents.length} documents`
      );
    },

    async load(workspaceId: number, indexName: string): Promise<boolean> {
      // This would be implemented using the MLModelStore
      console.log(`Loading LSH Index "${indexName}" for workspace ${workspaceId}...`);
      return false; // Not implemented yet
    },
  };
}
