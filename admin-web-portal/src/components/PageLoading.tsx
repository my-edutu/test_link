'use client';

import { motion } from 'framer-motion';

export default function PageLoading() {
    return (
        <div className="flex-1 flex items-center justify-center min-h-[400px]">
            <motion.div
                className="flex flex-col items-center gap-4"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
            >
                {/* Spinner */}
                <div className="relative">
                    <div className="h-12 w-12 rounded-full border-4 border-[var(--accent)]" />
                    <div className="absolute inset-0 h-12 w-12 rounded-full border-4 border-transparent border-t-[#FF8A00] animate-spin" />
                </div>
                <p className="text-sm text-muted-foreground font-medium">Loading...</p>
            </motion.div>
        </div>
    );
}
