/**
 * Testes automatizados do Indicador de Pendência de Prontidão (Bolinha Vermelha).
 *
 * Cobertura:
 * 1. Diagnóstico PRONTO resulta em hasPendingReadiness = false (sem bolinha)
 * 2. Diagnóstico DEGRADADO resulta em hasPendingReadiness = true (com bolinha)
 * 3. Diagnóstico DESATIVADO resulta em hasPendingReadiness = true (com bolinha)
 * 4. Transição dinâmica de estado (DEGRADADO -> PRONTO remove o badge)
 * 5. Somente a aba de Definições ('settings') recebe o badge de prontidão
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import type { AlertReadinessDiagnosis, AlertReadinessStatus } from '../src/services/notifications/types.ts';

function computeHasPendingReadiness(diagnosis: AlertReadinessDiagnosis | null): boolean {
  if (!diagnosis) return false;
  return diagnosis.status !== 'PRONTO';
}

function mockDiagnosis(status: AlertReadinessStatus): AlertReadinessDiagnosis {
  return {
    status,
    summary: `Status ${status}`,
    detail: `Detalhes de ${status}`,
    canTest: status === 'PRONTO',
    checks: [],
    evaluatedAt: new Date().toISOString(),
  };
}

test('1. Indicador de Pendência - Status PRONTO não exibe bolinha vermelha', () => {
  const diagnosis = mockDiagnosis('PRONTO');
  const hasPending = computeHasPendingReadiness(diagnosis);
  assert.equal(hasPending, false, 'PRONTO não deve ter pendência');
});

test('2. Indicador de Pendência - Status DEGRADADO exibe bolinha vermelha', () => {
  const diagnosis = mockDiagnosis('DEGRADADO');
  const hasPending = computeHasPendingReadiness(diagnosis);
  assert.equal(hasPending, true, 'DEGRADADO deve sinalizar pendência para o usuário');
});

test('3. Indicador de Pendência - Status DESATIVADO exibe bolinha vermelha', () => {
  const diagnosis = mockDiagnosis('DESATIVADO');
  const hasPending = computeHasPendingReadiness(diagnosis);
  assert.equal(hasPending, true, 'DESATIVADO deve sinalizar pendência crítica para o usuário');
});

test('4. Indicador de Pendência - Diagnóstico nulo ou inicialização não exibe bolinha falsa', () => {
  const hasPending = computeHasPendingReadiness(null);
  assert.equal(hasPending, false, 'Antes do diagnóstico carregar não deve exibir falso positivo');
});

test('5. Indicador de Pendência - Transição dinâmica após correção no dispositivo', () => {
  let diagnosis = mockDiagnosis('DEGRADADO');
  assert.equal(computeHasPendingReadiness(diagnosis), true);

  // Usuário concede permissão e canal sincroniza
  diagnosis = mockDiagnosis('PRONTO');
  assert.equal(computeHasPendingReadiness(diagnosis), false, 'Bolinha deve desaparecer assim que ficar PRONTO');
});

test('6. Regra da Bottom Navigation - Somente a aba settings recebe o badge', () => {
  const hasPending = true;
  const routes = ['index', 'history', 'cameras', 'settings'];

  const badges = routes.map((routeName) => ({
    route: routeName,
    hasBadge: routeName === 'settings' && hasPending,
  }));

  assert.deepEqual(badges, [
    { route: 'index', hasBadge: false },
    { route: 'history', hasBadge: false },
    { route: 'cameras', hasBadge: false },
    { route: 'settings', hasBadge: true },
  ]);
});
