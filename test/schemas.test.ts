import test from 'node:test';
import assert from 'node:assert/strict';
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../src/schemas/auth.ts';

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

test('2. Schemas de Cadastro - Validação de nome, senha, confirmação, manifestações e telefone', () => {
  // Sucesso com confirmação idêntica e manifestações obrigatórias
  const valid = registerSchema.safeParse({
    name: 'Dan Silva',
    email: 'dan@example.com',
    password: 'senhaSegura123',
    passwordConfirmation: 'senhaSegura123',
    termsAccepted: true,
    privacyAware: true,
  });
  assert.equal(valid.success, true);

  // Rejeição quando termos não foram aceitos
  const noTerms = registerSchema.safeParse({
    name: 'Dan Silva',
    email: 'dan@example.com',
    password: 'senhaSegura123',
    passwordConfirmation: 'senhaSegura123',
    termsAccepted: false,
    privacyAware: true,
  });
  assert.equal(noTerms.success, false);

  // Rejeição quando aviso de privacidade não foi reconhecido
  const noPrivacy = registerSchema.safeParse({
    name: 'Dan Silva',
    email: 'dan@example.com',
    password: 'senhaSegura123',
    passwordConfirmation: 'senhaSegura123',
    termsAccepted: true,
    privacyAware: false,
  });
  assert.equal(noPrivacy.success, false);

  // Sucesso com telefone opcional válido e autorizado
  const validWithPhone = registerSchema.safeParse({
    name: 'Dan Silva',
    email: 'dan@example.com',
    password: 'senhaSegura123',
    passwordConfirmation: 'senhaSegura123',
    termsAccepted: true,
    privacyAware: true,
    phone: '(11) 98765-4321',
    phoneContactAuthorized: true,
  });
  assert.equal(validWithPhone.success, true);

  // Rejeição com telefone preenchido mas sem autorização
  const phoneWithoutAuth = registerSchema.safeParse({
    name: 'Dan Silva',
    email: 'dan@example.com',
    password: 'senhaSegura123',
    passwordConfirmation: 'senhaSegura123',
    termsAccepted: true,
    privacyAware: true,
    phone: '(11) 98765-4321',
    phoneContactAuthorized: false,
  });
  assert.equal(phoneWithoutAuth.success, false);

  // Rejeição com telefone em formato inválido
  const invalidPhone = registerSchema.safeParse({
    name: 'Dan Silva',
    email: 'dan@example.com',
    password: 'senhaSegura123',
    passwordConfirmation: 'senhaSegura123',
    termsAccepted: true,
    privacyAware: true,
    phone: '1234',
    phoneContactAuthorized: true,
  });
  assert.equal(invalidPhone.success, false);

  // Nome menor que 2 caracteres após trim
  const shortName = registerSchema.safeParse({
    name: ' A ',
    email: 'dan@example.com',
    password: 'senhaSegura123',
    passwordConfirmation: 'senhaSegura123',
    termsAccepted: true,
    privacyAware: true,
  });
  assert.equal(shortName.success, false);

  // Nome maior que 120 caracteres
  const longName = registerSchema.safeParse({
    name: 'A'.repeat(121),
    email: 'dan@example.com',
    password: 'senhaSegura123',
    passwordConfirmation: 'senhaSegura123',
    termsAccepted: true,
    privacyAware: true,
  });
  assert.equal(longName.success, false);

  // Confirmação de senha divergente
  const mismatch = registerSchema.safeParse({
    name: 'Dan Silva',
    email: 'dan@example.com',
    password: 'senhaSegura123',
    passwordConfirmation: 'senhaDiferente456',
    termsAccepted: true,
    privacyAware: true,
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

test('3. Schemas de Recuperação de Senha (Fatia 3B) - Validações de e-mail', () => {
  // Sucesso
  const valid = forgotPasswordSchema.safeParse({ email: 'usuario@example.com' });
  assert.equal(valid.success, true);

  // E-mail vazio
  const empty = forgotPasswordSchema.safeParse({ email: '' });
  assert.equal(empty.success, false);

  // E-mail inválido
  const invalid = forgotPasswordSchema.safeParse({ email: 'invalido' });
  assert.equal(invalid.success, false);

  // E-mail maior que 254 caracteres
  const tooLong = forgotPasswordSchema.safeParse({ email: `${'a'.repeat(250)}@ex.com` });
  assert.equal(tooLong.success, false);
});

test('4. Schemas de Redefinição de Senha (Fatia 3B) - Validação de código e senhas', () => {
  // Código formatado com hífen válido
  const validWithHyphen = resetPasswordSchema.safeParse({
    token: 'AB7K-2P9Q',
    newPassword: 'nova-senha-segura',
    passwordConfirmation: 'nova-senha-segura',
  });
  assert.equal(validWithHyphen.success, true);

  // Código sem hífen válido
  const validWithoutHyphen = resetPasswordSchema.safeParse({
    token: 'AB7K2P9Q',
    newPassword: 'nova-senha-segura',
    passwordConfirmation: 'nova-senha-segura',
  });
  assert.equal(validWithoutHyphen.success, true);

  // Código minúsculo aceito pelo schema
  const validLowercase = resetPasswordSchema.safeParse({
    token: 'ab7k-2p9q',
    newPassword: 'nova-senha-segura',
    passwordConfirmation: 'nova-senha-segura',
  });
  assert.equal(validLowercase.success, true);

  // Código com caractere ambíguo proibido (ex: zero '0' ou 'O')
  const invalidChar = resetPasswordSchema.safeParse({
    token: 'AB7K-2P90',
    newPassword: 'nova-senha-segura',
    passwordConfirmation: 'nova-senha-segura',
  });
  assert.equal(invalidChar.success, false);

  // Código com tamanho diferente de 8 caracteres úteis
  const shortCode = resetPasswordSchema.safeParse({
    token: 'AB7K-2P',
    newPassword: 'nova-senha-segura',
    passwordConfirmation: 'nova-senha-segura',
  });
  assert.equal(shortCode.success, false);

  // Senha menor que 8 caracteres
  const shortPass = resetPasswordSchema.safeParse({
    token: 'AB7K-2P9Q',
    newPassword: '1234567',
    passwordConfirmation: '1234567',
  });
  assert.equal(shortPass.success, false);

  // Confirmação divergente
  const mismatch = resetPasswordSchema.safeParse({
    token: 'AB7K-2P9Q',
    newPassword: 'nova-senha-segura',
    passwordConfirmation: 'outra-senha',
  });
  assert.equal(mismatch.success, false);
});

