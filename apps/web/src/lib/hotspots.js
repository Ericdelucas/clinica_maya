/** Posições dos hotspots clínicos — alinhadas ao WoodenMannequin (z negativo = costas).
 *  X negativo = lado direito do paciente (esquerda da tela, de frente).
 */
export const HOTSPOT_DEFAULTS = [
  { id: 'ombro_d', label: 'Ombro Direito', region: 'Membros Superiores', position: [-0.34, 1.39, 0] },
  { id: 'ombro_e', label: 'Ombro Esquerdo', region: 'Membros Superiores', position: [0.34, 1.39, 0] },
  { id: 'cotovelo_d', label: 'Cotovelo Direito', region: 'Membros Superiores', position: [-0.58, 1.02, 0] },
  { id: 'cotovelo_e', label: 'Cotovelo Esquerdo', region: 'Membros Superiores', position: [0.58, 1.02, 0] },
  { id: 'punho_d', label: 'Punho Direito', region: 'Membros Superiores', position: [-0.66, 0.62, 0] },
  { id: 'punho_e', label: 'Punho Esquerdo', region: 'Membros Superiores', position: [0.66, 0.62, 0] },
  { id: 'pescoco_posterior', label: 'Pescoço (nuca)', region: 'Coluna', position: [0, 1.52, -0.145] },
  { id: 'coluna_cervical', label: 'Costas altas / Cervical', region: 'Coluna', position: [0, 1.40, -0.148] },
  { id: 'coluna_lombar', label: 'Costas baixas / Lombar', region: 'Coluna', position: [0, 0.95, -0.108] },
  { id: 'lombo_sacra', label: 'Lombo-sacra', region: 'Coluna', position: [0, 0.58, -0.12] },
  { id: 'epigastrio', label: 'Tórax / Abdômen (frente)', region: 'Tronco', position: [0, 1.08, 0.145] },
  { id: 'quadril_d', label: 'Quadril Direito', region: 'Membros Inferiores', position: [-0.18, 0.48, 0] },
  { id: 'quadril_e', label: 'Quadril Esquerdo', region: 'Membros Inferiores', position: [0.18, 0.48, 0] },
  { id: 'joelho_d', label: 'Joelho Direito', region: 'Membros Inferiores', position: [-0.23, -0.08, 0] },
  { id: 'joelho_e', label: 'Joelho Esquerdo', region: 'Membros Inferiores', position: [0.23, -0.08, 0] },
  { id: 'tornozelo_d', label: 'Tornozelo Direito', region: 'Membros Inferiores', position: [-0.24, -0.72, 0] },
  { id: 'tornozelo_e', label: 'Tornozelo Esquerdo', region: 'Membros Inferiores', position: [0.24, -0.72, 0] },
];

export function extractYoutubeVideoId(value) {
  try {
    const parsed = new URL(String(value || '').trim());
    if (parsed.hostname.includes('youtu.be')) {
      return parsed.pathname.split('/').filter(Boolean)[0] || '';
    }
    if (parsed.searchParams.get('v')) {
      return parsed.searchParams.get('v') || '';
    }
    const parts = parsed.pathname.split('/').filter(Boolean);
    const marker = parts.findIndex((part) => part === 'embed' || part === 'shorts' || part === 'live');
    if (marker >= 0 && parts[marker + 1]) {
      return parts[marker + 1];
    }
    return '';
  } catch {
    return '';
  }
}

export function isValidYoutubeUrl(value) {
  if (!value || typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    const isYoutubeHost = parsed.hostname.includes('youtube.com') || parsed.hostname.includes('youtu.be');
    return (
      isYoutubeHost
      && (parsed.protocol === 'https:' || parsed.protocol === 'http:')
      && Boolean(extractYoutubeVideoId(trimmed))
    );
  } catch {
    return false;
  }
}
