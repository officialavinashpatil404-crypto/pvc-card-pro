import fs from 'fs';
import path from 'path';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import jsQR from 'jsqr';
import sharp from 'sharp';
import zlib from 'zlib';

const args = process.argv.slice(2);
const targetDir = args[0] || '.';
const password = args[1] || undefined; // Optional password for all PDFs if encrypted

async function decodeQR(base64Data) {
    try {
        const imageBuffer = Buffer.from(base64Data, 'base64');
        const { data, info } = await sharp(imageBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        const code = jsQR(new Uint8ClampedArray(data), info.width, info.height);

        if (code) {
            let xmlString = '';
            if (code.data.includes('<?xml') || code.data.includes('<PrintLetterBarcodeData')) {
                xmlString = code.data;
            } else {
                const binData = code.binaryData;
                let compressedIndex = -1;
                let isGzip = false;
                for (let i = 0; i < binData.length - 1; i++) {
                    if (binData[i] === 0x1f && binData[i+1] === 0x8b) {
                        compressedIndex = i; isGzip = true; break;
                    } else if (binData[i] === 0x78 && (binData[i+1] === 0x9c || binData[i+1] === 0xda || binData[i+1] === 0x01)) {
                        compressedIndex = i; isGzip = false; break;
                    }
                }
                if (compressedIndex !== -1) {
                    const compressedBuf = Buffer.from(binData.slice(compressedIndex));
                    try {
                        const unzipped = isGzip ? zlib.gunzipSync(compressedBuf) : zlib.unzipSync(compressedBuf);
                        xmlString = unzipped.toString('utf-8');
                    } catch (e) { /* silent fail */ }
                }
            }

            if (xmlString) {
                const attrRegex = /([a-zA-Z0-9_]+)="([^"]*)"/g;
                const parsedData = {};
                let match;
                while ((match = attrRegex.exec(xmlString)) !== null) {
                    parsedData[match[1]] = match[2];
                }
                return { xml: xmlString, data: parsedData };
            }
        }
    } catch (e) { }
    return null;
}

async function processPdf(filePath) {
    try {
        const pdfBytes = fs.readFileSync(filePath);
        const loadingTask = pdfjs.getDocument({ data: new Uint8Array(pdfBytes), password, useSystemFonts: true });
        const pdf = await loadingTask.promise;
        
        // Find QR image
        let qrDataResult = null;
        for (let i = 1; i <= pdf.numPages; i++) {
            if (qrDataResult) break;
            const page = await pdf.getPage(i);
            const ops = await page.getOperatorList();
            
            for (let j = 0; j < ops.fnArray.length; j++) {
                if (ops.fnArray[j] === pdfjs.OPS.paintImageXObject) {
                    const imgName = ops.argsArray[j][0];
                    try {
                        const img = await page.objs.get(imgName);
                        if (img && img.width && img.height) {
                           // QR codes are usually square-ish and large enough
                           if (img.width > 100 && img.height > 100 && Math.abs(img.width - img.height) < 50) {
                               const canvas = Buffer.alloc(img.width * img.height * 4);
                               let srcIndex = 0, destIndex = 0;
                               for (let y = 0; y < img.height; y++) {
                                   for (let x = 0; x < img.width; x++) {
                                       canvas[destIndex++] = img.data[srcIndex++];
                                       canvas[destIndex++] = img.data[srcIndex++];
                                       canvas[destIndex++] = img.data[srcIndex++];
                                       canvas[destIndex++] = 255; // Alpha
                                   }
                               }
                               const base64 = canvas.toString('base64');
                               const qrRes = await decodeQR(base64);
                               if (qrRes) {
                                   qrDataResult = qrRes;
                                   break;
                               }
                           }
                        }
                    } catch(e) {}
                }
            }
        }
        return qrDataResult;
    } catch (error) {
        return { error: error.message };
    }
}

async function main() {
    console.log(`Scanning directory: ${targetDir}`);
    const files = fs.readdirSync(targetDir).filter(f => f.toLowerCase().endsWith('.pdf'));
    const limit = Math.min(files.length, 20);
    
    console.log(`Found ${files.length} PDFs. Processing up to ${limit} files...\n`);
    
    let report = '# Aadhaar QR Code Analysis Report\n\n';
    report += `| File | Name | DOB | Gender | Address | Local Name | Local Address | VID | Aadhaar |\n`;
    report += `|---|---|---|---|---|---|---|---|---|\n`;

    let totalProcessed = 0;
    
    for (let i = 0; i < limit; i++) {
        const file = files[i];
        const filePath = path.join(targetDir, file);
        process.stdout.write(`Processing [${i+1}/${limit}]: ${file}... `);
        
        const res = await processPdf(filePath);
        
        if (!res) {
            console.log('No QR found or failed to decode.');
            report += `| ${file} | ❌ Failed/No QR | - | - | - | - | - | - | - |\n`;
        } else if (res.error) {
            console.log(`Error: ${res.error}`);
            report += `| ${file} | ⚠️ Error | - | - | - | - | - | - | - |\n`;
        } else {
            console.log('SUCCESS');
            const d = res.data;
            // Map known fields based on UIDAI XML spec
            const name = d.name || d.n || '-';
            const dob = d.dob || d.yob || d.d || '-';
            const gender = d.gender || d.g || '-';
            // Construct address if split
            let address = d.address || d.a || '';
            if (!address) {
                const parts = [d.house, d.street, d.lm, d.loc, d.vtc, d.po, d.dist, d.subdist, d.state, d.pc].filter(Boolean);
                if (parts.length) address = parts.join(', ');
                else address = '-';
            }
            
            const localName = d.lname || d.name_local || d.ln || '-';
            const localAddr = d.laddress || d.address_local || d.la || '-';
            const vid = d.vid || d.v || '-';
            const aadhaar = d.uid || d.u || '-';

            report += `| ${file} | ${name} | ${dob} | ${gender} | ${address} | **${localName}** | **${localAddr}** | ${vid} | ${aadhaar} |\n`;
            
            // Append raw XML summary
            report += `\n<details><summary>RAW XML: ${file}</summary>\n\n\`\`\`xml\n${res.xml}\n\`\`\`\n\n</details>\n`;
        }
        totalProcessed++;
    }
    
    fs.writeFileSync('Aadhaar_QR_Report.md', report);
    console.log(`\n✅ Done! Processed ${totalProcessed} PDFs. Report generated at: Aadhaar_QR_Report.md`);
}

main();
