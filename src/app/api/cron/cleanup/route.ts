import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// API Route: GET /api/cron/cleanup
// Muc dich: Tu dong xoa cac link da tao hon 15 ngay truoc
// Bao mat: Xac thuc qua API_KEY (dung chung voi POST /api/shorten)
// Database: PostgreSQL (Docker) qua pg Pool

export async function GET(request: NextRequest) {
  // --- Xac thuc API_KEY ---
  const requiredApiKey = process.env.API_KEY;

  if (requiredApiKey) {
    const headerKey = request.headers.get('x-api-key');
    const authHeader = request.headers.get('authorization');
    const bearerKey = authHeader?.startsWith('Bearer ')
      ? authHeader.substring(7).trim()
      : null;
    const { searchParams } = new URL(request.url);
    const queryKey = searchParams.get('api_key');

    const clientKey = headerKey || bearerKey || queryKey;

    if (!clientKey || clientKey !== requiredApiKey) {
      return NextResponse.json(
        { error: 'Unauthorized: API Key khong hop le hoac bi thieu' },
        { status: 401 }
      );
    }
  }

  try {
    // Tinh moc thoi gian 15 ngay truoc va xoa
    const result = await pool.query(
      "DELETE FROM links WHERE created_at < NOW() - INTERVAL '15 days' RETURNING id"
    );

    const deletedCount = result.rowCount ?? 0;
    const timestamp = new Date().toISOString();

    console.log(`[Cron Cleanup] Da xoa ${deletedCount} link cu luc ${timestamp}`);
    return NextResponse.json({ deleted: deletedCount, timestamp }, { status: 200 });

  } catch (err) {
    console.error('[Cron Cleanup] Loi khi xoa link cu:', err);
    return NextResponse.json(
      { error: 'Co loi xay ra khi xoa du lieu' },
      { status: 500 }
    );
  }
}