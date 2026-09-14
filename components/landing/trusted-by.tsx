"use client";

import React from "react";

export function TrustedBy() {
  const logos = [
    {
      name: "Vercel",
      svg: (
        <svg viewBox="0 0 116 100" className="h-5 w-auto fill-current">
          <path d="M57.5 0L115 100H0L57.5 0z" />
        </svg>
      ),
    },
    {
      name: "Linear",
      svg: (
        <svg viewBox="0 0 100 100" className="h-5 w-auto fill-current">
          <path d="M1.2 55.4C.4 56.6 0 58.1 0 59.6c0 1.5.4 3 1.2 4.2l34.6 34.6c1.2.8 2.7 1.2 4.2 1.2s3-.4 4.2-1.2L98.8 44c.8-1.2 1.2-2.7 1.2-4.2s-.4-3-1.2-4.2L64.2 1c-1.2-.8-2.7-1.2-4.2-1.2s-3 .4-4.2 1.2L1.2 55.4z" />
        </svg>
      ),
    },
    {
      name: "Stripe",
      svg: (
        <svg viewBox="0 0 120 45" className="h-5 w-auto fill-current">
          <path d="M110.8 19.3c0-7.3-5.7-13.1-14.7-13.1-9.3 0-15.3 6.1-15.3 14.5 0 9.7 7.2 14.2 16.3 14.2 4.8 0 8.4-1.1 11.2-2.7v-6.3c-2.8 1.4-6.1 2.3-9.9 2.3-4.9 0-8.6-2.1-9.2-6.5h21.4c.1-.8.2-1.6.2-2.4zm-14.7-6.8c3.9 0 6.6 2.1 7.1 5.3h-14.4c.6-3.2 3.4-5.3 7.3-5.3zm-27.1-6.3c-4.2 0-7.1 2-8.5 3.7V6.7h-7.8v34.4h8.3v-17c0-4.8 3.1-7.2 6.6-7.2 1 0 1.8.1 2.4.4v-8.1c-.6-.2-1.3-.3-2-.3zM46.7 12.8V6.7h-8.3v34.4h8.3v-17c0-4.8 3.1-7.2 6.6-7.2 1 0 1.8.1 2.4.4v-8.1c-.6-.2-1.3-.3-2-.3-4.2 0-7.1 2-8.5 3.7zm-20.6-6.1h-8.3v7.4h-4.3v6.3h4.3v10.5c0 6.1 3.5 9.8 9.7 9.8 2.6 0 4.6-.5 5.8-1.2v-6.3c-1 .5-2.2.8-3.6.8-2.6 0-3.6-1.5-3.6-4.5V20.4h6.7v-6.3h-6.7V6.7zM6.6 27.6c0-1.8 1.5-2.7 4.1-2.7 3.5 0 7.9 1.2 10.9 2.8v-7.2C18.4 19 14.5 18 10.5 18 4.2 18 0 21.4 0 27.1c0 9.2 12.8 8.1 12.8 12.4 0 2.2-1.9 3-4.6 3-4.1 0-9.2-1.7-12.7-3.7v7.5c4 2 8.6 2.9 12.6 2.9 6.8 0 11.4-3.3 11.4-9.3-.1-9.9-12.9-8.7-12.9-12.3z" />
        </svg>
      ),
    },
    {
      name: "GitHub",
      svg: (
        <svg viewBox="0 0 98 96" className="h-5 w-auto fill-current">
          <path fillRule="evenodd" clipRule="evenodd" d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.215-1.63c4.125 0 8.25.571 12.214 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z" />
        </svg>
      ),
    },
    {
      name: "Raycast",
      svg: (
        <svg viewBox="0 0 24 24" className="h-5 w-auto fill-current">
          <path d="M12 0L24 12L12 24L0 12L12 0Z" />
        </svg>
      ),
    },
    {
      name: "Supabase",
      svg: (
        <svg viewBox="0 0 24 24" className="h-5 w-auto fill-current">
          <path d="M21.362 9.354H12V.312a.312.312 0 0 0-.533-.22L.153 11.806a.312.312 0 0 0 .22.533h9.362v9.042a.312.312 0 0 0 .533.22l11.314-11.714a.312.312 0 0 0-.22-.533z" />
        </svg>
      ),
    },
  ];

  return (
    <section className="relative py-12 border-y border-white/10 bg-[#060B18]/50 backdrop-blur-md overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 mb-6 text-center">
        <p className="text-[10px] font-mono tracking-widest text-[#7C91B4]/80 uppercase">
          CALIBRATING CANDIDATE PIPELINES AT HIGH-SCALE ENGINEERING ORGS
        </p>
      </div>

      <div className="relative w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)]">
        <div className="flex w-max animate-marquee gap-16 sm:gap-24 items-center opacity-65 hover:opacity-100 transition-opacity duration-300">
          {/* First loop */}
          {logos.map((logo, idx) => (
            <div
              key={`logo-1-${idx}`}
              className="text-[#8FB6E8]/70 hover:text-[#EAF1FB] transition-colors duration-200 flex items-center justify-center"
              title={logo.name}
            >
              {logo.svg}
            </div>
          ))}
          {/* Second loop for seamless continuous scrolling */}
          {logos.map((logo, idx) => (
            <div
              key={`logo-2-${idx}`}
              className="text-[#8FB6E8]/70 hover:text-[#EAF1FB] transition-colors duration-200 flex items-center justify-center"
              title={logo.name}
            >
              {logo.svg}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
