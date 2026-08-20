import { createServerSupabaseClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

// API Route: GET /api/cron/cleanup
// Muc dich: Tu dong xoa cac link da tao hon 15 ngay truoc
// Bao mat: Xac thuc qua API_KEY (dung chung voi POST /api/shorten)

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

  // Khoi tao Supabase client phia server
  const supabase = createServerSupabaseClient();

  // Tinh moc thoi gian 15 ngay truoc
  const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();

  // Xoa cac link co created_at < NOW() - 15 days
  const { data, error } = await supabase
    .from('links')
    .delete()
    .lt('created_at', fifteenDaysAgo)
    .select();

  if (error) {
    console.error('[Cron Cleanup] Loi khi xoa link cu:', error.message);
    return NextResponse.json(
      { error: 'Co loi xay ra khi xoa du lieu', detail: error.message },
      { status: 500 }
    );
  }

  const deletedCount = data?.length ?? 0;
  const timestamp = new Date().toISOString();

  console.log(`[Cron Cleanup] Da xoa ${deletedCount} link cu luc ${timestamp}`);

  return NextResponse.json({ deleted: deletedCount, timestamp }, { status: 200 });
}