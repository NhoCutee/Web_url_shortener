/**
 * GET /[shortCode] - Redirect handler
 *
 * Query DB theo short_code (do dai 1-10 ky tu), tang click_count bat dong bo,
 * va redirect 302 sang original_url.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ shortCode: string }> }
) {
  const { shortCode } = await params;

  // Validation: short_code phai co do dai tu 1 den 10 ky tu
  if (!shortCode || shortCode.length > 10) {
    return NextResponse.redirect(new URL("/not-found", _request.url));
  }

  try {
    const supabase = createServerSupabaseClient();

    // Query link theo short_code
    const { data: link, error } = await supabase
      .from("links")
      .select("id, original_url, click_count")
      .eq("short_code", shortCode)
      .maybeSingle();

    if (error || !link) {
      return NextResponse.redirect(
        new URL(`/not-found?code=${shortCode}`, _request.url)
      );
    }

    // Tang click_count bat dong bo (fire-and-forget de khong lam cham redirect)
    supabase
      .from("links")
      .update({ click_count: link.click_count + 1 })
      .eq("id", link.id)
      .then(({ error: updateError }) => {
        if (updateError) {
          console.error(`[Redirect] Failed to update click_count for ${shortCode}:`, updateError);
        }
      });

    // Redirect 302 sang URL goc
    return NextResponse.redirect(link.original_url, { status: 302 });

  } catch (err) {
    console.error(`[Redirect] Unexpected error for /${shortCode}:`, err);
    return NextResponse.redirect(new URL("/", _request.url));
  }
}