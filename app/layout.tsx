import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';

export const metadata: Metadata = {
  title: 'TalentBench — Hire with evidence, not guesswork',
  description:
    'The recruiter platform that runs candidates through a configurable pipeline and gives every applicant a personalized performance report.',
  openGraph: {
    title: 'TalentBench',
    description: 'Hire with evidence, not guesswork.',
    images: [{ url: '/og.png' }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
