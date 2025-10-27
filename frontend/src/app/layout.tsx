import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CodeArena - Justice Through Code',
  description: 'Proctored coding challenge platform for Justice Through Code hackathon assessments',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
