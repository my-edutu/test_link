import admin from 'firebase-admin';

// Check if Firebase is already initialized
if (!admin.apps.length) {
    try {
        // In production, use environment variables for service account
        // For local dev, you might point to a file, but env vars are safer for Next.js deployments
        const serviceAccount = {
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'), // Handle newlines in env var
        };

        if (serviceAccount.projectId) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
            console.log('Firebase Admin initialized successfully');
        } else {
            console.warn('Firebase credentials not found in environment variables.');
        }
    } catch (error) {
        console.error('Firebase Admin initialization error:', error);
    }
}

export const firebaseAdmin = admin;
export const messaging = admin.apps.length ? admin.messaging() : null;
