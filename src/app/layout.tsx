import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "🎵 ROCKOLA - Sistema de Música Interactiva",
  description: "MERKA 4.0 - Sistema de música interactiva para bares y restaurantes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
