import fs from 'fs';

const filePath = 'src/app/api/extract/route.ts';
let code = fs.readFileSync(filePath, 'utf8');

// 1. Fix getCorrectAddressLabel gujarati
code = code.replace(/gujarati:\s*'àª¸àª°àª¨àª¾àª®[\s\S]*?'/g, "gujarati: 'સરનામું :'");

// 2. Fix getCorrectDobLine gujarati
code = code.replace(/gujarati:\s*'àªœàª¨[\s\S]*?DOB:\s*'/g, "gujarati: 'જન્મ તારીખ / DOB: '");

// 3. Fix getCorrectGenderLine gujarati
code = code.replace(/gujarati:\s*\{\s*male:\s*'àªª[\s\S]*?'\s*,\s*female:\s*'àª¸[\s\S]*?'\s*,\s*trans:\s*'àªŸ[\s\S]*?'\s*\}/g,
  "gujarati: { male: 'પુરુષ / MALE', female: 'સ્ત્રી / FEMALE', trans: 'ટ્રાન્સજેન્ડર / TRANSGENDER' }"
);

fs.writeFileSync(filePath, code, 'utf8');
console.log('✅ Mojibake dictionary in extract/route.ts successfully repaired!');
