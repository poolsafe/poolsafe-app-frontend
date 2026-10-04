/**
 * Utilitário de conversão em memória pura de Uint8Array para Base64.
 *
 * Não utiliza disco, AsyncStorage, SecureStore ou cache permanente.
 * Os dados residem exclusivamente na memória heap do JavaScript durante o ciclo de vida
 * do componente visual e são descartados no unmount.
 */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  // Se Buffer global existir (Node.js/test runner)
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }

  // No React Native / Hermes com btoa global
  if (typeof btoa === 'function') {
    let binary = '';
    const len = bytes.byteLength;
    const chunkSize = 8192;
    for (let i = 0; i < len; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
      binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
    }
    return btoa(binary);
  }

  // Fallback puro com tabela de caracteres base64
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  const len = bytes.length;
  let i = 0;

  while (i < len) {
    const b0 = bytes[i++] ?? 0;
    const b1 = i < len ? (bytes[i++] ?? 0) : NaN;
    const b2 = i < len ? (bytes[i++] ?? 0) : NaN;

    const c0 = b0 >> 2;
    const c1 = ((b0 & 3) << 4) | (isNaN(b1) ? 0 : b1 >> 4);
    const c2 = isNaN(b1) ? 64 : ((b1 & 15) << 2) | (isNaN(b2) ? 0 : b2 >> 6);
    const c3 = isNaN(b2) ? 64 : b2 & 63;

    result +=
      chars.charAt(c0) +
      chars.charAt(c1) +
      (c2 === 64 ? '=' : chars.charAt(c2)) +
      (c3 === 64 ? '=' : chars.charAt(c3));
  }

  return result;
}
