import * as React from 'react';

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    mql.addEventListener('change', onChange);
    onChange();
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return isMobile;
}

const wood = '#bd7f3f';
const jointWood = '#d0a069';
const darkWood = '#8f592c';
const frontAccent = '#f7c873';
const backAccent = '#60a5fa';
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

function TaperedBody({ position, height, topRadius, bottomRadius, depthScale, color, rotation = [0, 0, 0] }) {
  return (
    <mesh position={position} rotation={rotation} scale={[1, 1, depthScale]} castShadow receiveShadow>
      <cylinderGeometry args={[topRadius, bottomRadius, height, 40]} />
      <meshStandardMaterial color={color} roughness={0.48} metalness={0.03} />
    </mesh>
  );
}

function DetailLine({ position, length, color, rotation = [0, 0, 0], radius = 0.01 }) {
  return (
    <mesh position={position} rotation={rotation} castShadow>
      <cylinderGeometry args={[radius, radius, length, 12]} />
      <meshStandardMaterial color={color} roughness={0.4} />
    </mesh>
  );
}

function FrontBadge({ position, radius = 0.085 }) {
  return (
    <mesh position={position} rotation={[0, 0, 0]} castShadow>
      <circleGeometry args={[radius, 28]} />
      <meshStandardMaterial color={frontAccent} roughness={0.35} metalness={0.02} />
    </mesh>
  );
}

function BackMarker({ position, radius = 0.045 }) {
  return (
    <mesh position={position} rotation={[0, Math.PI, 0]} castShadow>
      <circleGeometry args={[radius, 24]} />
      <meshStandardMaterial color={backAccent} emissive="#1d4ed8" emissiveIntensity={0.15} roughness={0.32} />
    </mesh>
  );
}

export default function WoodenMannequin() {
  const points = {
    neck: [0, 1.55, 0],
    chestTop: [0, 1.42, 0],
    chestBottom: [0, 0.82, 0],
    pelvis: [0, 0.52, 0],
    shoulderR: [0.34, 1.39, 0],
    shoulderL: [-0.34, 1.39, 0],
    elbowR: [0.58, 1.02, 0],
    elbowL: [-0.58, 1.02, 0],
    wristR: [0.66, 0.62, 0],
    wristL: [-0.66, 0.62, 0],
    hipR: [0.18, 0.48, 0],
    hipL: [-0.18, 0.48, 0],
    kneeR: [0.23, -0.08, 0],
    kneeL: [-0.23, -0.08, 0],
    ankleR: [0.24, -0.72, 0],
    ankleL: [-0.24, -0.72, 0],
  };

  return (
    <group position={[0, 0.12, 0]} scale={1.08}>
      <Ellipsoid position={[0, 1.78, 0.035]} scale={[0.145, 0.195, 0.13]} color={skinLight} />

      <mesh position={[0, 1.78, 0.16]} scale={[0.055, 0.075, 0.032]} castShadow>
        <sphereGeometry args={[1, 20, 20]} />
        <meshStandardMaterial color={darkWood} roughness={0.38} />
      </mesh>
      <mesh position={[-0.052, 1.825, 0.155]} castShadow>
        <sphereGeometry args={[0.014, 12, 12]} />
        <meshStandardMaterial color="#1f130a" roughness={0.4} />
      </mesh>
      <mesh position={[0.052, 1.825, 0.155]} castShadow>
        <sphereGeometry args={[0.014, 12, 12]} />
        <meshStandardMaterial color="#1f130a" roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.73, 0.15]} rotation={[0, 0, 0]} castShadow>
        <torusGeometry args={[0.043, 0.006, 8, 24, Math.PI]} />
        <meshStandardMaterial color="#1f130a" roughness={0.4} />
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

      <DetailLine position={[0, 1.47, 0.01]} length={0.62} color={skinShadow} rotation={[0, 0, Math.PI / 2]} radius={0.018} />
      <DetailLine position={[0, 0.62, 0.01]} length={0.44} color={skinShadow} rotation={[0, 0, Math.PI / 2]} radius={0.014} />

      <FrontBadge position={[0, 1.31, 0.175]} radius={0.08} />
      <FrontBadge position={[-0.09, 1.15, 0.17]} radius={0.04} />
      <FrontBadge position={[0.09, 1.15, 0.17]} radius={0.04} />
      <mesh position={[0, 0.86, 0.15]} castShadow>
        <sphereGeometry args={[0.018, 12, 12]} />
        <meshStandardMaterial color={darkWood} roughness={0.42} />
      </mesh>

      {[1.44, 1.25, 1.06, 0.87, 0.68].map((y) => (
        <BackMarker key={y} position={[0, y, -0.145]} />
      ))}
      <Ellipsoid position={[-0.13, 1.3, -0.15]} scale={[0.1, 0.12, 0.018]} color="#8b5a31" rotation={[0.2, -0.25, 0.1]} />
      <Ellipsoid position={[0.13, 1.3, -0.15]} scale={[0.1, 0.12, 0.018]} color="#8b5a31" rotation={[0.2, 0.25, -0.1]} />

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

      <Ellipsoid position={[0.69, 0.55, 0.04]} scale={[0.045, 0.075, 0.035]} color={skinLight} />
      <Ellipsoid position={[-0.69, 0.55, 0.04]} scale={[0.045, 0.075, 0.035]} color={skinLight} />
      <Ellipsoid position={[0.25, -0.78, 0.1]} scale={[0.065, 0.035, 0.14]} color={skinLight} rotation={[0.2, 0, 0]} />
      <Ellipsoid position={[-0.25, -0.78, 0.1]} scale={[0.065, 0.035, 0.14]} color={skinLight} rotation={[0.2, 0, 0]} />

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
    </group>
  );
}
