/**
 * utils.ts - Cac ham tien ich ma hoa SHA-256 & Base64URL theo chuan quoc te (RFC 4648)
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
 * @param url URL goc can rut gon
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
  // Khi retry, dich chuyen offset de lay phan hash tiep theo
  const offset = attempt * 2;
  const start = offset % (base64UrlString.length - targetLength);

  return base64UrlString.substring(start, start + targetLength);
}

/**
 * Validate URL hop le (http/https, toi da 2048 ky tu)
 */
export function isValidUrl(url: string): boolean {
  if (!url || url.length > 2048) {
    return false;
  }
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
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