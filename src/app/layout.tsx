import type { Metadata, Viewport } from 'next';
import './globals.css';
import { NafasProvider } from '@/lib/store';

export const metadata: Metadata = {
  title: 'نَفَس | NAFAS — خلّي العراق يتنفس (The Breath of Mesopotamia)',
  description: 'المنظومة التكنولوجية المجتمعية لحماية وتوثيق بيئة العراق، وتحويل الوعي البيئي إلى أثر ميداني موثق بسواعد أهل الرافدين.',
  keywords: ['العراق', 'بيئة', 'تشجير', 'تطوع', 'دجلة', 'الفرات', 'نَفَس', 'NAFAS', 'Mesopotamia', 'Iraq Environment'],
  authors: [{ name: 'NAFAS Initiative' }],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar-IQ" dir="rtl" className="scroll-smooth">
      <body className="min-h-screen flex flex-col bg-nafas-sand text-nafas-silt">
        <NafasProvider>
          {children}
        </NafasProvider>
      </body>
    </html>
  );
}
