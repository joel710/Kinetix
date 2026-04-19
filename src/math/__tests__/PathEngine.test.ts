import { describe, it, expect } from 'vitest';
import { PathParser } from '../PathParser';
import { Linearizer } from '../Linearizer';

describe('Kinetix Path Engine', () => {
  it('should parse complex path data correctly', () => {
    const d = "M10 10 C 20 20, 40 20, 50 10 Z";
    const commands = PathParser.parse(d);
    expect(commands.length).toBe(3);
    expect(commands[0].code).toBe('M');
    expect(commands[1].code).toBe('C');
    expect(commands[2].code).toBe('Z');
  });

  it('should linearize curves with adaptive subdivision', () => {
    const d = "M0 0 C 50 100, 100 100, 150 0";
    const commands = PathParser.parse(d);
    const polygons = Linearizer.linearize(commands);
    
    expect(polygons.length).toBe(1);
    // Should have multiple points due to subdivision
    expect(polygons[0].length).toBeGreaterThan(5);
  });

  it('should handle relative commands', () => {
    const d = "m10 10 l10 10";
    const commands = PathParser.parse(d);
    const polygons = Linearizer.linearize(commands);
    
    expect(polygons[0][1]).toEqual({ x: 20, y: 20 });
  });
});
