import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { Toaster } from "sonner";
import { NavBar } from "@/components/NavBar";
import { AuthProvider } from "@/lib/auth-context";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MiVaqui — Panel administrativo",
  description: "Herramienta interna de MiVaqui: fincas, postulaciones y estado del piloto.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={poppins.variable}>
      <body style={{ backgroundColor: "#F5F7F4" }}>
        <AuthProvider>
          <div className="flex min-h-screen">
            <NavBar />
            <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-12 pt-6 md:px-8">{children}</main>
          </div>
          <Toaster richColors position="top-right" toastOptions={{ duration: 4000 }} />
        </AuthProvider>
      </body>
    </html>
  );
}
