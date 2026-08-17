/**
 * utils.ts - Cac ham tien ich:
 * - Chuan hoa & URL-Encode theo tieu chuan quoc te (RFC 3986 / WHATWG URL Standard)
 * - Ma hoa SHA-256 & Base64URL theo tieu chuan RFC 4648 §5
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
 * Chuyen buffer sang chuoi Base64URL theo tieu chuan RFC 4648 §5
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
 * Sinh short code tu URL goc bang thuat toan SHA-256 + Base64URL (RFC 4648)
 * 
 * @param url URL da duoc chuan hoa va URL-encoded
 * @param length Do dai short code (tu 7 den 10 ky tu, mac dinh 7)
 * @param attempt So lan thu lai khi co collision (de truot cua so hash)
 */
export function generateHashShortCode(
  url: string,
  length: number = 7,
  attempt: number = 0
): string {
  const targetLength = Math.min(Math.max(length, 7), 10);

  // Tao hash SHA-256 tu URL (them salt o cac lan retry collision)
  const input = attempt === 0 ? url : `${url}#salt_${attempt}`;
  const hashBuffer = createHash("sha256").update(input, "utf8").digest();

  // Encode sang Base64URL chuan quoc te
  const base64UrlString = bufferToBase64Url(hashBuffer);

  // Lay substring theo do dai 7-10 ky tu
  const offset = attempt * 2;
  const start = offset % (base64UrlString.length - targetLength);

  return base64UrlString.substring(start, start + targetLength);
}

/**
 * Validate URL hop le
 */
export function isValidUrl(url: string): boolean {
  if (!url || url.length > 2048) {
    return false;
  }
  const normalized = normalizeAndEncodeUrl(url);
  return Boolean(normalized);
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