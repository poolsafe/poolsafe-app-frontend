import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { AppBackground } from '@/components/layout/AppBackground';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { AppCard } from '@/components/primitives/AppCard';
import { AppText } from '@/components/primitives/AppText';
import { AppInput } from '@/components/primitives/AppInput';
import { AppButton } from '@/components/primitives/AppButton';
import { AppBanner } from '@/components/primitives/AppBanner';
import { spacing } from '@/theme/tokens';
import { useAuth } from '@/providers/AuthContext';
import { authService } from '@/services/auth/auth-service';
import { ApiError } from '@/services/api/errors';
import {
  changePasswordSchema,
  type ChangePasswordFormData,
} from '@/schemas/account';

export default function SecuritySettingsScreen() {
  const { tokens, updateTokens } = useAuth();

  const [passwordSuccessMessage, setPasswordSuccessMessage] = useState<string | null>(null);
  const [passwordGeneralError, setPasswordGeneralError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setError,
    reset,
    formState: { isSubmitting, errors },
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      newPasswordConfirmation: '',
    },
    mode: 'onBlur',
  });

  const onChangePassword = async (data: ChangePasswordFormData) => {
    if (!tokens) return;
    setPasswordSuccessMessage(null);
    setPasswordGeneralError(null);

    try {
      await authService.executeWithAuth(
        tokens,
        (accessToken) =>
          authService.changePassword(accessToken, {
            currentPassword: data.currentPassword,
            newPassword: data.newPassword,
          }),
        updateTokens,
      );

      reset();
      setPasswordSuccessMessage(
        'Senha alterada com sucesso! As demais sessões foram revogadas por segurança.',
      );
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.isReauthenticationFailed()) {
          setPasswordGeneralError(
            'A senha atual informada está incorreta. Verifique suas credenciais e tente novamente.',
          );
          return;
        }
        if (err.isRateLimited()) {
          setPasswordGeneralError('Muitas tentativas em sequência. Aguarde alguns instantes.');
          return;
        }
        if (err.isNetworkError || err.isTimeout) {
          setPasswordGeneralError('Falha ao conectar com o servidor. Verifique sua conexão.');
          return;
        }

        const fieldErrors = err.getFieldErrors();
        let hasMappedField = false;
        for (const [field, message] of Object.entries(fieldErrors)) {
          if (field === 'currentPassword' || field === 'newPassword') {
            setError(field as keyof ChangePasswordFormData, {
              type: 'server',
              message,
            });
            hasMappedField = true;
          }
        }
        if (!hasMappedField) {
          setPasswordGeneralError(err.detail || 'Não foi possível alterar a senha.');
        }
      } else {
        setPasswordGeneralError('Ocorreu uma falha inesperada. Tente novamente.');
      }
    }
  };

  return (
    <AppBackground edges={['top', 'left', 'right']}>
      <ScreenHeader
        showBack={true}
        title="Segurança e Senha"
        subtitle="Gerencie suas credenciais de acesso"
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <AppCard variant="default" style={styles.card}>
            <AppText variant="heading3" style={styles.sectionTitle}>
              Alterar Senha de Acesso
            </AppText>
            <AppText variant="body" colorRole="textSecondary" style={styles.sectionDescription}>
              A alteração de senha mantém ativa esta sessão neste dispositivo e revoga
              todas as demais sessões por segurança.
            </AppText>

            {passwordSuccessMessage && (
              <AppBanner
                testID="password-success-banner"
                variant="success"
                message={passwordSuccessMessage}
                style={styles.banner}
              />
            )}

            {passwordGeneralError && (
              <AppBanner
                testID="password-error-banner"
                variant="danger"
                message={passwordGeneralError}
                style={styles.banner}
              />
            )}

            <View style={styles.formGroup}>
              <Controller
                control={control}
                name="currentPassword"
                render={({ field: { onChange, onBlur, value } }) => (
                  <AppInput
                    testID="input-current-password"
                    label="Senha atual"
                    placeholder="Informe sua senha atual"
                    icon="lock"
                    isPassword={true}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.currentPassword?.message}
                    disabled={isSubmitting}
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="password"
                  />
                )}
              />

              <Controller
                control={control}
                name="newPassword"
                render={({ field: { onChange, onBlur, value } }) => (
                  <AppInput
                    testID="input-new-password"
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
                    textContentType="newPassword"
                    helperText="Entre 8 e 128 caracteres. Espaços são preservados."
                  />
                )}
              />

              <Controller
                control={control}
                name="newPasswordConfirmation"
                render={({ field: { onChange, onBlur, value } }) => (
                  <AppInput
                    testID="input-confirm-password"
                    label="Confirmar nova senha"
                    placeholder="Repita a nova senha"
                    icon="lock"
                    isPassword={true}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.newPasswordConfirmation?.message}
                    disabled={isSubmitting}
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="newPassword"
                  />
                )}
              />

              <AppButton
                testID="btn-change-password"
                variant="primary"
                title="Alterar Senha"
                icon="shield"
                loading={isSubmitting}
                disabled={isSubmitting}
                fullWidth={true}
                onPress={handleSubmit(onChangePassword)}
                style={styles.changePasswordButton}
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
    padding: spacing[4],
    gap: spacing[4],
    paddingBottom: spacing[8],
  },
  card: {
    padding: spacing[4],
  },
  sectionTitle: {
    marginBottom: spacing[1],
  },
  sectionDescription: {
    marginBottom: spacing[3],
    lineHeight: 22,
  },
  banner: {
    marginBottom: spacing[3],
  },
  formGroup: {
    gap: spacing[3],
  },
  changePasswordButton: {
    marginTop: spacing[2],
  },
});
