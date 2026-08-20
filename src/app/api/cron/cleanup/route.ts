import { createServerSupabaseClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

// API Route: GET /api/cron/cleanup
// Muc dich: Tu dong xoa cac link da tao hon 15 ngay truoc
// Bao mat: Xac thuc qua CRON_SECRET trong header hoac query param

export async function GET(request: NextRequest) {
  // --- Xac thuc CRON_SECRET ---
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    // Lay key tu header "x-cron-secret" hoac query "?secret=..."
    const { searchParams } = new URL(request.url);
    const querySecret = searchParams.get('secret');
    const headerSecret = request.headers.get('x-cron-secret');

    const clientSecret = headerSecret || querySecret;

    if (!clientSecret || clientSecret !== cronSecret) {
      return NextResponse.json(
        { error: 'Unauthorized: CRON_SECRET khong hop le hoac bi thieu' },
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

  // Xu ly loi tu Supabase neu co
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