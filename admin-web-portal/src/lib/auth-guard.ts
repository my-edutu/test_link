import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function checkAdmin() {
    const supabase = await createClient();

    // 1. Check if authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        throw new Error("Unauthorized: Not authenticated");
    }

    // 2. Check Role in 'profiles'
    const { data: profile, error: dbError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (dbError || !profile) {
        throw new Error("Unauthorized: Profile not found");
    }

    // 3. Verify 'admin' role (or 'super_admin')
    // Adjust 'admin' to match your actual role value
    const allowedRoles = ['admin', 'super_admin'];

    if (!allowedRoles.includes(profile.role || '')) {
        throw new Error("Forbidden: insufficient permissions");
    }

    return user;
}
