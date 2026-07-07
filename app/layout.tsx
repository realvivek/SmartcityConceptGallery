import type { Metadata } from "next";
import { Inter, Fraunces } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["opsz"],
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
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`}>
      <body className="min-h-screen font-sans">
        {children}
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              background: "#fdfcf7",
              border: "1px solid rgba(36, 52, 77, 0.25)",
              color: "#24344d",
              boxShadow: "4px 4px 0 rgba(36, 52, 77, 0.14)",
            },
          }}
        />
      </body>
    </html>
  );
}
