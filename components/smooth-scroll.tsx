'use client';

import { useEffect } from 'react';
import Lenis from 'lenis';

export function SmoothScroll() {
  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.5,
      allowNestedScroll: true,
      prevent: (node: any) => {
        if (!node || typeof node.hasAttribute !== 'function') return false;
        return (
          node.tagName === 'TEXTAREA' ||
          node.tagName === 'INPUT' ||
          node.tagName === 'SELECT' ||
          node.hasAttribute('data-lenis-prevent') ||
          Boolean(node.closest?.('[data-lenis-prevent]')) ||
          Boolean(node.closest?.('textarea')) ||
          Boolean(node.closest?.('[role="dialog"]')) ||
          Boolean(node.closest?.('.overflow-y-auto')) ||
          Boolean(node.closest?.('.overflow-auto'))
        );
      },
    });

    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  return null;
}
