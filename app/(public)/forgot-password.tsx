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
import { forgotPasswordSchema, ForgotPasswordFormData } from '@/schemas/auth';
import { authService } from '@/services/auth/auth-service';
import { ApiError } from '@/services/api/errors';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
    mode: 'onBlur',
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setGeneralError(null);
    setSuccessMessage(null);

    try {
      const response = await authService.forgotPassword(data.email.trim().toLowerCase());
      // Resposta genérica 202 Accepted: preserva privacidade e proteção contra enumeração
      setSuccessMessage(
        response.message || 'Se a conta existir, enviaremos as instruções de recuperação.',
      );
    } catch (err: unknown) {
      if (err instanceof ApiError) {
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

        // Mapeia erros de validação RFC 9457 para o campo e-mail
        const fieldErrors = err.getFieldErrors();
        if (fieldErrors['email']) {
          setError('email', { type: 'server', message: fieldErrors['email'] });
          return;
        }

        setGeneralError(
          err.detail || 'Ocorreu um erro ao processar sua solicitação. Tente novamente.',
        );
      } else {
        setGeneralError('Ocorreu uma falha inesperada. Tente novamente em instantes.');
      }
    }
  };

  return (
    <AppBackground edges={['top', 'bottom', 'left', 'right']}>
      <ScreenHeader
        title="Recuperação de Senha"
        subtitle="Instruções de acesso"
        showBack={true}
        onBack={() => router.back()}
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
          removeClippedSubviews={false}
        >
          <AppCard variant="glass" style={styles.card}>
            <AppText variant="heading2" style={styles.title}>
              Esqueci minha senha
            </AppText>

            <AppText variant="body" colorRole="textSecondary" style={styles.subtitle}>
              Informe o e-mail cadastrado na sua conta. Se ela existir, enviaremos um código
              de verificação seguro para redefinir sua credencial.
            </AppText>

            {generalError && (
              <AppBanner
                testID="forgot-password-error-banner"
                variant="danger"
                message={generalError}
                style={styles.banner}
              />
            )}

            {successMessage ? (
              <View style={styles.successContainer}>
                <AppBanner
                  testID="forgot-password-success-banner"
                  variant="success"
                  message={successMessage}
                  style={styles.banner}
                />

                <AppText variant="body" colorRole="textSecondary" style={styles.successTip}>
                  Verifique sua caixa de entrada e spam. O código de 8 caracteres tem validade
                  de 15 minutos.
                </AppText>

                <View style={styles.actionContainer}>
                  <AppButton
                    testID="forgot-password-proceed-to-reset"
                    variant="primary"
                    title="Inserir código de recuperação"
                    icon="key"
                    fullWidth={true}
                    onPress={() => router.push('/(public)/reset-password')}
                  />
                </View>

                <AppDivider marginVertical={spacing[4]} />

                <AppButton
                  testID="forgot-password-back-to-login-success"
                  variant="ghost"
                  title="Voltar para Login"
                  icon="arrow-left"
                  fullWidth={true}
                  onPress={() => router.push('/(public)/login')}
                />
              </View>
            ) : (
              <View style={styles.form}>
                <Controller
                  control={control}
                  name="email"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <AppInput
                      testID="forgot-password-input-email"
                      label="E-mail cadastrado"
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

                <View style={styles.actionContainer}>
                  <AppButton
                    testID="forgot-password-submit-button"
                    variant="primary"
                    title="Enviar instruções"
                    icon="send"
                    fullWidth={true}
                    loading={isSubmitting}
                    disabled={isSubmitting}
                    onPress={handleSubmit(onSubmit)}
                  />
                </View>

                <AppDivider marginVertical={spacing[4]} />

                <View style={styles.linksContainer}>
                  <AppButton
                    testID="forgot-password-have-code-button"
                    variant="secondary"
                    title="Já possuo um código de recuperação"
                    icon="key"
                    fullWidth={true}
                    disabled={isSubmitting}
                    onPress={() => router.push('/(public)/reset-password')}
                  />

                  <AppButton
                    testID="forgot-password-back-to-login"
                    variant="ghost"
                    title="Voltar para o Login"
                    icon="arrow-left"
                    fullWidth={true}
                    disabled={isSubmitting}
                    onPress={() => router.push('/(public)/login')}
                  />
                </View>
              </View>
            )}
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
  successContainer: {
    gap: spacing[2],
  },
  successTip: {
    lineHeight: 20,
    marginBottom: spacing[2],
  },
  linksContainer: {
    gap: spacing[2],
  },
});
