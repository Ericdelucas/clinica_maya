/** Posições dos hotspots clínicos — alinhadas ao WoodenMannequin (z negativo = costas) */
export const HOTSPOT_DEFAULTS = [
  { id: 'ombro_d', label: 'Ombro Direito', region: 'Membros Superiores', position: [0.34, 1.39, 0] },
  { id: 'ombro_e', label: 'Ombro Esquerdo', region: 'Membros Superiores', position: [-0.34, 1.39, 0] },
  { id: 'cotovelo_d', label: 'Cotovelo Direito', region: 'Membros Superiores', position: [0.58, 1.02, 0] },
  { id: 'cotovelo_e', label: 'Cotovelo Esquerdo', region: 'Membros Superiores', position: [-0.58, 1.02, 0] },
  { id: 'punho_d', label: 'Punho Direito', region: 'Membros Superiores', position: [0.66, 0.62, 0] },
  { id: 'punho_e', label: 'Punho Esquerdo', region: 'Membros Superiores', position: [-0.66, 0.62, 0] },
  // Costas: alinhados à superfície do tronco (z negativo = trás)
  { id: 'coluna_cervical', label: 'Costas altas / Cervical', region: 'Coluna', position: [0, 1.40, -0.148] },
  { id: 'coluna_lombar', label: 'Costas baixas / Lombar', region: 'Coluna', position: [0, 0.95, -0.108] },
  { id: 'quadril_d', label: 'Quadril Direito', region: 'Membros Inferiores', position: [0.18, 0.48, 0] },
  { id: 'quadril_e', label: 'Quadril Esquerdo', region: 'Membros Inferiores', position: [-0.18, 0.48, 0] },
  { id: 'joelho_d', label: 'Joelho Direito', region: 'Membros Inferiores', position: [0.23, -0.08, 0] },
  { id: 'joelho_e', label: 'Joelho Esquerdo', region: 'Membros Inferiores', position: [-0.23, -0.08, 0] },
  { id: 'tornozelo_d', label: 'Tornozelo Direito', region: 'Membros Inferiores', position: [0.24, -0.72, 0] },
  { id: 'tornozelo_e', label: 'Tornozelo Esquerdo', region: 'Membros Inferiores', position: [-0.24, -0.72, 0] },
];

export function isValidYoutubeUrl(value) {
  if (!value || typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    return (
      (parsed.hostname.includes('youtube.com') || parsed.hostname.includes('youtu.be'))
      && (parsed.protocol === 'https:' || parsed.protocol === 'http:')
    );
  } catch {
    return false;
  }
}
