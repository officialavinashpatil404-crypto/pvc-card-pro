import { pathToFileURL } from 'url';

// Polyfill browser globals for Node.js / Vercel Serverless environment so pdfjs-dist / pdf-parse runs cleanly without throwing DOMMatrix error

if (typeof globalThis.DOMMatrix === 'undefined') {
  class DOMMatrixPolyfill {
    a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
    m11 = 1; m12 = 0; m21 = 0; m22 = 1; m41 = 0; m42 = 0;
    is2D = true;
    isIdentity = true;
    constructor(init?: any) {
      if (Array.isArray(init) && init.length === 6) {
        this.a = this.m11 = init[0];
        this.b = this.m12 = init[1];
        this.c = this.m21 = init[2];
        this.d = this.m22 = init[3];
        this.e = this.m41 = init[4];
        this.f = this.m42 = init[5];
      }
    }
    multiply() { return this; }
    translate() { return this; }
    scale() { return this; }
    rotate() { return this; }
    inverse() { return this; }
    transformPoint(p: any) { return p; }
    toFloat32Array() { return new Float32Array([this.a, this.b, this.c, this.d, this.e, this.f]); }
    toFloat64Array() { return new Float64Array([this.a, this.b, this.c, this.d, this.e, this.f]); }
  }
  (globalThis as any).DOMMatrix = DOMMatrixPolyfill;
}

if (typeof globalThis.ImageData === 'undefined') {
  (globalThis as any).ImageData = class ImageDataPolyfill {
    width: number;
    height: number;
    data: Uint8ClampedArray;
    constructor(w: number, h: number) {
      this.width = w;
      this.height = h;
      this.data = new Uint8ClampedArray(w * h * 4);
    }
  };
}

if (typeof globalThis.Path2D === 'undefined') {
  (globalThis as any).Path2D = class Path2DPolyfill {
    addPath() {}
    closePath() {}
    moveTo() {}
    lineTo() {}
    bezierCurveTo() {}
    quadraticCurveTo() {}
    arc() {}
    arcTo() {}
    ellipse() {}
    rect() {}
  };
}

const setupPdfWorker = (pdfjsModule: string, workerModule: string) => {
  try {
    const pdfjs = require(pdfjsModule);
    const fs = require('fs');
    const workerPath = require.resolve(workerModule);
    if (fs.existsSync(workerPath) && pdfjs?.GlobalWorkerOptions) {
      pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;
    }
  } catch (e) {
    console.warn(`[pdfPolyfill] Failed to set workerSrc for ${pdfjsModule}:`, (e as any)?.message);
  }
};

setupPdfWorker('pdfjs-dist/legacy/build/pdf.mjs', 'pdfjs-dist/legacy/build/pdf.worker.mjs');
setupPdfWorker('pdfjs-dist/legacy/build/pdf.js', 'pdfjs-dist/legacy/build/pdf.worker.js');
setupPdfWorker('pdfjs-dist/build/pdf.mjs', 'pdfjs-dist/build/pdf.worker.mjs');
setupPdfWorker('pdfjs-dist', 'pdfjs-dist/build/pdf.worker.mjs');

export {};

