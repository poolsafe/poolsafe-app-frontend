import test from 'node:test';
import assert from 'node:assert/strict';

import {
  formatPhoneInput,
  formatPhoneForDisplay,
  isValidBrazilianPhone,
  normalizePhoneToE164,
} from '../src/utils/phone.ts';
import { LegalApiService } from '../src/services/api/legal-service.ts';
import { AuthService } from '../src/services/auth/auth-service.ts';
import type { HttpClient } from '../src/services/api/client.ts';
import type {
  LegalDocumentMetadata,
  LegalDocumentResponseData,
  UserProfileResponseData,
} from '../src/services/api/types.ts';

test('1. Utilitários de Telefone - Máscara e formatação de entrada (formatPhoneInput)', () => {
  // Entrada vazia
  assert.equal(formatPhoneInput(''), '');

  // DDD parcial
  assert.equal(formatPhoneInput('1'), '(1');
  assert.equal(formatPhoneInput('11'), '(11');

  // Fixo (10 dígitos)
  assert.equal(formatPhoneInput('1134567890'), '(11) 3456-7890');

  // Celular (11 dígitos)
  assert.equal(formatPhoneInput('11987654321'), '(11) 98765-4321');

  // Limite de dígitos: ignora além de 11 dígitos
  assert.equal(formatPhoneInput('1198765432199999'), '(11) 98765-4321');

  // Ignora caracteres não-numéricos
  assert.equal(formatPhoneInput('(11) 98765-4321 abc!'), '(11) 98765-4321');
});

test('2. Utilitários de Telefone - Formatação para exibição (formatPhoneForDisplay)', () => {
  assert.equal(formatPhoneForDisplay(null), '');
  assert.equal(formatPhoneForDisplay(undefined), '');
  assert.equal(formatPhoneForDisplay('+5511987654321'), '(11) 98765-4321');
  assert.equal(formatPhoneForDisplay('+551134567890'), '(11) 3456-7890');
  assert.equal(formatPhoneForDisplay('11987654321'), '(11) 98765-4321');
});

test('3. Utilitários de Telefone - Validação de telefones brasileiros (isValidBrazilianPhone)', () => {
  // Celulares válidos em diferentes DDDs
  assert.equal(isValidBrazilianPhone('(11) 98765-4321'), true);
  assert.equal(isValidBrazilianPhone('11987654321'), true);
  assert.equal(isValidBrazilianPhone('+5511987654321'), true);
  assert.equal(isValidBrazilianPhone('(21) 99888-7766'), true);
  assert.equal(isValidBrazilianPhone('(47) 91234-5678'), true);

  // Fixos válidos
  assert.equal(isValidBrazilianPhone('(11) 3456-7890'), true);
  assert.equal(isValidBrazilianPhone('1134567890'), true);

  // DDDs inválidos (00, 01, 10, etc.)
  assert.equal(isValidBrazilianPhone('(00) 98765-4321'), false);
  assert.equal(isValidBrazilianPhone('(01) 98765-4321'), false);
  assert.equal(isValidBrazilianPhone('(10) 98765-4321'), false);

  // Tamanhos inválidos
  assert.equal(isValidBrazilianPhone('12345'), false);
  assert.equal(isValidBrazilianPhone('(11) 9876-543'), false);
  assert.equal(isValidBrazilianPhone('1198765432100'), false);

  // Celular sem 9 inicial no bloco de 9 dígitos
  assert.equal(isValidBrazilianPhone('(11) 88765-4321'), false);
});

test('4. Utilitários de Telefone - Normalização para formato internacional E.164 (normalizePhoneToE164)', () => {
  assert.equal(normalizePhoneToE164('(11) 98765-4321'), '+5511987654321');
  assert.equal(normalizePhoneToE164('11987654321'), '+5511987654321');
  assert.equal(normalizePhoneToE164('+5511987654321'), '+5511987654321');
  assert.equal(normalizePhoneToE164('(11) 3456-7890'), '+551134567890');
});

test('5. LegalApiService - Consulta de documentos e conteúdo versionado', async () => {
  const mockDocsList: LegalDocumentMetadata[] = [
    {
      id: 'termos-de-uso',
      title: 'Termos de Uso',
      version: '1.0',
      updatedAt: '2026-10-18T00:00:00.000Z',
    },
    {
      id: 'aviso-de-privacidade',
      title: 'Aviso de Privacidade',
      version: '1.0',
      updatedAt: '2026-10-18T00:00:00.000Z',
    },
  ];

  const mockDocContent: LegalDocumentResponseData = {
    id: 'termos-de-uso',
    title: 'Termos de Uso',
    version: '1.0',
    updatedAt: '2026-10-18T00:00:00.000Z',
    content: '# Termos de Uso v1.0\n\nConteúdo completo...',
  };

  const calls: { url: string; options?: unknown }[] = [];

  const mockClient = {
    get: async <T>(url: string, options?: unknown) => {
      calls.push({ url, options });
      if (url === 'legal/documents') {
        return { data: mockDocsList as T };
      }
      return { data: mockDocContent as T };
    },
  } as unknown as HttpClient;

  const service = new LegalApiService(mockClient);

  // Chamada 1: getDocuments
  const docs = await service.getDocuments();
  assert.equal(docs.length, 2);
  assert.equal(docs[0]!.id, 'termos-de-uso');
  assert.equal(docs[1]!.id, 'aviso-de-privacidade');
  assert.equal(calls[0]!.url, 'legal/documents');

  // Chamada 2: getDocument sem versão específica
  const doc1 = await service.getDocument('termos-de-uso');
  assert.equal(doc1.id, 'termos-de-uso');
  assert.equal(doc1.version, '1.0');
  assert.equal(calls[1]!.url, 'legal/documents/termos-de-uso');

  // Chamada 3: getDocument com versão específica
  const doc2 = await service.getDocument('termos-de-uso', '1.0');
  assert.equal(doc2.version, '1.0');
  assert.equal(calls[2]!.url, 'legal/documents/termos-de-uso?version=1.0');
});

test('6. AuthService - Registro de manifestações legais (registerManifestations)', async () => {
  const mockUserResponse: UserProfileResponseData = {
    id: 'usr-123',
    name: 'Responsável PoolSafe',
    email: 'responsavel@example.com',
    status: 'ACTIVE',
    phone: '+5511987654321',
    termsVersion: '1.0',
    termsAcceptedAt: '2026-10-18T10:00:00.000Z',
    privacyVersion: '1.0',
    privacyAwareAt: '2026-10-18T10:00:00.000Z',
    phoneContactAuthorized: true,
    phoneContactVersion: '1.0',
    phoneContactGrantedAt: '2026-10-18T10:00:00.000Z',
    phoneContactRevokedAt: null,
    createdAt: '2026-09-01T12:00:00.000Z',
  };

  let capturedUrl = '';
  let capturedBody: unknown = null;
  let capturedOptions: { token?: string } | undefined;

  const mockClient = {
    post: async <T>(url: string, body?: unknown, options?: { token?: string }) => {
      capturedUrl = url;
      capturedBody = body;
      capturedOptions = options;
      return { data: mockUserResponse } as T;
    },
  } as unknown as HttpClient;

  const authService = new AuthService(mockClient);

  const result = await authService.registerManifestations('mock-token-xyz', {
    termsAccepted: true,
    termsVersion: '1.0',
    privacyAware: true,
    privacyVersion: '1.0',
  });

  assert.equal(capturedUrl, '/users/me/manifestations');
  assert.deepEqual(capturedBody, {
    termsAccepted: true,
    termsVersion: '1.0',
    privacyAware: true,
    privacyVersion: '1.0',
  });
  assert.equal(capturedOptions?.token, 'mock-token-xyz');
  assert.equal(result.termsAcceptedAt, '2026-10-18T10:00:00.000Z');
  assert.equal(result.privacyAwareAt, '2026-10-18T10:00:00.000Z');
});
