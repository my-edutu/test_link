"use client";

import { Bell, UserCircle, Sun, Moon } from "lucide-react";
import { useTheme } from "@/lib/theme";

export function Header() {
    const { resolvedTheme, setTheme } = useTheme();

    const toggleTheme = () => {
        setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
    };

    return (
        <header className="h-20 flex items-center justify-end px-8 glass-card border-none rounded-none border-b border-[var(--glass-border)]">

            {/* Right side - Actions */}
            <div className="flex items-center gap-3">
                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    className="h-11 w-11 flex items-center justify-center rounded-xl hover:bg-[var(--accent)] transition-colors"
                    title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
                >
                    {resolvedTheme === 'dark' ? (
                        <Sun className="h-5 w-5 text-amber-400" />
                    ) : (
                        <Moon className="h-5 w-5 text-slate-600" />
                    )}
                </button>

                {/* Notifications */}
                <button className="h-11 w-11 flex items-center justify-center rounded-xl hover:bg-[var(--accent)] transition-colors relative">
                    <Bell className="h-5 w-5 text-muted-foreground" />
                    <span className="absolute top-2 right-2 h-2.5 w-2.5 bg-[#FF8A00] rounded-full border-2 border-[var(--background)]" />
                </button>

                <div className="h-10 w-px bg-[var(--border)] mx-2" />

                {/* User Profile */}
                <div className="flex items-center gap-3 pl-2">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-semibold">Admin User</p>
                        <p className="text-xs text-muted-foreground">Platform Admin</p>
                    </div>
                    <div className="h-11 w-11 rounded-xl bg-[var(--accent)] flex items-center justify-center">
                        <UserCircle className="h-6 w-6 text-muted-foreground" />
                    </div>
                </div>
            </div>
        </header>
    );
}
