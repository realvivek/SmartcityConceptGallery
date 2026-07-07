import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  weight: ["500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "RF Concepts in Smart Cities",
  description:
    "A gallery of interactive Three.js visualizations exploring private 5G, outdoor small cells, and edge AI in urban environments.",
  keywords: [
    "RF engineering",
    "private 5G",
    "small cells",
    "edge AI",
    "beamforming",
    "smart cities",
    "Three.js",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="min-h-screen font-sans">
        {children}
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              background: "#ffffff",
              border: "1px solid rgba(28, 38, 52, 0.12)",
              color: "#1c2634",
              boxShadow: "0 12px 32px rgba(16, 24, 40, 0.12)",
            },
          }}
        />
      </body>
    </html>
  );
}
