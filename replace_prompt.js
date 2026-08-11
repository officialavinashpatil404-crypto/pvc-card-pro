const fs = require('fs');
const path = require('path');

const routePath = path.resolve(__dirname, 'src/app/api/extract/route.ts');
if (!fs.existsSync(routePath)) {
  console.error('route.ts not found at:', routePath);
  process.exit(1);
}

let content = fs.readFileSync(routePath, 'utf8');

const targetPrompt = `          if (docType === 'AADHAAR') {
            aiPrompt = \`You are an expert Aadhaar data REPAIR ENGINE with deep knowledge of Indian regional scripts.`;

// We will find the index of the start of the target and the end of the Aadhaar block which is before "else if (docType === 'PAN')"
const startIndex = content.indexOf(targetPrompt);
if (startIndex === -1) {
  console.error('Could not find the target Aadhaar prompt block in route.ts');
  process.exit(1);
}

const endIndex = content.indexOf(`          } else if (docType === 'PAN') {`, startIndex);
if (endIndex === -1) {
  console.error('Could not find the end of Aadhaar prompt block in route.ts');
  process.exit(1);
}

const newPrompt = `          if (docType === 'AADHAAR') {
            aiPrompt = \`You are an expert Aadhaar regional text repair engine for \${promptLang.toUpperCase()} script.
Your ONLY job is to output the clean, properly-spaced, and correctly-spelled name and address in the local \${promptLang.toUpperCase()} language.

REFERENCE DATA (English fields extracted from PDF):
- Name (EN): "\${extractedData.name || ''}"
- Address (EN): "\${extractedData.address || ''}"

ORIGINAL PDF TEXT LAYER (Contains encoding/font corruptions):
--- START ---
\${rawText}
--- END ---

CRITICAL RULES:
1. WORD FIDELITY & SPACING: The original PDF text layer often has spacing errors or missing characters due to custom font subsets. Use the English Name and English Address to repair individual broken glyphs, matras, and spaces, but KEEP the exact wording, names, and structure from the PDF text layer.
2. DO NOT translate English into the local language arbitrarily. For example, if the PDF text has "ના દ્વારા" or "દ્વારા", preserve it. DO NOT translate "C/O" into anything else if the local text has a specific prefix.
3. OUTPUT FORMAT: Return ONLY a valid JSON object. No explanation, no markdown, no backticks.
{
  "nameLocalScript": "repaired name in local language",
  "addressLocalScript": "repaired full address in local language"
}\`;
`;

const updatedContent = content.substring(0, startIndex) + newPrompt + content.substring(endIndex);
fs.writeFileSync(routePath, updatedContent, 'utf8');
console.log('Successfully updated Aadhaar Gemini AI prompt in route.ts!');
