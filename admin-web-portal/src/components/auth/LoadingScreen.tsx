"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import Image from "next/image";

export default function LoadingScreen({ onFinish }: { onFinish: () => void }) {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        // Simulate progress bar
        const timer = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 100) {
                    clearInterval(timer);
                    setTimeout(onFinish, 500); // Wait a bit before finishing
                    return 100;
                }
                return prev + 2; // Speed of loading
            });
        }, 30);

        return () => clearInterval(timer);
    }, [onFinish]);

    return (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#0D0200] overflow-hidden z-50">
            {/* Deep Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#1F0802] to-[#0D0200]" />

            {/* Ambient Glow Blobs */}
            <div className="absolute top-[-10%] left-[-20%] w-[500px] h-[500px] bg-[#FF8A00] rounded-full opacity-10 blur-[100px]" />
            <div className="absolute bottom-[-10%] right-[-20%] w-[600px] h-[600px] bg-[#FF8A00] rounded-full opacity-5 blur-[120px]" />

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center space-y-8">
                {/* Logo Animation */}
                <motion.div
                    initial={{ scale: 0.8, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="flex flex-col items-center gap-6"
                >
                    <div className="relative w-24 h-24 bg-white/5 rounded-3xl flex items-center justify-center border border-white/10 shadow-2xl backdrop-blur-sm overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-[#FF8A00]/20 to-transparent" />
                        {/* Assuming logo.png is available as per context, otherwise fallback to text/icon */}
                        <Image src="/logo.png" alt="Logo" width={64} height={64} className="object-contain opacity-90" priority />
                    </div>

                    <div className="text-center">
                        <motion.h1
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="text-4xl font-bold tracking-tight text-white"
                        >
                            Lingua<span className="text-[#FF8A00]">Link</span>
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.6 }}
                            className="text-white/50 text-sm font-medium tracking-widest uppercase mt-1"
                        >
                            AI Admin Portal
                        </motion.p>
                    </div>
                </motion.div>
            </div>

            {/* Footer / Progress Bar */}
            <div className="absolute bottom-16 w-64 space-y-3 z-10">
                <p className="text-center text-[10px] text-white/40 tracking-wider uppercase">Initializing Heritage Engine</p>
                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-gradient-to-r from-[#FF8A00] to-[#FFD700]"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>
        </div>
    );
}
