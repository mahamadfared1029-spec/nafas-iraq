import type { Metadata, Viewport } from 'next';
import './globals.css';
import { NafasProvider } from '@/lib/store';

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || (process.env.DEPLOY_TARGET === 'gh-pages' ? '/nafas-iraq' : '');

export const metadata: Metadata = {
  metadataBase: new URL('https://mahamadfared1029-spec.github.io/nafas-iraq/'),
  title: 'نَفَس | NAFAS — للبيئة الاجتماعية (خلّي العراق يتنفس)',
  description: 'المنظومة التكنولوجية المجتمعية لحماية وتوثيق بيئة العراق، وتحويل الوعي البيئي إلى أثر ميداني موثق بسواعد أهل الرافدين.',
  keywords: ['العراق', 'بيئة', 'تشجير', 'تطوع', 'دجلة', 'الفرات', 'نَفَس', 'NAFAS', 'Mesopotamia', 'Iraq Environment', 'للبيئة الاجتماعية'],
  authors: [{ name: 'NAFAS Initiative' }],
  icons: {
    icon: `${BASE_PATH}/icon.svg`,
    apple: `${BASE_PATH}/icon.svg`,
    shortcut: `${BASE_PATH}/icon.svg`,
  },
  openGraph: {
    title: 'نَفَس | NAFAS — للبيئة الاجتماعية',
    description: 'المنظومة التكنولوجية المجتمعية الميدانية لتوثيق وحماية بيئة العراق.',
    images: [
      {
        url: `${BASE_PATH}/nafas-logo.svg`,
        width: 120,
        height: 120,
        alt: 'شعار نَفَس الرسمي — للبيئة الاجتماعية',
      },
    ],
  },
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
      <body className="min-h-screen flex flex-col bg-nafas-cream/40 text-nafas-ink">
        <NafasProvider>
          {children}
        </NafasProvider>
      </body>
    </html>
  );
}
