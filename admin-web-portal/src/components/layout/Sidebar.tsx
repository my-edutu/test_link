"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { createFrontendClient } from "@/lib/supabase/client";
import {
    LayoutDashboard,
    Users,
    ShieldAlert,
    CreditCard,
    ChevronRight,
    LogOut,
    Briefcase
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/" },
    { icon: Users, label: "Users", href: "/users" },
    { icon: ShieldAlert, label: "Moderation", href: "/moderation" },
    { icon: Briefcase, label: "Ambassadors", href: "/ambassadors" },
    { icon: CreditCard, label: "Finance", href: "/finance" },
];

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createFrontendClient();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.refresh();
        router.push('/login');
    };

    return (
        <div className="flex h-full w-64 flex-col glass-card border-none rounded-none">
            <div className="flex h-20 items-center px-6 gap-3">
                <Image
                    src="/icon.png"
                    alt="LinguaLink Logo"
                    width={40}
                    height={40}
                    className="rounded-xl"
                />
                <span className="text-xl font-bold tracking-tight">LinguaLink <span className="text-[#FF8A00]">AI</span></span>
            </div>

            <nav className="flex-1 space-y-1 px-4 py-4">
                {menuItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "group relative flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200",
                                isActive
                                    ? "text-[#FF8A00] bg-[#FF8A00]/10 shadow-[0_0_20px_rgba(255,138,0,0.1)]"
                                    : "text-muted-foreground hover:text-foreground hover:bg-[var(--accent)]"
                            )}
                        >
                            <item.icon className={cn(
                                "h-5 w-5 transition-colors",
                                isActive ? "text-[#FF8A00]" : "group-hover:text-foreground"
                            )} />
                            {item.label}
                            {isActive && (
                                <motion.div
                                    layoutId="active-pill"
                                    className="absolute left-0 w-1 h-5 bg-[#FF8A00] rounded-r-full"
                                />
                            )}
                            {!isActive && (
                                <ChevronRight className="ml-auto h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                            )}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 mt-auto">
                <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-xl transition-all"
                >
                    <LogOut className="h-5 w-5" />
                    Logout
                </button>
            </div>
        </div>
    );
}
