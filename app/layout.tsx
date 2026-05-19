import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MLB Hit Tracker',
  description: 'Top 3 MLB hitters by team using hits over each player\'s last 10 games played.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
