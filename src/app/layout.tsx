import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "SoundWave — Music Streaming",
  description: "Apni pasandida music suno",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <html lang="hi">
      <body>
        <Navbar user={user} />
        <main style={{ minHeight: "calc(100vh - 140px)" }}>{children}</main>
        <Footer />
      </body>
    </html>
  );
}