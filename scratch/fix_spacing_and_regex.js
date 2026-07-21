const fs = require('fs');
const path = require('path');

const routePath = path.resolve('./src/app/api/extract/route.ts');
let content = fs.readFileSync(routePath, 'utf8');

console.log("Starting regex and spacing fixes in route.ts...");

// Fix 1: District Label Regex (adding 'જિલ્લો' to hasLocalDistLabel regex)
const oldRegex = `const hasLocalDistLabel = /(जिला|जिल्हा|જીલ્લો|மாவட்டம்|జిల్లా|జిల్లే|జిల్లే|జిల్లా|જિલ્લા)/.test(localPart);`;
const newRegex = `const hasLocalDistLabel = /(जिला|जिल्हा|જીલ્લો|જિલ્લો|மாவட்டம்|జిల్లా|జિલ્له|జిల్లే|జిల్లా|જિલ્લા)/.test(localPart);`;

// Let's do a line-ending-insensitive check and replacement
const cleanContent = content.replace(/\r?\n/g, '\n');
const cleanOldRegex = oldRegex.replace(/\r?\n/g, '\n');
const cleanNewRegex = newRegex.replace(/\r?\n/g, '\n');

if (cleanContent.includes(cleanOldRegex)) {
  content = cleanContent.replace(cleanOldRegex, cleanNewRegex);
  console.log("Fix 1: District Regex found and updated.");
} else {
  // Try another variation if it doesn't match exactly
  console.log("Fix 1: Could not find exact district regex. Attempting substring match...");
  const matchStr = `const hasLocalDistLabel = /(जिला|जिल्हा|જીલ્લો|மாவட்டம்`;
  if (cleanContent.includes(matchStr)) {
    // Find the line containing this match string
    const lines = cleanContent.split('\n');
    const lineIndex = lines.findIndex(l => l.includes(matchStr));
    if (lineIndex !== -1) {
      lines[lineIndex] = `      const hasLocalDistLabel = /(जिला|जिल्हा|જીલ્લો|જિલ્લો|જિલ્લા|જિલ્લાઓ|જિલ્લોઓ|જિલ્લે|જિલ્લે|மாவட்டம்|జిల్లా|జిల్లే|జిల్లే|జిల్లా)/.test(localPart);`;
      content = lines.join('\n');
      console.log("Fix 1: District regex line updated via line search.");
    }
  } else {
    console.log("Fix 1: District regex line not found at all.");
  }
}

// Fix 2: Devanagari Space Restorer Condition (wrap the loop in a space count check)
const cleanContent2 = content.replace(/\r?\n/g, '\n');
const oldDevanagariPattern = `    const commonDevanagariNameParts = [\n      'चौहान'`;
if (cleanContent2.includes(oldDevanagariPattern)) {
  const lines = cleanContent2.split('\n');
  const startIndex = lines.findIndex(l => l.includes("const commonDevanagariNameParts = ["));
  // Find where the loop ends (usually idx = repaired.indexOf(part, idx + part.length + 1); \n } \n } )
  let endIndex = -1;
  for (let idx = startIndex; idx < lines.length; idx++) {
    if (lines[idx].includes("idx = repaired.indexOf(part, idx + part.length + 1);") && lines[idx+1].trim() === "}" && lines[idx+2].trim() === "}") {
      endIndex = idx + 2;
      break;
    }
  }

  if (startIndex !== -1 && endIndex !== -1) {
    // Wrap this block in if (repaired.match(/\s/g) || []).length < englishName.trim().split(/\s+/).length - 1
    const blockContent = lines.slice(startIndex, endIndex + 1).map(l => '  ' + l).join('\n');
    const replacement = `    const repSpacesDev = (repaired.match(/\\s/g) || []).length;\n    const engWordsCountDev = englishName.trim().split(/\\s+/).filter(w => w.length > 0).length;\n    if (repSpacesDev < engWordsCountDev - 1) {\n${blockContent}\n    }`;
    
    // Replace the range [startIndex, endIndex] with replacement
    lines.splice(startIndex, endIndex - startIndex + 1, replacement);
    content = lines.join('\n');
    console.log("Fix 2: Devanagari space restorer successfully wrapped.");
  } else {
    console.log("Fix 2: Could not find Devanagari loop range.");
  }
} else {
  console.log("Fix 2: Devanagari space restorer pattern not found.");
}

// Fix 3: Gujarati Space Restorer Condition (wrap the loop in a space count check)
const cleanContent3 = content.replace(/\r?\n/g, '\n');
const oldGujaratiPattern = `    const commonGujaratiNameParts = [\n      'સિલ્વરરેસિડેન્સી'`;
if (cleanContent3.includes(oldGujaratiPattern)) {
  const lines = cleanContent3.split('\n');
  const startIndex = lines.findIndex(l => l.includes("const commonGujaratiNameParts = ["));
  let endIndex = -1;
  for (let idx = startIndex; idx < lines.length; idx++) {
    if (lines[idx].includes("idx = repaired.indexOf(part, idx + part.length + 1);") && lines[idx+1].trim() === "}" && lines[idx+2].trim() === "}") {
      endIndex = idx + 2;
      break;
    }
  }

  if (startIndex !== -1 && endIndex !== -1) {
    const blockContent = lines.slice(startIndex, endIndex + 1).map(l => '  ' + l).join('\n');
    const replacement = `    const repSpacesGuj = (repaired.match(/\\s/g) || []).length;\n    const engWordsCountGuj = englishName.trim().split(/\\s+/).filter(w => w.length > 0).length;\n    if (repSpacesGuj < engWordsCountGuj - 1) {\n${blockContent}\n    }`;
    
    lines.splice(startIndex, endIndex - startIndex + 1, replacement);
    content = lines.join('\n');
    console.log("Fix 3: Gujarati space restorer successfully wrapped.");
  } else {
    console.log("Fix 3: Could not find Gujarati loop range.");
  }
} else {
  console.log("Fix 3: Gujarati space restorer pattern not found.");
}

// Write the file back with standard CRLF line endings
fs.writeFileSync(routePath, content.replace(/\n/g, '\r\n'), 'utf8');
console.log("Fixes complete!");
