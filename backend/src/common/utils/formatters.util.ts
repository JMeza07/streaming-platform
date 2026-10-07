/**
 * Utilidades de Formato y Normalización para SGVS / OASIS VIRTUAL STORE
 * Cumplimiento de SRS:
 * - Punto 10: E.164 y código de país (RF-001, req. adicionales 4 y 5)
 * - Punto 27: Capitalización automática Title Case (req. adicional 12)
 */

export interface CountryCodeInfo {
  code: string;       // "+57"
  iso: string;        // "CO"
  name: string;       // "Colombia"
  flag: string;       // "🇨🇴"
  mask?: string;      // "300 000 0000"
}

export const SUPPORTED_COUNTRY_CODES: CountryCodeInfo[] = [
  { code: '+57', iso: 'CO', name: 'Colombia', flag: '🇨🇴' },
  { code: '+58', iso: 'VE', name: 'Venezuela', flag: '🇻🇪' },
  { code: '+1',  iso: 'US', name: 'Estados Unidos / Canadá', flag: '🇺🇸' },
  { code: '+52', iso: 'MX', name: 'México', flag: '🇲🇽' },
  { code: '+51', iso: 'PE', name: 'Perú', flag: '🇵🇪' },
  { code: '+54', iso: 'AR', name: 'Argentina', flag: '🇦🇷' },
  { code: '+56', iso: 'CL', name: 'Chile', flag: '🇨🇱' },
  { code: '+593', iso: 'EC', name: 'Ecuador', flag: '🇪🇨' },
  { code: '+34', iso: 'ES', name: 'España', flag: '🇪🇸' },
  { code: '+507', iso: 'PA', name: 'Panamá', flag: '🇵🇦' },
  { code: '+1809', iso: 'DO', name: 'República Dominicana', flag: '🇩🇴' },
  { code: '+506', iso: 'CR', name: 'Costa Rica', flag: '🇨🇷' },
  { code: '+591', iso: 'BO', name: 'Bolivia', flag: '🇧🇴' },
  { code: '+502', iso: 'GT', name: 'Guatemala', flag: '🇬🇹' },
  { code: '+503', iso: 'SV', name: 'El Salvador', flag: '🇸🇻' },
  { code: '+504', iso: 'HN', name: 'Honduras', flag: '🇭🇳' },
  { code: '+505', iso: 'NI', name: 'Nicaragua', flag: '🇳🇮' },
  { code: '+598', iso: 'UY', name: 'Uruguay', flag: '🇺🇾' },
  { code: '+595', iso: 'PY', name: 'Paraguay', flag: '🇵🇾' },
];

/**
 * Convierte un nombre o cadena a Title Case (SRS Req. Adicional 12)
 * Ejemplo: "carlos alberto perez" -> "Carlos Alberto Perez"
 * Ejemplo: "JUAN DE DIOS" -> "Juan de Dios"
 */
export function toTitleCase(input: string | null | undefined): string {
  if (!input || typeof input !== 'string') return '';
  
  const lowerWords = ['de', 'del', 'la', 'las', 'los', 'el', 'y', 'e', 'o', 'u', 'van', 'von', 'da', 'di'];
  
  return input
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((word, index) => {
      if (word.length === 0) return '';
      // Si no es la primera palabra y es una preposición/artículo común, dejarla en minúscula
      if (index > 0 && lowerWords.includes(word)) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

/**
 * Normaliza un número telefónico a formato internacional E.164 (SRS RF-001, Req. Adicional 4 y 5)
 * Ejemplo: "3001234567", "+57" -> "+573001234567"
 * Ejemplo: "+57 300 123 4567" -> "+573001234567"
 * Ejemplo: "58 412 1234567" -> "+584121234567"
 */
export function normalizeE164(phone: string | null | undefined, defaultIndicativo = '+57'): string {
  if (!phone || typeof phone !== 'string') return '';

  // Limpiar caracteres no numéricos salvo el signo '+' inicial
  let cleaned = phone.trim().replace(/[^\d+]/g, '');

  if (cleaned.startsWith('+')) {
    return cleaned;
  }

  // Si no tiene '+' al inicio:
  // Si comienza con el indicativo sin el '+' (ej. '573001234567')
  const matchedCountry = SUPPORTED_COUNTRY_CODES.find(c => cleaned.startsWith(c.code.replace('+', '')));
  if (matchedCountry && cleaned.length > 8) {
    return `+${cleaned}`;
  }

  // Quitar ceros a la izquierda
  cleaned = cleaned.replace(/^0+/, '');

  // Agregar el indicativo por defecto
  const prefix = defaultIndicativo.startsWith('+') ? defaultIndicativo : `+${defaultIndicativo}`;
  return `${prefix}${cleaned}`;
}
