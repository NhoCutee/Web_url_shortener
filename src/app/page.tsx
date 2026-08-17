"use client";

/**
 * page.tsx - Trang chu URL Shortener
 *
 * Day la Client Component ("use client") vi can:
 *   - useState de quan ly form state, ket qua, danh sach link
 *   - Event handlers (onClick, onChange, onSubmit)
 *   - clipboard API (navigator.clipboard)
 *
 * Luong du lieu:
 *   User nhap URL -> POST /api/shorten -> hien thi ket qua
 *   Danh sach "recent links" luu trong React state (session-only)
 *   (Co the mo rong luu localStorage hoac query Supabase)
 */

import { useState, useCallback } from "react";
import type { LinkRow } from "@/types/database";

// Type cho response tu POST /api/shorten
interface ShortenResult {
  short_code: string;
  short_url: string;
  original_url: string;
  created_at: string;
}

export default function HomePage() {
  // --- State ---
  const [url, setUrl] = useState("");
  const [alias, setAlias] = useState("");
  const [showAlias, setShowAlias] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ShortenResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [recentLinks, setRecentLinks] = useState<ShortenResult[]>([]);

  // Base URL hien thi (uu tien env var, fallback window.location)
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");

  // --- Handlers ---
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!url.trim() || isLoading) return;

      setIsLoading(true);
      setError(null);
      setResult(null);
      setCopied(false);

      try {
        const body: Record<string, string> = { original_url: url.trim() };
        if (showAlias && alias.trim()) {
          body.alias = alias.trim();
        }

        const res = await fetch("/api/shorten", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Co loi xay ra. Vui long thu lai.");
          return;
        }

        setResult(data);
        // Them vao dau danh sach "recent links", giu toi da 10
        setRecentLinks((prev) => [data, ...prev].slice(0, 10));
        setUrl("");
        setAlias("");
        setShowAlias(false);
      } catch {
        setError("Khong the ket noi den server. Kiem tra lai mang.");
      } finally {
        setIsLoading(false);
      }
    },
    [url, alias, showAlias, isLoading]
  );

  const handleCopy = useCallback(async (textToCopy: string) => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback cho moi truong khong ho tro clipboard API
      const el = document.createElement("textarea");
      el.value = textToCopy;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, []);

  // --- Render ---
  return (
    <div className="page-container">
      <main className="main-content">
        {/* Header */}
        <header className="header">
          <div className="logo">
            <div className="logo-icon">⚡</div>
            <span className="logo-text">SnapLink</span>
          </div>
          <p className="header-subtitle">
            Rut gon URL nhanh chong · Theo doi luot click · Mien phi
          </p>
        </header>

        {/* Main Form Card */}
        <div className="card">
          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="url-input" className="form-label">
                Nhap URL can rut gon
              </label>

              <div className="input-row">
                <input
                  id="url-input"
                  type="url"
                  className="input"
                  placeholder="https://example.com/duong-dan-rat-dai..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={isLoading}
                  autoFocus
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  type="submit"
                  className="btn btn-primary btn-shorten"
                  disabled={isLoading || !url.trim()}
                  aria-label="Rut gon URL"
                >
                  {isLoading ? (
                    <>
                      <span className="spinner" aria-hidden="true" />
                      <span>Dang xu ly...</span>
                    </>
                  ) : (
                    <>
                      <span>⚡</span>
                      <span>Rut gon</span>
                    </>
                  )}
                </button>
              </div>

              {/* Optional alias */}
              <label className="toggle-label">
                <input
                  type="checkbox"
                  className="toggle-checkbox"
                  checked={showAlias}
                  onChange={(e) => setShowAlias(e.target.checked)}
                  disabled={isLoading}
                  id="alias-toggle"
                />
                Tuy chinh alias (tuy chon)
              </label>

              {showAlias && (
                <div className="alias-row">
                  <span className="input-prefix">{appUrl}/</span>
                  <input
                    id="alias-input"
                    type="text"
                    className="input input-with-prefix input-alias"
                    placeholder="my-link"
                    value={alias}
                    onChange={(e) => setAlias(e.target.value.slice(0, 7))}
                    disabled={isLoading}
                    maxLength={7}
                    spellCheck={false}
                    autoComplete="off"
                    aria-label="Custom alias (toi da 7 ky tu)"
                  />
                </div>
              )}
            </div>

            {/* Error message */}
            {error && (
              <div className="alert alert-error" role="alert" style={{ marginTop: "1rem" }}>
                <span className="alert-icon">⚠</span>
                <span>{error}</span>
              </div>
            )}
          </form>

          {/* Result */}
          {result && (
            <div className="result-box" style={{ marginTop: "1.25rem" }}>
              <div className="result-label">✓ Link da duoc rut gon</div>
              <div className="result-url-row">
                <a
                  href={result.short_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="result-url"
                >
                  {result.short_url}
                </a>
                <button
                  type="button"
                  className="btn btn-secondary copy-btn"
                  onClick={() => handleCopy(result.short_url)}
                  aria-label="Sao chep short URL"
                  id="copy-result-btn"
                >
                  {copied ? (
                    <span className="copy-success">✓ Da sao chep</span>
                  ) : (
                    <>📋 Sao chep</>
                  )}
                </button>
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
                → {result.original_url.length > 60
                  ? result.original_url.slice(0, 60) + "..."
                  : result.original_url}
              </div>
            </div>
          )}
        </div>

        {/* Recent links */}
        {recentLinks.length > 0 && (
          <section aria-labelledby="recent-links-heading">
            <div className="divider">Link gan day</div>

            <div className="card" style={{ marginTop: "1rem" }}>
              <h2 id="recent-links-heading" className="section-title">
                Tao trong phien nay
              </h2>
              <ul className="links-list">
                {recentLinks.map((link) => (
                  <li key={link.short_code} className="link-item">
                    <div className="link-item-info">
                      <a
                        href={link.short_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="link-item-short"
                      >
                        {link.short_url}
                      </a>
                      <span
                        className="link-item-original"
                        title={link.original_url}
                      >
                        {link.original_url}
                      </span>
                    </div>
                    <div className="link-item-meta">
                      <span className="click-badge">
                        👆 0 clicks
                      </span>
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon"
                        onClick={() => handleCopy(link.short_url)}
                        aria-label={`Sao chep ${link.short_url}`}
                        title="Sao chep"
                      >
                        📋
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}