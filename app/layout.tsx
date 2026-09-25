import type { Metadata } from "next";
import { ThemeProvider } from "@/context/theme-context";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "TalentBench — Score every candidate fairly.",
  description:
    "One friendly workspace for reviewing candidates, calibrating your team, and turning every interview into useful signal.",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ThemeProvider>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                borderRadius: "16px",
                fontFamily: "DM Sans, system-ui, sans-serif",
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
