import React from "react";

export default function MinimalLandingPage() {
  return (
    <main className="minimal-container">
      {/* Background Cosmic Glow */}
      <div className="bg-glow" aria-hidden="true"></div>

      {/* Ultra-Minimal Center Card */}
      <div className="minimal-card">
        <div className="minimal-logo">
          SnapLink<span className="brand-dot">.</span>
        </div>
        <h1 className="minimal-title">URL Shortener</h1>
        <div className="minimal-status-row">
          <span className="status-live-indicator" aria-hidden="true"></span>
          <p className="minimal-subtitle">
            Private Redirect Service
            <span className="loading-dots" aria-hidden="true">
              <span>.</span>
              <span>.</span>
              <span>.</span>
            </span>
          </p>
        </div>
      </div>
    </main>
  );
}
