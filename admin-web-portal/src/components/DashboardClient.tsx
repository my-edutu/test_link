"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
    Users,
    ArrowUpRight,
    ArrowDownRight,
    Activity,
    DollarSign,
    ShieldCheck,
    Calendar,
    CalendarDays
} from "lucide-react";
import { cn } from "@/lib/utils";

interface GrowthData {
    label: string;
    fullDate: string;
    count: number;
}

interface DashboardData {
    totalUsers: number;
    activeSessions: number | string;
    pendingPayouts: number | string;
    securityFlags: number;
    recentAlerts: {
        id: string;
        type: string;
        message: string;
        time: string;
    }[];
    userGrowthDaily: GrowthData[];
    userGrowthWeekly: GrowthData[];
    totalNewUsers: number;
}

interface DashboardClientProps {
    data: DashboardData;
}

export default function DashboardClient({ data }: DashboardClientProps) {
    const [viewMode, setViewMode] = useState<'days' | 'weeks'>('days');

    const stats = [
        {
            label: "Total Users",
            value: data.totalUsers.toLocaleString(),
            change: "+12.5%",
            trend: "up",
            icon: Users,
            color: "bg-blue-500"
        },
        {
            label: "Active Sessions",
            value: data.activeSessions.toString(),
            change: "+3.2%",
            trend: "up",
            icon: Activity,
            color: "bg-emerald-500"
        },
        {
            label: "Pending Payouts",
            value: typeof data.pendingPayouts === 'number' ? `₦${data.pendingPayouts.toLocaleString()}` : data.pendingPayouts,
            change: "-5.0%",
            trend: "down",
            icon: DollarSign,
            color: "bg-amber-500"
        },
        {
            label: "Security Flags",
            value: data.securityFlags.toString(),
            change: "0%",
            trend: "neutral",
            icon: ShieldCheck,
            color: "bg-rose-500"
        },
    ];

    // Get current data based on view mode
    const currentGrowthData = viewMode === 'days' ? data.userGrowthDaily : data.userGrowthWeekly;
    const maxCount = Math.max(...currentGrowthData.map(d => d.count), 1);
    const totalInView = currentGrowthData.reduce((sum, d) => sum + d.count, 0);

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-3xl font-bold tracking-tight">Platform Overview</h1>
                <p className="text-muted-foreground mt-1">Welcome back, Admin. Here&apos;s what&apos;s happening across LinguaLink today.</p>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, index) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="glass-card p-6 rounded-2xl relative overflow-hidden group hover:scale-[1.02] transition-transform cursor-pointer"
                    >
                        <div className="flex justify-between items-start">
                            <div className={cn("p-2 rounded-xl text-white shadow-lg", stat.color)}>
                                <stat.icon className="h-5 w-5" />
                            </div>
                            <div className={cn(
                                "flex items-center text-xs font-medium px-2 py-1 rounded-full",
                                stat.trend === "up" ? "bg-emerald-500/10 text-emerald-500" :
                                    stat.trend === "down" ? "bg-rose-500/10 text-rose-500" :
                                        "bg-muted text-muted-foreground"
                            )}>
                                {stat.change}
                                {stat.trend === "up" && <ArrowUpRight className="ml-1 h-3 w-3" />}
                                {stat.trend === "down" && <ArrowDownRight className="ml-1 h-3 w-3" />}
                            </div>
                        </div>

                        <div className="mt-4">
                            <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
                            <h3 className="text-2xl font-bold mt-1 tracking-tight">{stat.value}</h3>
                        </div>

                        <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <stat.icon className="h-24 w-24" />
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* User Acquisition Chart */}
                <div className="lg:col-span-2 glass-card rounded-2xl p-8 min-h-[400px] flex flex-col">
                    <div className="mb-6 flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <Activity className="h-5 w-5 text-[#FF8A00]" />
                                User Acquisition
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                {viewMode === 'days' ? 'New signups over the last 7 days' : 'New signups over the last 4 weeks'}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Total Badge */}
                            <span className="px-3 py-1 rounded-lg bg-[#FF8A00]/10 text-[#FF8A00] text-xs font-medium">
                                {totalInView} new users
                            </span>
                            {/* View Toggle */}
                            <div className="flex rounded-lg border border-[var(--border)] overflow-hidden">
                                <button
                                    onClick={() => setViewMode('days')}
                                    className={cn(
                                        "px-3 py-1.5 text-xs font-medium flex items-center gap-1 transition-colors",
                                        viewMode === 'days'
                                            ? "bg-[#FF8A00] text-white"
                                            : "hover:bg-[var(--accent)] text-muted-foreground"
                                    )}
                                >
                                    <CalendarDays className="h-3 w-3" />
                                    Days
                                </button>
                                <button
                                    onClick={() => setViewMode('weeks')}
                                    className={cn(
                                        "px-3 py-1.5 text-xs font-medium flex items-center gap-1 transition-colors",
                                        viewMode === 'weeks'
                                            ? "bg-[#FF8A00] text-white"
                                            : "hover:bg-[var(--accent)] text-muted-foreground"
                                    )}
                                >
                                    <Calendar className="h-3 w-3" />
                                    Weeks
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Bar Chart */}
                    <div className="flex-1 flex items-end justify-between gap-3 pt-8 min-h-[250px]">
                        {currentGrowthData.map((item, index) => (
                            <motion.div
                                key={item.label}
                                initial={{ scaleY: 0 }}
                                animate={{ scaleY: 1 }}
                                transition={{ delay: index * 0.1, duration: 0.4 }}
                                style={{ transformOrigin: 'bottom' }}
                                className="flex-1 flex flex-col items-center"
                            >
                                <div
                                    className="w-full bg-[#FF8A00] rounded-t-lg relative group cursor-pointer transition-all hover:bg-[#FF6A00]"
                                    style={{
                                        height: `${Math.max((item.count / maxCount) * 200, 24)}px`,
                                        minHeight: '24px'
                                    }}
                                >
                                    {/* Count Label on Bar */}
                                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-foreground">
                                        {item.count}
                                    </span>
                                    {/* Tooltip */}
                                    <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-[var(--card)] border border-[var(--border)] shadow-lg text-foreground text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                        {item.fullDate}
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground mt-3 font-medium">{item.label}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Recent Alerts */}
                <div className="glass-card rounded-2xl p-6 min-h-[400px]">
                    <h3 className="font-bold flex items-center gap-2 mb-6">
                        <span className="h-2 w-2 rounded-full bg-[#FF8A00] animate-pulse" />
                        Recent Alerts
                    </h3>
                    <div className="space-y-4">
                        {data.recentAlerts.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No recent alerts.</p>
                        ) : data.recentAlerts.map((alert) => (
                            <div key={alert.id} className="flex gap-3 p-3 rounded-xl hover:bg-[var(--accent)]/50 transition-colors cursor-pointer group">
                                <div className="h-10 w-10 rounded-lg bg-[var(--accent)] flex items-center justify-center shrink-0">
                                    <ShieldCheck className="h-5 w-5 text-muted-foreground group-hover:text-[#FF8A00] transition-colors" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-semibold uppercase opacity-70">{alert.type}</p>
                                    <p className="text-xs text-muted-foreground">{alert.message}</p>
                                    <p className="text-[10px] text-[#FF8A00] font-medium">{alert.time}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
