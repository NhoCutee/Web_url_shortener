/**
 * utils.ts - Cac ham tien ich dung chung
 */

// Bo ky tu base62: 62 ky tu (a-z, A-Z, 0-9)
// Khong dung 0, O, l, I de tranh nham lan khi doc
const BASE62_CHARS =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * Sinh ngau nhien mot short_code co do dai `length` ky tu (mac dinh: 7)
 *
 * Cach hoat dong:
 *   - Dung crypto.getRandomValues() (Web Crypto API - co san trong Node.js 18+)
 *     de sinh byte ngau nhien co chat luong cao (cryptographically secure)
 *   - Moi byte (0-255) duoc map sang ky tu trong BASE62_CHARS bang phep chia du
 *   - Ket qua: chuoi 7 ky tu tu 62 ky tu -> 62^7 = ~3.5 ty combination
 *
 * Tai sao khong dung Math.random()?
 *   - Math.random() KHONG cryptographically secure
 *   - Co the bi predict trong mot so moi truong
 *   - crypto.getRandomValues() dam bao entropy cao
 */
export function generateShortCode(length = 7): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => BASE62_CHARS[b % BASE62_CHARS.length])
    .join("");
}

/**
 * Validate URL co hop le khong
 *
 * Dung URL constructor: neu throw thi URL khong hop le
 * Chi chap nhan http:// va https:// (khong chap nhan ftp://, file://, ...)
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Validate custom alias:
 *   - Chi cho phep a-z, A-Z, 0-9, hyphen (-), underscore (_)
 *   - Do dai 1-7 ky tu
 */
export function isValidAlias(alias: string): boolean {
  return /^[a-zA-Z0-9_-]{1,7}$/.test(alias);
}
