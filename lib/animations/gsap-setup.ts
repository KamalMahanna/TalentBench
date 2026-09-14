import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

let isGsapRegistered = false;

export function initGSAP() {
  if (typeof window !== "undefined" && !isGsapRegistered) {
    gsap.registerPlugin(ScrollTrigger);
    
    // Configure default smooth interpolation
    ScrollTrigger.config({
      limitCallbacks: true,
      ignoreMobileResize: true,
    });

    isGsapRegistered = true;
  }
  return { gsap, ScrollTrigger };
}

export { gsap, ScrollTrigger };

