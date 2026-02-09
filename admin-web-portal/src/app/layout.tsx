import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { PHProvider } from "./providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "LinguaLink | Admin Portal",
  description: "Advanced Platform Management for LinguaLink AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const theme = localStorage.getItem('admin-theme') || 'dark';
                if (theme === 'system') {
                  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  document.documentElement.classList.add(systemDark ? 'dark' : 'light');
                } else {
                  document.documentElement.classList.add(theme);
                }
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased text-foreground bg-background`}>
        <PHProvider>
          {children}
        </PHProvider>
      </body>
    </html>
  );
}
