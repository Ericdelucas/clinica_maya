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
        // Fallback CPU se GPU/WebGL falhar
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
  // Centro aproximado da palma: wrist + bases dos dedos
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

  // Guias laterais verdes (como na referência)
  ctx.strokeStyle = GUIDE_GREEN;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(6, 8);
  ctx.lineTo(6, height - 8);
  ctx.moveTo(width - 6, 8);
  ctx.lineTo(width - 6, height - 8);
  ctx.stroke();

  if (!hands?.length) return;

  for (const landmarks of hands) {
    const toXY = (lm) => {
      const x = mirrored ? (1 - lm.x) * width : lm.x * width;
      const y = lm.y * height;
      return [x, y];
    };

    ctx.lineWidth = 4;
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
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.fillStyle = DOT_CORE;
      ctx.arc(x, y, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }

    const center = palmCenter(landmarks);
    const [cx, cy] = toXY(center);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy);
    ctx.lineTo(cx + 10, cy);
    ctx.moveTo(cx, cy - 10);
    ctx.lineTo(cx, cy + 10);
    ctx.stroke();
  }
}

export default function ComputerVisionPanel() {
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

  function syncCanvasSize() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
  }

  function stopVision() {
    runningRef.current = false;
    setIsRunning(false);
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
    setStatus('Carregando modelo MediaPipe…');

    try {
      const landmarker = await loadHandLandmarker();
      landmarkerRef.current = landmarker;

      setStatus('Abrindo câmera…');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
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

  return (
    <section className="panel-section vision-panel">
      <h3>Visão computacional</h3>
      <p className="muted">
        Câmera com rastreamento da mão em tempo real (21 pontinhos + esqueleto), no estilo MediaPipe.
      </p>

      <div className="vision-toolbar">
        <button
          type="button"
          className="btn btn-primary"
          disabled={isRunning}
          onClick={() => void startVision()}
        >
          Iniciar câmera
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          disabled={!isRunning}
          onClick={stopVision}
        >
          Parar
        </button>
        <span className={`vision-status ${handsDetected ? 'ok' : ''}`}>{status}</span>
      </div>

      {error ? <p className="form-error">{error}</p> : null}

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
            <strong>Mão em foco</strong>
            <span>Clique em Iniciar câmera e posicione a mão na frente.</span>
          </div>
        ) : null}
      </div>
    </section>
  );
}
