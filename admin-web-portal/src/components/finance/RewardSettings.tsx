'use client';

import { useState } from 'react';
import { createFrontendClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { Save, Settings } from 'lucide-react';

interface RewardSettingsProps {
    initialReward: string;
}

export default function RewardSettings({ initialReward }: RewardSettingsProps) {
    const [rewardAmount, setRewardAmount] = useState<string>(initialReward);
    const [loading, setLoading] = useState(false);
    const supabase = createFrontendClient();

    const handleSave = async () => {
        setLoading(true);
        try {
            const { error } = await supabase
                .from('app_config')
                .upsert({
                    key: 'validation_reward',
                    value: parseInt(rewardAmount),
                    description: 'Amount in Naira awarded for a successful validation'
                });

            if (error) throw error;
            toast.success('Validation reward updated successfully!');
        } catch (error) {
            console.error('Error updating reward:', error);
            toast.error('Failed to update validation reward');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="glass-card p-6 rounded-2xl">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-xl bg-purple-500 text-white">
                    <Settings className="h-5 w-5" />
                </div>
                <div>
                    <h2 className="text-lg font-semibold">Reward Configuration</h2>
                    <p className="text-sm text-muted-foreground">Set the amount paid to users for each successful validation</p>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
                <div className="flex-1 max-w-xs">
                    <label htmlFor="reward" className="block text-sm font-medium mb-2">
                        Validation Reward Amount (₦)
                    </label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₦</span>
                        <input
                            id="reward"
                            type="number"
                            min="0"
                            value={rewardAmount}
                            onChange={(e) => setRewardAmount(e.target.value)}
                            className="w-full h-12 rounded-xl border border-[var(--border)] bg-[var(--input)] pl-8 pr-4 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF8A00] focus:border-transparent transition-all"
                            placeholder="50"
                        />
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-[#FF8A00] text-white hover:bg-[#FF6A00] h-12 px-6"
                >
                    <Save className="h-4 w-4" />
                    {loading ? 'Saving...' : 'Update Reward'}
                </button>
            </div>

            <p className="text-xs text-muted-foreground mt-4">
                This amount is automatically credited to user wallets when they complete a validation task.
            </p>
        </div>
    );
}
