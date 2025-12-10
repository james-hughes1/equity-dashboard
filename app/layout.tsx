import "./globals.css";
import { Inter } from "next/font/google";
import Navigation from "@/components/Navigation";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Alpha Signal Dashboard",
  description: "Professional quantitative trading dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-dark-bg text-white min-h-screen`}>
        <Navigation />
        <main className="container mx-auto px-4 py-6 max-w-7xl">
          {children}
        </main>
      </body>
    </html>
  );
}
