import fs from 'fs';

const filePath = 'src/app/api/extract/route.ts';
let lines = fs.readFileSync(filePath, 'utf8').split('\n');

console.log('Total lines before fix:', lines.length);

// ---- FIX 1: Restore the corrupted try block (lines 1694-1759, 0-indexed: 1693-1758) ----
// Line 1695 (index 1694) has a broken console.log that transitions into slogan code.
// We need to replace lines 1693 (try {) through 1758 (}) with clean legacy repair try-catch.

// Find the corrupted try block start: look for line containing "Aadhaar regional text d      //"
let tryStart = -1;
for (let i = 1690; i < 1700; i++) {
  if (lines[i] && lines[i].includes('Aadhaar regional text d      //')) {
    tryStart = i - 1; // the 'try {' line
    break;
  }
}
console.log('Corrupted try block start (0-indexed):', tryStart);

// Find the end: line containing just "      }" (closing of the if(runLegacyAadhaarRepair) block)
// This is around line 1759 (0-indexed 1758)
let tryEnd = -1;
if (tryStart !== -1) {
  // Look for the } that closes the if(runLegacyAadhaarRepair) block
  // It comes after the Devanagari fallback block
  for (let i = tryStart + 60; i < tryStart + 90; i++) {
    if (lines[i] && lines[i].trim() === '}' && 
        lines[i-1] && lines[i-1].trim() === '}' &&
        lines[i+1] && lines[i+1].trim() === '') {
      tryEnd = i;
      break;
    }
  }
}
console.log('Corrupted try block end (0-indexed):', tryEnd);

if (tryStart !== -1 && tryEnd !== -1) {
  const cleanTryBlock = [
    '        try {',
    '          console.log(`[API/Extract] Aadhaar regional text detected (${detectedLangForRepair}) with confidence ${confidenceScore.toFixed(1)}% < 95%. Triggering Gemini correction...`);',
    '          const fieldsToRepair = {',
    '            localName: originalLocalName,',
    '            localAddress: originalLocalAddress,',
    "            nameEnglish: extractedData.name || '',",
    "            addressEnglish: extractedData.address || ''",
    '          };',
    "          const repairRes = await invokeUserGeminiRepair(geminiApiKeyForRepair, detectedLangForRepair, fieldsToRepair, 'AADHAAR', extractedData.state || null);",
    '          const repaired = repairRes.result;',
    '          if (repaired.localName) {',
    '            extractedData.localName = repaired.localName;',
    '          }',
    '          if (repaired.localAddress) {',
    '            extractedData.localAddress = repaired.localAddress;',
    '          }',
    '          if (repairRes.tokensUsed) {',
    '            try {',
    '              const supabase = await createClient();',
    "              await supabase.from('gemini_token_usage').insert({",
    "                user_id: user && user.id ? user.id : null,",
    '                input_tokens: repairRes.tokensUsed.input,',
    '                output_tokens: repairRes.tokensUsed.output,',
    '                total_tokens: repairRes.tokensUsed.total,',
    "                document_type: 'AADHAAR'",
    '              });',
    '            } catch (dbErr) {',
    "              console.error('[API/Extract] Failed to log Aadhaar repair tokens to Supabase:', dbErr.message);",
    '            }',
    '          }',
    '          aiRepaired = true;',
    "          extractedData.languageSource = 'GEMINI_AI';",
    "          console.log('[API/Extract] Gemini correction completed successfully.');",
    '        } catch (geminiErr) {',
    '          const errMsg = geminiErr.message || String(geminiErr);',
    "          console.error('[API/Extract] Gemini correction failed with exception:', geminiErr);",
    '          let errorDetail = "Unknown AI error";',
    '          if (errMsg.includes("aborted") || errMsg.includes("timeout") || geminiErr.name === "AbortError") {',
    '            errorDetail = "Timeout (exceeded 15s limit)";',
    '          } else if (errMsg.includes("API key not valid") || errMsg.includes("API_KEY_INVALID")) {',
    '            errorDetail = "Invalid API Key (401)";',
    '          } else if (errMsg.includes("quota") || errMsg.includes("429")) {',
    '            errorDetail = "Quota exceeded (429)";',
    '          } else {',
    '            errorDetail = errMsg.replace(/\\[GoogleGenerativeAI Error\\]:\\s*/, \'\').substring(0, 80);',
    '          }',
    '          aiWarning = `AI repair unavailable: ${errorDetail}. Standard language engine used.`;',
    '        }',
    '      }',
  ];
  
  lines.splice(tryStart, tryEnd - tryStart + 1, ...cleanTryBlock);
  console.log('Fix 1: Corrupted try block restored. Lines now:', lines.length);
}

// ---- FIX 2: Remove the orphaned junk lines after the new Unicode slogan block ----
// The clean Unicode slogan block ends with /[\u0A80-\u0AFF]/.test(rawText); // Any Gujarati
// The junk starts right after (blank line + mojibake garbage)
// Find the second occurrence of /[\u0A80-\u0AFF]/.test(rawText) (the junk one) and remove surrounding junk

let gujaratiRegexCount = 0;
let junkStart = -1;
let junkEnd = -1;
for (let i = 1750; i < 1870; i++) {
  if (lines[i] && lines[i].includes('u0A80-') && lines[i].includes('u0AFF') && lines[i].includes('.test(rawText)')) {
    gujaratiRegexCount++;
    if (gujaratiRegexCount === 2) {
      // Found the duplicate - junk is around here
      // Find the blank line just before this (junkStart) and the blank line just after (junkEnd)
      junkStart = i - 8; // go back to find start of junk block
      // Find end: the next clean line after this Gujarati regex
      junkEnd = i + 1; // include the blank line after
      break;
    }
  }
}
console.log('Second Gujarati regex (junk) at line:', junkStart, 'to', junkEnd);

if (junkStart !== -1 && junkEnd !== -1) {
  // Narrow down: find the blank line that starts the junk (after the clean Unicode block)
  // The clean block ends with /[\u0A80-\u0AFF]/.test(rawText); // Any Gujarati script character
  let firstGujaratiRegex = -1;
  for (let i = 1770; i < junkStart; i++) {
    if (lines[i] && lines[i].includes('u0A80-') && lines[i].includes('u0AFF') && lines[i].includes('.test(rawText)')) {
      firstGujaratiRegex = i;
      break;
    }
  }
  
  if (firstGujaratiRegex !== -1) {
    const realJunkStart = firstGujaratiRegex + 1; // blank line after clean block
    const realJunkEnd = junkEnd; // blank line after duplicate Gujarati regex
    console.log('Removing junk from line', realJunkStart, 'to', realJunkEnd, '(0-indexed)');
    lines.splice(realJunkStart, realJunkEnd - realJunkStart + 1);
    console.log('Fix 2: Junk lines removed. Lines now:', lines.length);
  }
}

fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log('\u2705 route.ts patched successfully! Final lines:', lines.length);
