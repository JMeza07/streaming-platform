import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { DialogProvider } from '@/components/Dialog';
import { SettingsProvider } from '@/context/SettingsContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Plataforma de Gestión y Streaming',
  description: 'Gestión inteligente, distribución automatizada y soporte de cuentas de streaming.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body className={`${inter.className} min-h-screen bg-[#030712] text-gray-100 antialiased selection:bg-red-600 selection:text-white`}>
        <SettingsProvider>
          <DialogProvider>
            {children}
          </DialogProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
