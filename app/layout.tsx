import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { NavBar } from "@/components/NavBar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MiVaqui — Panel administrativo",
  description: "Herramienta interna de MiVaqui: fincas, postulaciones y estado del piloto.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full bg-[#F5F7F4]">
        <NavBar />
        <main className="flex-1 overflow-y-auto p-8">{children}</main>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
