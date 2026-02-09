import { createClient } from "./supabase/server";

export async function logAdminAction(
    action: string,
    targetId: string,
    targetType: string,
    details: any = {}
) {
    const supabase = await createClient();

    // Get current admin user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        console.error("Failed to log admin action: No authenticated user");
        return;
    }

    try {
        const { error } = await supabase
            .from('admin_logs')
            .insert({
                admin_id: user.id,
                action,
                target_id: targetId,
                target_type: targetType,
                details
            });

        if (error) {
            console.error("Error logging admin action:", error);
        }
    } catch (e) {
        console.error("Unexpected error logging admin action:", e);
    }
}
