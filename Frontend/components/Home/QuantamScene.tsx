"use client";
import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial, Sphere, Box, Stars, Environment, Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

const DataParticle = ({ position, color, scale = 1 }: { position: [number, number, number]; color: string; scale?: number }) => {
  const ref = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (ref.current) {
      const t = state.clock.getElapsedTime();
      ref.current.position.y = position[1] + Math.sin(t * 1.5 + position[0]) * 0.15;
      ref.current.rotation.x = t * 0.3;
      ref.current.rotation.z = t * 0.2;
    }
  });

  return (
    <Box ref={ref} args={[1, 1, 1]} position={position} scale={scale}>
      <meshStandardMaterial
        color={color}
        metalness={0.8}
        roughness={0.2}
        emissive={color}
        emissiveIntensity={0.2}
      />
    </Box>
  );
};

const DataStream = ({ count = 100 }) => {
  const points = useMemo(() => {
    const p = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      p[i * 3] = (Math.random() - 0.5) * 10;
      p[i * 3 + 1] = (Math.random() - 0.5) * 10;
      p[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    return p;
  }, [count]);

  const ref = useRef<THREE.Points>(null);
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.getElapsedTime() * 0.05;
      ref.current.rotation.x = state.clock.getElapsedTime() * 0.03;
    }
  });

  return (
    <Points ref={ref} positions={points} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color="#C5A059"
        size={0.05}
        sizeAttenuation={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </Points>
  );
};

export const HeroScene: React.FC = () => {
  return (
    <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
      <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={1.5} />
        <spotLight position={[-10, 10, 10]} angle={0.15} penumbra={1} intensity={2} color="#4F46E5" />
        
        <Float speed={1} rotationIntensity={0.5} floatIntensity={0.5}>
          <DataParticle position={[0, 0, 0]} color="#4F46E5" scale={1.2} />
          <DataStream count={200} />
        </Float>
        
        <Float speed={1.5} rotationIntensity={1} floatIntensity={1}>
           <DataParticle position={[-4, 2, -3]} color="#9333EA" scale={0.4} />
           <DataParticle position={[4, -2, -4]} color="#C5A059" scale={0.5} />
           <DataParticle position={[2, 3, -2]} color="#10B981" scale={0.3} />
        </Float>

        <Environment preset="night" />
        <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={0.5} />
      </Canvas>
    </div>
  );
};

export const DataFlowScene: React.FC = () => {
  return (
    <div className="w-full h-full absolute inset-0">
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <spotLight position={[5, 5, 5]} angle={0.3} penumbra={1} intensity={2} color="#C5A059" />
        <pointLight position={[-5, -5, -5]} intensity={0.5} color="#4F46E5" />
        
        <Float rotationIntensity={0.5} floatIntensity={0.5} speed={1.5}>
          <group>
            {/* Central Processing Core */}
            <Box args={[1, 1, 1]} position={[0, 0, 0]}>
              <meshStandardMaterial color="#111" metalness={1} roughness={0.1} emissive="#C5A059" emissiveIntensity={0.2} />
            </Box>
            
            {/* Orbiting Data Nodes */}
            {[...Array(6)].map((_, i) => {
              const angle = (i / 6) * Math.PI * 2;
              const radius = 2;
              return (
                <group key={i} rotation={[0, 0, angle]}>
                  <Float speed={2} rotationIntensity={2} floatIntensity={1}>
                    <Box args={[0.3, 0.3, 0.3]} position={[radius, 0, 0]}>
                      <meshStandardMaterial color={i % 2 === 0 ? "#4F46E5" : "#C5A059"} metalness={0.8} roughness={0.2} />
                    </Box>
                    {/* Connection Line */}
                    <mesh position={[radius / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                      <cylinderGeometry args={[0.01, 0.01, radius]} />
                      <meshStandardMaterial color="#333" transparent opacity={0.5} />
                    </mesh>
                  </Float>
                </group>
              );
            })}

            {/* Outer Ring */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[2.5, 0.02, 16, 100]} />
              <meshStandardMaterial color="#C5A059" transparent opacity={0.3} wireframe />
            </mesh>
          </group>
        </Float>
        
        <Environment preset="city" />
      </Canvas>
    </div>
  );
}