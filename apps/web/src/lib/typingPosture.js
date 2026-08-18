/** Landmarks MediaPipe Pose (parte do braço). */
export const POSE_IDX = {
  lShoulder: 11,
  rShoulder: 12,
  lElbow: 13,
  rElbow: 14,
  lWrist: 15,
  rWrist: 16,
  lIndex: 19,
  rIndex: 20,
};

export const ARM_CONNECTIONS = {
  left: [
    [POSE_IDX.lShoulder, POSE_IDX.lElbow],
    [POSE_IDX.lElbow, POSE_IDX.lWrist],
    [POSE_IDX.lWrist, POSE_IDX.lIndex],
  ],
  right: [
    [POSE_IDX.rShoulder, POSE_IDX.rElbow],
    [POSE_IDX.rElbow, POSE_IDX.rWrist],
    [POSE_IDX.rWrist, POSE_IDX.rIndex],
  ],
};

const HAND_MCP = 9; // base do dedo médio — direção da palma

/** Cotovelo perto de 90° (digitação). */
const ELBOW_TARGET = 90;
const ELBOW_TOLERANCE = 22;

/** Desvio do pulso em relação à linha reta do antebraço. Curva suave ok; grande = alerta. */
const WRIST_SOFT_MAX = 16;
const WRIST_ALERT_MIN = 26;

function visible(lm, min = 0.35) {
  if (!lm) return false;
  const score = lm.visibility ?? lm.presence ?? 1;
  return score >= min;
}

export function angleAt(vertex, a, c) {
  const abx = a.x - vertex.x;
  const aby = a.y - vertex.y;
  const cbx = c.x - vertex.x;
  const cby = c.y - vertex.y;
  const mag1 = Math.hypot(abx, aby);
  const mag2 = Math.hypot(cbx, cby);
  if (mag1 < 1e-6 || mag2 < 1e-6) return null;
  const cos = Math.min(1, Math.max(-1, (abx * cbx + aby * cby) / (mag1 * mag2)));
  return (Math.acos(cos) * 180) / Math.PI;
}

function nearestHand(hands, wrist) {
  let best = null;
  let bestD = Infinity;
  for (const hand of hands || []) {
    const w = hand[0];
    if (!w) continue;
    const d = (w.x - wrist.x) ** 2 + (w.y - wrist.y) ** 2;
    if (d < bestD) {
      bestD = d;
      best = hand;
    }
  }
  return bestD < 0.08 ? best : null;
}

function sidePosture(pose, hands, keys) {
  const shoulder = pose[keys.shoulder];
  const elbow = pose[keys.elbow];
  const wrist = pose[keys.wrist];
  const poseIndex = pose[keys.index];

  if (!visible(shoulder) || !visible(elbow) || !visible(wrist)) {
    return { ready: false, ok: true, elbowAngle: null, wristBend: null, reasons: [] };
  }

  const elbowAngle = angleAt(elbow, shoulder, wrist);
  const hand = nearestHand(hands, wrist);
  const palm = hand?.[HAND_MCP] || poseIndex;
  const wristAngle = palm ? angleAt(wrist, elbow, palm) : null;
  const wristBend = wristAngle == null ? null : Math.abs(180 - wristAngle);

  const reasons = [];
  if (elbowAngle != null && Math.abs(elbowAngle - ELBOW_TARGET) > ELBOW_TOLERANCE) {
    reasons.push(`cotovelo ${Math.round(elbowAngle)}° (ideal ~90°)`);
  }
  if (wristBend != null && wristBend >= WRIST_ALERT_MIN) {
    reasons.push(`pulso curvado ${Math.round(wristBend)}°`);
  }

  return {
    ready: true,
    ok: reasons.length === 0,
    mildWrist: wristBend != null && wristBend > WRIST_SOFT_MAX && wristBend < WRIST_ALERT_MIN,
    elbowAngle,
    wristBend,
    reasons,
  };
}

export function analyzeTypingPosture(poseLandmarks, hands) {
  const empty = { ready: false, ok: true, elbowAngle: null, wristBend: null, reasons: [] };
  if (!poseLandmarks?.length) {
    return {
      left: empty,
      right: empty,
      anyAlert: false,
      message: 'Mostre o braço inteiro: ombro, cotovelo e mão.',
    };
  }

  const pose = poseLandmarks;
  const left = sidePosture(pose, hands, {
    shoulder: POSE_IDX.lShoulder,
    elbow: POSE_IDX.lElbow,
    wrist: POSE_IDX.lWrist,
    index: POSE_IDX.lIndex,
  });
  const right = sidePosture(pose, hands, {
    shoulder: POSE_IDX.rShoulder,
    elbow: POSE_IDX.rElbow,
    wrist: POSE_IDX.rWrist,
    index: POSE_IDX.rIndex,
  });

  const alerts = [];
  if (!left.ok && left.ready) alerts.push(`Esquerdo: ${left.reasons.join(', ')}`);
  if (!right.ok && right.ready) alerts.push(`Direito: ${right.reasons.join(', ')}`);

  let message = 'Postura ok — curva suave no pulso e cotovelo perto de 90°.';
  if (!left.ready && !right.ready) {
    message = 'Aproxime o braço da câmera (ombro, cotovelo e mão no quadro).';
  } else if (alerts.length) {
    message = alerts.join(' · ');
  }

  return {
    left,
    right,
    anyAlert: alerts.length > 0,
    message,
  };
}

export function averageSide(history, sample, max = 6) {
  if (!sample?.ready) return sample;
  history.push(sample);
  if (history.length > max) history.shift();
  const elbowVals = history.map((item) => item.elbowAngle).filter((v) => v != null);
  const wristVals = history.map((item) => item.wristBend).filter((v) => v != null);
  const avg = (list) => (list.length ? list.reduce((s, v) => s + v, 0) / list.length : null);
  const elbowAngle = avg(elbowVals);
  const wristBend = avg(wristVals);
  const reasons = [];
  if (elbowAngle != null && Math.abs(elbowAngle - ELBOW_TARGET) > ELBOW_TOLERANCE) {
    reasons.push(`cotovelo ${Math.round(elbowAngle)}° (ideal ~90°)`);
  }
  if (wristBend != null && wristBend >= WRIST_ALERT_MIN) {
    reasons.push(`pulso curvado ${Math.round(wristBend)}°`);
  }
  return {
    ready: true,
    ok: reasons.length === 0,
    mildWrist: wristBend != null && wristBend > WRIST_SOFT_MAX && wristBend < WRIST_ALERT_MIN,
    elbowAngle,
    wristBend,
    reasons,
  };
}
