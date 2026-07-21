"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const puppeteer_1 = require("puppeteer");
const fs = require("fs");
const path = require("path");
async function main() {
    console.log("=== STARTING AUTOMATED END-TO-END VERIFICATION ===");
    const brainDir = 'C:/Users/NANO/.gemini/antigravity-ide/brain/540099ad-a8db-4a5b-8643-0f1a9ef0c969';
    const pdfPath = 'C:/Users/NANO/Downloads/amol.pdf';
    if (!fs.existsSync(pdfPath)) {
        console.error(`PDF not found at: ${pdfPath}`);
        process.exit(1);
    }
    const browser = await puppeteer_1.default.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    // Capture console logs from the page
    const consoleLogs = [];
    page.on('console', msg => {
        consoleLogs.push(`[BROWSER CONSOLE] ${msg.type().toUpperCase()}: ${msg.text()}`);
        console.log(`[BROWSER CONSOLE] ${msg.type().toUpperCase()}: ${msg.text()}`);
    });
    try {
        // 1. Open the page
        console.log("Navigating to http://localhost:3000/dashboard/generate ...");
        await page.goto('http://localhost:3000/dashboard/generate', { waitUntil: 'networkidle2' });
        await page.setViewport({ width: 1280, height: 1000 });
        // Take a screenshot of the initial upload state
        const ss1Path = path.join(brainDir, 'pvc_step1_upload.png');
        await page.screenshot({ path: ss1Path });
        console.log(`Step 1 Screenshot saved: ${ss1Path}`);
        // 2. Upload password protected Aadhaar PDF
        console.log("Selecting file amol.pdf to upload...");
        const fileInput = await page.$('input[type="file"]');
        if (!fileInput)
            throw new Error("File input element not found");
        await fileInput.uploadFile(pdfPath);
        await new Promise(r => setTimeout(r, 1000));
        // Try to click Extract Details to trigger password prompt
        console.log("Clicking Extract Details to trigger password screen...");
        await page.click('main button[type="submit"]');
        await new Promise(r => setTimeout(r, 1500));
        // Take screenshot showing password prompt
        const ss2Path = path.join(brainDir, 'pvc_step2_password_prompt.png');
        await page.screenshot({ path: ss2Path });
        console.log(`Step 2 (Password prompt) Screenshot saved: ${ss2Path}`);
        // 3. Enter password
        console.log("Entering password: AMOL1992 ...");
        const pwdInput = await page.$('input[type="password"]');
        if (!pwdInput)
            throw new Error("Password input field not found");
        await pwdInput.type('AMOL1992');
        // Click Extract Details again
        console.log("Clicking Extract Details again to start extraction...");
        await page.click('main button[type="submit"]');
        // Wait for the extraction API call to complete
        console.log("Waiting for extraction API response...");
        await page.waitForFunction(() => {
            // Return true when verify details container appears
            return document.body.innerText.includes('Verify Extracted Details');
        }, { timeout: 30000 });
        await new Promise(r => setTimeout(r, 2000));
        // 4 & 5. Confirm photo and QR code are automatically displayed on screen
        console.log("Verifying extracted fields and auto-extracted assets...");
        const pageText = await page.evaluate(() => document.body.innerText);
        const hasPhotoBadge = pageText.includes('Photo') && pageText.includes('Auto-extracted');
        const hasQRBadge = (pageText.includes('QR Code') || pageText.includes('QR')) && pageText.includes('Auto-extracted');
        console.log(`Auto-extracted Photo visible: ${hasPhotoBadge}`);
        console.log(`Auto-extracted QR visible: ${hasQRBadge}`);
        if (!hasPhotoBadge || !hasQRBadge) {
            throw new Error("Photo or QR code auto-extracted badge is missing!");
        }
        // Take screenshot of the populated details screen
        const ss3Path = path.join(brainDir, 'pvc_step3_details_screen.png');
        await page.screenshot({ path: ss3Path });
        console.log(`Step 3 (Details screen) Screenshot saved: ${ss3Path}`);
        // 6. Click Generate PVC Card
        console.log("Clicking Generate PVC Card...");
        // Find the generate button
        const generateBtnText = "Generate PVC Card";
        const generateBtn = await page.evaluateHandle((text) => {
            const buttons = Array.from(document.querySelectorAll('button'));
            return buttons.find(b => b.innerText.includes(text));
        }, generateBtnText);
        if (!generateBtn.asElement())
            throw new Error("Generate PVC Card button not found");
        await generateBtn.asElement().click();
        // Wait for generation previews to appear
        console.log("Waiting for card previews to load...");
        await page.waitForFunction(() => {
            return document.body.innerText.includes('PVC Card generated successfully!') || document.body.innerText.includes('Front Side');
        }, { timeout: 45000 });
        await new Promise(r => setTimeout(r, 3000));
        // 7, 8, & 9. Verify front/back previews and downloads
        console.log("Verifying card previews...");
        const hasFrontPreview = await page.evaluate(() => {
            const imgs = Array.from(document.querySelectorAll('img'));
            return imgs.some(img => img.alt === 'PVC Card Front' && img.src.startsWith('data:image/png;base64,'));
        });
        const hasBackPreview = await page.evaluate(() => {
            const imgs = Array.from(document.querySelectorAll('img'));
            return imgs.some(img => img.alt === 'PVC Card Back' && img.src.startsWith('data:image/png;base64,'));
        });
        console.log(`Front Card Preview visible: ${hasFrontPreview}`);
        console.log(`Back Card Preview visible: ${hasBackPreview}`);
        if (!hasFrontPreview || !hasBackPreview) {
            throw new Error("Front or Back card previews are missing or failed to render!");
        }
        // Take full-page screenshot of the card preview screen (scroll to bottom first)
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await new Promise(r => setTimeout(r, 500));
        const ss4Path = path.join(brainDir, 'pvc_step4_previews.png');
        await page.screenshot({ path: ss4Path, fullPage: true });
        console.log(`Step 4 (Previews screen - full page) Screenshot saved: ${ss4Path}`);
        // Verify presence of download buttons
        const downloadBtns = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            return {
                front: buttons.some(b => b.innerText.includes('Download Front PNG')),
                back: buttons.some(b => b.innerText.includes('Download Back PNG')),
                pdf: buttons.some(b => b.innerText.includes('Download A4 PDF'))
            };
        });
        console.log("Download buttons check:", downloadBtns);
        if (!downloadBtns.front || !downloadBtns.back || !downloadBtns.pdf) {
            throw new Error("One or more download buttons are missing!");
        }
        console.log("=== END-TO-END VERIFICATION COMPLETED SUCCESSFULLY ===");
        fs.writeFileSync(path.join(brainDir, 'console_logs.txt'), consoleLogs.join('\n'));
        console.log(`Console logs written to console_logs.txt`);
    }
    catch (err) {
        console.error("VERIFICATION STEP FAILED!");
        console.error("Stack trace:", err.stack);
        fs.writeFileSync(path.join(brainDir, 'console_logs.txt'), consoleLogs.join('\n'));
        await browser.close();
        process.exit(1);
    }
    await browser.close();
}
main().catch(console.error);
