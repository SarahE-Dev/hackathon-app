import type { Metadata } from 'next';
import { Orbitron, Inter } from 'next/font/google';
import './globals.css';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { ToastContainer } from '@/components/notifications/ToastContainer';

const orbitron = Orbitron({ 
  subsets: ['latin'],
  variable: '--font-orbitron',
  display: 'swap',
});

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

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
    <html lang="en" className={`${orbitron.variable} ${inter.variable}`}>
      <body className="font-sans">
        <NotificationProvider>
          {children}
          <ToastContainer />
        </NotificationProvider>
      </body>
    </html>
  );
}
