import { Html } from '@react-three/drei';
import { useMemo } from 'react';

const wood = '#bd7f3f';
const jointWood = '#d0a069';
const darkWood = '#8f592c';
const skin = '#d7a16b';
const skinLight = '#e2b886';
const skinShadow = '#a96a35';

function midpoint(a, b) {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
}

function lengthBetween(a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const dz = b[2] - a[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function rotationBetween(a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  return [0, 0, -Math.atan2(dx, dy)];
}

function Bone({ from, to, radius = 0.055 }) {
  return (
    <mesh position={midpoint(from, to)} rotation={rotationBetween(from, to)} castShadow receiveShadow>
      <cylinderGeometry args={[radius, radius, lengthBetween(from, to), 24]} />
      <meshStandardMaterial color={wood} roughness={0.48} metalness={0.04} />
    </mesh>
  );
}

function Limb({ from, to, topRadius = 0.06, bottomRadius = 0.05, color = skin }) {
  return (
    <mesh position={midpoint(from, to)} rotation={rotationBetween(from, to)} castShadow receiveShadow>
      <cylinderGeometry args={[bottomRadius, topRadius, lengthBetween(from, to), 28]} />
      <meshStandardMaterial color={color} roughness={0.5} metalness={0.02} />
    </mesh>
  );
}

function Joint({ position, radius = 0.095 }) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <sphereGeometry args={[radius, 28, 28]} />
      <meshStandardMaterial color={jointWood} roughness={0.42} metalness={0.05} />
    </mesh>
  );
}

function Ellipsoid({ position, scale, color = wood, rotation = [0, 0, 0] }) {
  return (
    <mesh position={position} scale={scale} rotation={rotation} castShadow receiveShadow>
      <sphereGeometry args={[1, 36, 36]} />
      <meshStandardMaterial color={color} roughness={0.46} metalness={0.04} />
    </mesh>
  );
}

function TaperedBody({ position, height, topRadius, bottomRadius, depthScale, color }) {
  return (
    <mesh position={position} scale={[1, 1, depthScale]} castShadow receiveShadow>
      <cylinderGeometry args={[topRadius, bottomRadius, height, 40]} />
      <meshStandardMaterial color={color} roughness={0.48} metalness={0.03} />
    </mesh>
  );
}

/** Âncoras fixas no mesh — evita hotspots flutuando fora do corpo */
const MESH_ALIGNED_POSITIONS = {
  pescoco_posterior: [0, 1.52, -0.145],
  coluna_cervical: [0, 1.40, -0.148],
  coluna_lombar: [0, 0.95, -0.108],
  lombo_sacra: [0, 0.58, -0.12],
  epigastrio: [0, 1.08, 0.145],
};

function HotspotSphere({ hotspot, selected, onSelect }) {
  const position = useMemo(() => {
    const aligned = MESH_ALIGNED_POSITIONS[hotspot.id];
    if (aligned) return aligned;
    const [x, y, z] = hotspot.position;
    return [x, y, z];
  }, [hotspot.id, hotspot.position]);

  const radius = (
    hotspot.id.startsWith('coluna_')
    || hotspot.id === 'pescoco_posterior'
    || hotspot.id === 'lombo_sacra'
    || hotspot.id === 'epigastrio'
  ) ? 0.07 : 0.078;

  return (
    <mesh
      position={position}
      onClick={(event) => {
        event.stopPropagation();
        onSelect?.(hotspot);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto';
      }}
    >
      <sphereGeometry args={[radius, 24, 24]} />
      <meshStandardMaterial
        color={selected ? '#ff6b6b' : '#e53935'}
        emissive={selected ? '#ff8787' : '#b71c1c'}
        emissiveIntensity={selected ? 0.55 : 0.28}
        roughness={0.35}
        metalness={0.1}
        transparent
        opacity={0.92}
      />
    </mesh>
  );
}

export default function WoodenMannequin({ hotspots = [], selectedId = null, mode = 'patient', onSelect }) {
  const points = {
    neck: [0, 1.55, 0],
    chestTop: [0, 1.42, 0],
    chestBottom: [0, 0.82, 0],
    pelvis: [0, 0.52, 0],
    // Direito do paciente = X negativo (esquerda da tela, de frente)
    shoulderR: [-0.34, 1.39, 0],
    shoulderL: [0.34, 1.39, 0],
    elbowR: [-0.58, 1.02, 0],
    elbowL: [0.58, 1.02, 0],
    wristR: [-0.66, 0.62, 0],
    wristL: [0.66, 0.62, 0],
    hipR: [-0.18, 0.48, 0],
    hipL: [0.18, 0.48, 0],
    kneeR: [-0.23, -0.08, 0],
    kneeL: [0.23, -0.08, 0],
    ankleR: [-0.24, -0.72, 0],
    ankleL: [0.24, -0.72, 0],
  };

  return (
    <group position={[0, 0.12, 0]} scale={1.08}>
      <Ellipsoid position={[0, 1.78, 0.035]} scale={[0.145, 0.195, 0.13]} color={skinLight} />

      <mesh position={[0, 1.78, 0.16]} scale={[0.055, 0.075, 0.032]} castShadow>
        <sphereGeometry args={[1, 20, 20]} />
        <meshStandardMaterial color={darkWood} roughness={0.38} />
      </mesh>

      <TaperedBody
        position={[0, 1.17, 0]}
        height={0.56}
        topRadius={0.28}
        bottomRadius={0.17}
        depthScale={0.58}
        color={skin}
      />
      <TaperedBody
        position={[0, 0.79, 0.015]}
        height={0.28}
        topRadius={0.15}
        bottomRadius={0.13}
        depthScale={0.48}
        color="#c68b55"
      />
      <TaperedBody
        position={[0, 0.52, 0]}
        height={0.2}
        topRadius={0.18}
        bottomRadius={0.24}
        depthScale={0.55}
        color={skinShadow}
      />

      <Bone from={[0, 1.62, 0]} to={points.neck} radius={0.055} />
      <Bone from={points.chestTop} to={points.chestBottom} radius={0.055} />
      <Bone from={points.chestBottom} to={points.pelvis} radius={0.045} />
      <Bone from={points.shoulderL} to={points.shoulderR} radius={0.045} />
      <Bone from={points.hipL} to={points.hipR} radius={0.045} />

      <Limb from={points.shoulderR} to={points.elbowR} topRadius={0.07} bottomRadius={0.052} />
      <Limb from={points.elbowR} to={points.wristR} topRadius={0.048} bottomRadius={0.038} color={skinLight} />
      <Limb from={points.shoulderL} to={points.elbowL} topRadius={0.07} bottomRadius={0.052} />
      <Limb from={points.elbowL} to={points.wristL} topRadius={0.048} bottomRadius={0.038} color={skinLight} />

      <Limb from={points.hipR} to={points.kneeR} topRadius={0.085} bottomRadius={0.065} color="#c98850" />
      <Limb from={points.kneeR} to={points.ankleR} topRadius={0.06} bottomRadius={0.043} color={skinLight} />
      <Limb from={points.hipL} to={points.kneeL} topRadius={0.085} bottomRadius={0.065} color="#c98850" />
      <Limb from={points.kneeL} to={points.ankleL} topRadius={0.06} bottomRadius={0.043} color={skinLight} />

      <Ellipsoid position={[-0.69, 0.55, 0.04]} scale={[0.045, 0.075, 0.035]} color={skinLight} />
      <Ellipsoid position={[0.69, 0.55, 0.04]} scale={[0.045, 0.075, 0.035]} color={skinLight} />
      <Ellipsoid position={[-0.25, -0.78, 0.1]} scale={[0.065, 0.035, 0.14]} color={skinLight} rotation={[0.2, 0, 0]} />
      <Ellipsoid position={[0.25, -0.78, 0.1]} scale={[0.065, 0.035, 0.14]} color={skinLight} rotation={[0.2, 0, 0]} />

      <Joint position={points.neck} radius={0.055} />
      <Joint position={points.shoulderR} radius={0.075} />
      <Joint position={points.shoulderL} radius={0.075} />
      <Joint position={points.elbowR} radius={0.055} />
      <Joint position={points.elbowL} radius={0.055} />
      <Joint position={points.wristR} radius={0.044} />
      <Joint position={points.wristL} radius={0.044} />
      <Joint position={points.hipR} radius={0.065} />
      <Joint position={points.hipL} radius={0.065} />
      <Joint position={points.kneeR} radius={0.06} />
      <Joint position={points.kneeL} radius={0.06} />
      <Joint position={points.ankleR} radius={0.048} />
      <Joint position={points.ankleL} radius={0.048} />

      <Html position={[-0.52, 1.52, 0]} center distanceFactor={8}>
        <span className="side-tag" aria-label="Lado direito do paciente">D</span>
      </Html>
      <Html position={[0.52, 1.52, 0]} center distanceFactor={8}>
        <span className="side-tag" aria-label="Lado esquerdo do paciente">E</span>
      </Html>

      {hotspots.map((hotspot) => (
        <HotspotSphere
          key={hotspot.id}
          hotspot={hotspot}
          selected={mode === 'admin' && selectedId === hotspot.id}
          onSelect={onSelect}
        />
      ))}
    </group>
  );
}
