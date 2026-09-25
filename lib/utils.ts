import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

/**
 * Extract / Clean Candidate Personal Name
 * Priority:
 * 1. If fallbackName is already clean (e.g. "Rachel Kowalski", "Evelyn Reed") and not a file or role string, keep it.
 * 2. Search top lines of resume text (first 6 non-empty lines) for a candidate name (2-4 capitalized words, no email/phone/urls/sections).
 * 3. Extract from personal email local-part (e.g. rachel.kowalski.tech@gmail.com -> Rachel Kowalski).
 * 4. Aggressively clean fallbackName/filename: strip extensions, numbers, 'resume_', 'cv_', and trailing job titles.
 */
export function extractCandidateNameFromResume(
  text?: string | null,
  email?: string | null,
  fallbackName?: string | null
): string {
  // If fallbackName is already a clean personal name (not a filename or role string)
  if (fallbackName) {
    const isMessy =
      /^(?:resume|cv|candidate|profile)[\s_-]*/i.test(fallbackName) ||
      /^\d+[\s_-]*/.test(fallbackName) ||
      /\b(frontend|backend|engineer|developer|scientist|manager|lead|vp|director|analyst|fullstack|devops|architect)\b/i.test(fallbackName) ||
      fallbackName.includes(".pdf") ||
      fallbackName.includes(".docx") ||
      fallbackName.includes(".txt") ||
      fallbackName.includes("_");

    if (!isMessy && fallbackName.trim().length >= 2 && fallbackName.trim().length <= 35) {
      return fallbackName.trim();
    }
  }

  // 1. Scan resume text header
  if (text) {
    const lines = text
      .slice(0, 1000)
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    for (let i = 0; i < Math.min(lines.length, 6); i++) {
      let line = lines[i];

      // Remove leading bullets or formatting marks
      line = line.replace(/^[•\-\*–—\s]+/, "").trim();

      // Disqualify lines with contact info, URLs, sections, dates, or file markers
      if (
        line.includes("@") ||
        line.includes("http") ||
        line.includes("linkedin") ||
        line.includes("github") ||
        line.includes("www.") ||
        /\b(resume|curriculum|vitae|summary|profile|experience|skills|education|contact|page|phone|tel|email|address|objective|projects)\b/i.test(line) ||
        /\d{3}[-\s]?\d{3}[-\s]?\d{4}/.test(line) ||
        /\b\d{4}\b/.test(line) || // year
        line.length > 40 ||
        line.length < 3
      ) {
        continue;
      }

      // Check if line contains 2-4 capitalized words (or honorifics like Dr.)
      const words = line.split(/\s+/).filter(Boolean);
      if (
        words.length >= 2 &&
        words.length <= 4 &&
        words.every(
          (w) =>
            /^[A-Z][a-zA-Z.'-]*$/.test(w) ||
            /^(dr|mr|ms|mrs|prof)\.?$/i.test(w)
        )
      ) {
        return line;
      }
    }
  }

  // 2. Derive from personal email (e.g. rachel.kowalski.tech@gmail.com -> Rachel Kowalski)
  if (email && email.includes("@")) {
    const localPart = email.split("@")[0].replace(/[0-9]/g, "");
    const emailParts = localPart
      .split(/[._-]/)
      .filter(
        (p) =>
          p.length > 1 &&
          ![
            "tech", "ds", "ml", "dev", "eng", "work", "job", "candidate", "mail", "contact",
            "frontend", "backend", "fullstack", "ai", "lead"
          ].includes(p.toLowerCase())
      );
    if (emailParts.length >= 2) {
      return emailParts
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
        .join(" ");
    }
  }

  // 3. Clean fallbackName aggressively
  if (fallbackName) {
    let clean = fallbackName
      .replace(/\.[^/.]+$/, "") // remove extension
      .replace(/^(?:resume|cv|profile|candidate)[\s_-]*/gi, "") // remove resume_ / cv_
      .replace(/^\d+[\s_-]*/, "") // remove leading numbers like 16_
      .replace(/[_-]/g, " ")
      .replace(
        /\b(vp of engineering|staff frontend lead|senior|junior|lead|developer|engineer|data scientist|director|architect|manager|intern)\b.*$/gi,
        ""
      ) // strip trailing job title
      .trim();

    if (clean && clean.length >= 2) {
      return clean
        .split(/\s+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
    }
  }

  return "Candidate";
}

/**
 * Sanitize Greeting in Mail Body
 * If the greeting line starts with 'Dear resume 16...' or 'Dear cv...' or placeholders,
 * replaces it with 'Dear <Actual Candidate Name>,'
 */
export function sanitizeMailBodyGreeting(
  mailBody: string | null | undefined,
  displayName: string
): string {
  if (!mailBody) return "";
  return mailBody.replace(
    /^Dear\s+(?:resume|cv|\d+|\[Candidate Name\])[^,\n]*([,\n])/i,
    (_match, punct) => `Dear ${displayName}${punct === "," ? "," : ""}`
  );
}
