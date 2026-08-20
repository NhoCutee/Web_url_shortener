/**
 * GET /[shortCode] - Redirect handler
 *
 * Query DB theo Primary Key `id` (VARCHAR(10)), tang click_count bat dong bo,
 * va redirect 302 sang original_url.
 * Database: PostgreSQL (Docker) qua pg Pool.
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
    // Query link truc tiep theo Primary Key `id`
    const result = await pool.query(
      "SELECT original_url, click_count FROM links WHERE id = $1",
      [shortCode]
    );

    if (result.rows.length === 0) {
      return NextResponse.redirect(
        new URL(`/not-found?code=${shortCode}`, _request.url)
      );
    }

    const link = result.rows[0];

    // Tang click_count bat dong bo theo Primary Key `id`
    pool.query(
      "UPDATE links SET click_count = $1 WHERE id = $2",
      [link.click_count + 1, shortCode]
    ).catch((err) => {
      console.error(`[Redirect] Failed to update click_count for ${shortCode}:`, err);
    });

    // Redirect 302 sang URL goc
    return NextResponse.redirect(link.original_url, { status: 302 });

  } catch (err) {
    console.error(`[Redirect] Unexpected error for /${shortCode}:`, err);
    return NextResponse.redirect(new URL("/", _request.url));
  }
}