/**
 * POST /api/shorten
 *
 * Nhan original_url (bat buoc) va alias (tuy chon, toi da 7 ky tu)
 * Tra ve: { short_code, short_url, original_url, created_at }
 *
 * Logic xu ly:
 *   1. Parse va validate body (original_url, alias?)
 *   2. Neu co alias: kiem tra hop le va UNIQUE -> insert thang
 *   3. Neu khong co alias: sinh ngau nhien short_code, retry neu trung (toi da 5 lan)
 *   4. Insert vao Supabase -> tra ve ket qua
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";
import { generateShortCode, isValidUrl, isValidAlias } from "@/lib/utils";

// So lan thu lai toi da khi sinh short_code bi trung (collision)
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

    const { original_url, alias } = body as {
      original_url?: string;
      alias?: string;
    };

    // --- 2. Validate original_url ---
    if (!original_url || typeof original_url !== "string") {
      return NextResponse.json(
        { error: "original_url la bat buoc" },
        { status: 400 }
      );
    }

    const trimmedUrl = original_url.trim();
    if (!isValidUrl(trimmedUrl)) {
      return NextResponse.json(
        { error: "URL khong hop le. Phai bat dau bang http:// hoac https://" },
        { status: 400 }
      );
    }

    // --- 3. Xu ly alias (neu co) ---
    const supabase = createServerSupabaseClient();

    if (alias !== undefined && alias !== "") {
      // Validate format alias
      if (!isValidAlias(alias)) {
        return NextResponse.json(
          {
            error:
              "Alias khong hop le. Chi duoc dung a-z, A-Z, 0-9, -, _ va toi da 7 ky tu",
          },
          { status: 400 }
        );
      }

      // Kiem tra alias da ton tai chua
      const { data: existing } = await supabase
        .from("links")
        .select("id")
        .eq("short_code", alias)
        .single();

      if (existing) {
        return NextResponse.json(
          { error: `Alias "${alias}" da duoc su dung, vui long chon alias khac` },
          { status: 409 } // 409 Conflict
        );
      }

      // Insert voi alias custom
      const { data, error } = await supabase
        .from("links")
        .insert({ short_code: alias, original_url: trimmedUrl })
        .select()
        .single();

      if (error) throw error;
      return buildSuccessResponse(data.short_code, data.original_url, data.created_at, request);
    }

    // --- 4. Sinh short_code ngau nhien voi retry logic ---
    // Tai sao phai retry?
    //   - Xac suat trung (collision) rat thap nhung khong bang 0
    //   - Retry toi da 5 lan la du an toan (62^7 = 3.5 ty slots)
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      const short_code = generateShortCode(7);

      const { data, error } = await supabase
        .from("links")
        .insert({ short_code, original_url: trimmedUrl })
        .select()
        .single();

      if (!error && data) {
        return buildSuccessResponse(data.short_code, data.original_url, data.created_at, request);
      }

      // Neu loi la do UNIQUE constraint vi pham -> thu lai
      // PostgreSQL error code 23505 = unique_violation
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "23505"
      ) {
        lastError = error;
        continue; // Thu lai
      }

      // Loi khac (ket noi DB, ...) -> throw ngay
      throw error;
    }

    // Het so lan retry
    console.error("Failed after max retries:", lastError);
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
 * Helper: Tao response thanh cong
 * Tra ve short_url day du de frontend hien thi ngay
 */
function buildSuccessResponse(
  short_code: string,
  original_url: string,
  created_at: string,
  request: NextRequest
) {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    `${request.nextUrl.protocol}//${request.nextUrl.host}`;

  return NextResponse.json(
    {
      short_code,
      short_url: `${appUrl}/${short_code}`,
      original_url,
      created_at,
    },
    { status: 201 }
  );
}
