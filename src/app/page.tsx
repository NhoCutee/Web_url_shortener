"use client";

/**
 * page.tsx - Trang chu URL Shortener
 *
 * Tu dong nhan dien Domain hien tai (Vercel hoac Localhost) qua window.location.origin.
 */

import { useState, useEffect, useCallback } from "react";

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
  const [length, setLength] = useState<number>(7);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ShortenResult | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [recentLinks, setRecentLinks] = useState<ShortenResult[]>([]);
  const [appUrl, setAppUrl] = useState("");

  // Tu dong lay origin thuc te cua trinh duyet (https://meobo.vercel.app hoac http://localhost:3000)
  useEffect(() => {
    if (typeof window !== "undefined") {
      setAppUrl(window.location.origin);
    }
  }, []);

  // --- Handlers ---
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!url.trim() || isLoading) return;

      setIsLoading(true);
      setError(null);
      setResult(null);

      try {
        const body: Record<string, unknown> = {
          original_url: url.trim(),
          length: Number(length) || 7,
        };
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
        setRecentLinks((prev) => [
          data,
          ...prev.filter((item) => item.short_code !== data.short_code),
        ].slice(0, 10));
        setUrl("");
        setAlias("");
        setShowAlias(false);
      } catch {
        setError("Khong the ket noi den server. Kiem tra lai ket noi mang.");
      } finally {
        setIsLoading(false);
      }
    },
    [url, alias, showAlias, length, isLoading]
  );

  const handleCopy = useCallback(async (textToCopy: string) => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedUrl(textToCopy);
      setTimeout(() => setCopiedUrl((curr) => (curr === textToCopy ? null : curr)), 2000);
    } catch {
      const el = document.createElement("textarea");
      el.value = textToCopy;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopiedUrl(textToCopy);
      setTimeout(() => setCopiedUrl((curr) => (curr === textToCopy ? null : curr)), 2000);
    }
  }, []);

  const displayPrefix = appUrl ? `${appUrl}/` : ".../";

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
            Rut gon URL chuan SHA-256 + Base64URL · Toc do cao · Mien phi
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

              {/* Tuy chon do dai va alias */}
              <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", alignItems: "center", marginTop: "0.25rem" }}>
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    className="toggle-checkbox"
                    checked={showAlias}
                    onChange={(e) => setShowAlias(e.target.checked)}
                    disabled={isLoading}
                    id="alias-toggle"
                  />
                  Custom alias (1-10 ky tu)
                </label>

                {!showAlias && (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8125rem", color: "var(--color-text-secondary)" }}>
                    <span>Do dai ma hash:</span>
                    <select
                      value={length}
                      onChange={(e) => setLength(Number(e.target.value))}
                      disabled={isLoading}
                      style={{
                        background: "var(--color-bg-input)",
                        color: "var(--color-text-primary)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "var(--radius-sm)",
                        padding: "0.2rem 0.5rem",
                        fontSize: "0.8125rem",
                        outline: "none",
                        cursor: "pointer",
                      }}
                    >
                      <option value={7}>7 ky tu (chuan)</option>
                      <option value={8}>8 ky tu</option>
                      <option value={9}>9 ky tu</option>
                      <option value={10}>10 ky tu</option>
                    </select>
                  </div>
                )}
              </div>

              {showAlias && (
                <div className="alias-row">
                  <span className="input-prefix">{displayPrefix}</span>
                  <input
                    id="alias-input"
                    type="text"
                    className="input input-with-prefix input-alias"
                    placeholder="my-link"
                    value={alias}
                    onChange={(e) => setAlias(e.target.value.slice(0, 10))}
                    disabled={isLoading}
                    maxLength={10}
                    spellCheck={false}
                    autoComplete="off"
                    aria-label="Custom alias (1 den 10 ky tu)"
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

          {/* Result Box */}
          {result && (
            <div className="result-box" style={{ marginTop: "1.25rem" }}>
              <div className="result-label">✓ Link da duoc rut gon (SHA-256 Base64URL)</div>
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
                  {copiedUrl === result.short_url ? (
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
                {recentLinks.map((link) => {
                  const isCopied = copiedUrl === link.short_url;
                  return (
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
                          {link.short_code.length} chars
                        </span>
                        <button
                          type="button"
                          className="btn btn-ghost btn-icon"
                          onClick={() => handleCopy(link.short_url)}
                          aria-label={`Sao chep ${link.short_url}`}
                          title="Sao chep"
                        >
                          {isCopied ? "✓" : "📋"}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}