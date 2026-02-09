import { createClient } from "@/lib/supabase/server";
import DashboardClient from "@/components/DashboardClient";

export default async function Home() {
  const supabase = await createClient();

  // Use Promise.all for parallel fetching
  const [
    { count: totalUsers },
    { count: securityFlags },
    { data: activeSessionsData },
    { data: pendingPayoutsData },
    { data: alertData },
    { data: userGrowthData }
  ] = await Promise.all([
    // 1. Total Users
    supabase.from('profiles').select('*', { count: 'exact', head: true }),

    // 2. Security Flags (Pending Moderation Queue)
    supabase.from('moderation_queue').select('*', { count: 'exact', head: true }).eq('status', 'pending'),

    // 3. Active Sessions (Mock or Real)
    supabase.from('profiles').select('id').limit(1),

    // 4. Pending Payouts Sum or Count
    supabase.from('payouts').select('amount').eq('status', 'pending'),

    // 5. Recent Alerts
    supabase.from('admin_logs').select('*').order('created_at', { ascending: false }).limit(5),

    // 6. User Growth (Last 28 Days for both daily and weekly views)
    supabase.from('profiles')
      .select('created_at')
      .gte('created_at', new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: true })
  ]);

  // Calculate safely
  const usersCount = totalUsers || 0;
  const flagsCount = securityFlags || 0;

  // Calculate total pending amount
  const totalPendingAmount = pendingPayoutsData?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0;

  // Process User Growth Data - DAILY (last 7 days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i)); // Start from 6 days ago to today
    return d.toISOString().split('T')[0];
  });

  const userGrowthDaily = last7Days.map(date => ({
    label: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
    fullDate: date,
    count: (userGrowthData || []).filter((p: any) => p.created_at?.startsWith(date)).length
  }));

  // Process User Growth Data - WEEKLY (last 4 weeks)
  const last4Weeks = Array.from({ length: 4 }, (_, i) => {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - (i * 7));
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 6);
    return {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0],
      label: `Week ${4 - i}`
    };
  }).reverse();

  const userGrowthWeekly = last4Weeks.map(week => ({
    label: week.label,
    fullDate: `${week.start} to ${week.end}`,
    count: (userGrowthData || []).filter((p: any) => {
      const date = p.created_at?.split('T')[0];
      return date >= week.start && date <= week.end;
    }).length
  }));

  // Map alerts
  const recentAlerts = (alertData || []).map((log: any) => ({
    id: log.id,
    type: log.action?.replace('_', ' ') || 'Unknown',
    message: `Admin ${log.admin_id?.slice(0, 5) || 'N/A'}... performed ${log.action || 'action'} on ${log.target_type || 'item'}`,
    time: log.created_at ? new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'
  }));

  // Data for client component
  const dashboardData = {
    totalUsers: usersCount,
    activeSessions: 182, // Hardcoded for now
    pendingPayouts: totalPendingAmount,
    securityFlags: flagsCount,
    recentAlerts,
    userGrowthDaily,
    userGrowthWeekly,
    totalNewUsers: (userGrowthData || []).length
  };

  return <DashboardClient data={dashboardData} />;
}
