/**
 * G-code interpolation utilities for smooth drawing
 * Adds intermediate points between line segments for smoother curves
 */

export interface Point {
  x: number;
  y: number;
}

export interface GcodeLine {
  command: string;
  x?: number;
  y?: number;
  i?: number;
  j?: number;
  raw: string;
}

/**
 * Parse a gcode line into structured data
 */
export function parseGcodeLine(line: string): GcodeLine {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith(';')) {
    return { command: '', raw: line };
  }

  const command = trimmed.match(/^[GM]\d+/)?.[0] || '';
  const xMatch = trimmed.match(/X([-\d.]+)/);
  const yMatch = trimmed.match(/Y([-\d.]+)/);
  const iMatch = trimmed.match(/I([-\d.]+)/);
  const jMatch = trimmed.match(/J([-\d.]+)/);

  return {
    command,
    x: xMatch ? parseFloat(xMatch[1]) : undefined,
    y: yMatch ? parseFloat(yMatch[1]) : undefined,
    i: iMatch ? parseFloat(iMatch[1]) : undefined,
    j: jMatch ? parseFloat(jMatch[1]) : undefined,
    raw: line,
  };
}

/**
 * Linear interpolation between two points
 */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Linear interpolation between two points
 */
function lerpPoint(a: Point, b: Point, t: number): Point {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
  };
}

/**
 * Catmull-Rom spline interpolation for smoother curves
 */
function catmullRom(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const t2 = t * t;
  const t3 = t2 * t;

  const x = 0.5 * (
    (2 * p1.x) +
    (-p0.x + p2.x) * t +
    (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
    (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
  );

  const y = 0.5 * (
    (2 * p1.y) +
    (-p0.y + p2.y) * t +
    (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
    (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
  );

  return { x, y };
}

/**
 * Generate points along an arc (G2/G3)
 */
function interpolateArc(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  i: number,
  j: number,
  clockwise: boolean,
  numPoints: number
): Point[] {
  const centerX = startX + i;
  const centerY = startY + j;
  const radius = Math.sqrt(i * i + j * j);

  const startAngle = Math.atan2(startY - centerY, startX - centerX);
  let endAngle = Math.atan2(endY - centerY, endX - centerX);

  let angleDiff = endAngle - startAngle;
  if (clockwise) {
    if (angleDiff >= 0) angleDiff -= 2 * Math.PI;
  } else {
    if (angleDiff <= 0) angleDiff += 2 * Math.PI;
  }

  const points: Point[] = [];
  for (let n = 1; n <= numPoints; n++) {
    const t = n / (numPoints + 1);
    const angle = startAngle + angleDiff * t;
    points.push({
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    });
  }

  return points;
}

/**
 * Create gcode line from coordinates
 */
function createGcodeLine(x: number, y: number): string {
  return `G1 X${x.toFixed(2)} Y${y.toFixed(2)}`;
}

/**
 * Interpolate gcode with additional points
 * @param lines Original gcode lines
 * @param pointsPerSegment Number of intermediate points to add between each segment
 * @param useCatmullRom Use Catmull-Rom spline for smoother curves (default: false for linear)
 */
export function interpolateGcode(
  lines: string[],
  pointsPerSegment: number = 5,
  useCatmullRom: boolean = false
): string[] {
  const result: string[] = [];
  let lastX = 0;
  let lastY = 0;
  let lastToolDown = false;

  // Parse all lines and extract G1 points
  const g1Points: Point[] = [];
  const g1Indices: number[] = [];

  lines.forEach((line, index) => {
    const parsed = parseGcodeLine(line);
    
    if (parsed.command === 'M3' || parsed.command === 'M03') {
      lastToolDown = true;
      result.push(line);
    } else if (parsed.command === 'M5' || parsed.command === 'M05') {
      lastToolDown = false;
      result.push(line);
    } else if (parsed.command === 'G1' && parsed.x !== undefined && parsed.y !== undefined) {
      if (lastToolDown) {
        g1Points.push({ x: parsed.x, y: parsed.y });
        g1Indices.push(result.length);
      }
      lastX = parsed.x;
      lastY = parsed.y;
      result.push(line);
    } else if (parsed.command === 'G0') {
      // Rapid move - don't interpolate
      lastX = parsed.x ?? lastX;
      lastY = parsed.y ?? lastY;
      lastToolDown = false;
      result.push(line);
    } else if (parsed.command === 'G2' || parsed.command === 'G3') {
      // Arc command - add interpolated points
      if (parsed.x !== undefined && parsed.y !== undefined && parsed.i !== undefined && parsed.j !== undefined) {
        const startPoint = { x: lastX, y: lastY };
        const endPoint = { x: parsed.x, y: parsed.y };
        const arcPoints = interpolateArc(
          startPoint.x, startPoint.y,
          endPoint.x, endPoint.y,
          parsed.i, parsed.j,
          parsed.command === 'G2',
          pointsPerSegment
        );
        
        arcPoints.forEach(point => {
          result.push(createGcodeLine(point.x, point.y));
        });
        lastX = parsed.x;
        lastY = parsed.y;
      }
      result.push(line);
    } else if (parsed.command.startsWith('G') || parsed.command.startsWith('M')) {
      result.push(line);
    }
  });

  // Now do the interpolation - rebuild with extra points
  if (g1Points.length < 2) {
    return result;
  }

  const interpolated: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const parsed = parseGcodeLine(line);
    
    if (parsed.command === 'M3' || parsed.command === 'M03') {
      interpolated.push(line);
    } else if (parsed.command === 'M5' || parsed.command === 'M05') {
      interpolated.push(line);
    } else if (parsed.command === 'G0') {
      lastToolDown = false;
      lastX = parsed.x ?? lastX;
      lastY = parsed.y ?? lastY;
      interpolated.push(line);
    } else if (parsed.command === 'G1') {
      const startX = lastX;
      const startY = lastY;
      const endX = parsed.x ?? lastX;
      const endY = parsed.y ?? lastY;

      if (lastToolDown) {
        // Add interpolated points
        for (let t = 0; t <= pointsPerSegment; t++) {
          const ratio = t / (pointsPerSegment + 1);
          const x = lerp(startX, endX, ratio);
          const y = lerp(startY, endY, ratio);
          interpolated.push(createGcodeLine(x, y));
        }
      } else {
        // First point after tool down
        lastToolDown = true;
        interpolated.push(line);
      }

      lastX = endX;
      lastY = endY;
    } else if (parsed.command === 'G2' || parsed.command === 'G3') {
      // Arc command
      if (parsed.x !== undefined && parsed.y !== undefined && parsed.i !== undefined && parsed.j !== undefined) {
        const startPoint = { x: lastX, y: lastY };
        const endPoint = { x: parsed.x, y: parsed.y };
        const arcPoints = interpolateArc(
          startPoint.x, startPoint.y,
          endPoint.x, endPoint.y,
          parsed.i, parsed.j,
          parsed.command === 'G2',
          pointsPerSegment
        );
        
        arcPoints.forEach(point => {
          interpolated.push(createGcodeLine(point.x, point.y));
        });
        lastX = parsed.x;
        lastY = parsed.y;
      }
      interpolated.push(line);
    } else {
      // Other commands (comments, etc.)
      interpolated.push(line);
    }
  }

  return interpolated;
}

/**
 * Simplify gcode by reducing points (opposite of interpolation)
 */
export function simplifyGcode(lines: string[], keepEveryNth: number = 2): string[] {
  const result: string[] = [];
  let count = 0;
  let lastToolState = false;

  for (const line of lines) {
    const parsed = parseGcodeLine(line);
    
    if (parsed.command === 'M3' || parsed.command === 'M03') {
      lastToolState = true;
      result.push(line);
      count = 0;
    } else if (parsed.command === 'M5' || parsed.command === 'M05') {
      lastToolState = false;
      result.push(line);
      count = 0;
    } else if (parsed.command === 'G1' || parsed.command === 'G0') {
      count++;
      if (count % keepEveryNth === 1 || !lastToolState) {
        result.push(line);
      }
    } else {
      result.push(line);
    }
  }

  return result;
}