const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'app', 'api', 'generate-card', 'route.ts');

if (!fs.existsSync(filePath)) {
  console.error("File does not exist:", filePath);
  process.exit(1);
}

let content = fs.readFileSync(filePath, 'utf8');

// Find where interface RelationAssets starts
const interfaceStart = content.indexOf('interface RelationAssets');
if (interfaceStart === -1) {
  // Let's search with comments too
  const fallbackStart = content.indexOf('//');
  // We want to find "interface RelationAssets" specifically
  const regex = /\/\/\s*.*interface\s+RelationAssets/;
  const match = content.match(regex);
  if (!match) {
    console.error("Could not find interface RelationAssets in the file");
    process.exit(1);
  }
  // Let's find the start of the line containing that match
  const lineStart = content.lastIndexOf('\n', match.index) + 1;
  replaceFromIndex(lineStart);
} else {
  // Let's find the start of the line
  const lineStart = content.lastIndexOf('\n', interfaceStart) + 1;
  replaceFromIndex(lineStart);
}

function replaceFromIndex(startIndex) {
  // We want to replace everything from startIndex to the start of export async function POST
  const postMatch = content.indexOf('export async function POST');
  if (postMatch === -1) {
    console.error("Could not find POST export");
    process.exit(1);
  }

  // Find the closing brace of fixLocalCoPrefix before POST
  const beforePost = content.substring(startIndex, postMatch);
  const lastCloseBrace = beforePost.lastIndexOf('}');
  if (lastCloseBrace === -1) {
    console.error("Could not find closing brace of fixLocalCoPrefix");
    process.exit(1);
  }

  const endIndex = startIndex + lastCloseBrace + 1;

  console.log("Replacing content from index", startIndex, "to", endIndex);
  console.log("Original content preview:");
  console.log(content.substring(startIndex, startIndex + 200));
  console.log("...");
  console.log(content.substring(endIndex - 100, endIndex));

  const newCode = `interface RelationAssets {
  so: string;
  wo: string;
  do: string;
  co: string;
}

const RELATION_MAPPING: Record<string, RelationAssets> = {
  hindi:       { so: 'सुपुत्र:', wo: 'पत्नी:', do: 'सुपुत्री:', co: 'केयर ऑफ:' },
  devanagari:  { so: 'सुपुत्र:', wo: 'पत्नी:', do: 'सुपुत्री:', co: 'केयर ऑफ:' },
  marathi:     { so: 'पुत्र:', wo: 'पत्नी:', do: 'पुत्री:', co: 'केअर ऑफ:' },
  gujarati:    { so: 'પુત્ર:', wo: 'પત્ની:', do: 'પુત્રી:', co: 'કેર ઓફ:' },
  tamil:       { so: 'மகன்:', wo: 'மனைவி:', do: 'மகள்:', co: 'கேர் ஆஃப்:' },
  telugu:      { so: 'కుమారుడు:', wo: 'భార్య:', do: 'కుమార్తె:', co: 'కేర్ ഓഫ്:' },
  kannada:     { so: 'മഗ:', wo: 'ಪತ್ನಿ:', do: 'ಮಗಳು:', co: 'ಕೇರ್ ಆಫ್:' },
  malayalam:   { so: 'മകൻ:', wo: 'ഭാര്യ:', do: 'മകൾ:', co: 'കെയർ ഓഫ്:' },
  bengali:     { so: 'পুত্র:', wo: 'স্ত্রী:', do: 'কন্যা:', co: 'যত্নে:' },
  assamese:    { so: 'পুত্র:', wo: 'পত্নী:', do: 'কন্যা:', co: 'যত্নে:' },
  punjabi:     { so: 'ਪੁੱਤਰ:', wo: 'ਪਤਨੀ:', do: 'ਧੀ:', co: 'ਕੇਅर आफ:' },
  odia:        { so: 'ਪੁਤ੍ਰ:', wo: 'ਪਤਨੀ:', do: 'କନ୍ୟା:', co: 'ଯତ୍ନରେ:' },
  urdu:        { so: 'بیٹا:', wo: 'زوجہ:', do: 'بیٹی:', co: 'زیر نگرانی:' },
  manipuri:    { so: 'মচা:', wo: 'লোইনবী:', do: 'মচা সুপ্ত্রী:', co: 'কেয়র অফ:' },
  english:     { so: 'S/O:', wo: 'W/O:', do: 'D/O:', co: 'C/O:' }
};

function fixLocalCoPrefix(localAddress: string, englishAddress: string): string {
  if (!localAddress || !englishAddress) return localAddress;

  const engCoMatch = englishAddress.trim().match(
    /^(C\\/O|W\\/O|S\\/O|D\\/O|H\\/O|F\\/O|C\\\\.O\\\\.|W\\\\.O\\\\.|S\\\\.O\\\\.|D\\\\.O\\\\.)/i
  );
  if (!engCoMatch) return localAddress;

  const rel = engCoMatch[1].toUpperCase().replace(/\\./g, '');
  const { lang } = detectLanguage(localAddress);
  const mapping = RELATION_MAPPING[lang] || RELATION_MAPPING.hindi;

  let localPrefix = '';
  if (rel === 'SO') localPrefix = mapping.so;
  else if (rel === 'WO') localPrefix = mapping.wo;
  else if (rel === 'DO') localPrefix = mapping.do;
  else if (rel === 'CO') localPrefix = mapping.co;

  if (!localPrefix) return localAddress;

  const allPrefixes = Object.values(RELATION_MAPPING)
    .map(m => [m.so, m.wo, m.do, m.co])
    .flat()
    .map(p => p.replace(':', '[:\\\\s]*'))
    .join('|');
  const prefixRegex = new RegExp(\`^(\${allPrefixes}|C\\\\/O|W\\\\/O|S\\\\/O|D\\\\/O|H\\\\/O|F\\\\/O|C\\\\\\\\.O\\\\\\\\.|W\\\\\\\\.O\\\\\\\\.|S\\\\\\\\.O\\\\\\\\.|D\\\\\\\\.O\\\\\\\\.)[:\\\\\\\\s]*\`, 'i');

  if (prefixRegex.test(localAddress.trim())) {
    return localAddress.trim().replace(prefixRegex, \`\${localPrefix} \`);
  }

  return \`\${localPrefix} \${localAddress.trim()}\`;
}`;

  const newContent = content.substring(0, startIndex) + newCode + content.substring(endIndex);
  fs.writeFileSync(filePath, newContent, 'utf8');
  console.log("File successfully updated!");
}
