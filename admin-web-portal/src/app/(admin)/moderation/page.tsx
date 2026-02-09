import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export default async function ModerationPage() {
    const supabase = await createClient();

    // Fetch pending moderation items
    const { data: queue } = await supabase
        .from('moderation_queue')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

    async function handleModeration(formData: FormData) {
        'use server'
        const id = formData.get('id') as string;
        const action = formData.get('action') as string;

        const supabase = await createClient();

        // If delete, we might also delete the content referenced by content_id
        // For now, we update the queue status

        const status = action === 'keep' ? 'reviewed' : 'dismissed'; // Simplified login

        await supabase
            .from('moderation_queue')
            .update({ status: status })
            .eq('id', id);

        revalidatePath('/moderation');
    }

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-3xl font-bold tracking-tight">Content Moderation</h1>
                <p className="text-muted-foreground mt-1">Review and manage flagged content.</p>
            </header>
            <div className="grid gap-4">
                {(!queue || queue.length === 0) ? (
                    <div className="glass-card p-10 flex flex-col items-center justify-center text-center text-muted-foreground">
                        Queue is empty. No content requires moderation.
                    </div>
                ) : (
                    queue.map((item: any) => (
                        <div key={item.id} className="glass-card p-4 rounded-xl flex items-center justify-between">
                            <div>
                                <div className="text-sm font-bold uppercase text-brand-secondary">{item.content_type}</div>
                                <div className="text-sm mt-1">Reason: <span className="text-muted-foreground">{item.reason || 'Flagged manually'}</span></div>
                                <div className="text-xs text-muted-foreground mt-2">ID: {item.content_id}</div>
                            </div>
                            <form action={handleModeration} className="flex gap-2">
                                <input type="hidden" name="id" value={item.id} />
                                <button name="action" value="keep" className="px-4 py-2 bg-emerald-500/10 text-emerald-500 rounded-lg text-sm hover:bg-emerald-500/20">
                                    Keep
                                </button>
                                <button name="action" value="delete" className="px-4 py-2 bg-rose-500/10 text-rose-500 rounded-lg text-sm hover:bg-rose-500/20">
                                    Remove
                                </button>
                            </form>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
