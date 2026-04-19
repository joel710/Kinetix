import { Point } from './Linearizer';

export class Geometry {
  /**
   * Calculates the signed area of a 2D polygon.
   */
  public static calculateArea(vertices: Point[]): number {
    let area = 0;
    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
      area += vertices[j].x * vertices[i].y - vertices[i].x * vertices[j].y;
    }
    return area / 2;
  }

  /**
   * Calculates the centroid (center of mass) of a 2D polygon.
   */
  public static calculateCentroid(vertices: Point[]): Point {
    let x = 0;
    let y = 0;
    let area = 0;
    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
      const p1 = vertices[j];
      const p2 = vertices[i];
      const f = p1.x * p2.y - p2.x * p1.y;
      x += (p1.x + p2.x) * f;
      y += (p1.y + p2.y) * f;
      area += f;
    }
    const signedArea = area / 2;
    if (signedArea === 0) {
      const fallback = vertices.reduce((acc, point) => {
        acc.x += point.x;
        acc.y += point.y;
        return acc;
      }, { x: 0, y: 0 });
      return {
        x: fallback.x / vertices.length,
        y: fallback.y / vertices.length
      };
    }
    return { x: x / (6 * signedArea), y: y / (6 * signedArea) };
  }
}
