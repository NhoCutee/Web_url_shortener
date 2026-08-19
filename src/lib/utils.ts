/**
 * utils.ts - Cac ham tien ich:
 * - Chuan hoa & URL-Encode theo tieu chuan quoc te (RFC 3986 / WHATWG URL Standard)
 * - Ma hoa SHA-256 & Base64URL theo tieu chuan RFC 4648 §5
 * - Mo rong do dai linh hoat (7 -> 8 -> 9 -> 10 ky tu) khi xu ly Collision
 */

import { createHash } from "crypto";

// Danh sach cac alias bi cam vi trung voi route he thong cua Next.js
export const RESERVED_ALIASES = new Set([
  "api",
  "not-found",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
  "_next",
  "static",
  "404",
  "500",
  "login",
  "dashboard",
  "admin",
]);

/**
 * Chuan hoa va ma hoa URL ve URL-encoded format theo chuan quoc te (RFC 3986 / WHATWG):
 * 1. Loai bo khoang trang thua o 2 dau (.trim()) va ky tu dieu khien (\r, \n, \t)
 * 2. Tu dong bo sung https:// neu nguoi dung quen nhap giao thuc
 * 3. Chuan hoa domain sang chu thuong (lowercase hostname)
 * 4. Encode to URL-encoded format (percent-encoding cac khoang trang %20, ky tu unicode, ky tu dac biet)
 * 5. Dam bao khi redirect 302 trinh duyet luon mo chinh xac link goc ma khong bi loi 404
 */
export function normalizeAndEncodeUrl(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== "string") return "";

  // 1. Trim khoang trang o 2 dau va loai bo newline/tab
  let cleaned = rawUrl.trim().replace(/[\r\n\t]+/g, "");
  if (!cleaned) return "";

  // 2. Tu dong them https:// neu chua co giao thuc http:// hoac https://
  if (!/^https?:\/\//i.test(cleaned)) {
    cleaned = `https://${cleaned}`;
  }

  // 3. Chuan hoa va ma hoa thanh URL-encoded format chuan RFC 3986
  try {
    const parsed = new URL(cleaned);

    // Chi chap nhan giao thuc http va https
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "";
    }

    // Hostname phai ton tai va hop le
    if (!parsed.hostname || !parsed.hostname.includes(".")) {
      // Cho phep localhost khi dev
      if (parsed.hostname !== "localhost") {
        return "";
      }
    }

    // parsed.href tu dong format va percent-encode URL theo chuan RFC 3986
    return parsed.href;
  } catch {
    // Fallback: Dung encodeURI neu URL chua ky tu dac biet chua duoc escape
    try {
      const encoded = encodeURI(cleaned);
      const parsed = new URL(encoded);
      return parsed.href;
    } catch {
      return "";
    }
  }
}

/**
 * Chuyen buffer sang chuoi Base64URL theo tieu chuan RFC 4648 §5 (43 ky tu)
 * - Thay '+' bang '-'
 * - Thay '/' bang '_'
 * - Xoa padding '=' o cuoi
 */
export function bufferToBase64Url(buffer: Buffer): string {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Sinh short code tu chuoi hash SHA-256 (Base64URL 43 ky tu):
 * 
 * Thuat toan mo rong thong minh:
 * - attempt 0: Lay 7 ky tu dau tien tu chuoi hash (0..7)
 * - attempt 1: Neu trung, lay mo rong them ky tu thu 8 (0..8)
 * - attempt 2: Neu trung, lay mo rong them ky tu thu 9 (0..9)
 * - attempt 3: Neu trung, lay mo rong them ky tu thu 10 (0..10)
 * - attempt >= 4: Truot cua so hash hoac them salt cho den khi hoan toan het trung
 * 
 * @param url URL da duoc chuan hoa va URL-encoded
 * @param initialLength Do dai short code ban dau (tu 7 den 10 ky tu, mac dinh 7)
 * @param attempt So lan thu lai khi co collision (de mo rong va truot cua so hash)
 */
export function generateHashShortCode(
  url: string,
  initialLength: number = 7,
  attempt: number = 0
): string {
  const baseLength = Math.min(Math.max(initialLength, 7), 10);
  
  // Tinh do dai mo rong: 7 -> 8 -> 9 -> 10 ky tu
  const targetLength = Math.min(baseLength + attempt, 10);

  // So buoc mo rong truoc khi can truot cua so / them salt (vi du: 10 - 7 = 3 buoc cho attempt 0, 1, 2, 3)
  const expansionSteps = 10 - baseLength;

  const saltCount = attempt > expansionSteps ? attempt - expansionSteps : 0;
  const input = saltCount === 0 ? url : `${url}#salt_${saltCount}`;

  // Tao hash SHA-256 tu input
  const hashBuffer = createHash("sha256").update(input, "utf8").digest();
  const base64UrlString = bufferToBase64Url(hashBuffer);

  // Neu da vuot qua do dai 10 ma van trung -> truot cua so doc theo 43 ky tu cua hash
  const offset = attempt > expansionSteps ? (saltCount * 2) % (base64UrlString.length - targetLength) : 0;

  return base64UrlString.substring(offset, offset + targetLength);
}

/**
 * Validate custom alias:
 *   - Chi cho phep a-z, A-Z, 0-9, hyphen (-), underscore (_) theo chuan Base64URL
 *   - Do dai tu 1 den 10 ky tu
 *   - Khong trung voi reserved aliases
 */
export function isValidAlias(alias: string): boolean {
  if (!/^[a-zA-Z0-9_-]{1,10}$/.test(alias)) {
    return false;
  }
  return !RESERVED_ALIASES.has(alias.toLowerCase());
}

/**
 * Xoa dau slash o cuoi URL neu co (tranh double slash)
 */
export function sanitizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}