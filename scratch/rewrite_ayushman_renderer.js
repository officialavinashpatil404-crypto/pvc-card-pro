const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'app', 'api', 'generate-card', 'route.ts');

if (!fs.existsSync(filePath)) {
  console.error("File does not exist:", filePath);
  process.exit(1);
}

let content = fs.readFileSync(filePath, 'utf8');

// Find start of function generateAyushmanPVCHTML
const funcStart = content.indexOf('function generateAyushmanPVCHTML');
if (funcStart === -1) {
  console.error("Could not find function generateAyushmanPVCHTML");
  process.exit(1);
}

// Find start of function generateEshramPVCHTML which follows it
const nextFunc = content.indexOf('function generateEshramPVCHTML');
if (nextFunc === -1) {
  console.error("Could not find function generateEshramPVCHTML");
  process.exit(1);
}

// Find the last closing brace of generateAyushmanPVCHTML before generateEshramPVCHTML
const beforeNext = content.substring(funcStart, nextFunc);
const lastBrace = beforeNext.lastIndexOf('}');
if (lastBrace === -1) {
  console.error("Could not find closing brace of generateAyushmanPVCHTML");
  process.exit(1);
}

const funcEnd = funcStart + lastBrace + 1;

console.log("Replacing Ayushman renderer from index", funcStart, "to", funcEnd);

const newFunc = `function generateAyushmanPVCHTML(params: any): string {
  const frontCardBase64 = params.frontCardBase64 || '';
  const backCardBase64  = params.backCardBase64  || '';
  const photoBase64     = params.photoBase64     || '';
  const qrBase64        = params.qrBase64        || '';
  const name            = (params.name    || '').toUpperCase();
  const dob             = params.dob      || '';
  const gender          = (params.gender  || '').toUpperCase();
  const village         = params.village      || '';
  const subdivision     = params.subdivision  || '';
  const district        = (params.district || '').toUpperCase();
  const state           = (params.state   || '').toUpperCase();
  const mobile          = params.mobile       || '';
  const pmjayId         = params.documentNumber || params.pmjayId || '';
  const abhaNumber      = params.vid      || params.abhaNumber || '';
  const rationId        = params.rationId || '';
  const localFontReg    = params.localFontReg  || '';
  const localFontBold   = params.localFontBold || '';
  const isOld           = !!params.isOldLayout;
  const lbl             = params.labels || {};
  const nameLabel       = lbl.name        || 'नाम / NAME';
  const yobLabel        = lbl.yob         || 'जन्म वर्ष / YOB';
  const genderLabel     = lbl.gender      || 'लिंग / GENDER';
  const villageLabel    = lbl.village     || 'ग्राम/वार्ड - Village/Ward';
  const subLabel        = lbl.subdivision || 'उपखंड/कस्बा - Subdivision/Town';
  const districtLabel   = lbl.district    || 'जिला/District';
  const stateLabel      = lbl.state       || 'राज्य/State';
  const mobileLabel     = lbl.mobile      || 'Mobile';
  const pmjayLabel      = lbl.pmjay       || 'PM-JAY ID';
  const abhaLabel       = lbl.abha        || 'ABHA Number';
  const rationLabel     = lbl.ration      || 'Ration/Other ID';

  const mkRow = (cls: string, label: string, value: string, show = true): string => {
    if (!show || !value) return '';
    return \`
    <div class="field-box \${cls}">
      <span class="field-label">\${label} :</span>
      <span class="field-value">\${value}</span>
    </div>\`;
  };

  const nameRow = \`
    <div class="field-box name-box">
      <span class="field-label">\${nameLabel} :</span>
      <span class="field-value">\${name}</span>
    </div>\`;

  const frontRows = isOld
    ? [
        nameRow,
        mkRow('yob-box',    yobLabel,    dob),
        mkRow('gender-box', genderLabel, gender),
        mkRow('abha-box',   abhaLabel,   abhaNumber),
        mkRow('pmjay-box',  pmjayLabel,  pmjayId),
      ].join('\\n')
    : [
        nameRow,
        mkRow('village-box',     villageLabel,     village),
        mkRow('subdivision-box', subLabel,         subdivision),
        mkRow('district-box',    districtLabel,    district),
        mkRow('state-box',       stateLabel,       state),
        mkRow('yob-box',         yobLabel,         dob),
        mkRow('gender-box',      genderLabel,      gender),
        mkRow('mobile-box',      mobileLabel,      mobile),
        mkRow('abha-box',        abhaLabel,        abhaNumber),
        mkRow('pmjay-box',       pmjayLabel,       pmjayId),
        mkRow('ration-box',      rationLabel,      rationId),
      ].join('\\n');

  const backTemplatePath = path.resolve('./src/templates/ayushman-back.html');
  const backTemplateHtml = fs.existsSync(backTemplatePath) ? fs.readFileSync(backTemplatePath, 'utf8') : '';
  const backData: Record<string, string> = {
    backCardBase64, name, dob, gender, village, subdivision,
    district, state, mobile, pmjayId, abhaNumber, rationId, qrBase64,
    localFontReg, localFontBold,
    localFontType:   params.localFontType   || 'ttf',
    localFontFamily: params.localFontFamily || 'NotoSansGujarati',
    nameLabel, yobLabel, genderLabel, villageLabel,
    subdivisionLabel: subLabel, districtLabel, stateLabel,
    mobileLabel, pmjayLabel, abhaLabel, rationLabel,
  };
  const backHtml = renderCardHtml(backTemplateHtml, backData);

  return \`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <style>
    @font-face { 
      font-family:'NotoSansCustom-Regular'; 
      src:url('data:font/ttf;base64,\${localFontReg}') format('truetype'); 
      font-display:block; 
    }
    @font-face { 
      font-family:'NotoSansCustom-Bold';    
      src:url('data:font/ttf;base64,\${localFontBold}') format('truetype'); 
      font-display:block; 
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      margin: 0; 
      padding: 0; 
      background: #ffffff; 
      text-rendering: optimizeLegibility; 
      -webkit-font-smoothing: antialiased; 
      font-feature-settings: 'liga' 1, 'kern' 1, 'calt' 1, 'locl' 1; 
      font-kerning: auto; 
    }

    .card-container { 
      width: 1016px; 
      height: 638px; 
      position: relative; 
      background-size: 100% 100%; 
      background-repeat: no-repeat; 
      overflow: hidden; 
      -webkit-print-color-adjust: exact; 
      print-color-adjust: exact; 
    }
    #card-front { 
      background-image: url('\${frontCardBase64}'); 
    }

    /* Absolute Bounding Boxes */
    .photo-box { 
      position: absolute; 
      left: 32px; 
      top: 226px; 
      width: 148px; 
      height: 198px; 
      overflow: hidden; 
      border: 1.5px solid #bbb; 
      background: #eee; 
      border-radius: 4px; 
      z-index: 2; 
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .photo-box img { 
      max-width: 100%; 
      max-height: 100%; 
      object-fit: cover; 
    }

    .qr-box { 
      position: absolute; 
      left: 836px; 
      top: 245px; 
      width: 148px; 
      height: 148px; 
      background: #ffffff; 
      z-index: 2; 
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .qr-box img { 
      width: 100%; 
      height: 100%; 
      object-fit: contain; 
      image-rendering: pixelated; 
    }

    /* Bounding Box Base */
    .field-box {
      position: absolute;
      display: flex;
      flex-direction: row;
      align-items: center;
      background: #ffffff;
      overflow: hidden;
      z-index: 3;
      padding: 0 2px;
      font-family: 'NotoSansCustom-Bold', Arial, sans-serif;
    }
    
    .field-box .field-label {
      color: #df5800;
      font-weight: 700;
      font-size: 15px;
      margin-right: 5px;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .field-box .field-value {
      color: #000000;
      font-weight: 700;
      font-size: 15px;
      white-space: nowrap;
    }

    /* Name Box layout: column stack */
    .name-box {
      left: 204px; 
      top: 250px; 
      width: 600px; 
      height: 75px;
      flex-direction: column;
      align-items: flex-start;
      justify-content: flex-start;
      gap: 2px;
      padding-top: 2px;
    }
    .name-box .field-label {
      font-size: 16px;
    }
    .name-box .field-value {
      font-size: 26px;
      font-weight: 900;
      white-space: normal;
      word-wrap: break-word;
      overflow-wrap: break-word;
      width: 100%;
    }

    /* Layout Positioning */
    .village-box       { left: 204px; top: 328px; width: 600px; height: 24px; }
    .subdivision-box   { left: 204px; top: 354px; width: 600px; height: 24px; }
    .district-box      { left: 204px; top: 380px; width: 280px; height: 24px; }
    .state-box         { left: 500px; top: 380px; width: 300px; height: 24px; }
    .yob-box           { left: 204px; top: 406px; width: 280px; height: 24px; }
    .gender-box        { left: 500px; top: 406px; width: 300px; height: 24px; }

    /* Bottom row elements */
    .mobile-box        { left: 28px;  top: 442px; width: 440px; height: 28px; align-items: center; }
    .abha-box          { left: 28px;  top: 472px; width: 440px; height: 28px; align-items: center; }
    .pmjay-box         { left: 490px; top: 442px; width: 490px; height: 28px; align-items: center; }
    .ration-box        { left: 490px; top: 472px; width: 490px; height: 28px; align-items: center; }

    .pmjay-box .field-value {
      font-size: 20px;
      font-weight: 900;
    }
  </style>
</head>
<body>
  <div class="card-container" id="card-front">
    <div class="photo-box"><img src="\${photoBase64}" alt="Photo"/></div>
    <div class="qr-box"><img src="\${qrBase64}" alt="QR"/></div>

    \${frontRows}
  </div>
  \${backHtml}

  <script>
    function autoScaleFields() {
      const fields = document.querySelectorAll('.field-box');
      fields.forEach(box => {
        const label = box.querySelector('.field-label');
        const val = box.querySelector('.field-value');
        if (!val) return;

        const isColumn = window.getComputedStyle(box).flexDirection === 'column';
        const maxBoxWidth = box.clientWidth;
        const maxBoxHeight = box.clientHeight;

        const maxValWidth = isColumn ? maxBoxWidth : (maxBoxWidth - (label ? label.offsetWidth : 0) - 6);
        const maxValHeight = isColumn ? (maxBoxHeight - (label ? label.offsetHeight : 0) - 2) : maxBoxHeight;

        let fontSize = parseFloat(window.getComputedStyle(val).fontSize);
        
        while ((val.scrollWidth > maxValWidth || val.scrollHeight > maxValHeight) && fontSize > 8) {
          fontSize -= 0.5;
          val.style.fontSize = fontSize + 'px';
          val.style.lineHeight = '1.1';
        }
      });
    }
    
    window.addEventListener('DOMContentLoaded', autoScaleFields);
    window.addEventListener('load', autoScaleFields);
  </script>
</body>
</html>\`;
}`;

const updated = content.substring(0, funcStart) + newFunc + content.substring(funcEnd);
fs.writeFileSync(filePath, updated, 'utf8');
console.log("Successfully rewrote Ayushman Card Renderer from scratch!");
