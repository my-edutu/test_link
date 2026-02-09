import { createClient } from "@/lib/supabase/server";
import { DollarSign, ArrowUpRight, ArrowDownRight, Settings } from "lucide-react";
import { approvePayout } from "@/app/actions/finance";
import RewardSettings from "@/components/finance/RewardSettings";

export default async function FinancePage() {
    const supabase = await createClient();

    // Fetch pending payouts with profile join
    const { data: payouts } = await supabase
        .from('payouts')
        .select('*, profiles(full_name, email)')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

    // Fetch total approved payouts
    const { data: approvedPayouts } = await supabase
        .from('payouts')
        .select('amount')
        .eq('status', 'approved');

    // Fetch current validation reward
    const { data: rewardConfig } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'validation_reward')
        .single();

    const totalApprovedAmount = approvedPayouts?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0;
    const totalPendingAmount = payouts?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0;
    const currentReward = rewardConfig?.value || 50;

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-3xl font-bold tracking-tight">Financial Dashboard</h1>
                <p className="text-muted-foreground mt-1">Manage payouts, rewards, and track financial transactions.</p>
            </header>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="glass-card p-6 rounded-2xl">
                    <div className="flex justify-between items-start">
                        <div className="p-2 rounded-xl text-white shadow-lg bg-amber-500">
                            <DollarSign className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="mt-4">
                        <p className="text-sm text-muted-foreground font-medium">Total Approved Payouts</p>
                        <h3 className="text-2xl font-bold mt-1 tracking-tight">₦{totalApprovedAmount.toLocaleString()}</h3>
                    </div>
                </div>
                <div className="glass-card p-6 rounded-2xl">
                    <div className="flex justify-between items-start">
                        <div className="p-2 rounded-xl text-white shadow-lg bg-orange-500">
                            <ArrowUpRight className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="mt-4">
                        <p className="text-sm text-muted-foreground font-medium">Pending Withdrawal Requests</p>
                        <h3 className="text-2xl font-bold mt-1 tracking-tight">₦{totalPendingAmount.toLocaleString()}</h3>
                    </div>
                </div>
                <div className="glass-card p-6 rounded-2xl">
                    <div className="flex justify-between items-start">
                        <div className="p-2 rounded-xl text-white shadow-lg bg-emerald-500">
                            <ArrowDownRight className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="mt-4">
                        <p className="text-sm text-muted-foreground font-medium">Pending Requests Count</p>
                        <h3 className="text-2xl font-bold mt-1 tracking-tight">{payouts?.length || 0} Users</h3>
                    </div>
                </div>
                <div className="glass-card p-6 rounded-2xl">
                    <div className="flex justify-between items-start">
                        <div className="p-2 rounded-xl text-white shadow-lg bg-purple-500">
                            <Settings className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="mt-4">
                        <p className="text-sm text-muted-foreground font-medium">Current Validation Reward</p>
                        <h3 className="text-2xl font-bold mt-1 tracking-tight">₦{Number(currentReward).toLocaleString()}</h3>
                    </div>
                </div>
            </div>

            {/* Reward Settings */}
            <RewardSettings initialReward={currentReward.toString()} />

            {/* Pending Payouts Table */}
            <div className="glass-card p-6 rounded-2xl">
                <h2 className="text-xl font-semibold mb-6">Pending Payout Requests</h2>
                {(!payouts || payouts.length === 0) ? (
                    <p className="text-muted-foreground text-center py-10">No pending payout requests.</p>
                ) : (
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-[var(--border)]">
                                <th className="py-3 text-sm font-medium text-muted-foreground">User</th>
                                <th className="py-3 text-sm font-medium text-muted-foreground">Amount (NGN)</th>
                                <th className="py-3 text-sm font-medium text-muted-foreground">Request Date</th>
                                <th className="py-3 text-sm font-medium text-muted-foreground text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payouts.map((p: any) => (
                                <tr key={p.id} className="border-b border-[var(--border)]/50 hover:bg-[var(--accent)]/30 transition-colors">
                                    <td className="py-4">
                                        <div className="font-medium">{p.profiles?.full_name || 'Unknown User'}</div>
                                        <div className="text-xs text-muted-foreground">{p.profiles?.email || 'No Email'}</div>
                                    </td>
                                    <td className="py-4 font-semibold text-[#FF8A00]">₦{Number(p.amount).toLocaleString()}</td>
                                    <td className="py-4 text-sm">{new Date(p.created_at).toLocaleDateString()}</td>
                                    <td className="py-4 text-right">
                                        <form action={async (formData) => {
                                            "use server";
                                            const id = formData.get('payoutId') as string;
                                            await approvePayout(id);
                                        }}>
                                            <input type="hidden" name="payoutId" value={p.id} />
                                            <button className="bg-[#FF8A00] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#FF6A00] transition-colors">
                                                Approve
                                            </button>
                                        </form>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
