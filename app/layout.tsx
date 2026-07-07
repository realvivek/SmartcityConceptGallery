import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
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
    <html lang="en" className={`dark ${inter.variable}`}>
      <body className="min-h-screen font-sans">
        {children}
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              background: "#0e1b33",
              border: "1px solid rgba(148, 179, 222, 0.18)",
              color: "#e2e8f0",
            },
          }}
        />
      </body>
    </html>
  );
}
