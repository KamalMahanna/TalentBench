import LandingPage from "@/components/landing/hero";
import { LenisProvider } from "@/lib/animations/lenis-provider";

export default function Home() {
  return (
    <LenisProvider>
      <LandingPage />
    </LenisProvider>
  );
}
