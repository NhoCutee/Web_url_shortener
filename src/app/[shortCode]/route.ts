import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ shortCode: string }> }
) {
  const { shortCode } = await params;

  if (!shortCode || shortCode.length > 7) {
    return NextResponse.redirect(new URL("/not-found", _request.url));
  }

  try {
    const supabase = createServerSupabaseClient();

    const { data: link, error } = await supabase
      .from("links")
      .select("id, original_url, click_count")
      .eq("short_code", shortCode)
      .single();

    if (error || !link) {
      return NextResponse.redirect(
        new URL(`/not-found?code=${shortCode}`, _request.url)
      );
    }

    // Tang click_count bat dong bo (fire-and-forget)
    supabase
      .from("links")
      .update({ click_count: link.click_count + 1 })
      .eq("id", link.id)
      .then(({ error: updateError }) => {
        if (updateError) {
          console.error(`Failed to update click_count for ${shortCode}:`, updateError);
        }
      });

    return NextResponse.redirect(link.original_url, { status: 302 });

  } catch (err) {
    console.error(`Unexpected error for /${shortCode}:`, err);
    return NextResponse.redirect(new URL("/", _request.url));
  }
}