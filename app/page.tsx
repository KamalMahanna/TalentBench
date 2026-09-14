import { Navigation } from "@/components/ui/navigation";
import { HeroSection } from "@/components/landing/hero";
import { TrustedBy } from "@/components/landing/trusted-by";
import { HowItWorks } from "@/components/landing/how-it-works";
import { PipelinePreview } from "@/components/landing/pipeline-preview";
import { AiAgentDemo } from "@/components/landing/ai-agent-demo";
import { FeaturesBento } from "@/components/landing/features";
import { Testimonials } from "@/components/landing/testimonials";
import { CtaFooter } from "@/components/landing/cta-footer";

export default function Home() {
  return (
    <main className="overflow-x-hidden w-full max-w-full min-h-screen bg-transparent text-[#EAF1FB] selection:bg-[#8FB6E8] selection:text-[#0A1228] transition-colors duration-300">
      <Navigation />
      <HeroSection />
      <TrustedBy />
      <HowItWorks />
      <PipelinePreview />
      <AiAgentDemo />
      <FeaturesBento />
      <Testimonials />
      <CtaFooter />
    </main>
  );
}

