import PostHog from 'posthog-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const apiKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
const host = process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com';

if (!apiKey) {
    console.warn('[PostHog] No API key found. Analytics will be disabled.');
}

export const posthog = new PostHog(apiKey || 'disabled', {
    host: host,

});

export default posthog;
