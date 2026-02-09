'use server'

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { logAdminAction } from "@/lib/audit";
import { sendPushNotification } from "./notifications";

export async function approvePayout(payoutId: string) {
    const supabase = await createClient();

    try {
        // 1. Fetch payout details
        const { data: payout, error: fetchError } = await supabase
            .from('payouts')
            .select('*, profiles(id, full_name, email)')
            .eq('id', payoutId)
            .single();

        if (fetchError || !payout) throw new Error("Payout not found");

        if (payout.status !== 'pending') throw new Error("Payout is not pending");

        // 2. Trigger Paystack Transfer (Simulation)
        // In a real scenario, you would call:
        // const transfer = await paystack.transfer.initiate({ ... });
        // if (!transfer.status) throw new Error("Transfer failed");

        console.log(`[Mock] Initiating Paystack transfer of ${payout.amount} to user ${payout.user_id}`);
        // await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay

        // 3. Update Database
        const { error: updateError } = await supabase
            .from('payouts')
            .update({
                status: 'paid',
                provider_ref: `mock_ref_${Date.now()}` // Store the Paystack reference here
            })
            .eq('id', payoutId);

        if (updateError) throw updateError;

        // 4. Audit Log
        await logAdminAction('approve_payout', payoutId, 'payout', {
            amount: payout.amount,
            user_id: payout.user_id
        });

        // 5. Notify User
        // Use user_id as token placeholder for now
        await sendPushNotification(
            payout.user_id,
            "Payout Approved",
            `Your withdrawal of $${payout.amount} has been processed.`
        );

        revalidatePath('/finance');
        return { success: true, message: 'Payout approved and user notified.' };

    } catch (error: any) {
        console.error('Error approving payout:', error);
        return { success: false, message: error.message };
    }
}
