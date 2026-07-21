import { repairGujaratiText, getDynamicRepairs } from '../src/utils/gujaratiRepair';

async function main() {
  const rawLocalAddress = "ના  ારા: લીલેષકુમાર પાટીલ, 111, સ ાટ  ીન  સટી, ભગત";
  const dynamicMap = await getDynamicRepairs();
  const dynamicMappings = Object.fromEntries(dynamicMap.entries());

  console.log("Raw Address:", rawLocalAddress);
  
  // Clean spaces (like cleanIndianText does)
  let cleaned = rawLocalAddress.replace(/[\u200B\u200C\u200D\uFEFF]/g, '');
  cleaned = cleaned.replace(/([\u094D\u09CD\u0A4D\u0ACD\u0B4D\u0BCD\u0C4D\u0CCD\u0D4D])\s+(?=\S)/g, '$1');
  const allIndicCombining = '[\\u0900-\\u0903\\u093C-\\u094D\\u0945-\\u0948\\u094E-\\u0954' +
    '\\u0980-\\u0983\\u09BC\\u09BE-\\u09CD\\u09D7' +
    '\\u0A01-\\u0A03\\u0A3C\\u0A3E-\\u0A4D\\u0A51\\u0A70-\\u0A71\\u0A75' +
    '\\u0A81-\\u0A83\\u0ABC\\u0ABE-\\u0ACD\\u0AE2-\\u0AE3' +
    '\\u0B01-\\u0B03\\u0B3C\\u0B3E-\\u0B4D\\u0B56-\\u0B57\\u0B62-\\u0B63' +
    '\\u0B82\\u0BBE-\\u0BCD\\u0BD7' +
    '\\u0C00-\\u0C03\\u0C3E-\\u0C4D\\u0C55-\\u0C56\\u0C62-\\u0C63' +
    '\\u0C80-\\u0C83\\u0CBC\\u0CBE-\\u0CCD\\u0CD5-\\u0CD6\\u0CE2-\\u0CE3' +
    '\\u0D00-\\u0D03\\u0D3B-\\u0D3C\\u0D3E-\\u0D4D\\u0D57\\u0D62-\\u0D63]';
  cleaned = cleaned.replace(new RegExp('(?<=\\S)\\s(' + allIndicCombining + ')(?=\\S)', 'g'), '$1');
  
  console.log("Cleaned Address:", cleaned);
  
  const repaired = repairGujaratiText(cleaned, dynamicMappings);
  console.log("Repaired Address:", repaired);
}

main().catch(console.error);
