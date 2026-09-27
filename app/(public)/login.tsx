import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
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
import { spacing } from '@/theme/tokens';
import { loginSchema, LoginFormData } from '@/schemas/auth';
import { useAuth } from '@/providers/AuthContext';
import { ApiError } from '@/services/api/errors';
import { ApiErrorCodes } from '@/services/api/types';
import { AppLogo } from '@/components/primitives/AppLogo';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [generalError, setGeneralError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
    mode: 'onBlur',
  });

  const onSubmit = async (data: LoginFormData) => {
    setGeneralError(null);
    try {
      await login({
        email: data.email.trim().toLowerCase(),
        password: data.password,
      });

      // Transição atômica para a área autenticada sem retorno ao Login pelo botão Voltar
      router.replace('/(app)/(tabs)');
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.isInvalidCredentials()) {
          // Mensagem não enumerável por requisito de segurança
          setGeneralError('E-mail ou senha incorretos. Verifique suas credenciais e tente novamente.');
          return;
        }

        if (err.isRateLimited()) {
          setGeneralError('Muitas tentativas em sequência. Por favor, aguarde alguns instantes antes de tentar novamente.');
          return;
        }

        if (err.isNetworkError || err.isTimeout) {
          setGeneralError('Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.');
          return;
        }

        // Mapeia erros de validação RFC 9457 para os campos específicos
        const fieldErrors = err.getFieldErrors();
        let hasMappedField = false;

        for (const [field, message] of Object.entries(fieldErrors)) {
          if (field === 'email' || field === 'password') {
            setError(field as keyof LoginFormData, { type: 'server', message });
            hasMappedField = true;
          }
        }

        if (!hasMappedField) {
          setGeneralError(err.detail || 'Ocorreu um erro ao processar seu login. Tente novamente.');
        }
      } else {
        setGeneralError('Ocorreu uma falha inesperada. Tente novamente em instantes.');
      }
    }
  };

  return (
    <AppBackground edges={['top', 'bottom', 'left', 'right']}>
      <ScreenHeader
        title={<AppLogo />}
        subtitle="Acesso ao sistema"
        showThemeToggle={true}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <AppCard variant="glass" style={styles.card}>
            <AppText variant="heading2" style={styles.title}>
              Entrar
            </AppText>

            <AppText variant="body" colorRole="textSecondary" style={styles.subtitle}>
              Informe suas credenciais de responsável para gerenciar suas câmeras e alertas.
            </AppText>

            {generalError && (
              <AppBanner
                testID="login-error-banner"
                variant="danger"
                message={generalError}
                style={styles.banner}
              />
            )}

            <View style={styles.form}>
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <AppInput
                    testID="login-input-email"
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
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <AppInput
                    testID="login-input-password"
                    label="Senha"
                    placeholder="Sua senha de acesso"
                    icon="lock"
                    isPassword={true}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.password?.message}
                    disabled={isSubmitting}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="password"
                    textContentType="password"
                  />
                )}
              />

              <View style={styles.actionContainer}>
                <AppButton
                  testID="login-submit-button"
                  variant="primary"
                  title="Entrar"
                  icon="log-in"
                  fullWidth={true}
                  loading={isSubmitting}
                  disabled={isSubmitting}
                  onPress={handleSubmit(onSubmit)}
                />
              </View>
            </View>

            <AppDivider marginVertical={spacing[4]} />

            <View style={styles.registerContainer}>
              <AppText variant="small" colorRole="textMuted" style={styles.registerPrompt}>
                Ainda não possui uma conta?
              </AppText>
              <AppButton
                testID="login-go-to-register"
                variant="secondary"
                title="Cadastrar nova conta"
                icon="user-plus"
                fullWidth={true}
                disabled={isSubmitting}
                onPress={() => router.push('/(public)/register')}
              />
            </View>
          </AppCard>
        </ScrollView>
      </KeyboardAvoidingView>
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
    justifyContent: 'center',
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
  actionContainer: {
    marginTop: spacing[3],
  },
  registerContainer: {
    alignItems: 'center',
    gap: spacing[2],
  },
  registerPrompt: {
    textAlign: 'center',
  },
});
