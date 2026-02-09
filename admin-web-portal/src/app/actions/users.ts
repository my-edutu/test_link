'use server'

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { logAdminAction } from "@/lib/audit";
import { checkAdmin } from "@/lib/auth-guard";

export async function warnUser(userId: string, reason: string) {
  // Warning doesn't change state in 'profiles' (unless we add a warnings count column), 
  // but it generates an audit log and could trigger a notification.
  try {
    await checkAdmin();
    await logAdminAction('warn_user', userId, 'user', { reason });

    // TODO: Send notification to user here (e.g. via Firebase)

    revalidatePath('/users');
    return { success: true, message: 'User warned successfully (Logged)' };
  } catch (error) {
    console.error('Error warning user:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function banUser(userId: string, reason: string) {
  const supabase = await createClient();

  try {
    await checkAdmin();
    const { error } = await supabase
      .from('profiles')
      .update({ is_banned: true, ban_reason: reason })
      .eq('id', userId);

    if (error) throw error;

    await logAdminAction('ban_user', userId, 'user', { reason });

    revalidatePath('/users');
    return { success: true, message: 'User banned successfully' };
  } catch (error) {
    console.error('Error banning user:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function updateUserRole(userId: string, newRole: string) {
  const supabase = await createClient();

  try {
    await checkAdmin();
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);

    if (error) throw error;

    await logAdminAction('update_role', userId, 'user', { new_role: newRole });

    revalidatePath('/users');
    return { success: true, message: 'User role updated successfully' };
  } catch (error) {
    console.error('Error updating role:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}
