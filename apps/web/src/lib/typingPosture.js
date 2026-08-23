/**
 * Postura na digitação — só MediaPipe Hands.
 * Com 2 mãos: eixo compartilhado (linha entre punhos) para não marcar
 * a mão “de dentro” como torta. Slots E/D travados entre frames.
 */

const HAND_WRIST = 0;
const HAND_DIR = 9;
const HAND_INDEX_MCP = 5;

const BEND_SOFT_MAX = 16;
const BEND_ALERT_ENTER = 32;
const BEND_ALERT_EXIT = 22;

const emptySide = {
  ready: false,
  ok: true,
  mild: false,
  bend: null,
  reasons: [],
  points: null,
};

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function sub(a, b) {
  return { x: a.x - b.x, y: a.y - b.y };
}

function add(a, b) {
  return { x: a.x + b.x, y: a.y + b.y };
}

function scale(v, s) {
  return { x: v.x * s, y: v.y * s };
}

function norm(v) {
  const m = Math.hypot(v.x, v.y);
  if (m < 1e-6) return null;
  return { x: v.x / m, y: v.y / m };
}

function lerp(a, b, t) {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
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

function handForward(hand) {
  const wrist = hand?.[HAND_WRIST];
  const tip = hand?.[HAND_DIR] || hand?.[HAND_INDEX_MCP];
  if (!wrist || !tip) return null;
  return { wrist, tip, dir: norm(sub(tip, wrist)), len: Math.max(0.04, dist(wrist, tip)) };
}

/**
 * Atribui mãos a slots E/D com trava temporal (evita trocar lado a cada frame).
 * `slots`: { leftX, rightX } mutável — posições X brutas da última atribuição.
 */
export function pickHands(hands, handSides = [], slots = null) {
  const list = hands || [];
  if (list.length === 0) return { left: null, right: null };

  const items = list.map((hand, i) => {
    const raw = handSides[i];
    const anatomical = raw === 'Left' || raw === 'Right' ? raw : null;
    return {
      hand,
      anatomical,
      x: hand[HAND_WRIST]?.x ?? 0.5,
      score: 1,
    };
  });

  // Selfie bruto: x menor ≈ mão direita anatômica
  const byX = [...items].sort((a, b) => a.x - b.x);

  let left = null;
  let right = null;

  if (items.length === 1) {
    const item = items[0];
    if (slots?.leftX != null || slots?.rightX != null) {
      const dL = slots.leftX == null ? Infinity : Math.abs(item.x - slots.leftX);
      const dR = slots.rightX == null ? Infinity : Math.abs(item.x - slots.rightX);
      if (dL <= dR && dL < 0.2) left = item.hand;
      else if (dR < 0.2) right = item.hand;
      else if (item.anatomical === 'Left') left = item.hand;
      else if (item.anatomical === 'Right') right = item.hand;
      else if (item.x < 0.5) right = item.hand;
      else left = item.hand;
    } else if (item.anatomical === 'Left') left = item.hand;
    else if (item.anatomical === 'Right') right = item.hand;
    else if (item.x < 0.5) right = item.hand;
    else left = item.hand;
  } else {
    // Duas+ mãos: posição X é mais estável que o rótulo do modelo
    const imageRight = byX[0]; // x baixo = direita anatômica
    const imageLeft = byX[byX.length - 1];

    if (slots?.leftX != null && slots?.rightX != null) {
      // Mantém continuidade: cada detecção vai para o slot mais próximo
      const cand = byX.slice(0, 2);
      let best = null;
      let bestCost = Infinity;
      for (const a of cand) {
        for (const b of cand) {
          if (a === b) continue;
          const cost =
            Math.abs(a.x - slots.rightX) + Math.abs(b.x - slots.leftX);
          if (cost < bestCost) {
            bestCost = cost;
            best = { right: a.hand, left: b.hand, rx: a.x, lx: b.x };
          }
        }
      }
      if (best && bestCost < 0.55) {
        right = best.right;
        left = best.left;
        if (slots) {
          slots.rightX = best.rx;
          slots.leftX = best.lx;
        }
        return { left, right };
      }
    }

    right = imageRight.hand;
    left = imageLeft.hand;

    // Se rótulos concordam com alta confiança e não colidem, preferir rótulo
    const byLabel = { Left: null, Right: null };
    for (const item of items) {
      if (item.anatomical && item.score >= 0.7 && !byLabel[item.anatomical]) {
        byLabel[item.anatomical] = item;
      }
    }
    if (
      byLabel.Left &&
      byLabel.Right &&
      byLabel.Left.hand !== byLabel.Right.hand &&
      byLabel.Left.x > byLabel.Right.x
    ) {
      left = byLabel.Left.hand;
      right = byLabel.Right.hand;
    }
  }

  if (slots) {
    if (left?.[HAND_WRIST]) slots.leftX = left[HAND_WRIST].x;
    if (right?.[HAND_WRIST]) slots.rightX = right[HAND_WRIST].x;
  }

  return { left, right };
}

/**
 * Eixo “reto” esperado:
 * - 2 mãos: perpendicular à linha dos punhos, no sentido dos dedos
 * - 1 mão: para baixo + leve inclinação para o centro (V da digitação)
 */
function expectedForward(leftInfo, rightInfo, side) {
  if (leftInfo && rightInfo) {
    const across = sub(rightInfo.wrist, leftInfo.wrist);
    let forward = norm({ x: -across.y, y: across.x });
    if (!forward) return { x: 0, y: 1 };

    const avg = norm({
      x: (leftInfo.dir?.x || 0) + (rightInfo.dir?.x || 0),
      y: (leftInfo.dir?.y || 0) + (rightInfo.dir?.y || 0),
    });
    if (avg && forward.x * avg.x + forward.y * avg.y < 0) {
      forward = scale(forward, -1);
    }
    // Preferir componente “para baixo” na imagem (digitação)
    if (forward.y < 0) forward = scale(forward, -1);
    return forward;
  }

  const info = side === 'left' ? leftInfo : rightInfo;
  if (!info) return { x: 0, y: 1 };
  // Uma mão: eixo local suavizado (não vertical puro)
  const inward = side === 'left' ? 0.22 : -0.22;
  const blended = norm({
    x: (info.dir?.x || 0) * 0.55 + inward * 0.45,
    y: Math.max(0.35, (info.dir?.y || 1) * 0.55 + 0.45),
  });
  return blended || { x: 0, y: 1 };
}

function sideFromHand(info, expected) {
  if (!info?.dir) return emptySide;

  const cos = Math.min(
    1,
    Math.max(-1, info.dir.x * expected.x + info.dir.y * expected.y),
  );
  let bend = (Math.acos(cos) * 180) / Math.PI;

  const zW = info.wrist.z;
  const zH = info.tip.z;
  if (typeof zW === 'number' && typeof zH === 'number') {
    const zBend = Math.min(14, Math.abs(zH - zW) * 70);
    bend = bend * 0.9 + zBend * 0.1;
  }

  // Antebraço desenhado no sentido oposto ao eixo esperado (atrás do punho)
  const forearm = add(info.wrist, scale(expected, -info.len * 1.55));

  const reasons = [];
  if (bend >= BEND_ALERT_ENTER) {
    reasons.push(`desvio ${Math.round(bend)}°`);
  }

  return {
    ready: true,
    ok: reasons.length === 0,
    mild: bend > BEND_SOFT_MAX && bend < BEND_ALERT_ENTER,
    bend,
    reasons,
    points: { elbow: forearm, wrist: info.wrist, handDir: info.tip },
  };
}

/**
 * @param {object|null} _poseLandmarks ignorado
 * @param {object} [trackState] { slots: {leftX,rightX}, expected: {x,y}|null }
 */
export function analyzeTypingPosture(_poseLandmarks, hands, handSides = [], trackState = null) {
  const slots = trackState?.slots || null;
  const { left: leftHand, right: rightHand } = pickHands(hands, handSides, slots);

  const leftInfo = handForward(leftHand);
  const rightInfo = handForward(rightHand);

  let expected = expectedForward(leftInfo, rightInfo, leftInfo ? 'left' : 'right');

  // Suaviza o eixo esperado entre frames (mão gira um pouco sem “perder” o braço)
  if (trackState) {
    if (trackState.expected) {
      expected = norm(lerp(trackState.expected, expected, 0.28)) || expected;
    }
    trackState.expected = expected;
  }

  const left = sideFromHand(leftInfo, expected);
  const right = sideFromHand(rightInfo, expected);

  const alerts = [];
  if (!left.ok && left.ready) alerts.push(`Esquerdo: ${left.reasons.join(', ')}`);
  if (!right.ok && right.ready) alerts.push(`Direito: ${right.reasons.join(', ')}`);

  const n = (left.ready ? 1 : 0) + (right.ready ? 1 : 0);
  let message = 'As duas mãos alinhadas.';
  if (n === 0) {
    message = 'Mostre uma ou duas mãos — não precisa do cotovelo.';
  } else if (n === 1) {
    message = 'Uma mão ok. Pode mostrar a outra — o eixo se ajusta com as duas.';
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

export function averageSide(history, sample, state, max = 14) {
  if (!state) {
    return sample?.ready ? sample : emptySide;
  }

  if (!sample?.ready) {
    state.miss += 1;
    if (state.miss < 12 && state.lastReady) {
      return { ...state.lastReady };
    }
    history.length = 0;
    state.miss = 0;
    state.lastReady = null;
    state.alert = false;
    return { ...emptySide };
  }

  state.miss = 0;
  history.push(sample);
  if (history.length > max) history.shift();

  const bends = history.map((item) => item.bend).filter((v) => v != null);
  const bend = bends.length
    ? bends.reduce((s, v) => s + v, 0) / bends.length
    : null;

  // Suaviza também os pontos desenhados (linha do antebraço não “pula”)
  let points = sample.points;
  if (state.lastReady?.points && points) {
    points = {
      elbow: lerp(state.lastReady.points.elbow, points.elbow, 0.35),
      wrist: lerp(state.lastReady.points.wrist, points.wrist, 0.4),
      handDir: lerp(state.lastReady.points.handDir, points.handDir, 0.4),
    };
  }

  if (bend != null) {
    if (state.alert) {
      if (bend <= BEND_ALERT_EXIT) state.alert = false;
    } else if (bend >= BEND_ALERT_ENTER) {
      state.alert = true;
    }
  }

  const reasons = [];
  if (state.alert && bend != null) {
    reasons.push(`desvio ${Math.round(bend)}°`);
  }

  const next = {
    ready: true,
    ok: reasons.length === 0,
    mild: bend != null && !state.alert && bend > BEND_SOFT_MAX,
    bend,
    reasons,
    points,
  };
  state.lastReady = next;
  return next;
}

export const POSE_IDX = { lElbow: 13, rElbow: 14 };
export const ARM_CONNECTIONS = { left: [], right: [] };
export const FOREARM_CONNECTIONS = ARM_CONNECTIONS;
