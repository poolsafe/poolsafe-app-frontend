import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveApiBaseUrl } from '../src/config/env.ts';

test('1. Configuração de URL — Normalização remove barra final', () => {
  const url = resolveApiBaseUrl('https://api.poolsafe.app/api/v1/', false);
  assert.equal(url, 'https://api.poolsafe.app/api/v1');
});

test('2. Configuração de URL — Produção (release) adota endpoint canônico HTTPS deterministicamente', () => {
  const url = resolveApiBaseUrl(undefined, true);
  assert.equal(url, 'https://api.poolsafe.app/api/v1');
});

test('3. Configuração de URL — Variável local de desenvolvimento (.env) NÃO contamina o build de release', () => {
  const originalEnv = process.env.EXPO_PUBLIC_API_BASE_URL;
  try {
    // Simula um .env local apontando para IP de desenvolvimento com HTTP
    process.env.EXPO_PUBLIC_API_BASE_URL = 'http://10.195.122.10:3012/api/v1';

    // Em modo release, DEVE ignorar a variável local de dev e resolver a URL canônica HTTPS da VPS
    const releaseUrl = resolveApiBaseUrl(undefined, true);
    assert.equal(releaseUrl, 'https://api.poolsafe.app/api/v1');

    // Em modo dev, DEVE respeitar a variável local configurada
    const devUrl = resolveApiBaseUrl(undefined, false);
    assert.equal(devUrl, 'http://10.195.122.10:3012/api/v1');
  } finally {
    process.env.EXPO_PUBLIC_API_BASE_URL = originalEnv;
  }
});

test('4. Configuração de URL — Desenvolvimento local aceita emulador padrão quando vazia', () => {
  const originalEnv = process.env.EXPO_PUBLIC_API_BASE_URL;
  try {
    delete process.env.EXPO_PUBLIC_API_BASE_URL;
    const url = resolveApiBaseUrl(undefined, false);
    assert.equal(url, 'http://10.0.2.2:3000/api/v1');
  } finally {
    process.env.EXPO_PUBLIC_API_BASE_URL = originalEnv;
  }
});

test('5. Configuração de URL — Produção (release) rejeita protocolo HTTP inseguro em overrides', () => {
  assert.throws(
    () => resolveApiBaseUrl('http://api.poolsafe.app/api/v1', true),
    /\[Config\] O build de produção \(release\) requer HTTPS obrigatório/,
  );
});

test('6. Configuração de URL — Produção (release) rejeita endereços locais em overrides (localhost, 10.0.2.2, 127.0.0.1)', () => {
  assert.throws(
    () => resolveApiBaseUrl('https://localhost:3000/api/v1', true),
    /\[Config\] Referências a localhost\/IPs locais são estritamente proibidas no build de produção/,
  );
  assert.throws(
    () => resolveApiBaseUrl('https://10.0.2.2:3000/api/v1', true),
    /\[Config\] Referências a localhost\/IPs locais são estritamente proibidas no build de produção/,
  );
  assert.throws(
    () => resolveApiBaseUrl('https://127.0.0.1:3000/api/v1', true),
    /\[Config\] Referências a localhost\/IPs locais são estritamente proibidas no build de produção/,
  );
});

test('7. Configuração de URL — Rejeita esquemas de protocolo inválidos', () => {
  assert.throws(
    () => resolveApiBaseUrl('ftp://api.poolsafe.app/api/v1', false),
    /\[Config\] EXPO_PUBLIC_API_BASE_URL inválida\. O protocolo deve ser http:\/\/ ou https:\/\//,
  );
});
