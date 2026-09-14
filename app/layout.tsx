import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { LenisProvider } from "@/lib/animations/lenis-provider";
import { ThemeProvider } from "@/context/theme-context";
import { GlobalParticleBackground } from "@/components/ui/global-particle-background";
import { ChromaticGlassAura } from "@/components/ui/chromatic-aura";
import { TopAtmosphericSheen } from "@/components/ui/background-sheen";
import { Toaster } from "sonner";
import "./globals.css";

const sansFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-satoshi",
  display: "swap",
});

const displayFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-clash",
  display: "swap",
});

const monoFont = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TalentBench | Awwwards-Tier AI Recruitment & Pipeline Architecture",
  description: "High-precision recruitment infrastructure with customizable pipelines, automated AI resume screening, auditable agent traces, and hyper-personalized candidate communication.",
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
    <html
      lang="en"
      className={`${sansFont.variable} ${displayFont.variable} ${monoFont.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen transition-colors duration-300">
        <ThemeProvider>
          {/* Global Interactive Floating Constellation Particle Network (from talentbench_00001 (2)) */}
          <GlobalParticleBackground />

          {/* Atmospheric Chromatic Iridescent Glassmorphism Aura (from talentbench_00001 (2)) */}
          <ChromaticGlassAura />

          {/* Subtle Ethereal Top Atmospheric Sheen (from talentbench_00001 (2)) */}
          <TopAtmosphericSheen />

          <div className="noise-overlay pointer-events-none" aria-hidden="true" />
          <LenisProvider>
            <div className="relative z-10">
              {children}
            </div>
          </LenisProvider>
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                backdropFilter: "blur(24px)",
                borderRadius: "1rem",
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
