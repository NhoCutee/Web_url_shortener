import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "404 - Khong tim thay link | SnapLink",
};

export default function NotFoundPage() {
  return (
    <div className="notfound-container">
      <div className="notfound-code">404</div>
      <h1 className="notfound-title">Link khong ton tai</h1>
      <p className="notfound-desc">
        Short link nay da het han, bi xoa, hoac chua bao gio ton tai.
      </p>
      <Link href="/" className="btn btn-primary">
        ← Tao link moi
      </Link>
    </div>
  );
}