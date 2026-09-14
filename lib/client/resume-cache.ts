/**
 * Browser-side IndexedDB Cache for Queued & Parsed Resumes
 * - Persists parsed text, extracted Gmail IDs, and file metadata locally in browser
 * - Prevents data loss across page refreshes, tab closing, or network drops
 */

export interface CachedResume {
  id: string;
  fileName: string;
  fileSize: number;
  resumeText: string;
  extractedEmail: string | null;
  isGmail: boolean;
  allEmails: string[];
  wordCount: number;
  charCount: number;
  status: "extracted" | "ready" | "ingested" | "error";
  jobId?: string;
  createdAt: number;
}

const DB_NAME = "TalentBench_ResumeCache";
const DB_VERSION = 1;
const STORE_NAME = "queued_resumes";

let dbInstance: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("IndexedDB is only available in browser"));
  }

  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("jobId", "jobId", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };

    request.onsuccess = (e) => {
      dbInstance = (e.target as IDBOpenDBRequest).result;
      resolve(dbInstance);
    };

    request.onerror = (e) => {
      console.warn("[ResumeCache] IndexedDB open error:", e);
      reject((e.target as IDBOpenDBRequest).error);
    };
  });
}

export async function saveCachedResume(resume: CachedResume): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(resume);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("[ResumeCache] Failed to save resume to IndexedDB:", err);
  }
}

export async function saveBatchCachedResumes(resumes: CachedResume[]): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      for (const r of resumes) {
        store.put(r);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("[ResumeCache] Failed to batch save resumes:", err);
  }
}

export async function loadCachedResumes(jobId?: string): Promise<CachedResume[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        const all: CachedResume[] = req.result || [];
        if (jobId) {
          resolve(all.filter((r) => !r.jobId || r.jobId === jobId));
        } else {
          resolve(all);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("[ResumeCache] Failed to load resumes from IndexedDB:", err);
    return [];
  }
}

export async function removeCachedResume(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("[ResumeCache] Failed to delete resume from IndexedDB:", err);
  }
}

export async function clearCachedResumes(jobId?: string): Promise<void> {
  try {
    const db = await openDB();
    if (!jobId) {
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    }

    const all = await loadCachedResumes();
    const toDelete = all.filter((r) => r.jobId === jobId);
    for (const r of toDelete) {
      await removeCachedResume(r.id);
    }
  } catch (err) {
    console.warn("[ResumeCache] Failed to clear IndexedDB cache:", err);
  }
}

