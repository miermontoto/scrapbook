export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AlignmentGuide {
  axis: "x" | "y";
  /** coordenada del eje alineado (world space) */
  position: number;
  /** inicio de la linea guia en el eje perpendicular */
  from: number;
  /** fin de la linea guia en el eje perpendicular */
  to: number;
  type: "edge" | "center";
}

export interface SnapResult {
  x: number;
  y: number;
  guides: AlignmentGuide[];
}

export interface SnapOptions {
  magneticSnap: boolean;
  gridSnap: boolean;
  gridSize: number;
  /** threshold en world pixels (caller convierte desde screen px) */
  threshold: number;
}

interface AxisMatch {
  offset: number;
  guide: AlignmentGuide;
}

/**
 * calcula snap magnetico y/o de grid para un rect propuesto.
 * funcion pura: sin side effects, sin acceso al store.
 */
export function calculateSnap(
  proposed: Rect,
  others: Rect[],
  options: SnapOptions,
): SnapResult {
  const guides: AlignmentGuide[] = [];
  let snapX = proposed.x;
  let snapY = proposed.y;

  const xMatch = options.magneticSnap
    ? findMagneticMatch("x", proposed, others, options.threshold)
    : null;

  const yMatch = options.magneticSnap
    ? findMagneticMatch("y", proposed, others, options.threshold)
    : null;

  if (xMatch) {
    snapX = proposed.x + xMatch.offset;
    guides.push(xMatch.guide);
  } else if (options.gridSnap) {
    snapX = Math.round(proposed.x / options.gridSize) * options.gridSize;
  }

  if (yMatch) {
    snapY = proposed.y + yMatch.offset;
    guides.push(yMatch.guide);
  } else if (options.gridSnap) {
    snapY = Math.round(proposed.y / options.gridSize) * options.gridSize;
  }

  // si magnetic snap esta activo, resolver solapamientos
  if (options.magneticSnap) {
    const snapped: Rect = {
      x: snapX,
      y: snapY,
      width: proposed.width,
      height: proposed.height,
    };
    const pushOut = resolveOverlap(snapped, others);
    snapX += pushOut.dx;
    snapY += pushOut.dy;
  }

  return { x: snapX, y: snapY, guides };
}

/**
 * snap de grid para resize: redondea width/height al grid mas cercano.
 */
export function snapResize(
  rawW: number,
  rawH: number,
  gridSize: number,
): { width: number; height: number } {
  return {
    width: Math.round(rawW / gridSize) * gridSize,
    height: Math.round(rawH / gridSize) * gridSize,
  };
}

function findMagneticMatch(
  axis: "x" | "y",
  proposed: Rect,
  others: Rect[],
  threshold: number,
): AxisMatch | null {
  const isX = axis === "x";

  const pStart = isX ? proposed.x : proposed.y;
  const pSize = isX ? proposed.width : proposed.height;
  const pEnd = pStart + pSize;
  const pCenter = pStart + pSize / 2;

  const pPerpStart = isX ? proposed.y : proposed.x;
  const pPerpEnd = isX
    ? proposed.y + proposed.height
    : proposed.x + proposed.width;

  // pares validos: solo combinaciones que no causan solapamiento
  // start-to-end (abutting: nuestro inicio = su final)
  // end-to-start (abutting: nuestro final = su inicio)
  // start-to-start, end-to-end (alinear bordes iguales, valido si no se solapan en el eje perpendicular)
  // center-to-center (alineacion visual)

  let best: AxisMatch | null = null;
  let bestDist = threshold;

  for (const other of others) {
    const oStart = isX ? other.x : other.y;
    const oSize = isX ? other.width : other.height;
    const oEnd = oStart + oSize;
    const oCenter = oStart + oSize / 2;

    const oPerpStart = isX ? other.y : other.x;
    const oPerpEnd = isX ? other.y + other.height : other.x + other.width;

    // verificar si hay solapamiento en el eje perpendicular
    const perpOverlap = pPerpStart < oPerpEnd && pPerpEnd > oPerpStart;

    const candidates: Array<{
      pVal: number;
      oVal: number;
      type: "edge" | "center";
    }> = [
      // abutting: siempre validos
      { pVal: pEnd, oVal: oStart, type: "edge" },   // nuestro derecho -> su izquierdo
      { pVal: pStart, oVal: oEnd, type: "edge" },   // nuestro izquierdo -> su derecho
    ];

    // alineacion de bordes iguales: solo si no se solapan en el eje perpendicular
    if (!perpOverlap) {
      candidates.push(
        { pVal: pStart, oVal: oStart, type: "edge" },
        { pVal: pEnd, oVal: oEnd, type: "edge" },
      );
    }

    // center-to-center: solo si no se solapan en el eje perpendicular
    if (!perpOverlap) {
      candidates.push({ pVal: pCenter, oVal: oCenter, type: "center" });
    }

    for (const { pVal, oVal, type } of candidates) {
      const dist = Math.abs(pVal - oVal);
      if (dist < bestDist) {
        const offset = oVal - pVal;
        bestDist = dist;
        best = {
          offset,
          guide: {
            axis,
            position: oVal,
            from: Math.min(pPerpStart, oPerpStart),
            to: Math.max(pPerpEnd, oPerpEnd),
            type,
          },
        };
      }
    }
  }

  return best;
}

/**
 * si el rect snapped se solapa con algun otro, lo empuja hacia fuera
 * por el eje de menor penetracion.
 */
function resolveOverlap(
  snapped: Rect,
  others: Rect[],
): { dx: number; dy: number } {
  let dx = 0;
  let dy = 0;

  for (const other of others) {
    const sx = snapped.x + dx;
    const sy = snapped.y + dy;

    // calcular penetracion en ambos ejes
    const overlapX =
      Math.min(sx + snapped.width, other.x + other.width) -
      Math.max(sx, other.x);
    const overlapY =
      Math.min(sy + snapped.height, other.y + other.height) -
      Math.max(sy, other.y);

    if (overlapX <= 0 || overlapY <= 0) continue;

    // empujar por el eje de menor penetracion
    if (overlapX < overlapY) {
      const centerS = sx + snapped.width / 2;
      const centerO = other.x + other.width / 2;
      dx += centerS < centerO ? -overlapX : overlapX;
    } else {
      const centerS = sy + snapped.height / 2;
      const centerO = other.y + other.height / 2;
      dy += centerS < centerO ? -overlapY : overlapY;
    }
  }

  return { dx, dy };
}
