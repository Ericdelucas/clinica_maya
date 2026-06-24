import { Html, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import type { AnatomicalNode } from "@smartsaude/shared";
import styles from "./AnatomicalCanvas.module.css";

export interface AnatomicalCanvasProps {
  readonly nodes: readonly AnatomicalNode[];
  readonly onHotspotClick?: (node: AnatomicalNode) => void;
}

export function AnatomicalCanvas({
  nodes,
  onHotspotClick,
}: AnatomicalCanvasProps) {
  const simulateRaycast = (node: AnatomicalNode) => {
    onHotspotClick?.(node);
    window.open(node.youtubeUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <section className={styles.container} aria-labelledby="anatomical-title">
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Mapa de movimentos</p>
          <h2 id="anatomical-title">Modelo anatômico</h2>
        </div>
        <span className={styles.hint}>Arraste para girar</span>
      </header>

      <div className={styles.canvas}>
        <Canvas camera={{ position: [0, 0, 7], fov: 45 }}>
          <ambientLight intensity={1.3} />
          <directionalLight position={[4, 6, 5]} intensity={2} />

          {/* Placeholder visual: o modelo GLTF será inserido nesta cena. */}
          <mesh>
            <capsuleGeometry args={[0.85, 2.7, 8, 24]} />
            <meshStandardMaterial color="#dcece7" roughness={0.7} />
          </mesh>

          {nodes.map((node) => (
            <mesh
              key={node.id}
              position={[
                node.coordenadas.x,
                node.coordenadas.y,
                node.coordenadas.z,
              ]}
              onClick={(event) => {
                event.stopPropagation();
                simulateRaycast(node);
              }}
              scale={1.25}
            >
              <sphereGeometry args={[0.13, 24, 24]} />
              <meshStandardMaterial
                color="#ec765e"
                emissive="#8d2d20"
                emissiveIntensity={0.35}
              />
              <Html center distanceFactor={8}>
                <span className={styles.hotspotLabel}>{node.nomeArticulacao}</span>
              </Html>
            </mesh>
          ))}

          <OrbitControls enablePan={false} minDistance={4} maxDistance={10} />
        </Canvas>
      </div>

      <div className={styles.touchTargets} aria-label="Articulações disponíveis">
        {nodes.map((node) => (
          <button
            key={node.id}
            type="button"
            onClick={() => simulateRaycast(node)}
          >
            {node.nomeArticulacao}
          </button>
        ))}
      </div>
    </section>
  );
}
