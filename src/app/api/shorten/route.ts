/**
 * POST /api/shorten
 *
 * Tao short link su dung SHA-256 + Base64URL (RFC 4648 §5).
 * Primary Key: `id` (VARCHAR(10)) chua ma short code truc tiep.
 * Bao mat: BAT BUOC xac thuc qua API_KEY (Header x-api-key, Authorization Bearer, hoac api_key trong body).
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

const MAX_RETRIES = 10;

/**
 * Helper: Tu dong nhan dien Base URL tu Request Headers cua Vercel hoac Localhost
 */
function getBaseUrl(request: NextRequest): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  const host = request.headers.get("host") || request.nextUrl.host;
  if (host && !host.includes("localhost") && !host.includes("127.0.0.1")) {
    const proto = request.nextUrl.protocol.replace(":", "") || "https";
    return `${proto}://${host}`;
  }

  if (process.env.NEXT_PUBLIC_APP_URL) {
    return sanitizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL);
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return `${request.nextUrl.protocol}//${request.nextUrl.host}`;
}

/**
 * POST /api/shorten
 * Tao short link moi voi BAT BUOC xac thuc API Key
 */
export async function POST(request: NextRequest) {
  try {
    // --- 1. Xac thuc API Key bat buoc ---
    const requiredApiKey = process.env.API_KEY || process.env.SHORTEN_API_KEY;

    if (!requiredApiKey) {
      console.error("[POST /api/shorten] Server chua cau hinh API_KEY trong bien moi truong (.env)");
      return NextResponse.json(
        { error: "Server configuration error: API_KEY is not set in environment" },
        { status: 500 }
      );
    }

    // Lay api key tu header `x-api-key`, `Authorization: Bearer <key>`, query `?api_key=...`
    const headerKey = request.headers.get("x-api-key");
    const authHeader = request.headers.get("authorization");
    const bearerKey = authHeader?.startsWith("Bearer ")
      ? authHeader.substring(7).trim()
      : null;
    
    const { searchParams } = new URL(request.url);
    const queryKey = searchParams.get("api_key");

    // Parse request body
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Request body phai la JSON hop le" },
        { status: 400 }
      );
    }

    const { original_url, alias, length = 7, api_key: bodyApiKey } = body as {
      original_url?: string;
      alias?: string;
      length?: number;
      api_key?: string;
    };

    const clientKey = headerKey || bearerKey || queryKey || bodyApiKey;

    // Kiem tra key co khop voi API_KEY trong env khong
    if (!clientKey || clientKey !== requiredApiKey) {
      return NextResponse.json(
        { error: "Unauthorized: API Key khong hop le hoac bi thieu" },
        { status: 401 }
      );
    }

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

      // Kiem tra alias da ton tai chua theo Primary Key `id`
      const { data: existing } = await supabase
        .from("links")
        .select("id, original_url, created_at")
        .eq("id", trimmedAlias)
        .maybeSingle();

      if (existing) {
        if (existing.original_url === normalizedUrl) {
          return buildSuccessResponse(trimmedAlias, normalizedUrl, request, existing.created_at);
        }
        return NextResponse.json(
          { error: `Alias "${trimmedAlias}" da duoc su dung, vui long chon alias khac` },
          { status: 409 }
        );
      }

      // Insert alias moi voi id = trimmedAlias
      const { data, error } = await supabase
        .from("links")
        .insert({ id: trimmedAlias, original_url: normalizedUrl })
        .select("id, original_url, created_at")
        .single();

      if (error) throw error;
      return buildSuccessResponse(data.id, data.original_url, request, data.created_at);
    }

    // --- 4. Sinh short code bang thuat toan SHA-256 + Base64URL ---
    const codeLength = Math.min(Math.max(Number(length) || 7, 7), 10);

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const shortCodeId = generateHashShortCode(normalizedUrl, codeLength, attempt);

      // Kiem tra truc tiep tren Primary Key `id`
      const { data: existing } = await supabase
        .from("links")
        .select("id, original_url, created_at")
        .eq("id", shortCodeId)
        .maybeSingle();

      if (existing) {
        if (existing.original_url === normalizedUrl) {
          // Deduplication: Cung URL goc da tung duoc rut gon
          return buildSuccessResponse(
            existing.id,
            existing.original_url,
            request,
            existing.created_at
          );
        }
        // Collision: Tiep tuc loop de truot cua so hash
        continue;
      }

      // Insert link moi vao DB voi id = shortCodeId
      const { data, error } = await supabase
        .from("links")
        .insert({ id: shortCodeId, original_url: normalizedUrl })
        .select("id, original_url, created_at")
        .single();

      if (!error && data) {
        return buildSuccessResponse(data.id, data.original_url, request, data.created_at);
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
  id: string,
  original_url: string,
  request: NextRequest,
  created_at?: string
) {
  const appUrl = getBaseUrl(request);

  return NextResponse.json(
    {
      id,
      short_code: id,
      short_url: `${appUrl}/${id}`,
      original_url,
      created_at: created_at || new Date().toISOString(),
    },
    { status: 201 }
  );
}