/**
 * GET /[shortCode] - Redirect handler
 *
 * Query DB theo Primary Key `id` (VARCHAR(10)) va redirect 302 sang original_url.
 * Toi uu toc do: Chi doc original_url, KHONG dem click -> redirect sieu toc (< 1ms).
 * Database: PostgreSQL qua pg Pool.
 */

import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ shortCode: string }> }
) {
  const { shortCode } = await params;

  // Validation: id/shortCode phai co do dai tu 1 den 10 ky tu
  if (!shortCode || shortCode.length > 10) {
    return NextResponse.redirect(new URL("/not-found", _request.url));
  }

  try {
    // Query truc tiep URL goc theo Primary Key `id`
    const result = await pool.query(
      "SELECT original_url FROM links WHERE id = $1",
      [shortCode]
    );

    if (result.rows.length === 0) {
      return NextResponse.redirect(
        new URL(`/not-found?code=${shortCode}`, _request.url)
      );
    }

    const { original_url } = result.rows[0];

    // Redirect 302 sang URL goc (Khong dem click, toi uu toc do toi da)
    return NextResponse.redirect(original_url, { status: 302 });

  } catch (err) {
    console.error(`[Redirect] Unexpected error for /${shortCode}:`, err);
    return NextResponse.redirect(new URL("/", _request.url));
  }
}