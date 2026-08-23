import { useEffect, useRef, useState } from 'react';
import {
  analyzeTypingPosture,
  averageSide,
} from '../lib/typingPosture.js';

const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12],
  [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
  [5, 9], [9, 13], [13, 17],
];

const COLOR_OK = '#4ade80';
const COLOR_ALERT = '#ef4444';
const COLOR_MILD = '#f59e0b';
const DOT_CORE = '#faf5ff';
const GUIDE_GREEN = '#4ade80';

const WASM_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.17/wasm';
const HAND_MODEL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

let modelsPromise = null;

async function loadVisionModels() {
  if (!modelsPromise) {
    modelsPromise = (async () => {
      const { FilesetResolver, HandLandmarker } = await import('@mediapipe/tasks-vision');
      const vision = await FilesetResolver.forVisionTasks(WASM_CDN);

      async function create(delegate) {
        const hands = await HandLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: HAND_MODEL, delegate },
          runningMode: 'VIDEO',
          numHands: 2,
          minHandDetectionConfidence: 0.35,
          minHandPresenceConfidence: 0.35,
          minTrackingConfidence: 0.35,
        });
        return { hands };
      }

      try {
        return await create('GPU');
      } catch {
        return create('CPU');
      }
    })();
  }
  return modelsPromise;
}

function toXY(lm, width, height, mirrored) {
  const x = mirrored ? (1 - lm.x) * width : lm.x * width;
  const y = lm.y * height;
  return [x, y];
}

function colorFor(side) {
  if (!side?.ready) return COLOR_OK;
  if (!side.ok) return COLOR_ALERT;
  if (side.mild) return COLOR_MILD;
  return COLOR_OK;
}

function drawForearmSegment(ctx, points, color, width, height, mirrored, lineW) {
  if (!points?.elbow || !points?.wrist || !points?.handDir) return;

  const elbow = toXY(points.elbow, width, height, mirrored);
  const wrist = toXY(points.wrist, width, height, mirrored);
  const handDir = toXY(points.handDir, width, height, mirrored);

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = color;
  ctx.lineWidth = lineW * 1.35;
  ctx.beginPath();
  ctx.moveTo(elbow[0], elbow[1]);
  ctx.lineTo(wrist[0], wrist[1]);
  ctx.lineTo(handDir[0], handDir[1]);
  ctx.stroke();

  const dotR = Math.max(8, width * 0.009);
  const coreR = Math.max(3.5, width * 0.004);
  for (const [lm, label] of [[points.elbow, 'A'], [points.wrist, 'P'], [points.handDir, null]]) {
    const [x, y] = toXY(lm, width, height, mirrored);
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.arc(x, y, dotR, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = DOT_CORE;
    ctx.arc(x, y, coreR, 0, Math.PI * 2);
    ctx.fill();
    if (label) {
      ctx.font = `800 ${Math.max(11, Math.round(width * 0.012))}px Nunito, sans-serif`;
      ctx.fillStyle = color;
      ctx.fillText(label, x + 10, y - 8);
    }
  }
}

function drawHand(ctx, landmarks, color, width, height, mirrored, lineW) {
  const to = (lm) => toXY(lm, width, height, mirrored);
  ctx.lineWidth = lineW;
  ctx.lineCap = 'round';
  ctx.strokeStyle = color;
  for (const [a, b] of HAND_CONNECTIONS) {
    const [ax, ay] = to(landmarks[a]);
    const [bx, by] = to(landmarks[b]);
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();
  }

  const ringR = Math.max(6, width * 0.007);
  const coreR = Math.max(2.8, width * 0.003);
  for (const lm of landmarks) {
    const [x, y] = to(lm);
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.arc(x, y, ringR, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = DOT_CORE;
    ctx.arc(x, y, coreR, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawLabel(ctx, poseIndex, text, width, height, mirrored, color) {
  const lm = poseIndex;
  if (!lm || !text) return;
  const [x, y] = toXY(lm, width, height, mirrored);
  ctx.font = `700 ${Math.max(14, Math.round(width * 0.016))}px Nunito, sans-serif`;
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.75)';
  ctx.fillStyle = color;
  ctx.strokeText(text, x + 10, y - 10);
  ctx.fillText(text, x + 10, y - 10);
}

function handMatchesWrist(hand, wrist) {
  if (!hand?.[0] || !wrist) return false;
  const d = (hand[0].x - wrist.x) ** 2 + (hand[0].y - wrist.y) ** 2;
  return d < 0.01;
}

function drawScene(ctx, width, height, hands, posture, mirrored) {
  ctx.clearRect(0, 0, width, height);

  ctx.strokeStyle = GUIDE_GREEN;
  ctx.lineWidth = Math.max(3, width * 0.003);
  ctx.beginPath();
  ctx.moveTo(8, 12);
  ctx.lineTo(8, height - 12);
  ctx.moveTo(width - 8, 12);
  ctx.lineTo(width - 8, height - 12);
  ctx.stroke();

  const lineW = Math.max(5, width * 0.0045);
  const leftColor = colorFor(posture.left);
  const rightColor = colorFor(posture.right);

  if (posture.left.ready && posture.left.points) {
    drawForearmSegment(ctx, posture.left.points, leftColor, width, height, mirrored, lineW);
    if (posture.left.bend != null) {
      drawLabel(ctx, posture.left.points.wrist, `${Math.round(posture.left.bend)}°`, width, height, mirrored, leftColor);
    }
  }
  if (posture.right.ready && posture.right.points) {
    drawForearmSegment(ctx, posture.right.points, rightColor, width, height, mirrored, lineW);
    if (posture.right.bend != null) {
      drawLabel(ctx, posture.right.points.wrist, `${Math.round(posture.right.bend)}°`, width, height, mirrored, rightColor);
    }
  }

  for (const hand of hands || []) {
    let color = COLOR_OK;
    if (posture.left.ready && handMatchesWrist(hand, posture.left.points?.wrist)) {
      color = leftColor;
    } else if (posture.right.ready && handMatchesWrist(hand, posture.right.points?.wrist)) {
      color = rightColor;
    }
    drawHand(ctx, hand, color, width, height, mirrored, lineW * 0.55);
  }
}

function formatAngle(value, suffix = '°') {
  return value == null ? '—' : `${Math.round(value)}${suffix}`;
}

export default function ComputerVisionPanel({
  layout = 'workspace',
  onClose,
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const modelsRef = useRef(null);
  const rafRef = useRef(0);
  const lastVideoTimeRef = useRef(-1);
  const runningRef = useRef(false);
  const historyRef = useRef({ left: [], right: [] });
  const sideStateRef = useRef({
    left: { alert: false, miss: 0, lastReady: null },
    right: { alert: false, miss: 0, lastReady: null },
  });
  const trackStateRef = useRef({
    slots: { leftX: null, rightX: null },
    expected: null,
  });
  const statusHoldRef = useRef({ text: 'Parado', since: 0 });

  const [status, setStatus] = useState('Parado');
  const [isRunning, setIsRunning] = useState(false);
  const [handsDetected, setHandsDetected] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [posture, setPosture] = useState({
    left: { ready: false, ok: true, bend: null },
    right: { ready: false, ok: true, bend: null },
    anyAlert: false,
    message: '',
  });

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
    historyRef.current = { left: [], right: [] };
    sideStateRef.current = {
      left: { alert: false, miss: 0, lastReady: null },
      right: { alert: false, miss: 0, lastReady: null },
    };
    trackStateRef.current = {
      slots: { leftX: null, rightX: null },
      expected: null,
    };
    statusHoldRef.current = { text: 'Parado', since: 0 };
    setHandsDetected(0);
    setPosture({
      left: { ready: false, ok: true, bend: null },
      right: { ready: false, ok: true, bend: null },
      anyAlert: false,
      message: '',
    });
    setStatus('Parado');
  }

  function setStableStatus(nextText) {
    const now = performance.now();
    const hold = statusHoldRef.current;
    if (nextText === hold.text) {
      setStatus(nextText);
      return;
    }
    if (now - hold.since < 450) return;
    hold.text = nextText;
    hold.since = now;
    setStatus(nextText);
  }

  function detectLoop() {
    if (!runningRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const models = modelsRef.current;

    if (video && canvas && models && video.readyState >= 2) {
      syncCanvasSize();
      if (video.currentTime !== lastVideoTimeRef.current) {
        lastVideoTimeRef.current = video.currentTime;
        const now = performance.now();
        const handResult = models.hands.detectForVideo(video, now);
        const hands = handResult.landmarks || [];
        const handSides = (handResult.handedness || []).map(
          (entry) => entry?.[0]?.categoryName,
        );
        const raw = analyzeTypingPosture(
          null,
          hands,
          handSides,
          trackStateRef.current,
        );
        const left = averageSide(
          historyRef.current.left,
          raw.left,
          sideStateRef.current.left,
        );
        const right = averageSide(
          historyRef.current.right,
          raw.right,
          sideStateRef.current.right,
        );
        const alerts = [];
        if (!left.ok && left.ready) alerts.push(`Esquerdo: ${left.reasons.join(', ')}`);
        if (!right.ok && right.ready) alerts.push(`Direito: ${right.reasons.join(', ')}`);
        const ready = left.ready || right.ready;
        const next = {
          left,
          right,
          anyAlert: alerts.length > 0,
          message: alerts.length ? alerts.join(' · ') : raw.message,
        };

        setHandsDetected(hands.length);
        setPosture(next);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          drawScene(ctx, canvas.width, canvas.height, hands, next, true);
        }
        if (next.anyAlert) {
          setStableStatus('Ajuste a postura');
        } else if (ready) {
          setStableStatus('Postura ok');
        } else {
          setStableStatus('Procurando mãos…');
        }
      }
    }

    rafRef.current = requestAnimationFrame(detectLoop);
  }

  async function startVision() {
    setError('');
    setLoading(true);
    setStatus('Carregando MediaPipe (mãos)…');

    try {
      const models = await loadVisionModels();
      modelsRef.current = models;

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
      setStatus('Câmera ativa — mostre as mãos');
      lastVideoTimeRef.current = -1;
      historyRef.current = { left: [], right: [] };
      sideStateRef.current = {
        left: { alert: false, miss: 0, lastReady: null },
        right: { alert: false, miss: 0, lastReady: null },
      };
      trackStateRef.current = {
        slots: { leftX: null, rightX: null },
        expected: null,
      };
      statusHoldRef.current = { text: 'Câmera ativa — mostre as mãos', since: performance.now() };
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

  const alertActive = Boolean(isRunning && posture.anyAlert);

  return (
    <section className={`vision-workspace layout-${layout}`}>
      <header className="vision-workspace-header">
        <div className="vision-workspace-titles">
          <span className="vision-pro-badge">Somente profissional</span>
          <h2>Visão computacional</h2>
          <p>Duas mãos: eixo compartilhado entre os punhos — acompanha as duas sem exigir cotovelo</p>
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
        <div className={`vision-chip ${handsDetected || posture.left.ready || posture.right.ready ? 'ok' : ''} ${alertActive ? 'alert' : ''}`}>
          <span>Status</span>
          <strong>{status}</strong>
        </div>
        <div className={`vision-chip ${posture.left.ready && posture.left.ok ? 'ok' : ''} ${posture.left.ready && !posture.left.ok ? 'alert' : ''}`}>
          <span>Esquerdo</span>
          <strong>{posture.left.ready ? formatAngle(posture.left.bend) : '—'}</strong>
        </div>
        <div className={`vision-chip ${posture.right.ready && posture.right.ok ? 'ok' : ''} ${posture.right.ready && !posture.right.ok ? 'alert' : ''}`}>
          <span>Direito</span>
          <strong>{posture.right.ready ? formatAngle(posture.right.bend) : '—'}</strong>
        </div>
      </div>

      {error ? <p className="form-error vision-error">{error}</p> : null}
      {isRunning && posture.message ? (
        <p className={`vision-posture-msg ${alertActive ? 'alert' : 'ok'}`}>
          {posture.message}
        </p>
      ) : null}

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
            <strong>Basta mostrar as mãos</strong>
            <span>
              Não precisa enquadrar cotovelo nem braço inteiro. Linha A→P→mão = antebraço estimado → punho → mão. Vermelho = desvio no punho.
            </span>
          </div>
        ) : null}
      </div>
    </section>
  );
}
