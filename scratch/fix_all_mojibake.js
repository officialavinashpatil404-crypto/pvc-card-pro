const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'app', 'api', 'generate-card', 'route.ts');

if (!fs.existsSync(filePath)) {
  console.error("File does not exist:", filePath);
  process.exit(1);
}

let content = fs.readFileSync(filePath, 'utf8');

// 1. Replace getCorrectGenderLine function
const genderFuncStart = content.indexOf('function getCorrectGenderLine');
if (genderFuncStart === -1) {
  console.error("Could not find getCorrectGenderLine function");
  process.exit(1);
}

// Find the end of getCorrectGenderLine (closes around line 73)
const genderFuncEnd = content.indexOf('function cleanIndianText');
if (genderFuncEnd === -1) {
  console.error("Could not find cleanIndianText function to locate end of getCorrectGenderLine");
  process.exit(1);
}

// Let's find the closing brace of getCorrectGenderLine right before cleanIndianText
const beforeClean = content.substring(genderFuncStart, genderFuncEnd);
const lastCloseBrace = beforeClean.lastIndexOf('}');
if (lastCloseBrace === -1) {
  console.error("Could not find closing brace of getCorrectGenderLine");
  process.exit(1);
}

const genderReplaceEnd = genderFuncStart + lastCloseBrace + 1;

const newGenderFunc = `function getCorrectGenderLine(genderLine: string, gender: string, lang: string): string {
  const genderLower = (gender || '').toUpperCase();
  const langLower = (lang || '').toLowerCase();

  const mapping: Record<string, { male: string; female: string; trans: string }> = {
    gujarati:  { male: 'પુરુષ / MALE', female: 'સ્ત્રી / FEMALE', trans: 'ત્રીજી જાતિ / TRANSGENDER' },
    hindi:     { male: 'पुरुष / MALE', female: 'महिला / FEMALE', trans: 'किन्नर / TRANSGENDER' },
    marathi:   { male: 'पुरुष / MALE', female: 'महिला / FEMALE', trans: 'तृतीयपंथी / TRANSGENDER' },
    devanagari:{ male: 'पुरुष / MALE', female: 'महिला / FEMALE', trans: 'किन्नर / TRANSGENDER' },
    tamil:     { male: 'ஆண் / MALE', female: 'பெண் / FEMALE', trans: 'திருநங்கை / TRANSGENDER' },
    telugu:    { male: 'పురుషుడు / MALE', female: 'స్త్రీ / FEMALE', trans: 'నపుంసకుడు / TRANSGENDER' },
    kannada:   { male: 'ಪುರುಷ / MALE', female: 'ಮಹಿಳೆ / FEMALE', trans: 'ತೃತೀಯ ಲಿಂಗ / TRANSGENDER' },
    malayalam: { male: 'പുരുഷൻ / MALE', female: 'സ്ത്രീ / FEMALE', trans: 'ഭിന്നലിംഗക്കാരൻ / TRANSGENDER' },
    bengali:   { male: 'পুরুষ / MALE', female: 'মহিলা / FEMALE', trans: 'তৃতীয় লিঙ্গ / TRANSGENDER' },
    assamese:  { male: 'पुरुष / MALE', female: 'মহিলা / FEMALE', trans: 'তৃতীয় লিংগ / TRANSGENDER' },
    punjabi:   { male: 'ਪੁਰਸ਼ / MALE', female: 'ਮਹਿਲਾ / FEMALE', trans: 'ਤੀਜਾ ਲਿੰਗ / TRANSGENDER' },
    odia:      { male: 'ପୁରୁଷ / MALE', female: 'ମହିଳା / FEMALE', trans: 'ତୃତୀୟ ଲିଙ୍ଗ / TRANSGENDER' },
    urdu:      { male: 'مرد / MALE', female: 'عورت / FEMALE', trans: 'خواجہ سرا / TRANSGENDER' },
    english:   { male: 'MALE', female: 'FEMALE', trans: 'TRANSGENDER' }
  };

  const currentMap = mapping[langLower] || mapping.english;

  if (genderLower.includes('FEMALE')) {
    return currentMap.female;
  } else if (genderLower.includes('TRANS')) {
    return currentMap.trans;
  } else {
    return currentMap.male;
  }
}`;

content = content.substring(0, genderFuncStart) + newGenderFunc + content.substring(genderReplaceEnd);

// 2. Replace SAFE_DOB_LABELS
// Reload content to compute new indexes
const dobStart = content.indexOf('const SAFE_DOB_LABELS: Record<string, string> = {');
if (dobStart === -1) {
  console.error("Could not find SAFE_DOB_LABELS");
  process.exit(1);
}

const dobEnd = content.indexOf('};', dobStart);
if (dobEnd === -1) {
  console.error("Could not find end of SAFE_DOB_LABELS");
  process.exit(1);
}

const newDobLabels = `const SAFE_DOB_LABELS: Record<string, string> = {
      gujarati:  'જન્મ તારીખ / DOB: ',
      hindi:     'जन्म तिथि / DOB: ',
      marathi:   'जन्म तारीख / DOB: ',
      tamil:     'பிறந்த தேதி / DOB: ',
      telugu:    'పుట్టిన తేదీ / DOB: ',
      kannada:   'ಹುಟ್ಟಿದ ದಿನಾಂಕ / DOB: ',
      malayalam: 'ജനന തീയതി / DOB: ',
      bengali:   'জন্ম তারিখ / DOB: ',
      assamese:  'জন্ম তারিখ / DOB: ',
      punjabi:   'ਜਨਮ ਮਿਤੀ / DOB: ',
      odia:      'ଜନ୍ମ ତାରିଖ / DOB: ',
      english:   'DOB: ',
    }`;

content = content.substring(0, dobStart) + newDobLabels + content.substring(dobEnd + 2);

fs.writeFileSync(filePath, content, 'utf8');
console.log("SUCCESSFULLY FIXED MOJIBAKE CHARACTERS");
