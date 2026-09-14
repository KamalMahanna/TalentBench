"use client";

import React, { useEffect, useRef } from "react";
import { useTheme } from "@/context/theme-context";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseRadius: number;
  radius: number;
  alpha: number;
  pulseSpeed: number;
  pulsePhase: number;
  color: string;
  isBackgroundStar?: boolean;
}

interface PulsePacket {
  nodeAIndex: number;
  nodeBIndex: number;
  progress: number;
  speed: number;
  size: number;
}

export function GlobalParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const isLight = theme === "light";

    let animationFrameId: number;
    let isTabActive = true;

    // Viewport dimensions & DPR
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const updateDimensions = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
    };
    updateDimensions();

    // Responsive node counts
    const isMobile = width < 768;
    const nodeCount = isMobile ? 42 : Math.min(95, Math.floor((width * height) / 18000));
    const backgroundStarCount = isMobile ? 30 : 60;
    const maxConnectionDistance = isMobile ? 115 : 155;

    // Mouse tracking for interactive neural web
    const mouse = {
      x: -1000,
      y: -1000,
      targetX: -1000,
      targetY: -1000,
      radius: isMobile ? 120 : 180,
      isActive: false,
    };

    // Palette with custom design tokens adapted for theme
    const darkPalette = [
      "rgba(255, 255, 255, ", // Brilliant pure white
      "rgba(238, 245, 255, ", // Pristine icy white
      "rgba(205, 226, 255, ", // Luminous diamond frost
      "rgba(155, 192, 240, ", // Highlight pastel ice
    ];

    const lightPalette = [
      "rgba(30, 58, 110, ",  // Deep navy node
      "rgba(50, 95, 175, ",  // Rich blue node
      "rgba(75, 130, 215, ", // Sky cobalt node
      "rgba(110, 160, 235, ",// Accent pastel ice
    ];

    const nodePalette = isLight ? lightPalette : darkPalette;

    // Initialize constellation particles
    const particles: Particle[] = [];

    for (let i = 0; i < nodeCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        baseRadius: Math.random() * 2.2 + 1.2,
        radius: 1.5,
        alpha: isLight ? Math.random() * 0.4 + 0.3 : Math.random() * 0.55 + 0.35,
        pulseSpeed: Math.random() * 0.025 + 0.01,
        pulsePhase: Math.random() * Math.PI * 2,
        color: nodePalette[Math.floor(Math.random() * nodePalette.length)],
        isBackgroundStar: false,
      });
    }

    // Initialize ambient background star dust
    const bgStars: Particle[] = [];
    for (let i = 0; i < backgroundStarCount; i++) {
      bgStars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.12,
        vy: (Math.random() - 0.5) * 0.12,
        baseRadius: Math.random() * 1.1 + 0.4,
        radius: 0.8,
        alpha: isLight ? Math.random() * 0.25 + 0.1 : Math.random() * 0.45 + 0.15,
        pulseSpeed: Math.random() * 0.015 + 0.005,
        pulsePhase: Math.random() * Math.PI * 2,
        color: isLight ? "rgba(70, 110, 180, " : "rgba(250, 252, 255, ",
        isBackgroundStar: true,
      });
    }

    // Packet pulses traveling along connection lines
    const packets: PulsePacket[] = [];
    const spawnPacket = () => {
      if (packets.length > 8 || particles.length < 2) return;
      const idxA = Math.floor(Math.random() * particles.length);
      // Find a connected neighbor
      const nodeA = particles[idxA];
      const validNeighbors: number[] = [];
      for (let j = 0; j < particles.length; j++) {
        if (j === idxA) continue;
        const dx = particles[j].x - nodeA.x;
        const dy = particles[j].y - nodeA.y;
        if (Math.hypot(dx, dy) < maxConnectionDistance) {
          validNeighbors.push(j);
        }
      }
      if (validNeighbors.length > 0) {
        const idxB = validNeighbors[Math.floor(Math.random() * validNeighbors.length)];
        packets.push({
          nodeAIndex: idxA,
          nodeBIndex: idxB,
          progress: 0,
          speed: Math.random() * 0.018 + 0.008,
          size: Math.random() * 1.6 + 1.2,
        });
      }
    };

    // Window event listeners
    const handleResize = () => {
      updateDimensions();
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
      mouse.isActive = true;
    };

    const handleMouseLeave = () => {
      mouse.isActive = false;
      mouse.targetX = -1000;
      mouse.targetY = -1000;
    };

    const handleVisibilityChange = () => {
      isTabActive = !document.hidden;
      if (isTabActive) {
        lastTime = performance.now();
      }
    };

    window.addEventListener("resize", handleResize, { passive: true });
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    let lastTime = performance.now();
    let packetTimer = 0;

    // Render loop
    const render = (currentTime: number) => {
      animationFrameId = requestAnimationFrame(render);
      if (!isTabActive) return;

      const delta = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      // Smooth mouse coordinate tracking
      if (mouse.isActive) {
        mouse.x += (mouse.targetX - mouse.x) * 0.15;
        mouse.y += (mouse.targetY - mouse.y) * 0.15;
      } else {
        mouse.x = -1000;
        mouse.y = -1000;
      }

      ctx.clearRect(0, 0, width, height);

      // 1. Subtle deep atmospheric radial ambient nebulae + ethereal ambient wash
      const grad1 = ctx.createRadialGradient(
        width * 0.75,
        height * 0.25,
        50,
        width * 0.75,
        height * 0.25,
        width * 0.55
      );
      if (isLight) {
        grad1.addColorStop(0, "rgba(143, 182, 232, 0.18)");
        grad1.addColorStop(0.5, "rgba(215, 232, 255, 0.08)");
        grad1.addColorStop(1, "rgba(244, 247, 252, 0)");
      } else {
        grad1.addColorStop(0, "rgba(230, 240, 255, 0.09)");
        grad1.addColorStop(0.4, "rgba(143, 182, 232, 0.05)");
        grad1.addColorStop(1, "rgba(10, 18, 40, 0)");
      }
      ctx.fillStyle = grad1;
      ctx.fillRect(0, 0, width, height);

      const grad2 = ctx.createRadialGradient(
        width * 0.2,
        height * 0.8,
        30,
        width * 0.2,
        height * 0.8,
        width * 0.45
      );
      if (isLight) {
        grad2.addColorStop(0, "rgba(91, 136, 196, 0.14)");
        grad2.addColorStop(0.5, "rgba(175, 205, 245, 0.06)");
        grad2.addColorStop(1, "rgba(244, 247, 252, 0)");
      } else {
        grad2.addColorStop(0, "rgba(215, 230, 255, 0.07)");
        grad2.addColorStop(0.5, "rgba(91, 136, 196, 0.04)");
        grad2.addColorStop(1, "rgba(10, 18, 40, 0)");
      }
      ctx.fillStyle = grad2;
      ctx.fillRect(0, 0, width, height);

      // Top-center gentle ambient glow
      const gradCenter = ctx.createRadialGradient(
        width * 0.5,
        height * 0.08,
        10,
        width * 0.5,
        height * 0.08,
        width * 0.4
      );
      if (isLight) {
        gradCenter.addColorStop(0, "rgba(143, 182, 232, 0.15)");
        gradCenter.addColorStop(0.6, "rgba(255, 255, 255, 0.3)");
        gradCenter.addColorStop(1, "rgba(244, 247, 252, 0)");
      } else {
        gradCenter.addColorStop(0, "rgba(255, 255, 255, 0.05)");
        gradCenter.addColorStop(0.6, "rgba(215, 232, 255, 0.02)");
        gradCenter.addColorStop(1, "rgba(10, 18, 40, 0)");
      }
      ctx.fillStyle = gradCenter;
      ctx.fillRect(0, 0, width, height);

      // 2. Draw ambient background star dust
      for (let i = 0; i < bgStars.length; i++) {
        const star = bgStars[i];
        star.x += star.vx;
        star.y += star.vy;
        if (star.x < 0) star.x = width;
        if (star.x > width) star.x = 0;
        if (star.y < 0) star.y = height;
        if (star.y > height) star.y = 0;

        star.pulsePhase += star.pulseSpeed;
        const currentAlpha = Math.max(0.05, star.alpha + Math.sin(star.pulsePhase) * 0.15);

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.baseRadius, 0, Math.PI * 2);
        ctx.fillStyle = `${star.color}${currentAlpha})`;
        ctx.fill();
      }

      // 3. Update constellation particle positions & mouse interactions
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Velocity motion
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around boundaries smoothly
        if (p.x < -20) p.x = width + 20;
        if (p.x > width + 20) p.x = -20;
        if (p.y < -20) p.y = height + 20;
        if (p.y > height + 20) p.y = -20;

        // Subtle interactive mouse deflection
        if (mouse.isActive) {
          const dxMouse = mouse.x - p.x;
          const dyMouse = mouse.y - p.y;
          const distMouse = Math.hypot(dxMouse, dyMouse);
          if (distMouse < mouse.radius && distMouse > 1) {
            const force = (1 - distMouse / mouse.radius) * 0.85;
            p.x -= (dxMouse / distMouse) * force * 2.2;
            p.y -= (dyMouse / distMouse) * force * 2.2;
          }
        }

        // Pulse size
        p.pulsePhase += p.pulseSpeed;
        p.radius = p.baseRadius + Math.sin(p.pulsePhase) * 0.6;
      }

      // 4. Draw connecting lines between particles
      for (let i = 0; i < particles.length; i++) {
        const nodeA = particles[i];

        for (let j = i + 1; j < particles.length; j++) {
          const nodeB = particles[j];
          const dx = nodeB.x - nodeA.x;
          const dy = nodeB.y - nodeA.y;
          const dist = Math.hypot(dx, dy);

          if (dist < maxConnectionDistance) {
            const norm = 1 - dist / maxConnectionDistance;
            const alpha = norm * norm * 0.28;

            const strokeColor = isLight
              ? `rgba(70, 115, 185, ${alpha * 0.95})`
              : `rgba(143, 182, 232, ${alpha})`;

            ctx.beginPath();
            ctx.moveTo(nodeA.x, nodeA.y);
            ctx.lineTo(nodeB.x, nodeB.y);
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = dist < 70 ? (isLight ? 1.1 : 1.0) : 0.55;
            ctx.stroke();
          }
        }

        // 5. Connect nearby nodes to the user's cursor
        if (mouse.isActive) {
          const dxM = mouse.x - nodeA.x;
          const dyM = mouse.y - nodeA.y;
          const distM = Math.hypot(dxM, dyM);
          if (distM < mouse.radius) {
            const mAlpha = (1 - distM / mouse.radius) * (isLight ? 0.45 : 0.35);
            ctx.beginPath();
            ctx.moveTo(nodeA.x, nodeA.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.strokeStyle = isLight
              ? `rgba(50, 95, 175, ${mAlpha})`
              : `rgba(180, 210, 255, ${mAlpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      // 6. Draw and update data packets traveling along links
      packetTimer += delta;
      if (packetTimer > 0.45) {
        packetTimer = 0;
        spawnPacket();
      }

      for (let k = packets.length - 1; k >= 0; k--) {
        const pkt = packets[k];
        pkt.progress += pkt.speed;

        if (pkt.progress >= 1) {
          packets.splice(k, 1);
          continue;
        }

        const nA = particles[pkt.nodeAIndex];
        const nB = particles[pkt.nodeBIndex];
        if (!nA || !nB) {
          packets.splice(k, 1);
          continue;
        }

        const px = nA.x + (nB.x - nA.x) * pkt.progress;
        const py = nA.y + (nB.y - nA.y) * pkt.progress;

        // Packet outer aura
        ctx.beginPath();
        ctx.arc(px, py, pkt.size * 2.2, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(143, 182, 232, 0.25)";
        ctx.fill();

        // Packet core dot
        ctx.beginPath();
        ctx.arc(px, py, pkt.size, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(234, 241, 251, 0.95)";
        ctx.fill();
      }

      // 7. Draw constellation nodes (nodes on top of lines)
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Soft outer glow halo
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 2.6, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${p.alpha * 0.22})`;
        ctx.fill();

        // Solid luminous core
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${p.alpha})`;
        ctx.fill();

        // Specular glint on larger nodes
        if (p.baseRadius > 2.0) {
          ctx.beginPath();
          ctx.arc(p.x - 0.4, p.y - 0.4, 0.7, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
          ctx.fill();
        }
      }
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 w-full h-full pointer-events-none z-0 opacity-100 transition-opacity duration-700"
    />
  );
}

