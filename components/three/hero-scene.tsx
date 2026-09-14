"use client";

import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function HeroScene() {
  const pointsRef = useRef<THREE.Points>(null);
  const ringRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  // Generate 1200 constellation particles matching the Celestial Ice palette
  const particleCount = 1200;
  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const col = new Float32Array(particleCount * 3);

    const iceAccent = new THREE.Color("#8FB6E8");
    const iceLight = new THREE.Color("#EAF1FB");
    const royalBlue = new THREE.Color("#60A5FA");
    const lilac = new THREE.Color("#A78BFA");

    for (let i = 0; i < particleCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 2.4 + Math.random() * 1.8;

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;

      // Color variation: Ice Accent, Royal Blue, Lilac, Ice Light
      const mixedColor = new THREE.Color();
      const rand = Math.random();
      if (rand < 0.5) {
        mixedColor.copy(iceAccent).lerp(iceLight, Math.random() * 0.5);
      } else if (rand < 0.8) {
        mixedColor.copy(royalBlue).lerp(iceAccent, Math.random() * 0.4);
      } else {
        mixedColor.copy(lilac).lerp(iceLight, 0.3);
      }

      col[i * 3] = mixedColor.r;
      col[i * 3 + 1] = mixedColor.g;
      col[i * 3 + 2] = mixedColor.b;
    }
    return [pos, col];
  }, [particleCount]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (pointsRef.current) {
      pointsRef.current.rotation.y = t * 0.04;
      pointsRef.current.rotation.x = Math.sin(t * 0.03) * 0.15;
    }
    if (ringRef.current) {
      ringRef.current.rotation.z = -t * 0.05;
      ringRef.current.rotation.x = 1.1 + Math.cos(t * 0.02) * 0.08;
    }
    if (meshRef.current) {
      meshRef.current.rotation.x = t * 0.1;
      meshRef.current.rotation.y = t * 0.15;
    }
  });

  return (
    <group position={[0.4, 0, 0]}>
      {/* Central Glass Icosahedron core */}
      <mesh ref={meshRef} scale={1.25}>
        <icosahedronGeometry args={[1, 1]} />
        <meshPhysicalMaterial
          roughness={0.1}
          transmission={0.92}
          thickness={1.4}
          color="#8FB6E8"
          ior={1.45}
          wireframe={true}
          transparent={true}
          opacity={0.4}
        />
      </mesh>

      {/* Outer Orbiting Data Rings in Celestial Ice & Blue */}
      <group ref={ringRef}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[3.2, 0.02, 16, 100]} />
          <meshBasicMaterial color="#8FB6E8" transparent opacity={0.45} />
        </mesh>
        <mesh rotation={[Math.PI / 3, 0.4, 0]}>
          <torusGeometry args={[2.8, 0.015, 16, 100]} />
          <meshBasicMaterial color="#60A5FA" transparent opacity={0.35} />
        </mesh>
      </group>

      {/* Dynamic 3D Particle Cloud */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[colors, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.045}
          vertexColors
          transparent
          opacity={0.85}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      {/* Ambient and Key Lighting */}
      <ambientLight intensity={0.5} />
      <pointLight position={[5, 5, 5]} intensity={1.8} color="#8FB6E8" />
      <pointLight position={[-5, -5, -3]} intensity={1.4} color="#60A5FA" />
    </group>
  );
}
