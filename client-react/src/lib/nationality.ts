// Maps nationality strings (full name or ISO alpha-2) → { name, flag emoji }
// The PROMPT API stores nationality as full country name (e.g. "German").
// demoData also uses full names. We keep a lookup table for common values.

const NAME_TO_ISO: Record<string, string> = {
  Afghan: 'AF', Albanian: 'AL', Algerian: 'DZ', Argentine: 'AR', Australian: 'AU',
  Austrian: 'AT', Belgian: 'BE', Bolivian: 'BO', Brazilian: 'BR', British: 'GB',
  Bulgarian: 'BG', Canadian: 'CA', Chilean: 'CL', Chinese: 'CN', Colombian: 'CO',
  Croatian: 'HR', Czech: 'CZ', Danish: 'DK', Dutch: 'NL', Egyptian: 'EG',
  Estonian: 'EE', Finnish: 'FI', French: 'FR', German: 'DE', Greek: 'GR',
  Hungarian: 'HU', Icelandic: 'IS', Indian: 'IN', Indonesian: 'ID', Iranian: 'IR',
  Iraqi: 'IQ', Irish: 'IE', Israeli: 'IL', Italian: 'IT', Japanese: 'JP',
  Jordanian: 'JO', Korean: 'KR', Latvian: 'LV', Lebanese: 'LB', Lithuanian: 'LT',
  Luxembourgish: 'LU', Malaysian: 'MY', Mexican: 'MX', Moroccan: 'MA',
  'New Zealand': 'NZ', Nigerian: 'NG', Norwegian: 'NO', Pakistani: 'PK',
  Peruvian: 'PE', Philippine: 'PH', Filipino: 'PH', Polish: 'PL', Portuguese: 'PT',
  Romanian: 'RO', Russian: 'RU', Saudi: 'SA', Serbian: 'RS', Singaporean: 'SG',
  Slovak: 'SK', Slovenian: 'SI', 'South African': 'ZA', Spanish: 'ES', Swedish: 'SE',
  Swiss: 'CH', Taiwanese: 'TW', Thai: 'TH', Turkish: 'TR', Ukrainian: 'UA',
  American: 'US', Venezuelan: 'VE', Vietnamese: 'VN',
}

function isoToFlag(iso: string): string {
  return iso
    .toUpperCase()
    .split('')
    .map(c => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join('')
}

function isoToName(iso: string): string {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(iso.toUpperCase()) ?? iso
  } catch {
    return iso
  }
}

export interface NationalityInfo {
  name: string
  emoji: string
}

/** Accepts either an ISO alpha-2 code or a full nationality adjective string. */
export function getNationalityInfo(nationality: string): NationalityInfo | null {
  if (!nationality) return null
  let iso: string

  if (nationality.length === 2) {
    iso = nationality.toUpperCase()
  } else {
    iso = NAME_TO_ISO[nationality] ?? ''
  }

  if (!iso) return { name: nationality, emoji: '' }

  return {
    name: isoToName(iso),
    emoji: isoToFlag(iso),
  }
}
