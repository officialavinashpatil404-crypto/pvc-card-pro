<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# CRITICAL WORKSPACE RULES: DO NOT MODIFY AYUSHMAN PVC CARD GENERATOR
- **Strict Freeze:** The function `generateAyushmanPVCHTML` inside `src/app/api/generate-card/route.ts` has been finalized and optimized for exact government-spec design layout and spacing.
- **Do Not Edit:** Under no circumstances should any future updates or refactorings touch this function, its CSS styling blocks, its HTML structures, or the `BACK_CARD_LANGUAGES` translation table.
- **Why:** The spacing, font heights, absolute positions, vector SVGs, and inline margins are calibrated to prevent overlap and text scaling bugs for all 8 Indian language scripts. Any modifications risk breaking print alignment.

# CRITICAL WORKSPACE RULES: DO NOT MODIFY VOTER PVC CARD GENERATOR & PARSER
- **Strict Freeze:** The Voter Card extraction logic in `src/lib/parsers/VoterParser.ts` and `generateCroppedVoterPVCHTML` inside `src/app/api/generate-card/route.ts` have been finalized and calibrated for 100% full-bleed edge-to-edge PVC card fitting.
- **Do Not Edit:** Under no circumstances should any future updates or refactorings touch `VoterParser.ts` canvas extraction logic (top header Y-detection, aspect ratio locking 0.6298, inner artwork bounds) or `generateCroppedVoterPVCHTML`.
- **Why:** The coordinates, density thresholds, aspect ratio calculations, and inset margins are calibrated for exact zero-white-margin print alignment across all e-EPIC Voting Card PDFs. Any modifications risk breaking print alignment or introducing white margins.

# CRITICAL WORKSPACE RULES: DO NOT MODIFY AADHAAR AI PROMPT & GUJARATI REPAIR LOGIC
- **Strict Freeze:** The Aadhaar Gemini AI prompt rules in `src/app/api/extract/route.ts` and the `repairGujaratiText` functions in `src/utils/gujaratiRepair.ts` have been finalized and calibrated for 100% spelling, phonetic matra mapping, and word spacing accuracy.
- **Do Not Edit:** Under no circumstances should any future updates or refactorings touch the Aadhaar AI prompt definitions, name/address repair system instructions, or the `disableWorker: true` configuration inside `extractTextWithPdfJs`.
- **Why:** The current prompt configurations, phonetic matra repair guidelines, and single-threaded ESM configuration are optimized for Vercel Serverless environment runtime stability and token economy. Any modifications risk introducing ESM loader runtime errors or breaking Indic script spelling accuracy.

