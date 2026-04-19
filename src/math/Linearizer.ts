import { PathCommand } from './PathParser';

export type Point = { x: number; y: number };

export class Linearizer {
  private static readonly TOLERANCE = 0.5; // Pixels
  private static readonly MAX_RECURSION = 8;

  /**
   * Converts Path commands to a list of vertices (polygons).
   * Supports complex paths with multiple sub-paths.
   */
  public static linearize(commands: PathCommand[]): Point[][] {
    const polygons: Point[][] = [];
    let currentPolygon: Point[] = [];
    let cur: Point = { x: 0, y: 0 };
    let start: Point = { x: 0, y: 0 };
    let lastControl: Point | null = null;

    for (const cmd of commands) {
      const { code, params } = cmd;
      const isRelative = code === code.toLowerCase();
      const type = code.toUpperCase();

      switch (type) {
        case 'M': {
          if (currentPolygon.length > 0) polygons.push(currentPolygon);
          currentPolygon = [];
          for (let i = 0; i < params.length; i += 2) {
            cur = this.getPoint(params, i, isRelative, cur);
            if (i === 0) start = { ...cur };
            currentPolygon.push({ ...cur });
          }
          lastControl = null;
          break;
        }

        case 'L': {
          for (let i = 0; i < params.length; i += 2) {
            cur = this.getPoint(params, i, isRelative, cur);
            currentPolygon.push({ ...cur });
          }
          lastControl = null;
          break;
        }

        case 'H': {
          for (let i = 0; i < params.length; i++) {
            cur.x = isRelative ? cur.x + params[i] : params[i];
            currentPolygon.push({ ...cur });
          }
          lastControl = null;
          break;
        }

        case 'V': {
          for (let i = 0; i < params.length; i++) {
            cur.y = isRelative ? cur.y + params[i] : params[i];
            currentPolygon.push({ ...cur });
          }
          lastControl = null;
          break;
        }

        case 'C': {
          for (let i = 0; i < params.length; i += 6) {
            const p1 = this.getPoint(params, i, isRelative, cur);
            const p2 = this.getPoint(params, i + 2, isRelative, cur);
            const p3 = this.getPoint(params, i + 4, isRelative, cur);
            this.subdivideCubic(cur, p1, p2, p3, currentPolygon);
            cur = { ...p3 };
            lastControl = { ...p2 };
          }
          break;
        }

        case 'Q': {
          for (let i = 0; i < params.length; i += 4) {
            const p1 = this.getPoint(params, i, isRelative, cur);
            const p2 = this.getPoint(params, i + 2, isRelative, cur);
            this.subdivideQuadratic(cur, p1, p2, currentPolygon);
            cur = { ...p2 };
            lastControl = { ...p1 };
          }
          break;
        }

        case 'Z': {
          if (currentPolygon.length > 0) {
            currentPolygon.push({ ...start });
            cur = { ...start };
          }
          lastControl = null;
          break;
        }
        // TODO: S, T, A commands
      }
    }

    if (currentPolygon.length > 0) polygons.push(currentPolygon);
    return polygons;
  }

  private static getPoint(params: number[], index: number, isRelative: boolean, cur: Point): Point {
    return {
      x: isRelative ? cur.x + params[index] : params[index],
      y: isRelative ? cur.y + params[index + 1] : params[index + 1],
    };
  }

  private static subdivideCubic(p0: Point, p1: Point, p2: Point, p3: Point, points: Point[], depth = 0) {
    if (depth >= this.MAX_RECURSION || this.isFlatCubic(p0, p1, p2, p3)) {
      points.push({ ...p3 });
      return;
    }

    // De Casteljau split
    const p01 = this.mid(p0, p1);
    const p12 = this.mid(p1, p2);
    const p23 = this.mid(p2, p3);
    const p012 = this.mid(p01, p12);
    const p123 = this.mid(p12, p23);
    const p0123 = this.mid(p012, p123);

    this.subdivideCubic(p0, p01, p012, p0123, points, depth + 1);
    this.subdivideCubic(p0123, p123, p23, p3, points, depth + 1);
  }

  private static subdivideQuadratic(p0: Point, p1: Point, p2: Point, points: Point[], depth = 0) {
    if (depth >= this.MAX_RECURSION || this.isFlatQuadratic(p0, p1, p2)) {
      points.push({ ...p2 });
      return;
    }

    const p01 = this.mid(p0, p1);
    const p12 = this.mid(p1, p2);
    const p012 = this.mid(p01, p12);

    this.subdivideQuadratic(p0, p01, p012, points, depth + 1);
    this.subdivideQuadratic(p012, p12, p2, points, depth + 1);
  }

  private static isFlatCubic(p0: Point, p1: Point, p2: Point, p3: Point): boolean {
    const d1 = this.distToLine(p1, p0, p3);
    const d2 = this.distToLine(p2, p0, p3);
    return (d1 + d2) < this.TOLERANCE;
  }

  private static isFlatQuadratic(p0: Point, p1: Point, p2: Point): boolean {
    return this.distToLine(p1, p0, p2) < this.TOLERANCE;
  }

  private static distToLine(p: Point, a: Point, b: Point): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    if (dx === 0 && dy === 0) return Math.hypot(p.x - a.x, p.y - a.y);
    return Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x) / Math.hypot(dx, dy);
  }

  private static mid(a: Point, b: Point): Point {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }
}
