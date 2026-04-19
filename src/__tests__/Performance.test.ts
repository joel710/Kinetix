import { describe, it, expect, bench } from 'vitest';
import { Kinetix } from './src/core/Kinetix';

// Mock DOM for Vitest
if (typeof document === 'undefined') {
  const { JSDOM } = await import('jsdom');
  const dom = new JSDOM('<!DOCTYPE html><svg id="world"></svg>');
  global.document = dom.window.document;
  global.window = dom.window as any;
  global.Element = dom.window.Element;
  global.SVGElement = dom.window.SVGElement;
  global.SVGPathElement = dom.window.SVGPathElement;
  global.navigator = dom.window.navigator;
  global.SharedArrayBuffer = undefined; // Force fallback in tests
}

describe('Kinetix Performance Benchmarks', () => {
  it('should initialize correctly', () => {
    const world = new Kinetix('#world', { maxBodies: 1000 });
    expect(world).toBeDefined();
  });

  bench('SyncDOM - 1000 objects', () => {
    // This is a synthetic benchmark for the sync logic
    const world = new Kinetix('#world', { maxBodies: 1000 });
    // Mock elements
    for(let i=0; i<1000; i++) {
      const el = document.createElementNS("http://www.w3.org/2000/svg", "path");
      (world as any).elements.set(i, { 
        el, 
        centroid: { x: 0, y: 0 },
        isVisible: true 
      });
    }
    // Simulate sync
    (world as any).syncDOM();
  });
});
