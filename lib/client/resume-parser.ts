/**
 * Client-Side In-Browser Resume Text & Email Extraction Engine
 * - Runs 100% locally on client's machine (zero server upload for parsing)
 * - Supports PDF (Mozilla PDF.js with offline stream fallback), DOCX, and TXT/Markdown
 * - Extracts Email & specifically detects Gmail addresses via strict regex
 */

export interface ExtractedEmailResult {
  email: string | null;
  isGmail: boolean;
  allEmails: string[];
}

export interface ParseResult {
  text: string;
  emailResult: ExtractedEmailResult;
  extractedName: string;
  wordCount: number;
  charCount: number;
  fileName: string;
  fileSize: number;
}

/**
 * Strict Email & Gmail Regex Extractor
 */
export function extractEmailFromText(text: string): ExtractedEmailResult {
  if (!text) {
    return { email: null, isGmail: false, allEmails: [] };
  }

  // RFC-compliant email pattern
  const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
  const matches = text.match(EMAIL_REGEX) || [];

  // Filter out false positives (e.g. image extensions or domain-only tokens)
  const validEmails = matches
    .map((e) => e.trim().toLowerCase())
    .filter((e) => {
      const parts = e.split("@");
      if (parts.length !== 2) return false;
      const [user, domain] = parts;
      if (!user || !domain) return false;
      // Filter common file extensions accidentally matched
      if (domain.endsWith(".png") || domain.endsWith(".jpg") || domain.endsWith(".pdf")) {
        return false;
      }
      return true;
    });

  const uniqueEmails = Array.from(new Set(validEmails));

  // Prioritize @gmail.com if present
  const gmail = uniqueEmails.find((e) => e.endsWith("@gmail.com"));
  const primaryEmail = gmail || uniqueEmails[0] || null;
  const isGmail = Boolean(primaryEmail && primaryEmail.endsWith("@gmail.com"));

  return {
    email: primaryEmail,
    isGmail,
    allEmails: uniqueEmails,
  };
}

/**
 * Extract Candidate Actual Personal Name from Resume Text
 * 1. Checks first 6 non-empty lines for typical name patterns (2-4 capitalized words)
 * 2. Fallback: extracts from personal email handle (e.g. rachel.kowalski.tech@gmail.com -> Rachel Kowalski)
 * 3. Fallback: aggressively strips file markers, numbers, and trailing job titles from fileName
 */
export function extractCandidateNameFromResume(
  text: string,
  email?: string | null,
  fileName?: string
): string {
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

  // Fallback 1: Derive from personal email (e.g. rachel.kowalski.tech@gmail.com -> Rachel Kowalski)
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

  // Fallback 2: Clean fileName aggressively to extract the actual name
  if (fileName) {
    let clean = fileName
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
 * Load Mozilla PDF.js from CDN dynamically if not already loaded in browser window
 */
async function loadPdfJs(): Promise<any> {
  if (typeof window === "undefined") return null;

  if ((window as any).pdfjsLib) {
    return (window as any).pdfjsLib;
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.async = true;
    script.onload = () => {
      const lib = (window as any).pdfjsLib;
      if (lib) {
        lib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        resolve(lib);
      } else {
        reject(new Error("pdfjsLib not found on window"));
      }
    };
    script.onerror = () => reject(new Error("Failed to load PDF.js from CDN"));
    document.head.appendChild(script);
  });
}

/**
 * Parse PDF ArrayBuffer using Mozilla PDF.js
 */
async function parsePdfWithPdfJs(arrayBuffer: ArrayBuffer): Promise<string> {
  const pdfjsLib = await loadPdfJs();
  if (!pdfjsLib) throw new Error("PDF.js unavailable");

  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const doc = await loadingTask.promise;
  const numPages = doc.numPages;
  const textParts: string[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await doc.getPage(i);
    const textContent = await page.getTextContent();
    const pageStrings = textContent.items
      .map((item: any) => item.str || "")
      .join(" ");
    textParts.push(pageStrings);
  }

  return textParts.join("\n\n").trim();
}

/**
 * Fallback lightweight in-browser PDF text extractor for offline environments
 */
async function parsePdfFallback(arrayBuffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(arrayBuffer);
  const text = new TextDecoder("latin1").decode(bytes);

  const extracted: string[] = [];

  // Match raw text in parentheses before Tj or TJ operators
  // e.g. (John Doe) Tj or [(Hello) -20 (World)] TJ
  const tjRegex = /\(([^)]+)\)\s*Tj/g;
  let match: RegExpExecArray | null;
  while ((match = tjRegex.exec(text)) !== null) {
    extracted.push(match[1]);
  }

  const tjArrayRegex = /\[(.*?)\]\s*TJ/g;
  while ((match = tjArrayRegex.exec(text)) !== null) {
    const inner = match[1];
    const innerTj = /\(([^)]+)\)/g;
    let innerMatch: RegExpExecArray | null;
    while ((innerMatch = innerTj.exec(inner)) !== null) {
      extracted.push(innerMatch[1]);
    }
  }

  if (extracted.length > 0) {
    return extracted.join(" ").replace(/\\([()\\])/g, "$1").trim();
  }

  return text
    .replace(/[^\x20-\x7E\n\r\t]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Client-Side In-Browser DOCX Extractor
 * Parses the zip container to extract word/document.xml without external libraries.
 */
async function parseDocxInBrowser(arrayBuffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(arrayBuffer);
  const view = new DataView(arrayBuffer);

  let offset = 0;
  let documentXmlBytes: Uint8Array | null = null;
  let isDeflated = false;

  // Search local file headers: signature 0x04034b50 (PK\x03\x04)
  while (offset + 30 <= bytes.length) {
    if (view.getUint32(offset, true) !== 0x04034b50) {
      offset++;
      continue;
    }

    const compression = view.getUint16(offset + 8, true);
    const compressedSize = view.getUint32(offset + 18, true);
    const fileNameLen = view.getUint16(offset + 26, true);
    const extraFieldLen = view.getUint16(offset + 28, true);

    const nameStart = offset + 30;
    const nameBytes = bytes.subarray(nameStart, nameStart + fileNameLen);
    const fileName = new TextDecoder().decode(nameBytes);

    const dataStart = nameStart + fileNameLen + extraFieldLen;

    if (fileName === "word/document.xml") {
      documentXmlBytes = bytes.subarray(dataStart, dataStart + compressedSize);
      isDeflated = compression === 8;
      break;
    }

    offset = dataStart + compressedSize;
  }

  if (!documentXmlBytes) {
    // Fallback plain-text sweep over XML strings
    const rawString = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    const textMatches = rawString.match(/<w:t[^>]*>(.*?)<\/w:t>/g) || [];
    return textMatches.map((m) => m.replace(/<[^>]+>/g, "")).join(" ");
  }

  let xmlString = "";
  if (isDeflated && typeof DecompressionStream !== "undefined") {
    try {
      const ds = new DecompressionStream("deflate-raw");
      const writer = ds.writable.getWriter();
      writer.write(documentXmlBytes as any);
      writer.close();
      const reader = ds.readable.getReader();
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
      }
      const totalLen = chunks.reduce((acc, c) => acc + c.length, 0);
      const decompressed = new Uint8Array(totalLen);
      let pos = 0;
      for (const c of chunks) {
        decompressed.set(c, pos);
        pos += c.length;
      }
      xmlString = new TextDecoder().decode(decompressed);
    } catch {
      xmlString = new TextDecoder("utf-8", { fatal: false }).decode(documentXmlBytes);
    }
  } else {
    xmlString = new TextDecoder("utf-8", { fatal: false }).decode(documentXmlBytes);
  }

  // Extract <w:p> paragraphs and <w:t> text runs
  const paragraphs = xmlString.split(/<\/w:p>/g);
  const textLines: string[] = [];

  for (const para of paragraphs) {
    const textMatches = para.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g);
    if (textMatches) {
      const line = textMatches.map((t) => t.replace(/<[^>]+>/g, "")).join("");
      if (line.trim()) {
        textLines.push(line.trim());
      }
    }
  }

  return textLines.join("\n");
}

/**
 * Main Entry: Parse resume file in browser and extract Email / Gmail
 */
export async function parseResumeFileInBrowser(file: File): Promise<ParseResult> {
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  let text = "";

  try {
    if (extension === "txt" || extension === "md" || extension === "rtf" || extension === "csv") {
      text = await file.text();
    } else if (extension === "docx") {
      const buffer = await file.arrayBuffer();
      text = await parseDocxInBrowser(buffer);
    } else if (extension === "pdf") {
      const buffer = await file.arrayBuffer();
      try {
        text = await parsePdfWithPdfJs(buffer);
      } catch (pdfErr) {
        console.warn("[ResumeParser] PDF.js extraction failed, using fallback:", pdfErr);
        text = await parsePdfFallback(buffer);
      }
    } else {
      text = await file.text();
    }
  } catch (err) {
    console.error(`[ResumeParser] Error reading file ${file.name}:`, err);
    text = "";
  }

  // Clean and normalize text
  text = text.replace(/\r\n/g, "\n").trim();

  // Extract Email & Gmail
  const emailResult = extractEmailFromText(text);

  // Extract Candidate Name
  const extractedName = extractCandidateNameFromResume(text, emailResult.email, file.name);

  const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
  const chars = text.length;

  return {
    text,
    emailResult,
    extractedName,
    wordCount: words,
    charCount: chars,
    fileName: file.name,
    fileSize: file.size,
  };
}
