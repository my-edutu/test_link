import posthog from 'posthog-js';

export const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
export const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com';

export function initPostHog() {
    if (typeof window !== 'undefined' && POSTHOG_KEY) {
        posthog.init(POSTHOG_KEY, {
            api_host: POSTHOG_HOST,
            person_profiles: 'identified_only',
            capture_pageview: false, // We'll manually capture or use a PageView component for Next.js
        });
    }
}

export default posthog;
