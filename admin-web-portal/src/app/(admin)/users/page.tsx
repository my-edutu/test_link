import { createClient } from "@/lib/supabase/server";
import UsersClient, { AdminUser } from "@/components/UsersClient";

export default async function UsersPage() {
    const supabase = await createClient();

    let users: AdminUser[] = [];

    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, email, full_name, role, is_banned, ban_reason, created_at')
            .order('created_at', { ascending: false })
            .limit(50);

        if (!error && data) {
            users = data as unknown as AdminUser[];
        } else {
            console.error("Error fetching users:", error);
        }
    } catch (e) {
        console.error("Unexpected error fetching users:", e);
    }

    // fallback mock data if users is empty (for demo purposes if table is missing)
    // REMOVE THIS for production
    if (users.length === 0) {
        // Optional: We can leave it empty to show "No users found"
    }

    return <UsersClient initialUsers={users} />;
}

