import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth/auth-provider";
import { Navigation } from "@/components/navigation";
import { ConditionalNavigation } from "@/components/conditional-navigation";
import { AudioPlayerProvider } from "@/hooks/useAudioPlayer";
import { AudioPlayer } from "@/components/AudioPlayer";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TalksFromTherapy - Trascrizione e Analisi Sessioni Terapeutiche",
  description: "Piattaforma per la trascrizione automatica e analisi delle sessioni terapeutiche",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (    <html lang="it">
      <body className={inter.className}>
        {/* Logo Bolt in alto a destra */}
        <a
          href="https://bolt.new/"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            position: 'fixed',
            top: 0,
            right: 16,
            zIndex: 50,
            width: 224,
            height: 224,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img
            src="/bolt_logo.jpeg"
            alt="Powered by Bolt.New"
            style={{ width: '224px', height: '224px', objectFit: 'contain', filter: 'drop-shadow(0 4px 24px rgba(0,0,0,0.12))' }}
          />
        </a>
        <AuthProvider>
          <AudioPlayerProvider>
            <ConditionalNavigation />
            {children}
            <AudioPlayer />
          </AudioPlayerProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
