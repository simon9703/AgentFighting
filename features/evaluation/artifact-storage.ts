import { parseTournamentArtifact, type TournamentArtifact } from './tournament-artifact';

const DB_NAME = 'agent-fighting';
const DB_VERSION = 1;
const STORE_NAME = 'tournament-artifacts';

export interface StoredTournamentArtifact {
  id: string;
  createdAt: string;
  lockHash: string;
  artifact: TournamentArtifact;
}

function artifactId(artifact: TournamentArtifact) {
  return `${artifact.createdAt}:${artifact.lock.lockHash}`;
}

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('IndexedDB is not available in this environment.'));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open artifact storage.'));
  });
}

export async function saveTournamentArtifact(artifact: TournamentArtifact): Promise<StoredTournamentArtifact> {
  const parsed = parseTournamentArtifact(artifact);
  const entry: StoredTournamentArtifact = {
    id: artifactId(parsed),
    createdAt: parsed.createdAt,
    lockHash: parsed.lock.lockHash,
    artifact: parsed,
  };
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(entry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Failed to save tournament artifact.'));
  });
  db.close();
  return entry;
}

export async function listTournamentArtifacts(): Promise<StoredTournamentArtifact[]> {
  const db = await openDatabase();
  const entries = await new Promise<StoredTournamentArtifact[]>((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve((request.result as StoredTournamentArtifact[]).map((entry) => ({ ...entry, artifact: parseTournamentArtifact(entry.artifact) })));
    request.onerror = () => reject(request.error ?? new Error('Failed to list tournament artifacts.'));
  });
  db.close();
  return entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function loadTournamentArtifact(id: string): Promise<StoredTournamentArtifact | null> {
  const db = await openDatabase();
  const entry = await new Promise<StoredTournamentArtifact | undefined>((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(id);
    request.onsuccess = () => resolve(request.result as StoredTournamentArtifact | undefined);
    request.onerror = () => reject(request.error ?? new Error('Failed to load tournament artifact.'));
  });
  db.close();
  return entry ? { ...entry, artifact: parseTournamentArtifact(entry.artifact) } : null;
}

export async function deleteTournamentArtifact(id: string): Promise<void> {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Failed to delete tournament artifact.'));
  });
  db.close();
}
