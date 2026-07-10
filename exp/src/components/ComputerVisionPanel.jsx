import React, { useEffect, useRef, useState } from 'react';

const POSE_LINKS = [
  ['left_shoulder', 'left_elbow'],
  ['left_elbow', 'left_wrist'],
  ['right_shoulder', 'right_elbow'],
  ['right_elbow', 'right_wrist'],
  ['left_shoulder', 'right_shoulder'],
  ['left_hip', 'right_hip'],
  ['left_hip', 'left_knee'],
  ['left_knee', 'left_ankle'],
  ['right_hip', 'right_knee'],
  ['right_knee', 'right_ankle'],
  ['left_shoulder', 'left_hip'],
  ['right_shoulder', 'right_hip'],
];

function drawFallbackGuide(ctx, width, height) {
  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = 'rgba(37, 99, 235, 0.55)';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 10]);
  ctx.beginPath();
  ctx.ellipse(width / 2, height * 0.5, width * 0.24, height * 0.36, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
}

function toPoint(point, canvas, mirror = true) {
  let x = point[0] * canvas.width;
  const y = point[1] * canvas.height;
  if (mirror) x = canvas.width - x;
  return [x, y];
}

function drawPose(canvas, data) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const landmarks = data.landmarks || {};
  const keys = Object.keys(landmarks);
  if (!keys.length) {
    drawFallbackGuide(ctx, canvas.width, canvas.height);
    return;
  }

  ctx.lineWidth = 3;
  ctx.strokeStyle = '#4ade80';
  POSE_LINKS.forEach(([a, b]) => {
    if (!landmarks[a] || !landmarks[b]) return;
    const [ax, ay] = toPoint(landmarks[a], canvas);
    const [bx, by] = toPoint(landmarks[b], canvas);
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();
  });

  ctx.fillStyle = '#fb7185';
  keys.forEach((key) => {
    const [x, y] = toPoint(landmarks[key], canvas);
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
  });

  const angles = data.joint_angles || {};
  ctx.font = '600 14px Inter, Arial, sans-serif';
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#05060c';
  Object.entries(angles).slice(0, 4).forEach(([key, value], index) => {
    const text = `${key}: ${Number(value).toFixed(0)} deg`;
    const x = 14;
    const y = 22 + index * 20;
    ctx.strokeText(text, x, y);
    ctx.fillText(text, x, y);
  });
}

export default function ComputerVisionPanel({ onBack }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const captureCanvasRef = useRef(null);
  const streamRef = useRef(null);
  const wsRef = useRef(null);
  const frameRequestRef = useRef(null);
  const lastSendRef = useRef(0);
  const hasPoseResponseRef = useRef(false);

  const [wsUrl, setWsUrl] = useState('ws://127.0.0.1:8090/ai/pose/ws');
  const [exerciseId, setExerciseId] = useState('1');
  const [fps, setFps] = useState(10);
  const [quality, setQuality] = useState(0.7);
  const [isRunning, setIsRunning] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Parado');
  const [hasPoseResponse, setHasPoseResponse] = useState(false);
  const [feedback, setFeedback] = useState({
    phase: '-',
    elbowAvg: '-',
    level: '-',
    instruction: 'Inicie a camera para analisar o movimento.',
  });
  const [debugJson, setDebugJson] = useState('{}');

  const syncCanvas = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const captureCanvas = captureCanvasRef.current;
    if (!video || !canvas || !captureCanvas) return;

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;
    canvas.width = width;
    canvas.height = height;
    captureCanvas.width = width;
    captureCanvas.height = height;
  };

  const stopVision = () => {
    setIsRunning(false);
    if (frameRequestRef.current) cancelAnimationFrame(frameRequestRef.current);
    frameRequestRef.current = null;

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      drawFallbackGuide(ctx, canvas.width || 640, canvas.height || 480);
    }

    setConnectionStatus('Parado');
    setHasPoseResponse(false);
    hasPoseResponseRef.current = false;
  };

  useEffect(() => () => stopVision(), []);

  const sendFrame = async () => {
    const video = videoRef.current;
    const captureCanvas = captureCanvasRef.current;
    const ws = wsRef.current;
    if (!video || !captureCanvas || !ws || ws.readyState !== WebSocket.OPEN) return;

    const ctx = captureCanvas.getContext('2d');
    ctx.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);

    const blob = await new Promise(resolve => captureCanvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob || ws.readyState !== WebSocket.OPEN) return;
    ws.send(await blob.arrayBuffer());
  };

  const sendLoop = (timestamp) => {
    if (!wsRef.current) return;

    const minInterval = 1000 / Math.max(Number(fps) || 8, 1);
    if (timestamp - lastSendRef.current >= minInterval) {
      lastSendRef.current = timestamp;
      sendFrame().catch(() => setConnectionStatus('Erro ao enviar frame'));
    }

    frameRequestRef.current = requestAnimationFrame(sendLoop);
  };

  const startVision = async () => {
    setConnectionStatus('Abrindo camera...');
    setHasPoseResponse(false);
    hasPoseResponseRef.current = false;
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480, facingMode: 'user' },
      audio: false,
    });

    streamRef.current = stream;
    videoRef.current.srcObject = stream;
    await videoRef.current.play();
    syncCanvas();

    const canvas = canvasRef.current;
    drawFallbackGuide(canvas.getContext('2d'), canvas.width, canvas.height);

    setConnectionStatus('Conectando IA...');
    const ws = new WebSocket(wsUrl.trim());
    wsRef.current = ws;

    ws.onopen = () => {
      setConnectionStatus('WebSocket conectado. Aguardando primeira deteccao...');
      ws.send(JSON.stringify({
        exercise_id: Number(exerciseId || 1),
        token: '',
        send_audio: false,
      }));
      setIsRunning(true);
      frameRequestRef.current = requestAnimationFrame(sendLoop);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setDebugJson(JSON.stringify(data, null, 2));

        if (data.status === 'ready') {
          setConnectionStatus('IA pronta. Enviando frames...');
          return;
        }

        if (data.warn) {
          setConnectionStatus(`Aviso da IA: ${data.warn}`);
        }

        if (data.error) {
          setConnectionStatus(`Erro da IA: ${data.error}`);
          return;
        }

        setHasPoseResponse(true);
        hasPoseResponseRef.current = true;
        drawPose(canvasRef.current, data);
        setFeedback({
          phase: data.phase || '-',
          elbowAvg: data.elbow_avg?.toFixed?.(1) ?? '-',
          level: data.feedback_level || '-',
          instruction: data.detected
            ? (data.instruction || 'Movimento detectado.')
            : 'Nao detectado. Ajuste luz e enquadramento.',
        });
      } catch {
        setConnectionStatus('Resposta invalida da IA');
      }
    };

    ws.onerror = () => {
      setConnectionStatus('Backend de pose nao conectado');
      setFeedback(prev => ({
        ...prev,
        instruction: 'A camera abriu, mas os pontos dependem do backend MediaPipe em ws://127.0.0.1:8090/ai/pose/ws.',
      }));
    };

    ws.onclose = () => {
      if (streamRef.current && !hasPoseResponseRef.current) {
        setConnectionStatus('Backend de pose desconectado');
        setFeedback(prev => ({
          ...prev,
          instruction: 'Inicie o ai-service do exp2 para receber landmarks de bracos e pernas.',
        }));
      } else if (streamRef.current) {
        setConnectionStatus('IA desconectada');
      }
      wsRef.current = null;
    };
  };

  const handleStart = () => {
    startVision().catch((error) => {
      console.error('Erro ao iniciar visao computacional:', error);
      stopVision();
      setConnectionStatus('Nao foi possivel abrir a camera');
      setFeedback(prev => ({
        ...prev,
        instruction: 'Verifique a permissao da camera e tente novamente.',
      }));
    });
  };

  return (
    <section className="maya-vision-page">
      <div className="maya-view-toolbar">
        <button type="button" className="maya-ghost-button" onClick={onBack}>Voltar</button>
        <div>
          <h2>Visao computacional</h2>
          <p>Camera, landmarks e feedback de movimento</p>
        </div>
        <div className="maya-calendar-toolbar-actions">
          <button type="button" className="maya-primary-button" onClick={handleStart} disabled={isRunning}>
            Iniciar
          </button>
          <button type="button" className="maya-danger-button" onClick={stopVision} disabled={!streamRef.current}>
            Parar
          </button>
        </div>
      </div>

      <div className="maya-vision-layout">
        <div className="maya-vision-stage">
          <video ref={videoRef} className="maya-vision-video" autoPlay playsInline muted onLoadedMetadata={syncCanvas} />
          <canvas ref={canvasRef} className="maya-vision-canvas" />
          <canvas ref={captureCanvasRef} hidden />
        </div>

        <aside className="maya-vision-panel">
          <div className="maya-panel-card">
            <h3 className="maya-panel-title">Conexao</h3>
            <label className="maya-panel-label" htmlFor="vision-ws">WebSocket</label>
            <input id="vision-ws" className="maya-input" value={wsUrl} onChange={(event) => setWsUrl(event.target.value)} />

            <div className="maya-vision-settings">
              <label>
                Exercicio
                <input className="maya-input" value={exerciseId} onChange={(event) => setExerciseId(event.target.value)} />
              </label>
              <label>
                FPS
                <input className="maya-input" type="number" min="3" max="30" value={fps} onChange={(event) => setFps(event.target.value)} />
              </label>
              <label>
                Qualidade
                <input className="maya-input" type="number" min="0.3" max="0.95" step="0.05" value={quality} onChange={(event) => setQuality(Number(event.target.value))} />
              </label>
            </div>

            <p className="maya-sync-message">{connectionStatus}</p>
          </div>

          <div className="maya-panel-card">
            <h3 className="maya-panel-title">Feedback</h3>
            <div className={`maya-vision-badge ${String(feedback.level).toLowerCase()}`}>{feedback.level}</div>
            <div className="maya-vision-metrics">
              <span>Fase <strong>{feedback.phase}</strong></span>
              <span>Cotovelo medio <strong>{feedback.elbowAvg}</strong></span>
            </div>
            <p className="maya-panel-copy" style={{ marginTop: 14 }}>{feedback.instruction}</p>
          </div>

          <div className="maya-panel-card">
            <h3 className="maya-panel-title">Debug</h3>
            <pre className="maya-vision-debug">{debugJson}</pre>
          </div>
        </aside>
      </div>
    </section>
  );
}
