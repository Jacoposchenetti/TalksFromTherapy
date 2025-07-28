import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth/auth-provider";
import { Navigation } from "@/components/navigation";
import { ConditionalNavigation } from "@/components/conditional-navigation";
import { AudioPlayerProvider } from "@/hooks/useAudioPlayer";
import { AudioPlayer } from "@/components/AudioPlayer";
import CookieBanner from "@/components/cookie-banner";

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
  return (
    <html lang="it">
      <body className={inter.className}>
        <AuthProvider>
          <AudioPlayerProvider>
            <div className="min-h-screen flex flex-col">
              <ConditionalNavigation />
              <main className="flex-1">
                {children}
              </main>
              <AudioPlayer />
              <CookieBanner />
            </div>
          </AudioPlayerProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
