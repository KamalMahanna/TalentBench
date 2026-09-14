"use client";

import React from "react";
import { Quotes } from "@phosphor-icons/react";

export function Testimonials() {
  return (
    <section id="reviews" className="relative py-28 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
      <div className="w-12 h-12 rounded-full bg-white/[0.05] ring-1 ring-[#8FB6E8]/30 text-[#8FB6E8] flex items-center justify-center mx-auto mb-8 shadow-[0_0_20px_rgba(143,182,232,0.2)]">
        <Quotes size={22} weight="fill" />
      </div>

      {/* Quote max 3 lines per taste-skill */}
      <blockquote className="text-2xl sm:text-4xl font-display font-medium text-white tracking-tight leading-snug max-w-3xl mx-auto">
        &ldquo;The ability to audit the AI agent reasoning trace transformed our hiring velocity. We cut initial screening hours by 85% while giving every applicant genuine feedback.&rdquo;
      </blockquote>

      {/* Attribution: Name + Role + Company, No em-dashes */}
      <div className="mt-8">
        <div className="font-display font-semibold text-base text-[#EAF1FB]">
          Sarah Lin
        </div>
        <div className="text-xs font-mono text-[#7C91B4] mt-1">
          VP of People Operations at Axiom Dynamics
        </div>
      </div>
    </section>
  );
}
