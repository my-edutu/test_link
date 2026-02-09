"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
    Search,
    MoreHorizontal,
    ShieldAlert,
    ShieldCheck,
    Mail,
    Calendar,
    Filter,
    Ban
} from "lucide-react";
import { cn } from "@/lib/utils";
import { banUser, warnUser } from "@/app/actions/users";
import toast from "react-hot-toast"; // Assuming react-hot-toast is installed or available, otherwise use alert or basic toast logic

// Define User type based on Supabase 'profiles' schema
export interface AdminUser {
    id: string;
    email: string; // 'profiles' has email
    full_name?: string; // 'profiles' uses full_name
    role?: string; // newly added
    is_banned?: boolean; // 'profiles' uses is_banned
    ban_reason?: string;
    created_at?: string;
    // ... any other fields
}

interface UsersClientProps {
    initialUsers: AdminUser[];
}

export default function UsersClient({ initialUsers }: UsersClientProps) {
    const [search, setSearch] = useState("");
    const [users, setUsers] = useState(initialUsers);

    // Normalize user data for display if needed
    const displayedUsers = users.map(u => ({
        id: u.id,
        name: u.full_name || u.email?.split('@')[0] || "Unknown",
        email: u.email || "No Email",
        role: u.role || "User",
        status: u.is_banned ? "Banned" : "Active", // Derive status from is_banned
        joined: u.created_at ? new Date(u.created_at).toLocaleDateString() : "Unknown"
    }));

    const filteredUsers = displayedUsers.filter(u =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
    );

    const handleWarn = async (userId: string) => {
        if (!confirm("Are you sure you want to warn this user?")) return;

        try {
            const result = await warnUser(userId, "Admin manual warning");
            if (result.success) {
                // Track event
                if (typeof window !== 'undefined' && (window as any).posthog) {
                    (window as any).posthog.capture('admin_user_warned', { admin_id: 'current_admin', target_user_id: userId });
                }
                setUsers(users.map(u => u.id === userId ? { ...u, status: "Warned" } : u));
                toast.success("User warned successfully");
            } else {
                toast.error("Failed to warn user: " + result.message);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleBan = async (userId: string) => {
        if (!confirm("Are you sure you want to BAN this user?")) return;

        try {
            const result = await banUser(userId, "Admin manual ban");
            if (result.success) {
                // Track event
                if (typeof window !== 'undefined' && (window as any).posthog) {
                    (window as any).posthog.capture('admin_user_banned', { admin_id: 'current_admin', target_user_id: userId });
                }
                setUsers(users.map(u => u.id === userId ? { ...u, is_banned: true } : u));
                toast.success("User banned successfully");
            } else {
                toast.error("Failed to ban user: " + result.message);
            }
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="space-y-8">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Users</h1>
                    <p className="text-muted-foreground mt-1">Manage platform users, roles, and accounts.</p>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-accent rounded-xl text-sm font-medium hover:bg-accent/80 transition-colors">
                        <Filter className="h-4 w-4" />
                        Filters
                    </button>
                </div>
            </header>

            {/* Search and Filters Bar */}
            <div className="flex gap-4 items-center">
                <div className="relative flex-1 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-brand-primary transition-colors" />
                    <input
                        type="text"
                        placeholder="Search by name, email or ID..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full h-11 bg-[var(--input)] rounded-xl pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF8A00] border border-[var(--border)] transition-all"
                    />
                </div>
            </div>

            {/* Users Table */}
            <div className="glass-card rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-[var(--glass-border)] bg-accent/20">
                                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">User</th>
                                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Role</th>
                                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Joined</th>
                                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--glass-border)]">
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                                        No users found.
                                    </td>
                                </tr>
                            ) : filteredUsers.map((user, index) => (
                                <motion.tr
                                    key={user.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="hover:bg-accent/30 transition-colors group cursor-pointer"
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center font-bold text-brand-primary">
                                                {user.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-sm">{user.name}</p>
                                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <Mail className="h-3 w-3" />
                                                    {user.email}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={cn(
                                            "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide",
                                            user.role === "Ambassador" ? "bg-brand-primary/10 text-brand-primary" : "bg-muted text-muted-foreground"
                                        )}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={cn(
                                            "inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium",
                                            user.status === "Active" ? "bg-emerald-500/10 text-emerald-500" :
                                                user.status === "Warned" ? "bg-amber-500/10 text-amber-500" :
                                                    user.status === "Banned" ? "bg-rose-500/10 text-rose-500" :
                                                        "bg-gray-500/10 text-gray-500"
                                        )}>
                                            <div className={cn(
                                                "h-1.5 w-1.5 rounded-full",
                                                user.status === "Active" ? "bg-emerald-500" :
                                                    user.status === "Warned" ? "bg-amber-500" :
                                                        user.status === "Banned" ? "bg-rose-500" :
                                                            "bg-gray-500"
                                            )} />
                                            {user.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                                            <Calendar className="h-3.5 w-3.5" />
                                            {user.joined}
                                        </p>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => handleWarn(user.id)}
                                                className="p-2 hover:bg-amber-500/10 hover:text-amber-500 rounded-lg text-muted-foreground transition-colors"
                                                title="Warn User"
                                            >
                                                <ShieldAlert className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleBan(user.id)}
                                                className="p-2 hover:bg-rose-500/10 hover:text-rose-500 rounded-lg text-muted-foreground transition-colors"
                                                title="Ban User"
                                            >
                                                <Ban className="h-4 w-4" />
                                            </button>
                                            <button className="p-2 hover:bg-accent rounded-lg text-muted-foreground transition-colors" title="Settings">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
