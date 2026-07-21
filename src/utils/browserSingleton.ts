import type { Browser } from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';

// Programmatically sync and copy the correct blank template PNGs from the brain directory
const frontPath = path.resolve('./public/templates/aadhaar/aadhaar-front.png.png');
const backPath  = path.resolve('./public/templates/aadhaar/aadhaar-back.png.png');

if (process.env.NODE_ENV !== 'production') {
  const brainFrontSource = "C:\\Users\\NANO\\.gemini\\antigravity-ide\\brain\\9bafbd7f-728b-4c66-8255-f18a816f4f7b\\media__1784014822212.png";
  const brainBackSource  = "C:\\Users\\NANO\\.gemini\\antigravity-ide\\brain\\9bafbd7f-728b-4c66-8255-f18a816f4f7b\\media__1784014822149.png";

  try {
    const destDir = path.dirname(frontPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    if (fs.existsSync(brainFrontSource)) {
      fs.copyFileSync(brainFrontSource, frontPath);
    }
    if (fs.existsSync(brainBackSource)) {
      fs.copyFileSync(brainBackSource, backPath);
    }
  } catch (copyErr: any) {
    // Ignore in dev
  }
}

let TEMPLATE_FRONT_BASE64 = '';
let TEMPLATE_BACK_BASE64  = '';

try {
  if (fs.existsSync(frontPath) && fs.existsSync(backPath)) {
    TEMPLATE_FRONT_BASE64 = `data:image/png;base64,${fs.readFileSync(frontPath).toString('base64')}`;
    TEMPLATE_BACK_BASE64  = `data:image/png;base64,${fs.readFileSync(backPath).toString('base64')}`;
    console.log('AADHAAR_TEMPLATES_LOADED');
  } else {
    console.warn('[BrowserSingleton] Aadhaar blank templates not found');
  }
} catch (err: any) {
  console.error('[BrowserSingleton] Failed to load Aadhaar templates:', err.message);
}

const POOL_SIZE = 3;
const MAX_PAGES_BEFORE_RESTART = 300;

interface ManagedBrowser {
  id: number;
  browser: Browser;
  pageCount: number;
  isBusy: boolean;
  isDead: boolean;
}

class BrowserPool {
  private pool: ManagedBrowser[] = [];
  private nextId = 1;
  private queue: ((browser: Browser) => void)[] = [];
  private initPromise: Promise<void> | null = null;

  constructor() {
    // Lazily initialized
  }

  public async init(): Promise<void> {
    if (this.pool.length >= POOL_SIZE) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      console.log(`[BrowserPool] Initializing browser pool with size ${POOL_SIZE}...`);
      const launchPromises = [];
      const needed = POOL_SIZE - this.pool.length;
      for (let i = 0; i < needed; i++) {
        launchPromises.push(this.launchBrowser());
      }
      await Promise.all(launchPromises);
      console.log(`[BrowserPool] Browser pool initialization check. Active browsers: ${this.pool.length}`);
      this.initPromise = null; // reset to allow retries if some failed
    })();

    return this.initPromise;
  }

  private async launchBrowser(): Promise<ManagedBrowser | null> {
    const id = this.nextId++;
    try {
      console.log(`[BrowserPool] Launching browser instance #${id}...`);
      const browser = await createBrowserInstance();

      const managed: ManagedBrowser = {
        id,
        browser,
        pageCount: 0,
        isBusy: false,
        isDead: false,
      };

      // Set up crash detection
      browser.on('disconnected', () => {
        console.warn(`[BrowserPool] Browser instance #${id} disconnected (crashed or closed).`);
        managed.isDead = true;
        this.handleBrowserCrash(managed);
      });

      this.pool.push(managed);
      console.log(`[BrowserPool] Browser instance #${id} successfully launched and added to pool.`);
      return managed;
    } catch (err: any) {
      console.error(`[BrowserPool] Failed to launch browser instance #${id}:`, err.message);
      return null;
    }
  }

  private async handleBrowserCrash(managed: ManagedBrowser) {
    // Remove the dead browser from pool
    this.pool = this.pool.filter(b => b.id !== managed.id);
    try {
      await managed.browser.close();
    } catch (e) {}

    // Launch a replacement browser
    console.log(`[BrowserPool] Replacing crashed/dead browser instance #${managed.id}...`);
    await this.launchBrowser();
    this.processQueue();
  }

  private processQueue() {
    if (this.queue.length === 0) return;

    // Find an available browser
    const managed = this.pool.find(b => !b.isBusy && !b.isDead);
    if (!managed) return;

    const resolve = this.queue.shift();
    if (resolve) {
      managed.isBusy = true;
      resolve(this.wrapBrowser(managed));
    }
  }

  private wrapBrowser(managed: ManagedBrowser): Browser {
    const pool = this;
    const trackedPages: any[] = [];
    let released = false;

    const release = async () => {
      if (released) return;
      released = true;
      console.log(`[BrowserPool] Releasing browser instance #${managed.id} back to pool.`);

      // Safety cleanup: close any pages that weren't closed
      for (const page of [...trackedPages]) {
        try {
          const isClosed = typeof page.isClosed === 'function' ? page.isClosed() : false;
          if (!isClosed) {
            console.warn(`[BrowserPool] Closing leaked page in browser #${managed.id}`);
            await page.close();
          }
        } catch (e) {}
      }

      managed.isBusy = false;

      // Recycle the browser if it exceeded the page limit
      if (managed.pageCount >= MAX_PAGES_BEFORE_RESTART && !managed.isDead) {
        console.log(`[BrowserPool] Browser instance #${managed.id} reached page limit (${managed.pageCount}). Recycling...`);
        managed.isDead = true;
        pool.pool = pool.pool.filter(b => b.id !== managed.id);
        try {
          await managed.browser.close();
        } catch (e) {}
        await pool.launchBrowser();
      }

      pool.processQueue();
    };

    return new Proxy(managed.browser, {
      get(target, prop, receiver) {
        if (prop === 'newPage') {
          return async function (...args: any[]) {
            if (managed.isDead) {
              throw new Error(`Browser instance #${managed.id} is dead.`);
            }
            managed.pageCount++;
            console.log(`[BrowserPool] Creating new page on browser #${managed.id}. Total page creations on this instance: ${managed.pageCount}`);
            
            const page = await target.newPage(...args as any);
            trackedPages.push(page);

            // Intercept page.close to update our trackedPages and auto-release if page count hits 0
            const originalClose = page.close;
            page.close = async function (...closeArgs: any[]) {
              const res = await originalClose.apply(page, closeArgs as any);
              const idx = trackedPages.indexOf(page);
              if (idx !== -1) {
                trackedPages.splice(idx, 1);
              }
              console.log(`[BrowserPool] Page closed on browser #${managed.id}. Remaining active pages: ${trackedPages.length}`);
              if (trackedPages.length === 0) {
                await release();
              }
              return res;
            };

            return page;
          };
        }

        if (prop === 'close') {
          return async function () {
            await release();
          };
        }

        // Forward all other property/method accesses to the real browser object
        const val = Reflect.get(target, prop, receiver);
        if (typeof val === 'function') {
          return val.bind(target);
        }
        return val;
      }
    });
  }

  public async acquireBrowser(): Promise<Browser> {
    await this.init();

    // Check if any browser is available immediately and is healthy
    const managed = this.pool.find(b => !b.isBusy && !b.isDead);
    if (managed) {
      managed.isBusy = true;
      return this.wrapBrowser(managed);
    }

    // Otherwise, wait in the queue
    console.log(`[BrowserPool] All browsers busy. Request queued (queue length: ${this.queue.length}).`);
    return new Promise<Browser>((resolve) => {
      this.queue.push(resolve);
    });
  }

  public async shutdownAll() {
    console.log('[BrowserPool] Shutting down all browsers in the pool...');
    const browsers = [...this.pool];
    this.pool = [];
    for (const managed of browsers) {
      try {
        await managed.browser.close();
      } catch (e) {}
    }
  }
}

// Next.js hot-reloading workaround: save the pool in globalThis
const globalForPool = globalThis as unknown as {
  _browserPool: BrowserPool | undefined;
};

if (!globalForPool._browserPool) {
  globalForPool._browserPool = new BrowserPool();
  
  // Graceful shutdown handling
  const shutdown = async () => {
    if (globalForPool._browserPool) {
      await globalForPool._browserPool.shutdownAll();
    }
    process.exit();
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

const pool = globalForPool._browserPool;

// Download local JS assets asynchronously to speed up PDF parsing offline
async function downloadAsset(url: string, dest: string) {
  try {
    const dir = path.dirname(dest);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(dest)) {
      console.log(`[BrowserSingleton] Downloading offline script from ${url}...`);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buffer = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(dest, buffer);
      console.log(`[BrowserSingleton] Saved script locally: ${dest}`);
    }
  } catch (e: any) {
    console.error(`[BrowserSingleton] Failed to download script ${url}:`, e.message);
  }
}

async function initAssets() {
  await Promise.all([
    downloadAsset('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js', path.resolve('./public/js/pdf.min.js')),
    downloadAsset('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js', path.resolve('./public/js/pdf.worker.min.js')),
    downloadAsset('https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js', path.resolve('./public/js/jsQR.min.js'))
  ]);
}

// Lazy initialization of assets when required
// Asset downloads and browser pool startup are done lazily on demand

let PDFJS_CONTENT: string | undefined;
let PDFJS_WORKER_BASE64: string | undefined;
let JSQR_CONTENT: string | undefined;

export function getLocalScripts() {
  if (!PDFJS_CONTENT) {
    try {
      const pJs = path.join(process.cwd(), 'public', 'js', 'pdf.min.js');
      const pWorker = path.join(process.cwd(), 'public', 'js', 'pdf.worker.min.js');
      const pJsqr = path.join(process.cwd(), 'public', 'js', 'jsQR.min.js');

      if (fs.existsSync(pJs)) PDFJS_CONTENT = fs.readFileSync(pJs, 'utf8');
      if (fs.existsSync(pWorker)) {
        PDFJS_WORKER_BASE64 = fs.readFileSync(pWorker).toString('base64');
      }
      if (fs.existsSync(pJsqr)) JSQR_CONTENT = fs.readFileSync(pJsqr, 'utf8');
    } catch (e: any) {
      console.error('[BrowserSingleton] Failed to read local scripts:', e.message);
    }
  }
  return {
    pdfjs: PDFJS_CONTENT,
    pdfjsWorkerBase64: PDFJS_WORKER_BASE64,
    jsqr: JSQR_CONTENT
  };
}

// Browser pool is lazily initialized inside acquireBrowser()

async function createBrowserInstance(): Promise<Browser> {
  if (process.env.VERCEL) {
    console.log('[BrowserSingleton] Launching isolated Chromium instance for Vercel Serverless request...');
    const chromiumMod = await import('@sparticuz/chromium');
    const chromium = (chromiumMod as any).default || chromiumMod;

    const puppeteerCoreMod = await import('puppeteer-core');
    const puppeteerCore = (puppeteerCoreMod as any).default || puppeteerCoreMod;

    let executablePath: string;
    try {
      executablePath = await chromium.executablePath();
    } catch (err: any) {
      console.warn('[BrowserSingleton] Local chromium bin not found, falling back to release pack tar...', err?.message);
      executablePath = await chromium.executablePath(
        'https://github.com/Sparticuz/chromium/releases/download/v149.0.0/chromium-v149.0.0-pack.tar'
      );
    }

    const launchFn = puppeteerCore.launch || (puppeteerCoreMod as any).launch;
    return await launchFn({
      args: [...(chromium.args || []), '--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: chromium.defaultViewport,
      executablePath: executablePath,
      headless: chromium.headless ?? true,
    });
  }

  const puppeteerMod = await import('puppeteer');
  const puppeteer = (puppeteerMod as any).default || puppeteerMod;
  const launchFn = puppeteer.launch || (puppeteerMod as any).launch;
  return await launchFn({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
}

export async function getBrowser(): Promise<Browser> {
  if (process.env.VERCEL) {
    return createBrowserInstance();
  }
  return pool.acquireBrowser();
}

export { TEMPLATE_FRONT_BASE64, TEMPLATE_BACK_BASE64 };

