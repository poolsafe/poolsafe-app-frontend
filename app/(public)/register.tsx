import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { AppBackground } from '@/components/layout/AppBackground';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { AppCard } from '@/components/primitives/AppCard';
import { AppText } from '@/components/primitives/AppText';
import { AppInput } from '@/components/primitives/AppInput';
import { AppButton } from '@/components/primitives/AppButton';
import { AppBanner } from '@/components/primitives/AppBanner';
import { AppDivider } from '@/components/primitives/AppDivider';
import { AppCheckbox } from '@/components/primitives/AppCheckbox';
import { LegalDocumentModal } from '@/components/domain/LegalDocumentModal';
import { spacing } from '@/theme/tokens';
import { registerSchema, RegisterFormData } from '@/schemas/auth';
import { useAuth } from '@/providers/AuthContext';
import { ApiError } from '@/services/api/errors';
import { formatPhoneInput } from '@/utils/phone';

export default function RegisterScreen() {
  const router = useRouter();
  const { register: registerAccount } = useAuth();
  const [generalError, setGeneralError] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Controle do modal de leitura de documentos legais
  const [selectedDoc, setSelectedDoc] = useState<'termos-de-uso' | 'aviso-de-privacidade' | null>(null);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      },
    );

    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      },
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 250);
  };

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      passwordConfirmation: '',
      phone: '',
      phoneContactAuthorized: false,
      termsAccepted: false,
      privacyAware: false,
    },
    mode: 'onBlur',
  });

  const onSubmit = async (data: RegisterFormData) => {
    setGeneralError(null);
    try {
      await registerAccount({
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        password: data.password, // Preserva rigorosamente os caracteres da senha
        termsAccepted: true,
        termsVersion: '1.0',
        privacyAware: true,
        privacyVersion: '1.0',
        phone:
          data.phoneContactAuthorized && data.phone && data.phone.trim().length > 0
            ? data.phone.trim()
            : undefined,
        phoneContactAuthorized: data.phoneContactAuthorized,
        phoneContactVersion: data.phoneContactAuthorized ? '1.0' : undefined,
      });

      // Transição atômica para a área autenticada após persistência da sessão
      router.replace('/(app)/(tabs)');
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.isAccountCannotBeCreated()) {
          setGeneralError(
            'Não foi possível concluir o cadastro com os dados informados. Verifique as informações ou acerte seu acesso.',
          );
          return;
        }

        if (err.isRateLimited()) {
          setGeneralError(
            'Muitas tentativas em sequência. Por favor, aguarde alguns instantes antes de tentar novamente.',
          );
          return;
        }

        if (err.isNetworkError || err.isTimeout) {
          setGeneralError(
            'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.',
          );
          return;
        }

        // Mapeia erros de validação RFC 9457 para os campos do formulário
        const fieldErrors = err.getFieldErrors();
        let hasMappedField = false;

        for (const [field, message] of Object.entries(fieldErrors)) {
          if (
            field === 'name' ||
            field === 'email' ||
            field === 'password' ||
            field === 'phone' ||
            field === 'phoneContactAuthorized' ||
            field === 'termsAccepted' ||
            field === 'privacyAware'
          ) {
            setError(field as keyof RegisterFormData, { type: 'server', message });
            hasMappedField = true;
          }
        }

        if (!hasMappedField) {
          setGeneralError(err.detail || 'Ocorreu um erro ao criar a conta. Tente novamente.');
        }
      } else {
        setGeneralError('Ocorreu uma falha inesperada. Tente novamente em instantes.');
      }
    }
  };

  return (
    <AppBackground edges={['top', 'bottom', 'left', 'right']}>
      <ScreenHeader
        title="Cadastro"
        subtitle="Nova conta de responsável"
        showBack={true}
        onBack={() => router.back()}
        showThemeToggle={true}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: keyboardHeight > 0 ? keyboardHeight + spacing[6] : spacing[10] },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <AppCard variant="glass" style={styles.card}>
            <AppText variant="heading2" style={styles.title}>
              Criar Conta
            </AppText>

            <AppText variant="body" colorRole="textSecondary" style={styles.subtitle}>
              Cadastre-se para monitorar áreas de piscina e receber alertas em tempo real.
            </AppText>

            {generalError && (
              <AppBanner
                testID="register-error-banner"
                variant="danger"
                message={generalError}
                style={styles.banner}
              />
            )}

            <View collapsable={false} style={styles.form}>
              <Controller
                control={control}
                name="name"
                render={({ field: { onChange, onBlur, value } }) => (
                  <AppInput
                    testID="register-input-name"
                    label="Nome completo"
                    placeholder="Seu nome de responsável"
                    icon="user"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.name?.message}
                    disabled={isSubmitting}
                    autoCapitalize="words"
                    autoCorrect={false}
                    autoComplete="name"
                    textContentType="name"
                  />
                )}
              />

              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <AppInput
                    testID="register-input-email"
                    label="E-mail"
                    placeholder="seu.email@exemplo.com"
                    icon="mail"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.email?.message}
                    disabled={isSubmitting}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    textContentType="emailAddress"
                  />
                )}
              />

              <Controller
                control={control}
                name="phone"
                render={({ field: { onChange, onBlur, value } }) => (
                  <AppInput
                    testID="register-input-phone"
                    label="Telefone (opcional)"
                    placeholder="(XX) XXXXX-XXXX"
                    icon="phone"
                    value={value || ''}
                    onChangeText={(text) => onChange(formatPhoneInput(text))}
                    onBlur={onBlur}
                    error={errors.phone?.message}
                    helperText="Número com DDD para contato complementar da equipe."
                    disabled={isSubmitting}
                    keyboardType="phone-pad"
                    autoComplete="tel"
                    textContentType="telephoneNumber"
                  />
                )}
              />

              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <AppInput
                    testID="register-input-password"
                    label="Senha"
                    placeholder="Mínimo de 8 caracteres"
                    icon="lock"
                    isPassword={true}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.password?.message}
                    helperText="Entre 8 e 128 caracteres."
                    disabled={isSubmitting}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="new-password"
                    textContentType="newPassword"
                  />
                )}
              />

              <Controller
                control={control}
                name="passwordConfirmation"
                render={({ field: { onChange, onBlur, value } }) => (
                  <AppInput
                    testID="register-input-password-confirmation"
                    label="Confirmação de Senha"
                    placeholder="Repita a senha exatamente"
                    icon="check"
                    isPassword={true}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    onFocus={scrollToBottom}
                    error={errors.passwordConfirmation?.message}
                    disabled={isSubmitting}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="new-password"
                    textContentType="newPassword"
                  />
                )}
              />

              {/* Seção de Manifestações e Termos */}
              <AppDivider marginVertical={spacing[3]} />

              <AppText variant="smallStrong" colorRole="primary" style={styles.sectionHeader}>
                Termos, Privacidade e Autorizações
              </AppText>

              {/* 1. Aceite dos Termos de Uso (Obrigatório) */}
              <Controller
                control={control}
                name="termsAccepted"
                render={({ field: { onChange, value } }) => (
                  <AppCheckbox
                    testID="register-checkbox-terms"
                    checked={value}
                    onValueChange={onChange}
                    badgeText="Obrigatório"
                    badgeVariant="warning"
                    disabled={isSubmitting}
                    error={errors.termsAccepted?.message}
                    label={
                      <View collapsable={false} style={styles.checkboxLabelContainer}>
                        <AppText variant="body" style={styles.checkboxLabelText}>
                          Li e aceito os{' '}
                          <AppText
                            variant="bodyStrong"
                            colorRole="primary"
                            onPress={() => setSelectedDoc('termos-de-uso')}
                          >
                            Termos de Uso
                          </AppText>
                          .
                        </AppText>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Ler Termos de Uso"
                          onPress={() => setSelectedDoc('termos-de-uso')}
                        >
                          <AppText variant="caption" colorRole="primary" style={styles.readDocLink}>
                            [Ler documento]
                          </AppText>
                        </Pressable>
                      </View>
                    }
                  />
                )}
              />

              {/* 2. Ciência do Aviso de Privacidade (Obrigatório) */}
              <Controller
                control={control}
                name="privacyAware"
                render={({ field: { onChange, value } }) => (
                  <AppCheckbox
                    testID="register-checkbox-privacy"
                    checked={value}
                    onValueChange={onChange}
                    badgeText="Obrigatório"
                    badgeVariant="warning"
                    disabled={isSubmitting}
                    error={errors.privacyAware?.message}
                    label={
                      <View collapsable={false} style={styles.checkboxLabelContainer}>
                        <AppText variant="body" style={styles.checkboxLabelText}>
                          Declaro ciência do{' '}
                          <AppText
                            variant="bodyStrong"
                            colorRole="primary"
                            onPress={() => setSelectedDoc('aviso-de-privacidade')}
                          >
                            Aviso de Privacidade
                          </AppText>
                          .
                        </AppText>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Ler Aviso de Privacidade"
                          onPress={() => setSelectedDoc('aviso-de-privacidade')}
                        >
                          <AppText variant="caption" colorRole="primary" style={styles.readDocLink}>
                            [Ler documento]
                          </AppText>
                        </Pressable>
                      </View>
                    }
                  />
                )}
              />

              {/* 3. Autorização de Contato Telefônico (Opcional) */}
              <Controller
                control={control}
                name="phoneContactAuthorized"
                render={({ field: { onChange, value } }) => (
                  <AppCheckbox
                    testID="register-checkbox-phone-contact"
                    checked={Boolean(value)}
                    onValueChange={onChange}
                    badgeText="Opcional"
                    badgeVariant="info"
                    disabled={isSubmitting}
                    error={errors.phoneContactAuthorized?.message}
                    label="Autorizo contato telefônico complementar da equipe sobre suporte, avisos operacionais e situações do protótipo."
                    subtitle="Sem esta autorização, o telefone não será armazenado para essa finalidade. A recusa não impede a criação da conta."
                  />
                )}
              />

              <View collapsable={false} style={styles.actionContainer}>
                <AppButton
                  testID="register-submit-button"
                  variant="primary"
                  title="Criar Conta"
                  icon="user-plus"
                  fullWidth={true}
                  loading={isSubmitting}
                  disabled={isSubmitting}
                  onPress={handleSubmit(onSubmit)}
                />
              </View>
            </View>

            <AppDivider marginVertical={spacing[4]} />

            <View collapsable={false} style={styles.loginContainer}>
              <AppText variant="small" colorRole="textMuted" style={styles.loginPrompt}>
                Já possui uma conta?
              </AppText>
              <AppButton
                testID="register-go-to-login"
                variant="secondary"
                title="Ir para o Login"
                icon="log-in"
                fullWidth={true}
                disabled={isSubmitting}
                onPress={() => router.back()}
              />
            </View>
          </AppCard>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal de leitura dos documentos sem perda dos dados do formulário */}
      {selectedDoc && (
        <LegalDocumentModal
          visible={true}
          documentId={selectedDoc}
          onClose={() => setSelectedDoc(null)}
        />
      )}
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing[4],
    paddingBottom: spacing[12],
  },
  card: {
    padding: spacing[4],
  },
  title: {
    marginBottom: spacing[1],
  },
  subtitle: {
    marginBottom: spacing[4],
    lineHeight: 22,
  },
  banner: {
    marginBottom: spacing[3],
  },
  form: {
    gap: spacing[2],
  },
  sectionHeader: {
    marginBottom: spacing[1],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  checkboxLabelContainer: {
    flex: 1,
    gap: 2,
  },
  checkboxLabelText: {
    lineHeight: 20,
  },
  readDocLink: {
    marginTop: 2,
    textDecorationLine: 'underline',
  },
  actionContainer: {
    marginTop: spacing[3],
  },
  loginContainer: {
    alignItems: 'center',
    gap: spacing[2],
  },
  loginPrompt: {
    textAlign: 'center',
  },
});
