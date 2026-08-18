import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Amsterdam Frozen Foods",
  description: "Productos congelados e insumos de comida rápida con delivery en San Cristóbal, Venezuela",
  icons: {
    icon: "/logo-dark.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>
          <Navbar />
          <div className="pageWrapper">{children}</div>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
