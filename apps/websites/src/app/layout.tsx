import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./(styles)/tokens.css";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Zenthea Website Builder",
  description: "Create and manage your clinic website.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>
          <Providers>
            {children}
          </Providers>
          <Toaster position="top-center" />
        </body>
      </html>
    </ClerkProvider>
  );
}
