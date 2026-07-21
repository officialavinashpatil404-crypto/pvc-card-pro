import re

file_path = r"c:\Users\NANO\Desktop\PROPVCTOOL\pvc-card-pro\src\app\api\generate-card\route.ts"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Let's find the start of the interface RelationAssets or RELATION_MAPPING
# We want to replace everything from the commented-out interface down to the end of fixLocalCoPrefix

# Let's write a robust regex/search and replace
# We want to match:
# // ... interface RelationAssets { ... } ... const RELATION_MAPPING = { ... } ... function fixLocalCoPrefix(...) { ... }

# Let's find the position of the interface RelationAssets
match_interface = re.search(r"interface\s+RelationAssets", content)
if not match_interface:
    print("Could not find interface RelationAssets")
    exit(1)

# Find the end of fixLocalCoPrefix
# The function ends with a closing brace `}`.
# Let's find the position after `return localAddress; // No confident match` or `No confident match` or around lines 194-196.
# Let's locate the last return/closing brace of fixLocalCoPrefix before the POST export
match_post = re.search(r"export\s+async\s+function\s+POST", content)
if not match_post:
    print("Could not find export async function POST")
    exit(1)

post_idx = match_post.start()

# Now find the start of the line containing the interface
interface_line_start = content.rfind("\n", 0, match_interface.start()) + 1

# Let's find the closing brace of fixLocalCoPrefix right before POST
# We search backwards from post_idx for a closing brace `}`
close_brace_idx = content.rfind("}", interface_line_start, post_idx)

# Let's print what we are replacing
print("REPLACING CONTENT FROM:")
print(content[interface_line_start : close_brace_idx + 1][:300])
print("...")
print(content[interface_line_start : close_brace_idx + 1][-300:])

new_code = """interface RelationAssets {
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
  telugu:      { so: 'కుమారుడు:', wo: 'భార్య:', do: 'కుమార్తె:', co: 'కేర్ ఆఫ్:' },
  kannada:     { so: 'ಮಗ:', wo: 'ಪತ್ನಿ:', do: 'ಮಗಳು:', co: 'ಕೇರ್ ಆಫ್:' },
  malayalam:   { so: 'മകൻ:', wo: 'ഭാര്യ:', do: 'മകൾ:', co: 'കെയർ ഓഫ്:' },
  bengali:     { so: 'পুত্র:', wo: 'স্ত্রী:', do: 'কন্যা:', co: 'যত্নে:' },
  assamese:    { so: 'পুত্র:', wo: 'পত্নী:', do: 'কন্যা:', co: 'যত্নে:' },
  punjabi:     { so: 'ਪੁੱਤਰ:', wo: 'ਪਤਨੀ:', do: 'ਧੀ:', co: 'ਕੇਅર ਆਫ:' },
  odia:        { so: 'ਪੁਤ୍ର:', wo: 'ਪਤਨੀ:', do: 'କନ୍ୟା:', co: 'ଯତ୍ନରେ:' },
  urdu:        { so: 'بیٹا:', wo: 'زوجہ:', do: 'بیٹی:', co: 'زیر نگرانی:' },
  manipuri:    { so: 'মচা:', wo: 'লোইনবী:', do: 'মচা সুপ্ত্রী:', co: 'কেয়র ઓફ:' },
  english:     { so: 'S/O:', wo: 'W/O:', do: 'D/O:', co: 'C/O:' }
};

function fixLocalCoPrefix(localAddress: string, englishAddress: string): string {
  if (!localAddress || !englishAddress) return localAddress;

  const engCoMatch = englishAddress.trim().match(
    /^(C\/O|W\/O|S\/O|D\/O|H\/O|F\/O|C\\.O\\.|W\\.O\\.|S\\.O\\.|D\\.O\\.)/i
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
  const prefixRegex = new RegExp(`^(${allPrefixes}|C\\/O|W\\/O|S\\/O|D\\/O|H\\/O|F\\/O|C\\\\.O\\\\.|W\\\\.O\\\\.|S\\\\.O\\\\.|D\\\\.O\\\\.)[:\\\\s]*`, 'i');

  if (prefixRegex.test(localAddress.trim())) {
    return localAddress.trim().replace(prefixRegex, `${localPrefix} `);
  }

  return `${localPrefix} ${localAddress.trim()}`;
}"""

content = content[:interface_line_start] + new_code + content[close_brace_idx + 1:]

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("SUCCESSFULLY REPLACED CONTENT")
