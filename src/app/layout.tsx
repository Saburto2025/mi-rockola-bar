import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "🎵 ROCKOLA - Sistema de Música Interactiva",
  description: "MERKA 4.0 - Sistema de música interactiva para bares y restaurantes. Pide tus canciones favoritas desde tu celular.",
  keywords: ["Rockola", "Música", "Bar", "Jukebox", "Karaoke", "Entretenimiento"],
  authors: [{ name: "MERKA 4.0" }],
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎵</text></svg>",
  },
  openGraph: {
    title: "🎵 ROCKOLA",
    description: "Sistema de música interactiva - Pide tus canciones favoritas",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "🎵 ROCKOLA",
    description: "Sistema de música interactiva - Pide tus canciones favoritas",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
