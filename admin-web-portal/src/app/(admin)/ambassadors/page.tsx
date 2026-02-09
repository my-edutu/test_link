import { createClient } from "@/lib/supabase/server";
import { Users } from "lucide-react";

export default async function AmbassadorsPage() {
    const supabase = await createClient();

    // Fetch users with role 'ambassador'
    const { data: ambassadors, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'ambassador');

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-3xl font-bold tracking-tight">Ambassadors</h1>
                <p className="text-muted-foreground mt-1">Manage brand ambassadors and their performance.</p>
            </header>

            {/* Placeholder Content similar to Users but filtered */}
            <div className="glass-card p-10 flex flex-col items-center justify-center text-center space-y-4 min-h-[400px]">
                <div className="h-16 w-16 rounded-full bg-brand-primary/10 flex items-center justify-center">
                    <Users className="h-8 w-8 text-brand-primary" />
                </div>
                <h3 className="text-xl font-semibold">Ambassador Management</h3>
                <p className="text-muted-foreground max-w-md">
                    Filter users by 'Ambassador' role to see this list.
                    {(ambassadors?.length || 0) === 0 ? " No ambassadors found yet." : ` Found ${ambassadors?.length} ambassadors.`}
                </p>
            </div>
        </div>
    );
}
