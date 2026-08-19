/** Landmarks MediaPipe Pose — só cotovelo e punho (sem ombro). */
export const POSE_IDX = {
  lElbow: 13,
  rElbow: 14,
  lWrist: 15,
  rWrist: 16,
  lIndex: 19,
  rIndex: 20,
};

/** Segmento desenhado: cotovelo → punho → direção da mão */
export const FOREARM_CONNECTIONS = {
  left: [
    [POSE_IDX.lElbow, POSE_IDX.lWrist],
    [POSE_IDX.lWrist, POSE_IDX.lIndex],
  ],
  right: [
    [POSE_IDX.rElbow, POSE_IDX.rWrist],
    [POSE_IDX.rWrist, POSE_IDX.rIndex],
  ],
};

const HAND_MCP = 9;

/** Curva suave ok; acima disso alerta vermelho */
const BEND_SOFT_MAX = 18;
const BEND_ALERT_MIN = 28;

function visible(lm, min = 0.3) {
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
  return bestD < 0.1 ? best : null;
}

/** Quanto a mão desvia de uma linha reta com o antebraço (cotovelo → punho → mão). */
function sideForearm(pose, hands, keys) {
  const elbow = pose[keys.elbow];
  const wrist = pose[keys.wrist];
  const poseIndex = pose[keys.index];

  if (!visible(elbow) || !visible(wrist)) {
    return { ready: false, ok: true, bend: null, reasons: [] };
  }

  const hand = nearestHand(hands, wrist);
  const handDir = hand?.[HAND_MCP] || hand?.[8] || poseIndex;
  if (!handDir) {
    return { ready: false, ok: true, bend: null, reasons: [] };
  }

  const angleAtWrist = angleAt(wrist, elbow, handDir);
  const bend = angleAtWrist == null ? null : Math.abs(180 - angleAtWrist);

  const reasons = [];
  if (bend != null && bend >= BEND_ALERT_MIN) {
    reasons.push(`curva ${Math.round(bend)}°`);
  }

  return {
    ready: true,
    ok: reasons.length === 0,
    mild: bend != null && bend > BEND_SOFT_MAX && bend < BEND_ALERT_MIN,
    bend,
    reasons,
  };
}

export function analyzeTypingPosture(poseLandmarks, hands) {
  const empty = { ready: false, ok: true, bend: null, reasons: [] };

  if (!poseLandmarks?.length && !hands?.length) {
    return {
      left: empty,
      right: empty,
      anyAlert: false,
      message: 'Mostre a mão e o cotovelo na câmera (não precisa do ombro).',
    };
  }

  const pose = poseLandmarks || [];
  const left = sideForearm(pose, hands, {
    elbow: POSE_IDX.lElbow,
    wrist: POSE_IDX.lWrist,
    index: POSE_IDX.lIndex,
  });
  const right = sideForearm(pose, hands, {
    elbow: POSE_IDX.rElbow,
    wrist: POSE_IDX.rWrist,
    index: POSE_IDX.rIndex,
  });

  const alerts = [];
  if (!left.ok && left.ready) alerts.push(`Esquerdo: ${left.reasons.join(', ')}`);
  if (!right.ok && right.ready) alerts.push(`Direito: ${right.reasons.join(', ')}`);

  let message = 'Linha reta — mão alinhada ao antebraço.';
  if (!left.ready && !right.ready) {
    if (hands?.length) {
      message = 'Mão detectada. Enquadre também o cotovelo (mão até cotovelo).';
    } else {
      message = 'Enquadre mão e cotovelo — ombro fora do quadro está ok.';
    }
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
  const bends = history.map((item) => item.bend).filter((v) => v != null);
  const bend = bends.length
    ? bends.reduce((s, v) => s + v, 0) / bends.length
    : null;
  const reasons = [];
  if (bend != null && bend >= BEND_ALERT_MIN) {
    reasons.push(`curva ${Math.round(bend)}°`);
  }
  return {
    ready: true,
    ok: reasons.length === 0,
    mild: bend != null && bend > BEND_SOFT_MAX && bend < BEND_ALERT_MIN,
    bend,
    reasons,
  };
}

/** Compatibilidade com painel antigo */
export const ARM_CONNECTIONS = FOREARM_CONNECTIONS;
