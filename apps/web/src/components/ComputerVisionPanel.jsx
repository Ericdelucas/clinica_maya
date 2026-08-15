import { useEffect, useRef, useState } from 'react';

/** Conexões do esqueleto MediaPipe Hands (21 landmarks). */
const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12],
  [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
  [5, 9], [9, 13], [13, 17],
];

const LINE_COLOR = '#e879f9';
const DOT_RING = '#7c3aed';
const DOT_CORE = '#faf5ff';
const GUIDE_GREEN = '#4ade80';

const WASM_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.17/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

let handLandmarkerPromise = null;

async function loadHandLandmarker() {
  if (!handLandmarkerPromise) {
    handLandmarkerPromise = (async () => {
      const { FilesetResolver, HandLandmarker } = await import('@mediapipe/tasks-vision');
      const vision = await FilesetResolver.forVisionTasks(WASM_CDN);
      try {
        return await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: MODEL_URL,
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 2,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
      } catch {
        return HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: MODEL_URL,
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numHands: 2,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
      }
    })();
  }
  return handLandmarkerPromise;
}

function palmCenter(landmarks) {
  const ids = [0, 5, 9, 13, 17];
  let x = 0;
  let y = 0;
  for (const id of ids) {
    x += landmarks[id].x;
    y += landmarks[id].y;
  }
  return { x: x / ids.length, y: y / ids.length };
}

function drawHands(ctx, width, height, hands, mirrored) {
  ctx.clearRect(0, 0, width, height);

  ctx.strokeStyle = GUIDE_GREEN;
  ctx.lineWidth = Math.max(3, width * 0.003);
  ctx.beginPath();
  ctx.moveTo(8, 12);
  ctx.lineTo(8, height - 12);
  ctx.moveTo(width - 8, 12);
  ctx.lineTo(width - 8, height - 12);
  ctx.stroke();

  if (!hands?.length) return;

  const lineW = Math.max(4, width * 0.004);
  const ringR = Math.max(7, width * 0.008);
  const coreR = Math.max(3, width * 0.0035);
  const cross = Math.max(10, width * 0.012);

  for (const landmarks of hands) {
    const toXY = (lm) => {
      const x = mirrored ? (1 - lm.x) * width : lm.x * width;
      const y = lm.y * height;
      return [x, y];
    };

    ctx.lineWidth = lineW;
    ctx.lineCap = 'round';
    ctx.strokeStyle = LINE_COLOR;
    for (const [a, b] of HAND_CONNECTIONS) {
      const [ax, ay] = toXY(landmarks[a]);
      const [bx, by] = toXY(landmarks[b]);
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
    }

    for (const lm of landmarks) {
      const [x, y] = toXY(lm);
      ctx.beginPath();
      ctx.fillStyle = DOT_RING;
      ctx.arc(x, y, ringR, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.fillStyle = DOT_CORE;
      ctx.arc(x, y, coreR, 0, Math.PI * 2);
      ctx.fill();
    }

    const center = palmCenter(landmarks);
    const [cx, cy] = toXY(center);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = Math.max(2.5, width * 0.0025);
    ctx.beginPath();
    ctx.moveTo(cx - cross, cy);
    ctx.lineTo(cx + cross, cy);
    ctx.moveTo(cx, cy - cross);
    ctx.lineTo(cx, cy + cross);
    ctx.stroke();
  }
}

export default function ComputerVisionPanel({
  layout = 'workspace',
  onClose,
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const landmarkerRef = useRef(null);
  const rafRef = useRef(0);
  const lastVideoTimeRef = useRef(-1);
  const runningRef = useRef(false);

  const [status, setStatus] = useState('Parado');
  const [isRunning, setIsRunning] = useState(false);
  const [handsDetected, setHandsDetected] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function syncCanvasSize() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
  }

  function stopVision() {
    runningRef.current = false;
    setIsRunning(false);
    setLoading(false);
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
    setHandsDetected(0);
    setStatus('Parado');
  }

  function detectLoop() {
    if (!runningRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const landmarker = landmarkerRef.current;

    if (video && canvas && landmarker && video.readyState >= 2) {
      syncCanvasSize();
      if (video.currentTime !== lastVideoTimeRef.current) {
        lastVideoTimeRef.current = video.currentTime;
        const result = landmarker.detectForVideo(video, performance.now());
        const hands = result.landmarks || [];
        setHandsDetected(hands.length);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          drawHands(ctx, canvas.width, canvas.height, hands, true);
        }
        setStatus(hands.length ? `Mão detectada (${hands.length})` : 'Procurando mão…');
      }
    }

    rafRef.current = requestAnimationFrame(detectLoop);
  }

  async function startVision() {
    setError('');
    setLoading(true);
    setStatus('Carregando modelo MediaPipe…');

    try {
      const landmarker = await loadHandLandmarker();
      landmarkerRef.current = landmarker;

      setStatus('Abrindo câmera…');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) throw new Error('Vídeo indisponível.');

      video.srcObject = stream;
      await video.play();
      syncCanvasSize();

      runningRef.current = true;
      setIsRunning(true);
      setLoading(false);
      setStatus('Câmera ativa — mostre a mão');
      lastVideoTimeRef.current = -1;
      rafRef.current = requestAnimationFrame(detectLoop);
    } catch (err) {
      stopVision();
      const message = String(err?.message || err);
      if (/NotAllowed|Permission/i.test(message)) {
        setError('Permissão da câmera negada. Autorize no navegador e tente de novo.');
      } else if (/NotFound|DevicesNotFound/i.test(message)) {
        setError('Nenhuma câmera encontrada neste aparelho.');
      } else {
        setError(message || 'Não foi possível iniciar a visão computacional.');
      }
      setStatus('Erro');
    }
  }

  useEffect(() => () => stopVision(), []);

  function handleClose() {
    stopVision();
    onClose?.();
  }

  return (
    <section className={`vision-workspace layout-${layout}`}>
      <header className="vision-workspace-header">
        <div className="vision-workspace-titles">
          <span className="vision-pro-badge">Somente profissional</span>
          <h2>Visão computacional</h2>
          <p>Rastreamento da mão em tempo real · 21 landmarks MediaPipe</p>
        </div>

        <div className="vision-workspace-actions">
          <button
            type="button"
            className="btn btn-primary"
            disabled={isRunning || loading}
            onClick={() => void startVision()}
          >
            {loading ? 'Preparando…' : isRunning ? 'Câmera ligada' : 'Iniciar câmera'}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={!isRunning}
            onClick={stopVision}
          >
            Parar
          </button>
          {onClose ? (
            <button type="button" className="btn btn-ghost" onClick={handleClose}>
              Voltar ao boneco
            </button>
          ) : null}
        </div>
      </header>

      <div className="vision-metrics">
        <div className={`vision-chip ${handsDetected ? 'ok' : ''}`}>
          <span>Status</span>
          <strong>{status}</strong>
        </div>
        <div className={`vision-chip ${handsDetected ? 'ok' : ''}`}>
          <span>Mãos</span>
          <strong>{handsDetected}</strong>
        </div>
        <div className="vision-chip">
          <span>Acesso</span>
          <strong>Profissional</strong>
        </div>
      </div>

      {error ? <p className="form-error vision-error">{error}</p> : null}

      <div className="vision-stage">
        <video
          ref={videoRef}
          className="vision-video"
          autoPlay
          playsInline
          muted
          onLoadedMetadata={syncCanvasSize}
        />
        <canvas ref={canvasRef} className="vision-canvas" />
        {!isRunning ? (
          <div className="vision-placeholder">
            <strong>Área de captura ampliada</strong>
            <span>Inicie a câmera e posicione a mão do paciente no enquadramento.</span>
          </div>
        ) : null}
      </div>
    </section>
  );
}
