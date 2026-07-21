const fs = require('fs');
const file = 'src/app/api/generate-card/route.ts';
let code = fs.readFileSync(file, 'utf8');

// The replacement was in generateAyushmanPVCHTML. Let's fix all \${ to ${ inside that function only.
const startIdx = code.indexOf('function generateAyushmanPVCHTML(params: any): string {');
const endIdx = code.indexOf('}', startIdx + 1000); // the function is large

const before = code.substring(0, startIdx);
let funcBody = code.substring(startIdx, endIdx);
const after = code.substring(endIdx);

funcBody = funcBody.replace(/\\\$\{/g, '${');
funcBody = funcBody.replace(/\\\`/g, '`');

fs.writeFileSync(file, before + funcBody + after);
console.log('Fixed syntax errors');
