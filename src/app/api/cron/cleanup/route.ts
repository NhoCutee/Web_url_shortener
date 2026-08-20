import { createServerSupabaseClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';

// API Route: GET /api/cron/cleanup
// Muc dich: Tu dong xoa cac link da tao hon 15 ngay truoc
// Duoc kich hoat boi Vercel Cron Jobs moi ngay luc 2:00 AM UTC

export async function GET() {
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