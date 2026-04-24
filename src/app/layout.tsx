import type { Metadata } from "next";
import "./globals.css";
import { Providers } from '@/components/ui/Providers'

export const metadata: Metadata = {
  title: "Punto de Venta",
  description: "POS para restaurante",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
  <html lang="es" suppressHydrationWarning>
      <body
        className="antialiased"
        data-theme="light"
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
