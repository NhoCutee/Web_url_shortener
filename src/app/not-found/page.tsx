import React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "404 - Link Not Found | SnapLink",
  description: "Liên kết không tồn tại hoặc đã hết hạn.",
};

export default function NotFoundPage() {
  return (
    <main className="minimal-container">
      {/* Background Cosmic Glow */}
      <div className="bg-glow" aria-hidden="true"></div>

      {/* Ultra-Minimal Center Card */}
      <div className="minimal-card">
        <div className="minimal-logo">
          SnapLink<span className="brand-dot">.</span>
        </div>
        <h1 className="minimal-title">404 Not Found</h1>
        <div className="minimal-status-row">
          <span className="status-error-indicator" aria-hidden="true"></span>
          <p className="minimal-subtitle">
            Link Expired or Invalid
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
