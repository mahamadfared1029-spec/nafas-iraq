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
    icon: [
      { url: `${BASE_PATH}/favicon.png`, type: 'image/png' },
      { url: `${BASE_PATH}/brand/nafas-logo.png`, type: 'image/png' }
    ],
    apple: `${BASE_PATH}/apple-touch-icon.png`,
    shortcut: `${BASE_PATH}/favicon.ico`,
  },
  openGraph: {
    title: 'نَفَس | NAFAS — للبيئة الاجتماعية',
    description: 'المنظومة التكنولوجية المجتمعية الميدانية لتوثيق وحماية بيئة العراق.',
    images: [
      {
        url: 'https://mahamadfared1029-spec.github.io/nafas-iraq/brand/nafas-official-logo.png',
        width: 1024,
        height: 1008,
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

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'NGO',
      '@id': 'https://mahamadfared1029-spec.github.io/nafas-iraq/#organization',
      'name': 'نَفَس العراق | NAFAS Iraq',
      'alternateName': ['NAFAS', 'نَفَس للبيئة الاجتماعية', 'Mesopotamia Green Breath'],
      'url': 'https://mahamadfared1029-spec.github.io/nafas-iraq/',
      'logo': 'https://mahamadfared1029-spec.github.io/nafas-iraq/brand/nafas-official-logo.png',
      'description': 'المنظومة التكنولوجية المجتمعية لحماية وتوثيق بيئة العراق، وتحويل الوعي البيئي إلى أثر ميداني موثق بسواعد أهل الرافدين.',
      'areaServed': {
        '@type': 'Country',
        'name': 'Iraq'
      }
    },
    {
      '@type': 'WebSite',
      '@id': 'https://mahamadfared1029-spec.github.io/nafas-iraq/#website',
      'url': 'https://mahamadfared1029-spec.github.io/nafas-iraq/',
      'name': 'نَفَس العراق',
      'inLanguage': ['ar-IQ', 'ckb', 'en'],
      'publisher': {
        '@id': 'https://mahamadfared1029-spec.github.io/nafas-iraq/#organization'
      }
    }
  ]
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar-IQ" dir="rtl" className="scroll-smooth">
      <body className="min-h-screen flex flex-col bg-nafas-cream/40 text-nafas-ink">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <NafasProvider>
          {children}
        </NafasProvider>
      </body>
    </html>
  );
}
