import type {Metadata} from 'next';
import {Cinzel, Plus_Jakarta_Sans, JetBrains_Mono} from 'next/font/google';
import './globals.css';

const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-cinzel',
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-jakarta',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-jetbrains',
});

export const metadata: Metadata = {
  title: 'Aegis Empire Manager',
  description:
    "Simulation de gestion d'équipe esport RTS style Age of Empires en pixel art vue de dessus, moteur par ticks avec DAG visuel et pipeline ETL.",
  openGraph: {
    title: 'Aegis Empire Manager',
    description:
      "Simulation de gestion d'équipe esport RTS style Age of Empires en pixel art vue de dessus, moteur par ticks avec DAG visuel et pipeline ETL.",
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Aegis Empire Manager',
    description:
      "Simulation de gestion d'équipe esport RTS style Age of Empires en pixel art vue de dessus, moteur par ticks avec DAG visuel et pipeline ETL.",
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html
      lang="fr"
      className={`${cinzel.variable} ${jakarta.variable} ${jetbrains.variable} dark`}
    >
      <body
        suppressHydrationWarning
        className="bg-[#0B0F17] text-[#F1F5F9] antialiased selection:bg-[#D97706]/30 selection:text-[#FDE68A]"
      >
        {children}
      </body>
    </html>
  );
}
