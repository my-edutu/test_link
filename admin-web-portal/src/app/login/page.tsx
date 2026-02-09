"use client";

import { useState } from "react";
import { createFrontendClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Loader2, Mail, Lock, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import LoadingScreen from "@/components/auth/LoadingScreen";
import Image from "next/image";

export default function LoginPage() {
    const [showSplash, setShowSplash] = useState(true);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const supabase = createFrontendClient();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            router.push("/");
            router.refresh();
        } catch (err: any) {
            setError(err.message || "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-[#0D0200] min-h-screen font-sans text-white overflow-hidden relative selection:bg-[#FF8A00] selection:text-white">
            <AnimatePresence mode="wait">
                {showSplash ? (
                    <motion.div key="splash" exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
                        <LoadingScreen onFinish={() => setShowSplash(false)} />
                    </motion.div>
                ) : (
                    <motion.div
                        key="login"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="flex h-screen w-full items-center justify-center relative"
                    >
                        {/* Background Elements */}
                        <div className="absolute inset-0 bg-gradient-to-b from-[#1F0802] to-[#0D0200]" />
                        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-[#FF8A00] rounded-full opacity-[0.03] blur-[150px]" />

                        <div className="w-full max-w-md relative z-10 px-6">
                            <div className="glass-card border border-white/10 bg-white/5 p-8 md:p-10 rounded-3xl shadow-2xl backdrop-blur-xl">
                                <div className="text-center mb-8">
                                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FF8A00]/20 to-transparent border border-white/10 mb-4 shadow-lg">
                                        <Image src="/logo.png" alt="Logo" width={32} height={32} />
                                    </div>
                                    <h1 className="text-3xl font-bold tracking-tight">
                                        Admin<span className="text-[#FF8A00]">Portal</span>
                                    </h1>
                                    <p className="mt-2 text-sm text-white/50">
                                        Secure access to LinguaLink AI controls
                                    </p>
                                </div>

                                <form onSubmit={handleLogin} className="space-y-5">
                                    {error && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-200 text-center"
                                        >
                                            {error}
                                        </motion.div>
                                    )}

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-white/70 ml-1 uppercase tracking-wider">Email</label>
                                        <div className="relative group">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 group-focus-within:text-[#FF8A00] transition-colors" />
                                            <input
                                                type="email"
                                                required
                                                className="w-full h-12 bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 text-sm text-white focus:outline-none focus:border-[#FF8A00]/50 focus:bg-white/10 transition-all placeholder:text-white/20"
                                                placeholder="admin@lingualink.ai"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-white/70 ml-1 uppercase tracking-wider">Password</label>
                                        <div className="relative group">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 group-focus-within:text-[#FF8A00] transition-colors" />
                                            <input
                                                type="password"
                                                required
                                                className="w-full h-12 bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 text-sm text-white focus:outline-none focus:border-[#FF8A00]/50 focus:bg-white/10 transition-all placeholder:text-white/20"
                                                placeholder="••••••••"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full h-12 bg-gradient-to-r from-[#FF8A00] to-[#FF6A00] hover:to-[#FF8A00] rounded-xl text-sm font-bold text-white shadow-lg shadow-orange-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4"
                                    >
                                        {loading ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <>
                                                Sign In <ArrowRight className="h-4 w-4 opacity-70" />
                                            </>
                                        )}
                                    </button>
                                </form>
                            </div>

                            <p className="text-center text-xs text-white/30 mt-8">
                                Protected by LinguaLink Secure Guard
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
