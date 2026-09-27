import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { logoTokens } from '../src/theme/tokens.ts';

test('1. AppLogo - Preserva o aspect ratio original (1500 x 394)', () => {
  const expectedRatio = 1500 / 394;
  assert.equal(logoTokens.aspectRatio, expectedRatio);
  assert.ok(Math.abs(logoTokens.aspectRatio - 3.8071) < 0.001);
});

test('2. Assets de logo existem no diretório de assets e são arquivos PNG válidos', () => {
  const darkLogoPath = path.resolve('assets/poolsafe-logo-dark.png');
  const lightLogoPath = path.resolve('assets/poolsafe-logo-light.png');

  assert.ok(fs.existsSync(darkLogoPath), 'poolsafe-logo-dark.png deve existir');
  assert.ok(fs.existsSync(lightLogoPath), 'poolsafe-logo-light.png deve existir');

  const darkBuffer = fs.readFileSync(darkLogoPath);
  const lightBuffer = fs.readFileSync(lightLogoPath);

  // Assinatura PNG (89 50 4E 47 0D 0A 1A 0A)
  const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.deepEqual(darkBuffer.subarray(0, 8), pngHeader, 'Dark logo deve ser um PNG válido');
  assert.deepEqual(lightBuffer.subarray(0, 8), pngHeader, 'Light logo deve ser um PNG válido');

  // Dimensões do header IHDR (bytes 16 a 24)
  const darkWidth = darkBuffer.readUInt32BE(16);
  const darkHeight = darkBuffer.readUInt32BE(20);
  const lightWidth = lightBuffer.readUInt32BE(16);
  const lightHeight = lightBuffer.readUInt32BE(20);

  assert.equal(darkWidth, 1500);
  assert.equal(darkHeight, 394);
  assert.equal(lightWidth, 1500);
  assert.equal(lightHeight, 394);
});

test('3. Cálculo de proporção de tela e compensação óptica', () => {
  // Proporção regular (smartphone)
  const regularHeight = 32;
  const regularWidth = Math.round(regularHeight * logoTokens.aspectRatio);
  assert.equal(regularWidth, 122);

  // Compensação de margem transparente (5%)
  const trimLeft = -Math.round(regularWidth * 0.05);
  assert.equal(trimLeft, -6);

  // Compensação vertical (~8%)
  const trimVertical = -Math.round(regularHeight * 0.08);
  assert.equal(trimVertical, -3);

  // Proporção compacta (< 360)
  const compactHeight = 28;
  const compactWidth = Math.round(compactHeight * logoTokens.aspectRatio);
  assert.equal(compactWidth, 107);

  // Proporção tablet (>= 768)
  const tabletHeight = 36;
  const tabletWidth = Math.round(tabletHeight * logoTokens.aspectRatio);
  assert.equal(tabletWidth, 137);
});
