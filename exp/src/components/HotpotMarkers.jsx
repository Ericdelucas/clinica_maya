import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';

function PulsingHotspot({ hotspot, isSelected, isHovered, onClick, onHover }) {
  const coreRef = useRef();
  const glowRef = useRef();
  const [localHover, setLocalHover] = useState(false);
  const active = isHovered || localHover;

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (coreRef.current) {
      const s = active ? 1.4 : isSelected ? 1.2 : 1.0;
      const pulse = 1 + Math.sin(t * 3.5) * (active ? 0.22 : 0.1);
      coreRef.current.scale.setScalar(s * pulse);
    }
    if (glowRef.current) {
      const gp = 0.12 + Math.sin(t * 2.5 + 1) * 0.05;
      glowRef.current.material.opacity = active ? gp + 0.18 : gp;
      glowRef.current.scale.setScalar(1 + Math.sin(t * 2) * 0.1);
    }
  });

  const handleClick = (e) => {
    e.stopPropagation();
    onClick(hotspot.id);
  };

  const handlePointerOver = (e) => {
    e.stopPropagation();
    setLocalHover(true);
    onHover(hotspot.id);
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = (e) => {
    e.stopPropagation();
    setLocalHover(false);
    onHover(null);
    document.body.style.cursor = 'default';
  };

  return (
    <group position={hotspot.position}>

      {/* Outer glow — visual only */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.058, 12, 12]} />
        <meshStandardMaterial
          color="#ff0022"
          transparent
          opacity={0.15}
          emissive="#ff0022"
          emissiveIntensity={0.6}
        />
      </mesh>

      {/* Core dot — visual only, no events */}
      <mesh ref={coreRef} castShadow>
        <sphereGeometry args={[0.048, 12, 12]} />
        <meshStandardMaterial
          color={isSelected ? '#ff4466' : '#ff0022'}
          emissive={isSelected ? '#ff2244' : '#cc0011'}
          emissiveIntensity={active ? 1.1 : 0.65}
          roughness={0.3}
        />
      </mesh>

      {/* Selection ring — visual only */}
      {isSelected && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.09, 0.11, 20]} />
          <meshStandardMaterial
            color="#ff4466"
            transparent
            opacity={0.7}
            emissive="#ff0022"
            emissiveIntensity={0.5}
          />
        </mesh>
      )}

      {/* INVISIBLE HITBOX — large touch target for mobile */}
      <mesh
        visible={false}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

    </group>
  );
}

export default function HotspotMarkers({ hotspots, selectedId, hoveredId, onHotspotClick, onHover }) {
  return (
    <group>
      {hotspots.map(hs => (
        <PulsingHotspot
          key={hs.id}
          hotspot={hs}
          isSelected={selectedId === hs.id}
          isHovered={hoveredId === hs.id}
          onClick={onHotspotClick}
          onHover={onHover}
        />
      ))}
    </group>
  );
}