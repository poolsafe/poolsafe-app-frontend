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
import { resetPasswordSchema, ResetPasswordFormData } from '@/schemas/auth';
import { authService } from '@/services/auth/auth-service';
import { ApiError } from '@/services/api/errors';

function formatTokenInput(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8);
  if (cleaned.length > 4) {
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
  }
  return cleaned;
}

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    control,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token: '',
      newPassword: '',
      passwordConfirmation: '',
    },
    mode: 'onBlur',
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    setGeneralError(null);

    try {
      await authService.resetPassword({
        token: data.token,
        newPassword: data.newPassword,
      });

      // Sucesso: 204 No Content
      reset();
      setIsSuccess(true);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.isInvalidResetToken()) {
          setGeneralError(
            'Código de recuperação inválido ou já utilizado. Verifique o código recebido por e-mail e tente novamente.',
          );
          return;
        }

        if (err.isResetTokenExpired()) {
          setGeneralError(
            'O código de recuperação informado expirou. Códigos possuem validade de 15 minutos. Solicite um novo envio.',
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
            'Não foi possível conectar ao servidor. Verifique sua conexão com a Internet e tente novamente.',
          );
          return;
        }

        // Mapeia eventuais erros de validação RFC 9457 aos campos
        const fieldErrors = err.getFieldErrors();
        let hasMappedField = false;

        if (fieldErrors['token']) {
          setError('token', { type: 'server', message: fieldErrors['token'] });
          hasMappedField = true;
        }
        if (fieldErrors['newPassword']) {
          setError('newPassword', { type: 'server', message: fieldErrors['newPassword'] });
          hasMappedField = true;
        }

        if (!hasMappedField) {
          setGeneralError(
            err.detail || 'Ocorreu um erro ao redefinir sua senha. Tente novamente.',
          );
        }
      } else {
        setGeneralError('Ocorreu uma falha inesperada. Tente novamente em instantes.');
      }
    }
  };

  return (
    <AppBackground edges={['top', 'bottom', 'left', 'right']}>
      <ScreenHeader
        title="Redefinir Senha"
        subtitle="Nova credencial"
        showBack={true}
        onBack={() => (isSuccess ? router.replace('/(public)/login') : router.back())}
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
              Criar nova senha
            </AppText>

            <AppText variant="body" colorRole="textSecondary" style={styles.subtitle}>
              Digite o código de 8 caracteres recebido por e-mail e defina a nova senha da sua
              conta PoolSafe.
            </AppText>

            {generalError && (
              <AppBanner
                testID="reset-password-error-banner"
                variant="danger"
                message={generalError}
                style={styles.banner}
              />
            )}

            {isSuccess ? (
              <View style={styles.successContainer}>
                <AppBanner
                  testID="reset-password-success-banner"
                  variant="success"
                  message="Senha redefinida com sucesso! Por segurança, todas as sessões anteriores foram encerradas."
                  style={styles.banner}
                />

                <AppText variant="body" colorRole="textSecondary" style={styles.successTip}>
                  Sua conta está segura e você já pode entrar com sua nova senha.
                </AppText>

                <View style={styles.actionContainer}>
                  <AppButton
                    testID="reset-password-go-to-login"
                    variant="primary"
                    title="Ir para o Login"
                    icon="log-in"
                    fullWidth={true}
                    onPress={() => router.replace('/(public)/login')}
                  />
                </View>
              </View>
            ) : (
              <View style={styles.form}>
                <Controller
                  control={control}
                  name="token"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <AppInput
                      testID="reset-password-input-token"
                      label="Código de recuperação"
                      placeholder="Ex: AB7K-2P9Q"
                      icon="key"
                      value={value}
                      onChangeText={(text) => onChange(formatTokenInput(text))}
                      onBlur={onBlur}
                      error={errors.token?.message}
                      disabled={isSubmitting}
                      autoCapitalize="characters"
                      autoCorrect={false}
                      maxLength={9} // 8 caracteres + 1 hífen
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="newPassword"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <AppInput
                      testID="reset-password-input-new-password"
                      label="Nova senha"
                      placeholder="Mínimo de 8 caracteres"
                      icon="lock"
                      isPassword={true}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={errors.newPassword?.message}
                      disabled={isSubmitting}
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="password-new"
                      textContentType="newPassword"
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="passwordConfirmation"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <AppInput
                      testID="reset-password-input-password-confirmation"
                      label="Confirmar nova senha"
                      placeholder="Repita a nova senha"
                      icon="check"
                      isPassword={true}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={errors.passwordConfirmation?.message}
                      disabled={isSubmitting}
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="password-new"
                      textContentType="newPassword"
                    />
                  )}
                />

                <View style={styles.actionContainer}>
                  <AppButton
                    testID="reset-password-submit-button"
                    variant="primary"
                    title="Redefinir senha"
                    icon="check-circle"
                    fullWidth={true}
                    loading={isSubmitting}
                    disabled={isSubmitting}
                    onPress={handleSubmit(onSubmit)}
                  />
                </View>

                <AppDivider marginVertical={spacing[4]} />

                <View style={styles.linksContainer}>
                  <AppButton
                    testID="reset-password-request-new-code"
                    variant="secondary"
                    title="Solicitar novo código"
                    icon="mail"
                    fullWidth={true}
                    disabled={isSubmitting}
                    onPress={() => router.push('/(public)/forgot-password')}
                  />

                  <AppButton
                    testID="reset-password-back-to-login"
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
