import test from 'node:test';
import assert from 'node:assert/strict';
import { loginSchema, registerSchema } from '../src/schemas/auth.ts';

test('1. Schemas de Login - Validações de e-mail e senha', () => {
  // Caso de sucesso
  const valid = loginSchema.safeParse({
    email: 'dan@example.com',
    password: 'password123',
  });
  assert.equal(valid.success, true);

  // E-mail vazio
  const emptyEmail = loginSchema.safeParse({
    email: '',
    password: 'password123',
  });
  assert.equal(emptyEmail.success, false);

  // E-mail inválido
  const invalidEmail = loginSchema.safeParse({
    email: 'not-an-email',
    password: 'password123',
  });
  assert.equal(invalidEmail.success, false);

  // E-mail maior que 254 caracteres
  const longEmail = loginSchema.safeParse({
    email: `${'a'.repeat(250)}@ex.com`,
    password: 'password123',
  });
  assert.equal(longEmail.success, false);

  // Senha menor que 8 caracteres
  const shortPass = loginSchema.safeParse({
    email: 'dan@example.com',
    password: '1234567',
  });
  assert.equal(shortPass.success, false);

  // Senha com 8 caracteres (limite inferior)
  const minPass = loginSchema.safeParse({
    email: 'dan@example.com',
    password: '12345678',
  });
  assert.equal(minPass.success, true);

  // Senha maior que 128 caracteres
  const longPass = loginSchema.safeParse({
    email: 'dan@example.com',
    password: 'a'.repeat(129),
  });
  assert.equal(longPass.success, false);

  // Preservação estrita de espaços na senha
  const passWithSpaces = '  senha com espaços  ';
  const spacesParsed = loginSchema.safeParse({
    email: 'dan@example.com',
    password: passWithSpaces,
  });
  assert.equal(spacesParsed.success, true);
  if (spacesParsed.success) {
    assert.equal(spacesParsed.data.password, passWithSpaces, 'A senha não pode ter espaços removidos');
  }
});

test('2. Schemas de Cadastro - Validação de nome, senha e confirmação exclusiva no cliente', () => {
  // Sucesso com confirmação idêntica
  const valid = registerSchema.safeParse({
    name: 'Dan Silva',
    email: 'dan@example.com',
    password: 'senhaSegura123',
    passwordConfirmation: 'senhaSegura123',
  });
  assert.equal(valid.success, true);

  // Nome menor que 2 caracteres após trim
  const shortName = registerSchema.safeParse({
    name: ' A ',
    email: 'dan@example.com',
    password: 'senhaSegura123',
    passwordConfirmation: 'senhaSegura123',
  });
  assert.equal(shortName.success, false);

  // Nome maior que 120 caracteres
  const longName = registerSchema.safeParse({
    name: 'A'.repeat(121),
    email: 'dan@example.com',
    password: 'senhaSegura123',
    passwordConfirmation: 'senhaSegura123',
  });
  assert.equal(longName.success, false);

  // Confirmação de senha divergente
  const mismatch = registerSchema.safeParse({
    name: 'Dan Silva',
    email: 'dan@example.com',
    password: 'senhaSegura123',
    passwordConfirmation: 'senhaDiferente456',
  });
  assert.equal(mismatch.success, false);
  if (!mismatch.success) {
    const errorPaths = mismatch.error.issues.map((i) => i.path.join('.'));
    assert.ok(errorPaths.includes('passwordConfirmation'), 'O erro deve apontar para passwordConfirmation');
  }

  // Garantia de que a confirmação de senha é validada no cliente e pode ser excluída do payload da API
  if (valid.success) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordConfirmation, ...apiPayload } = valid.data;
    assert.equal('passwordConfirmation' in apiPayload, false, 'passwordConfirmation não deve fazer parte do payload da API');
    assert.equal(apiPayload.name, 'Dan Silva');
    assert.equal(apiPayload.email, 'dan@example.com');
  }
});
