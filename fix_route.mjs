import fs from 'fs';

const filePath = 'src/app/api/generate-card/route.ts';
let code = fs.readFileSync(filePath, 'utf8');

// Fix displayLocalAddress regex chopping bug
code = code.replace(
  /let displayLocalAddress = \(localAddress \|\| ''\)\.replace\([\s\S]*?\)\.trim\(\);/,
  "let displayLocalAddress = (localAddress || '').trim();\n  displayLocalAddress = displayLocalAddress.replace(/^સરનામું\\s*:\\s*/i, '');\n  displayLocalAddress = displayLocalAddress.replace(/^Address\\s*:\\s*/i, '');"
);

fs.writeFileSync(filePath, code, 'utf8');
console.log('✅ Successfully fixed displayLocalAddress in generate-card/route.ts!');
