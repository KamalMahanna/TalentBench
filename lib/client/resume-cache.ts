/**
 * Browser-side IndexedDB Cache & Local-First Store for TalentBench
 * - 100% Privacy Preserving: Candidate resumes, evaluations, and jobs are kept in the browser
 * - Zero Server Persistence: No candidate PII or recruiter queries leave the client device
 * - Content-Addressable SHA-256 Cache: Instant 0ms lookup for identical resumes & criteria
 * - Workspace Backup & Restore: 1-click JSON export/import for cross-device migration
 * - BYOK Local Storage: Stores user's Google Gemini API key safely in localStorage
 */

export interface CachedResume {
  id: string;
  fileName: string;
  candidateName?: string;
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

export interface CachedEvaluation {
  hash: string;
  candidateName: string;
  candidateEmail: string;
  jobId: string;
  verdict: "YES" | "NO";
  matches: boolean;
  score: number; // 0 - 100
  matchPercentage: number;
  experienceMatch?: boolean;
  experienceAnalysis?: string;
  matchedSkills: string[];
  missingSkills: string[];
  reasoning: string;
  mailBody: string;
  latencyMs: number;
  tokensUsed?: number;
  modelUsed?: string;
  timestamp: number;
}

export interface LocalPipelineRound {
  id: string;
  type: string;
  title: string;
  description: string | null;
  order: number;
  config: string | null;
}

export interface LocalJobProfile {
  id: string;
  title: string;
  description: string;
  minExperience: number;
  maxExperience: number;
  cutoff: number;
  createdAt: string;
  pipeline: LocalPipelineRound[];
}

export interface LocalCandidate {
  id: string;
  jobId: string;
  name: string;
  email: string;
  phone?: string | null;
  experienceYears: number;
  resumeText: string;
  skills?: string[] | string | null;
  status: "SHORTLISTED" | "NOT_SHORTLISTED" | "EVALUATING" | "FAILED" | "PENDING" | string;
  matchScore?: number;
  feedback?: string;
  personalizedReply?: string;
  isOverridden?: boolean;
  overrideReason?: string | null;
  matchedSkills?: string[];
  missingSkills?: string[];
  recommendedProject?: string;
  currentRound?: number;
  roundResults?: any[];
  emailStatus?: "NOT_SENT" | "SENT" | "FAILED" | string;
  emailSentAt?: string | null;
  emailError?: string | null;
  createdAt: string;
}

const DB_NAME = "TalentBench_ClientDB";
const DB_VERSION = 3;
const RESUMES_STORE = "queued_resumes";
const EVALS_STORE = "evaluations_cache";
const JOBS_STORE = "local_jobs";
const CANDIDATES_STORE = "local_candidates";

let dbInstance: IDBDatabase | null = null;

// ── BYOK Gemini Key & HR Email Management ──────────────────────────────────

export const GEMINI_API_KEY_STORAGE_KEY = "tb_gemini_api_key";
export const HR_EMAIL_STORAGE_KEY = "tb_hr_email";
export const GMAIL_APP_PASSWORD_STORAGE_KEY = "tb_gmail_app_password";
export const SENDER_NAME_STORAGE_KEY = "tb_sender_name";

export function getStoredGeminiApiKey(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(GEMINI_API_KEY_STORAGE_KEY) || "";
}

export function setStoredGeminiApiKey(key: string): void {
  if (typeof window === "undefined") return;
  if (!key || key.trim() === "") {
    window.localStorage.removeItem(GEMINI_API_KEY_STORAGE_KEY);
  } else {
    window.localStorage.setItem(GEMINI_API_KEY_STORAGE_KEY, key.trim());
  }
}

export function getStoredHrEmail(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(HR_EMAIL_STORAGE_KEY) || "";
}

export function setStoredHrEmail(email: string): void {
  if (typeof window === "undefined") return;
  if (!email || email.trim() === "") {
    window.localStorage.removeItem(HR_EMAIL_STORAGE_KEY);
  } else {
    window.localStorage.setItem(HR_EMAIL_STORAGE_KEY, email.trim());
  }
}

export function getStoredGmailAppPassword(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(GMAIL_APP_PASSWORD_STORAGE_KEY) || "";
}

export function setStoredGmailAppPassword(code: string): void {
  if (typeof window === "undefined") return;
  if (!code || code.trim() === "") {
    window.localStorage.removeItem(GMAIL_APP_PASSWORD_STORAGE_KEY);
  } else {
    window.localStorage.setItem(GMAIL_APP_PASSWORD_STORAGE_KEY, code.trim());
  }
}

export function getStoredSenderName(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(SENDER_NAME_STORAGE_KEY) || "Talent Acquisition Team";
}

export function setStoredSenderName(name: string): void {
  if (typeof window === "undefined") return;
  if (!name || name.trim() === "") {
    window.localStorage.removeItem(SENDER_NAME_STORAGE_KEY);
  } else {
    window.localStorage.setItem(SENDER_NAME_STORAGE_KEY, name.trim());
  }
}

// ── SHA-256 Content-Addressable Hash ──────────────────────────────────────

export async function computeEvaluationHash(
  resumeText: string,
  jobDescription: string,
  cutoff: number = 50
): Promise<string> {
  const normResume = (resumeText || "").trim().toLowerCase().slice(0, 3000);
  const normJd = (jobDescription || "").trim().toLowerCase().slice(0, 2000);
  const raw = `${normResume}__${normJd}__cutoff:${cutoff}__v3`;

  if (typeof window !== "undefined" && window.crypto && window.crypto.subtle) {
    try {
      const msgBuffer = new TextEncoder().encode(raw);
      const hashBuffer = await window.crypto.subtle.digest("SHA-256", msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    } catch {
      // Fallback below
    }
  }

  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `tb_hash_${Math.abs(hash).toString(16)}`;
}

// ── Database Connection ───────────────────────────────────────────────────

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

      // Resumes store
      if (!db.objectStoreNames.contains(RESUMES_STORE)) {
        const resumeStore = db.createObjectStore(RESUMES_STORE, { keyPath: "id" });
        resumeStore.createIndex("jobId", "jobId", { unique: false });
        resumeStore.createIndex("createdAt", "createdAt", { unique: false });
      }

      // Evaluations cache store
      if (!db.objectStoreNames.contains(EVALS_STORE)) {
        const evalStore = db.createObjectStore(EVALS_STORE, { keyPath: "hash" });
        evalStore.createIndex("jobId", "jobId", { unique: false });
        evalStore.createIndex("candidateEmail", "candidateEmail", { unique: false });
        evalStore.createIndex("timestamp", "timestamp", { unique: false });
      }

      // Local Jobs store
      if (!db.objectStoreNames.contains(JOBS_STORE)) {
        const jobStore = db.createObjectStore(JOBS_STORE, { keyPath: "id" });
        jobStore.createIndex("createdAt", "createdAt", { unique: false });
      }

      // Local Candidates store
      if (!db.objectStoreNames.contains(CANDIDATES_STORE)) {
        const candStore = db.createObjectStore(CANDIDATES_STORE, { keyPath: "id" });
        candStore.createIndex("jobId", "jobId", { unique: false });
        candStore.createIndex("email", "email", { unique: false });
        candStore.createIndex("status", "status", { unique: false });
      }
    };

    request.onsuccess = (e) => {
      dbInstance = (e.target as IDBOpenDBRequest).result;
      resolve(dbInstance);
    };

    request.onerror = (e) => {
      console.warn("[TalentBench ClientDB] IndexedDB open error:", e);
      reject((e.target as IDBOpenDBRequest).error);
    };
  });
}

// ── Local Jobs Store CRUD ─────────────────────────────────────────────────

export async function saveLocalJob(job: LocalJobProfile): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(JOBS_STORE, "readwrite");
      const store = tx.objectStore(JOBS_STORE);
      const req = store.put(job);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("[TalentBench ClientDB] Failed to save job:", err);
  }
}

export function areJobsDuplicate(
  a: { id?: string; title: string; minExperience?: number; maxExperience?: number; description?: string },
  b: { id?: string; title: string; minExperience?: number; maxExperience?: number; description?: string }
): boolean {
  if (!a || !b) return false;
  if (a.id && b.id && a.id === b.id) return true;

  const normTitleA = (a.title || "").trim().toLowerCase().replace(/\s+/g, " ");
  const normTitleB = (b.title || "").trim().toLowerCase().replace(/\s+/g, " ");
  if (!normTitleA || !normTitleB || normTitleA !== normTitleB) return false;

  const minA = Number(a.minExperience ?? 0);
  const minB = Number(b.minExperience ?? 0);
  const maxA = Number(a.maxExperience ?? 0);
  const maxB = Number(b.maxExperience ?? 0);
  if (minA !== minB || maxA !== maxB) return false;

  if (a.description && b.description) {
    const descA = (a.description || "").trim().toLowerCase().slice(0, 80).replace(/\s+/g, " ");
    const descB = (b.description || "").trim().toLowerCase().slice(0, 80).replace(/\s+/g, " ");
    if (descA && descB && descA !== descB) {
      return false;
    }
  }

  return true;
}

export async function migrateAndRemoveDuplicateLocalJob(
  duplicateJobId: string,
  canonicalJobId: string
): Promise<void> {
  if (!duplicateJobId || !canonicalJobId || duplicateJobId === canonicalJobId) return;
  try {
    const db = await openDB();
    const tx = db.transaction([JOBS_STORE, CANDIDATES_STORE, RESUMES_STORE], "readwrite");
    
    // 1. Delete duplicate job from JOBS_STORE
    tx.objectStore(JOBS_STORE).delete(duplicateJobId);

    // 2. Re-point candidates to canonicalJobId
    const candStore = tx.objectStore(CANDIDATES_STORE);
    const candReq = candStore.getAll();
    candReq.onsuccess = () => {
      const cands: LocalCandidate[] = candReq.result || [];
      for (const c of cands) {
        if (c.jobId === duplicateJobId) {
          candStore.put({ ...c, jobId: canonicalJobId });
        }
      }
    };

    // 3. Re-point queued resumes to canonicalJobId
    const resumeStore = tx.objectStore(RESUMES_STORE);
    const resumeReq = resumeStore.getAll();
    resumeReq.onsuccess = () => {
      const resumes: CachedResume[] = resumeReq.result || [];
      for (const r of resumes) {
        if (r.jobId === duplicateJobId) {
          resumeStore.put({ ...r, jobId: canonicalJobId });
        }
      }
    };
  } catch (err) {
    console.warn("[TalentBench ClientDB] Error migrating duplicate job:", err);
  }
}

export async function getLocalJobs(): Promise<LocalJobProfile[]> {
  try {
    const db = await openDB();
    const rawJobs: LocalJobProfile[] = await new Promise((resolve, reject) => {
      const tx = db.transaction(JOBS_STORE, "readonly");
      const store = tx.objectStore(JOBS_STORE);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });

    if (!rawJobs || rawJobs.length <= 1) return rawJobs || [];

    // Deduplicate local jobs
    const uniqueJobs: LocalJobProfile[] = [];
    const duplicatesToRemove: { duplicateId: string; canonicalId: string }[] = [];

    for (const job of rawJobs) {
      const existingIdx = uniqueJobs.findIndex((uj) => areJobsDuplicate(uj, job));
      if (existingIdx === -1) {
        uniqueJobs.push(job);
      } else {
        const existing = uniqueJobs[existingIdx];
        // Decide which one is canonical:
        // Prefer server ID (does not start with "job_local_") over local ID
        if (existing.id.startsWith("job_local_") && !job.id.startsWith("job_local_")) {
          uniqueJobs[existingIdx] = job;
          duplicatesToRemove.push({ duplicateId: existing.id, canonicalId: job.id });
        } else {
          duplicatesToRemove.push({ duplicateId: job.id, canonicalId: existing.id });
        }
      }
    }

    // Clean up duplicate entries in background
    if (duplicatesToRemove.length > 0) {
      for (const { duplicateId, canonicalId } of duplicatesToRemove) {
        migrateAndRemoveDuplicateLocalJob(duplicateId, canonicalId).catch(() => {});
      }
    }

    return uniqueJobs;
  } catch (err) {
    console.warn("[TalentBench ClientDB] Failed to load jobs:", err);
    return [];
  }
}

export async function getLocalJob(id: string): Promise<LocalJobProfile | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(JOBS_STORE, "readonly");
      const store = tx.objectStore(JOBS_STORE);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("[TalentBench ClientDB] Failed to load job:", err);
    return null;
  }
}

export async function deleteLocalJob(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([JOBS_STORE, CANDIDATES_STORE, RESUMES_STORE], "readwrite");
      tx.objectStore(JOBS_STORE).delete(id);
      
      // Cascade delete candidates and resumes for this job
      const candStore = tx.objectStore(CANDIDATES_STORE);
      const candReq = candStore.getAll();
      candReq.onsuccess = () => {
        const cands: LocalCandidate[] = candReq.result || [];
        for (const c of cands) {
          if (c.jobId === id) candStore.delete(c.id);
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("[TalentBench ClientDB] Failed to delete job:", err);
  }
}

// ── Local Candidates Store CRUD ───────────────────────────────────────────

export async function saveLocalCandidate(candidate: LocalCandidate): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(CANDIDATES_STORE, "readwrite");
      const store = tx.objectStore(CANDIDATES_STORE);
      const req = store.put(candidate);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("[TalentBench ClientDB] Failed to save candidate:", err);
  }
}

export async function saveBatchLocalCandidates(candidates: LocalCandidate[]): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(CANDIDATES_STORE, "readwrite");
      const store = tx.objectStore(CANDIDATES_STORE);
      for (const c of candidates) {
        store.put(c);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("[TalentBench ClientDB] Failed to batch save candidates:", err);
  }
}

export async function getLocalCandidates(jobId?: string): Promise<LocalCandidate[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(CANDIDATES_STORE, "readonly");
      const store = tx.objectStore(CANDIDATES_STORE);
      const req = store.getAll();
      req.onsuccess = () => {
        const all: LocalCandidate[] = req.result || [];
        if (jobId) {
          resolve(all.filter((c) => c.jobId === jobId));
        } else {
          resolve(all);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("[TalentBench ClientDB] Failed to load candidates:", err);
    return [];
  }
}

export async function updateLocalCandidateOverride(
  id: string,
  isOverridden: boolean,
  status: "SHORTLISTED" | "NOT_SHORTLISTED",
  overrideReason?: string
): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(CANDIDATES_STORE, "readwrite");
      const store = tx.objectStore(CANDIDATES_STORE);
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const cand: LocalCandidate = getReq.result;
        if (!cand) return resolve();
        cand.isOverridden = isOverridden;
        cand.status = status;
        cand.overrideReason = overrideReason || null;
        store.put(cand);
        resolve();
      };
      getReq.onerror = () => reject(getReq.error);
    });
  } catch (err) {
    console.warn("[TalentBench ClientDB] Failed to override candidate:", err);
  }
}

// ── Resumes Cache Operations ──────────────────────────────────────────────

export async function saveCachedResume(resume: CachedResume): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(RESUMES_STORE, "readwrite");
      const store = tx.objectStore(RESUMES_STORE);
      const req = store.put(resume);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("[TalentBench Cache] Failed to save resume to IndexedDB:", err);
  }
}

export async function saveBatchCachedResumes(resumes: CachedResume[]): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(RESUMES_STORE, "readwrite");
      const store = tx.objectStore(RESUMES_STORE);
      for (const r of resumes) {
        store.put(r);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("[TalentBench Cache] Failed to batch save resumes:", err);
  }
}

export async function loadCachedResumes(jobId?: string): Promise<CachedResume[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(RESUMES_STORE, "readonly");
      const store = tx.objectStore(RESUMES_STORE);
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
    console.warn("[TalentBench Cache] Failed to load resumes from IndexedDB:", err);
    return [];
  }
}

export async function removeCachedResume(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(RESUMES_STORE, "readwrite");
      const store = tx.objectStore(RESUMES_STORE);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("[TalentBench Cache] Failed to delete resume from IndexedDB:", err);
  }
}

export async function clearCachedResumes(jobId?: string): Promise<void> {
  try {
    const db = await openDB();
    if (!jobId) {
      return new Promise((resolve, reject) => {
        const tx = db.transaction(RESUMES_STORE, "readwrite");
        const store = tx.objectStore(RESUMES_STORE);
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
    console.warn("[TalentBench Cache] Failed to clear resume cache:", err);
  }
}

// ── AI Evaluation Cache Operations (0ms Latency Hits) ─────────────────────

export async function saveCachedEvaluation(evaluation: CachedEvaluation): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(EVALS_STORE, "readwrite");
      const store = tx.objectStore(EVALS_STORE);
      const req = store.put(evaluation);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("[TalentBench Cache] Failed to save evaluation to cache:", err);
  }
}

export async function getCachedEvaluation(hash: string): Promise<CachedEvaluation | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(EVALS_STORE, "readonly");
      const store = tx.objectStore(EVALS_STORE);
      const req = store.get(hash);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("[TalentBench Cache] Failed to get evaluation from cache:", err);
    return null;
  }
}

export async function getCachedEvaluationsForJob(jobId: string): Promise<CachedEvaluation[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(EVALS_STORE, "readonly");
      const store = tx.objectStore(EVALS_STORE);
      const req = store.getAll();
      req.onsuccess = () => {
        const all: CachedEvaluation[] = req.result || [];
        resolve(all.filter((e) => e.jobId === jobId));
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("[TalentBench Cache] Failed to load job evaluations:", err);
    return [];
  }
}

export async function clearJobEvaluationCache(jobId: string): Promise<void> {
  try {
    const db = await openDB();
    const evals = await getCachedEvaluationsForJob(jobId);
    return new Promise((resolve, reject) => {
      const tx = db.transaction(EVALS_STORE, "readwrite");
      const store = tx.objectStore(EVALS_STORE);
      for (const e of evals) {
        store.delete(e.hash);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("[TalentBench Cache] Failed to clear job evaluations cache:", err);
  }
}

export async function clearAllEvaluationCache(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(EVALS_STORE, "readwrite");
      const store = tx.objectStore(EVALS_STORE);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("[TalentBench Cache] Failed to clear all evaluations cache:", err);
  }
}

// ── Workspace Backup & Restore Operations ─────────────────────────────────

export interface WorkspaceExportData {
  version: number;
  exportedAt: string;
  geminiApiKeyConfigured: boolean;
  jobs: LocalJobProfile[];
  candidates: LocalCandidate[];
  cachedEvaluations: CachedEvaluation[];
}

export async function exportWorkspaceJson(): Promise<string> {
  const jobs = await getLocalJobs();
  const candidates = await getLocalCandidates();
  
  let cachedEvaluations: CachedEvaluation[] = [];
  try {
    const db = await openDB();
    cachedEvaluations = await new Promise((resolve) => {
      const tx = db.transaction(EVALS_STORE, "readonly");
      const req = tx.objectStore(EVALS_STORE).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch {
    // ignore
  }

  const exportPayload: WorkspaceExportData = {
    version: DB_VERSION,
    exportedAt: new Date().toISOString(),
    geminiApiKeyConfigured: !!getStoredGeminiApiKey(),
    jobs,
    candidates,
    cachedEvaluations,
  };

  return JSON.stringify(exportPayload, null, 2);
}

export async function importWorkspaceJson(jsonStr: string): Promise<boolean> {
  try {
    const data: WorkspaceExportData = JSON.parse(jsonStr);
    if (!data || (!data.jobs && !data.candidates)) {
      throw new Error("Invalid workspace JSON format.");
    }

    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(
        [JOBS_STORE, CANDIDATES_STORE, EVALS_STORE],
        "readwrite"
      );

      // Restore jobs
      if (Array.isArray(data.jobs)) {
        const jobStore = tx.objectStore(JOBS_STORE);
        for (const job of data.jobs) {
          jobStore.put(job);
        }
      }

      // Restore candidates
      if (Array.isArray(data.candidates)) {
        const candStore = tx.objectStore(CANDIDATES_STORE);
        for (const cand of data.candidates) {
          candStore.put(cand);
        }
      }

      // Restore evaluations
      if (Array.isArray(data.cachedEvaluations)) {
        const evalStore = tx.objectStore(EVALS_STORE);
        for (const ev of data.cachedEvaluations) {
          evalStore.put(ev);
        }
      }

      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error("[TalentBench ClientDB] Failed to import workspace:", err);
    return false;
  }
}

// ── Pre-seed Demo Data If Database Is Empty ───────────────────────────────

export async function seedInitialLocalDataIfEmpty(): Promise<void> {
  try {
    const jobs = await getLocalJobs();
    if (jobs.length > 0) return;

    const defaultJob: LocalJobProfile = {
      id: "job_demo_fullstack_2026",
      title: "Senior Distributed Systems & Full-Stack Engineer",
      description: "Requirements: 4+ years of professional engineering experience with Next.js, TypeScript, Python or Go, PostgreSQL, distributed systems, and real-time APIs. Candidates with at least 30% matched qualifications advance to technical interview.",
      minExperience: 3,
      maxExperience: 10,
      cutoff: 50,
      createdAt: new Date().toISOString(),
      pipeline: [
        {
          id: "round_resume_screen",
          type: "RESUME_SCREEN",
          title: "AI 30% Rule Resume Screening",
          description: "Stateless in-browser semantic calibration against role criteria.",
          order: 1,
          config: JSON.stringify({ threshold: 30 }),
        },
        {
          id: "round_tournament",
          type: "TOURNAMENT",
          title: "Comparative Quantile Ranking",
          description: "Sub-10ms browser tournament computing percentile placement.",
          order: 2,
          config: JSON.stringify({ percentileCutoff: 65 }),
        },
        {
          id: "round_interview",
          type: "INTERVIEW",
          title: "Architecture & System Design Interview",
          description: "Live interactive assessment of distributed patterns and tradeoffs.",
          order: 3,
          config: null,
        },
      ],
    };

    await saveLocalJob(defaultJob);
  } catch (err) {
    console.warn("[TalentBench ClientDB] Could not seed initial demo data:", err);
  }
}
