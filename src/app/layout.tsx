import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import ThemeRegistry from '@/components/providers/ThemeRegistry';
import { AuthProvider } from '@/context/AuthContext';
import AppShell from '@/components/layout/AppShell';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'FinAgent AI — Smart Financial Document Processing',
  description:
    'AI-powered conversational agent for financial document processing, SEC 10-K extraction, balance sheet analysis, and compliance audit.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-white text-slate-900">
        <ThemeRegistry>
          <AuthProvider>
            <AppShell>{children}</AppShell>
          </AuthProvider>
        </ThemeRegistry>
      </body>
    </html>
  );
}
