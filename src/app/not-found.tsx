import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "404 - Lost in the void | ZaloFlow",
  description: "Trang ban dang tim kiem khong ton tai hoac da bi xoa.",
};

export default function NotFoundPage() {
  return (
    <main className="square-page-container">
      {/* Background Cosmic Ambient Glow */}
      <div className="bg-glow" aria-hidden="true"></div>

      {/* Main Square Card */}
      <div className="zalo-square-card">
        
        {/* Top Brand & Error Status */}
        <div className="card-top-row">
          <div className="brand-logo">
            ZaloBot
          </div>
          <div className="live-badge" style={{ color: "#f87171", background: "rgba(239, 68, 68, 0.1)", borderColor: "rgba(239, 68, 68, 0.25)" }}>
            <span className="live-indicator" style={{ background: "#f87171", boxShadow: "0 0 6px #f87171" }}></span>
            404 Error
          </div>
        </div>

        {/* Headline & Description */}
        <div className="card-body">
          <h1 className="main-headline">
            404.<br />
            Lost in the void.
          </h1>
          <p className="main-desc">
            Đường dẫn bạn đang tìm kiếm đã trôi dạt vào khoảng không vũ trụ hoặc chưa bao giờ tồn tại.
          </p>

          {/* 3 Status Pills */}
          <div className="features-list">
            <div className="feature-pill">
              <span className="pill-icon">🛸</span>
              <span>Không tìm thấy <strong>dữ liệu liên kết</strong></span>
            </div>
            <div className="feature-pill">
              <span className="pill-icon">🛰️</span>
              <span>Tọa độ đường dẫn <strong>đã bị thay đổi</strong></span>
            </div>
            <div className="feature-pill">
              <span className="pill-icon">⚡</span>
              <span>Hệ thống máy chủ <strong>hoạt động 100%</strong></span>
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="card-footer">
          <div className="price-tag">
            <strong style={{ color: "#9ca3af" }}>Điều hướng</strong>
            <span>Quay lại vùng an toàn</span>
          </div>

          <div className="cta-actions">
            <Link href="/" className="btn-gold-cta">
              Về trang chủ <span>→</span>
            </Link>
          </div>
        </div>

      </div>
    </main>
  );
}
