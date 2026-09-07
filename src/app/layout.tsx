import type { Metadata, Viewport } from 'next';
import './globals.css';

/**
 * Root shell. Dark theme only, English only (Constitution VI).
 */
export const metadata: Metadata = {
  title: 'Vault',
  description: 'Standard upload tool for Dropbox.',
};

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#08080b',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
