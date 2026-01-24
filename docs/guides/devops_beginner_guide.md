# Beginner's Guide: Understanding the LinguaLink Hybrid Backend

Welcome, Guardian! This guide explains how our technology works in simple terms, so you can help build the future of cultural heritage.

## 1. What is a "Hybrid Backend"?
Imagine a library.
*   **Supabase** is the librarian. It handles the keys (login), the shelves (storage), and knows when someone walks in (realtime).
*   **NestJS** is the archives manager. It does the heavy thinking, like calculating rewards, checking for bad content, and making sure the digital money (balance) is safe.

They both talk to the same **Digital Vault** (our Postgres Database).

## 2. How We Build It
We use a method called **"Vibe Coding"** with Antigravity. You don't need to write every line of code. Instead, you guide Antigravity through these steps:

1.  **Preparation**: Make sure you have your Supabase URL and Keys ready.
2.  **The Bridge**: Antigravity connects NestJS to Supabase so they can "talk."
3.  **The Logic**: We tell Antigravity the rules (e.g., "Pay 5 coins for a validated recording").
4.  **Testing**: We ask Antigravity to check if the rules work correctly.

## 3. Deployment (Going Live)
When we are ready, we "ship" the code to the cloud.
*   The **App** goes to the App Store/Play Store (via Expo).
*   The **Backend (NestJS)** goes to a server (like AWS or Railway).
*   **Supabase** stays where it is, acting as the foundation.

## 4. Safety First
*   **Never** share your `.env` file. This contains the "Master Keys" to your vault.
*   **Always** ask Antigravity to review code for "Security Flaws" before finishing a task.
*   **Functionality over Speed**: It's better to take an extra 5 minutes to make sure a feature works perfectly than to rush and cause a bug.

## 5. Need Help?
Check the `docs/guides/` folder for specific instructions on features like Payments, Live Streaming, or Offline Mode. Happy building!
