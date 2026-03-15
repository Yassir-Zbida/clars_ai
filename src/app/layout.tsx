import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'clars.ai — CRM Intelligent',
  description: 'CRM pour Freelancers & Solopreneurs',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
