const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'app', 'api', 'generate-card', 'route.ts');

if (!fs.existsSync(filePath)) {
  console.error("File does not exist:", filePath);
  process.exit(1);
}

let content = fs.readFileSync(filePath, 'utf8');

// 1. Replace warnings dictionary
const warningsStart = content.indexOf('const warnings: Record<string, { local: string; english: string }> = {');
if (warningsStart === -1) {
  console.error("Could not find warnings dictionary in route.ts");
  process.exit(1);
}

const warningsEnd = content.indexOf('};', warningsStart);
if (warningsEnd === -1) {
  console.error("Could not find end of warnings dictionary");
  process.exit(1);
}

const newWarnings = `const warnings: Record<string, { local: string; english: string }> = {
    gujarati: {
      local: 'આધાર એ ઓળખની સાબિતી છે, નાગરિકતા કે જન્મતારીખની નથી. તેનો ઉપયોગ ચકાસણી (ઑનલાઇન પ્રમાણીકરણ, અથવા ક્યુઆર કોડ / ઑફલાઇન એક્સએમએલ સ્કેનિંગ) સાથે થવો જોઈએ.',
      english: 'Aadhaar is proof of identity, not of citizenship or date of birth.'
    },
    telugu: {
      local: 'ఆధార్ అనేది గుర్తింపు ఆధారం, పౌరసత్వం లేదా పుట్టిన తేదీకి సంబంధించినది కాదు. ధృవీకరణతో (ఆన్‌లైన్ ప్రమాణీకరణ, లేదా క్యూఆర్ కోడ్ / ఆఫ్‌లైన్ ఎక్స్‌ఎమ్ఎల్ స్కానింగ్) మాత్రమే దీనిని ఉపయోగించాలి.',
      english: 'Aadhaar is proof of identity, not of citizenship or date of birth.'
    },
    tamil: {
      local: 'ஆதார் என்பது அடையாளத்தின் சான்று, குடியுரிமை அல்லது பிறந்த தேதிக்கானதல்ல. சரிபார்ப்புடன் (ஆன்லைன் அங்கீகாரம் அல்லது கியூஆர் குறியீடு / ஆஃப்லைன் எக்ஸ்எம்எல் ஸ்கேனிங்) இதைப் பயன்படுத்த வேண்டும்.',
      english: 'Aadhaar is proof of identity, not of citizenship or date of birth.'
    },
    kannada: {
      local: 'ಆಧಾರ್ ಗುರುತಿನ ಪುರಾವೆಯಾಗಿದೆ, ಪೌರತ್ವ ಅಥವಾ ಜನ್మ ದಿನಾಂಕದ್ದಲ್ಲ. ಇದನ್ನು ಪರಿಶೀಲನೆಯೊಂದಿಗೆ (ಆನ್‌ಲೈನ್ ದೃಢೀಕರಣ, ಅಥವಾ ಕ್ಯೂಆರ್ ಕೋಡ್ / ಆಫ್‌ಲೈನ್ ಎಕ್ಸ್‌ಎಂಎಲ್ ಸ್ಕ್ಯಾನಿಂಗ್) ಬಳಸಬೇಕು.',
      english: 'Aadhaar is proof of identity, not of citizenship or date of birth.'
    },
    malayalam: {
      local: 'ആധാർ എന്നത് വ്യക്തിത്വത്തിന്റെ തെളിവാണ്, പൗരത്വത്തിന്റെയോ ജനനത്തീയതിയുടെയോ അല്ല. ഇത് പരിശോധനയോടെ (ഓൺലൈൻ പ്രാമാണീകരണം അല്ലെങ്കിൽ ക്യുആർ കോഡ് / ഓഫ്‌ലൈൻ എക്സ്എംഎൽ സ്കാനിംഗ്) ഉപയോഗിക്കേണ്ടതാണ്.',
      english: 'Aadhaar is proof of identity, not of citizenship or date of birth.'
    },
    bengali: {
      local: 'আধার সনাক্তকরণের প্রমাণ, নাগরিকত্ব বা জন্ম তারিখের নয়। এটি যাচাইকরণের সাথে (অনলাইন প্রমাণীকরণ, বা কিউআর কোড / অফলাইন এক্সএমএল স্ক্যানিং) ব্যবহার করা উচিত।',
      english: 'Aadhaar is proof of identity, not of citizenship or date of birth.'
    },
    assamese: {
      local: 'আধাৰ পৰিচয়ৰ প্ৰমাণ, নাগৰিকত্ব বা জন্ম তাৰিখৰ নহয়। ইয়াক সত্যপন কৰাৰ পাছত (অনলাইন প্ৰমাণীকৰণ বা কিউআৰ કોড / অফলাইন এক্সএমএল স্কেনিং) ব্যৱহাৰ কৰিব লাগে।',
      english: 'Aadhaar is proof of identity, not of citizenship or date of birth.'
    },
    punjabi: {
      local: 'ਆਧਾਰ ਪਛਾਣ ਦਾ ਸਬੂਤ ਹੈ, ਨਾਗਰਿਕਤਾ ਜਾਂ ਜਨਮ ਮਿਤੀ ਦਾ ਨਹੀਂ। ਇਸਦੀ ਵਰਤੋਂ ਤਸਦੀਕ (ਆਨਲਾਈਨ ਪ੍ਰਮਾਣਿਕਤਾ, ਜਾਂ QR ਕੋਡ / ਆਫਲਾਈਨ XML ਦੀ ਸਕੈਨਿੰਗ) ਦੇ ਨਾਲ ਕੀਤੀ ਜਾਣੀ ਚਾਹੀਦੀ ਹੈ।',
      english: 'Aadhaar is proof of identity, not of citizenship or date of birth.'
    },
    odia: {
      local: 'ଆଧାର ହେଉଛି ପରିଚୟର ପ୍ରମାଣ, ନାଗରିକତା କିମ୍ବା ଜନ୍ମ ତାରିଖର ନୁହେଁ। ଏହାକୁ ସତ୍ୟାପନ ସହିତ (ଅନଲାଇନ୍ ପ୍ରମାଣୀକରଣ କିମ୍ବା କ୍ୟୁଆର୍ କୋଡ୍ / ଅଫଲାଇନ୍ ଏକ୍ସଏମଏଲ୍ ସ୍କାନିଂ) ବ୍ୟବహାର କରାଯିବା ଉଚିତ।',
      english: 'Aadhaar is proof of identity, not of citizenship or date of birth.'
    },
    hindi: {
      local: 'आधार पहचान का प्रमाण है, नागरिकता या जन्म तिथि का नहीं। इसका उपयोग सत्यापन (ऑनलाइन प्रमाणीकरण, या क्यूआर कोड / ऑफलाइन एक्सएमएल की स्कैनिंग) के साथ किया जाना चाहिए।',
      english: 'Aadhaar is proof of identity, not of citizenship or date of birth.'
    },
    marathi: {
      local: 'आधार हा ओळखीचा पुरावा आहे, नागरिकत्वाचा किंवा जन्म तारखेचा नाही. याची पडताळणी (ऑनलाइन प्रमाणीकरण किंवा क्यूआर कोड / ऑफलाइन एक्सएमएल स्कॅनिंग) करूनच वापर केला पाहिजे।',
      english: 'Aadhaar is proof of identity, not of citizenship or date of birth.'
    },
    urdu: {
      local: 'آدھار شناخت کا ثبوت ہے، شہریت یا تاریخ پیدائش کا نہیں۔ اس کا استعمال تصدیق (آن لائن تصدیق، یا کیو آر کوڈ / آف لائن ایکس ایم ایل کی سکیننگ) کے ساتھ کیا جانا چاہئے۔',
      english: 'Aadhaar is proof of identity, not of citizenship or date of birth.'
    },
    english: {
      local: 'Aadhaar is proof of identity, not of citizenship or date of birth. It should be used with verification (online authentication, or scanning of QR code / offline XML).',
      english: 'Aadhaar is proof of identity, not of citizenship or date of birth.'
    }
  }`;

content = content.substring(0, warningsStart) + newWarnings + content.substring(warningsEnd + 2);

// 2. Replace AYUSHMAN_LABELS / Relation mapping or key labels
// Reload structure positions because they shifted
const labelMappingStart = content.indexOf('}> = {');
// Let's look for: const AYUSHMAN_LABELS: Record<string, {
const labelsSearch = 'gujarati: {\n    name: \'鄋兒知鄋';
const approxStart = content.indexOf(labelsSearch);
if (approxStart === -1) {
  // Let's find it by targetting gujarati block within labels block
  const fullSearch = 'name: \'鄋兒知鄋';
  const match = content.indexOf(fullSearch);
  if (match === -1) {
    console.error("Could not find AYUSHMAN_LABELS target");
    process.exit(1);
  }
  const sectionStart = content.lastIndexOf('gujarati: {', match);
  replaceLabels(sectionStart);
} else {
  replaceLabels(approxStart);
}

function replaceLabels(startIndex) {
  // The AYUSHMAN_LABELS mapping ends right before generateAyushmanPVCHTML function
  const endSection = content.indexOf('function generateAyushmanPVCHTML');
  if (endSection === -1) {
    console.error("Could not find generateAyushmanPVCHTML function");
    process.exit(1);
  }
  const lastCloseBrace = content.substring(startIndex, endSection).lastIndexOf('}');
  const endIndex = startIndex + lastCloseBrace + 1;

  const newLabels = `gujarati: {
    name: 'નામ / NAME :',
    yob: 'જન્મ વર્ષ / YOB :',
    gender: 'જાતિ / GENDER :',
    village: 'ગામ/વોર્ડ - Village/Ward :',
    subdivision: 'તાલુકો/નગર - Subdivision/Town :',
    district: 'જિલ્લો/District :',
    state: 'રાજ્ય/State :',
    mobile: 'Mobile :',
    pmjay: 'PM-JAY ID :',
    abha: 'ABHA Number :',
    ration: 'Ration/Other ID :',
  },
  hindi: {
    name: 'नाम / NAME :',
    yob: 'जन्म वर्ष / YOB :',
    gender: 'लिंग / GENDER :',
    village: 'ग्राम/वार्ड - Village/Ward :',
    subdivision: 'उपखंड/कस्बा - Subdivision/Town :',
    district: 'जिला/District :',
    state: 'राज्य/State :',
    mobile: 'Mobile :',
    pmjay: 'PM-JAY ID :',
    abha: 'ABHA Number :',
    ration: 'Ration/Other ID :',
  },
  marathi: {
    name: 'नाव / NAME :',
    yob: 'जन्म वर्ष / YOB :',
    gender: 'लिंग / GENDER :',
    village: 'गाव/वॉर्ड - Village/Ward :',
    subdivision: 'तालुका/शहर - Subdivision/Town :',
    district: 'जिल्हा/District :',
    state: 'राज्य/State :',
    mobile: 'Mobile :',
    pmjay: 'PM-JAY ID :',
    abha: 'ABHA Number :',
    ration: 'Ration/Other ID :',
  },
  english: {
    name: 'NAME :',
    yob: 'YOB :',
    gender: 'GENDER :',
    village: 'Village/Ward :',
    subdivision: 'Subdivision/Town :',
    district: 'District :',
    state: 'State :',
    mobile: 'Mobile :',
    pmjay: 'PM-JAY ID :',
    abha: 'ABHA Number :',
    ration: 'Ration/Other ID :',
  }
}`;

  content = content.substring(0, startIndex) + newLabels + content.substring(endIndex);
}

// 3. Replace generateAyushmanPVCHTML default label fallbacks (nameLabel down to stateLabel)
const nameLabelIndex = content.indexOf("const nameLabel       = lbl.name        || '鄋兒知鄋");
if (nameLabelIndex === -1) {
  console.error("Could not find default nameLabel inside generateAyushmanPVCHTML");
  process.exit(1);
}

const stateLabelIndex = content.indexOf("const stateLabel      = lbl.state       || '鄋啤知鄋/ State';");
if (stateLabelIndex === -1) {
  // Try matching without replacement char
  const fallbackIndex = content.indexOf("const stateLabel      = lbl.state");
  if (fallbackIndex === -1) {
    console.error("Could not find stateLabel fallback index");
    process.exit(1);
  }
  const lineEnd = content.indexOf('\n', fallbackIndex);
  replaceDefaultLabels(nameLabelIndex, lineEnd + 1);
} else {
  const lineEnd = content.indexOf('\n', stateLabelIndex);
  replaceDefaultLabels(nameLabelIndex, lineEnd + 1);
}

function replaceDefaultLabels(startIndex, endIndex) {
  const newDefaultLabels = `const nameLabel       = lbl.name        || 'नाम / NAME';
  const yobLabel        = lbl.yob         || 'जन्म वर्ष / YOB';
  const genderLabel     = lbl.gender      || 'लिंग / GENDER';
  const villageLabel    = lbl.village     || 'ग्राम/वार्ड - Village/Ward';
  const subLabel        = lbl.subdivision || 'उपखंड/कस्बा - Subdivision/Town';
  const districtLabel   = lbl.district    || 'जिला/District';
  const stateLabel      = lbl.state       || 'राज्य/State';`;

  content = content.substring(0, startIndex) + newDefaultLabels + content.substring(endIndex);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log("SUCCESSFULLY COMPLETED ALL LABEL AND WARNING REPLACEMENTS");
