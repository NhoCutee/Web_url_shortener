/**
 * POST /api/shorten
 *
 * Tao short link su dung SHA-256 + Base64URL (RFC 4648 §5).
 * Tu dong chuan hoa & URL-encode link goc theo tieu chuan RFC 3986 / WHATWG.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";
import {
  normalizeAndEncodeUrl,
  generateHashShortCode,
  isValidAlias,
  sanitizeBaseUrl,
  RESERVED_ALIASES,
} from "@/lib/utils";

const MAX_RETRIES = 5;

export async function POST(request: NextRequest) {
  try {
    // --- 1. Parse request body ---
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Request body phai la JSON hop le" },
        { status: 400 }
      );
    }

    const { original_url, alias, length = 7 } = body as {
      original_url?: string;
      alias?: string;
      length?: number;
    };

    // --- 2. Chuan hoa & URL-Encode link goc theo tieu chuan quoc te ---
    if (!original_url || typeof original_url !== "string") {
      return NextResponse.json(
        { error: "original_url la bat buoc" },
        { status: 400 }
      );
    }

    const normalizedUrl = normalizeAndEncodeUrl(original_url);
    if (!normalizedUrl || normalizedUrl.length > 2048) {
      return NextResponse.json(
        {
          error:
            "URL khong hop le. Vui long nhap dung dinh dang (vi du: https://example.com/path)",
        },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // --- 3. Truong hop nguoi dung chi dinh Custom Alias ---
    if (alias !== undefined && alias !== "") {
      const trimmedAlias = alias.trim();

      if (RESERVED_ALIASES.has(trimmedAlias.toLowerCase())) {
        return NextResponse.json(
          { error: `Alias "${trimmedAlias}" la tu khoa he thong, vui long chon alias khac` },
          { status: 400 }
        );
      }

      if (!isValidAlias(trimmedAlias)) {
        return NextResponse.json(
          {
            error: "Alias khong hop le. Chi duoc dung a-z, A-Z, 0-9, -, _ va do dai tu 1 den 10 ky tu",
          },
          { status: 400 }
        );
      }

      // Kiem tra alias da ton tai chua
      const { data: existing } = await supabase
        .from("links")
        .select("id, original_url, created_at")
        .eq("short_code", trimmedAlias)
        .maybeSingle();

      if (existing) {
        if (existing.original_url === normalizedUrl) {
          // Cung URL va cung alias -> Tra ve link da tao truoc do
          return buildSuccessResponse(trimmedAlias, normalizedUrl, request, existing.created_at);
        }
        return NextResponse.json(
          { error: `Alias "${trimmedAlias}" da duoc su dung, vui long chon alias khac` },
          { status: 409 }
        );
      }

      // Insert alias moi
      const { data, error } = await supabase
        .from("links")
        .insert({ short_code: trimmedAlias, original_url: normalizedUrl })
        .select("short_code, original_url, created_at")
        .single();

      if (error) throw error;
      return buildSuccessResponse(data.short_code, data.original_url, request, data.created_at);
    }

    // --- 4. Sinh short code bang thuat toan SHA-256 + Base64URL ---
    const codeLength = Math.min(Math.max(Number(length) || 7, 7), 10);

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const short_code = generateHashShortCode(normalizedUrl, codeLength, attempt);

      // Kiem tra short_code da ton tai trong DB chua
      const { data: existing } = await supabase
        .from("links")
        .select("short_code, original_url, created_at")
        .eq("short_code", short_code)
        .maybeSingle();

      if (existing) {
        if (existing.original_url === normalizedUrl) {
          // Idempotent / Deduplication: Cung URL goc da tung duoc rut gon
          return buildSuccessResponse(
            existing.short_code,
            existing.original_url,
            request,
            existing.created_at
          );
        }
        // Collision (khac URL nhung trung hash code): Tiep tuc loop de truot cua so hash
        continue;
      }

      // Insert link moi vao DB
      const { data, error } = await supabase
        .from("links")
        .insert({ short_code, original_url: normalizedUrl })
        .select("short_code, original_url, created_at")
        .single();

      if (!error && data) {
        return buildSuccessResponse(data.short_code, data.original_url, request, data.created_at);
      }

      // Neu bi race condition trung unique key luc insert -> retry
      if (error && "code" in error && error.code === "23505") {
        continue;
      }

      throw error;
    }

    return NextResponse.json(
      { error: "Khong the tao short code. Vui long thu lai." },
      { status: 500 }
    );
  } catch (err) {
    console.error("[POST /api/shorten] Error:", err);
    return NextResponse.json(
      { error: "Server error. Vui long thu lai sau." },
      { status: 500 }
    );
  }
}

/**
 * Helper: Build response tra ve cho client
 */
function buildSuccessResponse(
  short_code: string,
  original_url: string,
  request: NextRequest,
  created_at?: string
) {
  const rawAppUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    `${request.nextUrl.protocol}//${request.nextUrl.host}`;
  const appUrl = sanitizeBaseUrl(rawAppUrl);

  return NextResponse.json(
    {
      short_code,
      short_url: `${appUrl}/${short_code}`,
      original_url,
      created_at: created_at || new Date().toISOString(),
    },
    { status: 201 }
  );
}