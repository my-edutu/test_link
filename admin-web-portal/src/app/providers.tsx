'use client'

import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'
import { useEffect } from 'react'
import { initPostHog } from '@/lib/posthog'
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from '@/lib/theme';

export function PostHogPageview() {
    useEffect(() => {
        initPostHog();
    }, [])

    return null
}

export function PHProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        initPostHog();
    }, [])

    return (
        <PostHogProvider client={posthog}>
            <ThemeProvider>
                {children}
                <Toaster position="bottom-right" toastOptions={{
                    style: {
                        background: '#333',
                        color: '#fff',
                    }
                }} />
            </ThemeProvider>
        </PostHogProvider>
    )
}
