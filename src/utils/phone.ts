/**
 * Utilitários para máscara, validação e formatação de telefone no padrão brasileiro.
 */

const VALID_DDDS = new Set([
  '11', '12', '13', '14', '15', '16', '17', '18', '19',
  '21', '22', '24', '27', '28',
  '31', '32', '33', '34', '35', '37', '38',
  '41', '42', '43', '44', '45', '46', '47', '48', '49',
  '51', '53', '54', '55',
  '61', '62', '63', '64', '65', '66', '67', '68', '69',
  '71', '73', '74', '75', '77', '79',
  '81', '82', '83', '84', '85', '86', '87', '88', '89',
  '91', '92', '93', '94', '95', '96', '97', '98', '99',
]);

/**
 * Remove qualquer caracter não numérico e eventual prefixo DDI +55.
 */
export function stripPhone(value: string): string {
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    digits = digits.slice(2);
  }
  return digits;
}

/**
 * Aplica máscara de telefone brasileiro dinamicamente:
 * (XX) XXXXX-XXXX para celulares (11 dígitos)
 * (XX) XXXX-XXXX para fixos (10 dígitos)
 */
export function formatPhoneInput(value: string): string {
  const digits = stripPhone(value).slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

/**
 * Formata um número E.164 ou bruto para apresentação amigável na interface.
 */
export function formatPhoneForDisplay(value?: string | null): string {
  if (!value) return '';
  const digits = stripPhone(value);
  if (digits.length < 10) return value;
  return formatPhoneInput(digits);
}

/**
 * Valida se os dígitos formam um telefone brasileiro válido com DDD.
 */
export function isValidBrazilianPhone(value?: string | null): boolean {
  if (!value) return false;
  const digits = stripPhone(value);
  if (digits.length !== 10 && digits.length !== 11) return false;

  const ddd = digits.slice(0, 2);
  if (!VALID_DDDS.has(ddd)) return false;

  const numberPart = digits.slice(2);
  if (digits.length === 11) {
    return numberPart.startsWith('9');
  }
  const firstDigit = numberPart[0];
  return firstDigit !== undefined && ['2', '3', '4', '5'].includes(firstDigit);
}

/**
 * Normaliza o telefone para formato internacional E.164 (+55XXXXXXXXXXX).
 */
export function normalizePhoneToE164(value: string): string {
  const digits = stripPhone(value);
  return `+55${digits}`;
}
