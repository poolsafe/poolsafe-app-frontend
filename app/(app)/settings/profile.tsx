import React, { useState, useEffect } from 'react';
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
import { AppBadge } from '@/components/primitives/AppBadge';
import { AppBanner } from '@/components/primitives/AppBanner';
import { AppDivider } from '@/components/primitives/AppDivider';
import { spacing } from '@/theme/tokens';
import { useAuth } from '@/providers/AuthContext';
import { authService } from '@/services/auth/auth-service';
import { ApiError } from '@/services/api/errors';
import {
  updateProfileSchema,
  type UpdateProfileFormData,
} from '@/schemas/account';

export default function ProfileSettingsScreen() {
  const { user, tokens, updateUser, updateTokens } = useAuth();

  const [profileSuccessMessage, setProfileSuccessMessage] = useState<string | null>(null);
  const [profileGeneralError, setProfileGeneralError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setError,
    reset,
    formState: { isSubmitting, errors, isDirty },
  } = useForm<UpdateProfileFormData>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: user?.name || '',
    },
    mode: 'onBlur',
  });

  useEffect(() => {
    if (user?.name) {
      reset({ name: user.name });
    }
  }, [user?.name, reset]);

  const onSaveProfile = async (data: UpdateProfileFormData) => {
    if (!tokens) return;
    setProfileSuccessMessage(null);
    setProfileGeneralError(null);

    try {
      const updatedUser = await authService.executeWithAuth(
        tokens,
        (accessToken) =>
          authService.updateProfile(accessToken, {
            name: data.name.trim(),
          }),
        updateTokens,
      );

      updateUser(updatedUser);
      reset({ name: updatedUser.name });
      setProfileSuccessMessage('Nome atualizado com sucesso!');
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.isRateLimited()) {
          setProfileGeneralError('Muitas requisições em sequência. Aguarde alguns instantes.');
          return;
        }
        if (err.isNetworkError || err.isTimeout) {
          setProfileGeneralError('Falha ao conectar com o servidor. Verifique sua conexão.');
          return;
        }

        const fieldErrors = err.getFieldErrors();
        let hasMappedField = false;
        for (const [field, message] of Object.entries(fieldErrors)) {
          if (field === 'name') {
            setError('name', { type: 'server', message });
            hasMappedField = true;
          }
        }
        if (!hasMappedField) {
          setProfileGeneralError(err.detail || 'Não foi possível atualizar o nome.');
        }
      } else {
        setProfileGeneralError('Ocorreu uma falha inesperada. Tente novamente.');
      }
    }
  };

  return (
    <AppBackground edges={['top', 'left', 'right']}>
      <ScreenHeader
        showBack={true}
        title="Perfil da Conta"
        subtitle="Dados pessoais e e-mail de acesso"
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
          <AppCard variant="glass" style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.userInfo}>
                <AppText variant="heading3" style={styles.userName}>
                  {user?.name || 'Responsável PoolSafe'}
                </AppText>
                <AppText variant="small" colorRole="textSecondary">
                  {user?.email || 'Sessão ativa'}
                </AppText>
              </View>
              <AppBadge label="Ativo" variant="success" icon="check-circle" />
            </View>

            <AppDivider marginVertical={spacing[3]} />

            <AppText variant="smallStrong" colorRole="primary" style={styles.sectionSubtitle}>
              Identificação do Responsável
            </AppText>

            {profileSuccessMessage && (
              <AppBanner
                testID="profile-success-banner"
                variant="success"
                message={profileSuccessMessage}
                style={styles.banner}
              />
            )}

            {profileGeneralError && (
              <AppBanner
                testID="profile-error-banner"
                variant="danger"
                message={profileGeneralError}
                style={styles.banner}
              />
            )}

            <View style={styles.formGroup}>
              <Controller
                control={control}
                name="name"
                render={({ field: { onChange, onBlur, value } }) => (
                  <AppInput
                    testID="input-profile-name"
                    label="Nome completo"
                    placeholder="Seu nome completo"
                    icon="user"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.name?.message}
                    disabled={isSubmitting}
                    autoCapitalize="words"
                    autoCorrect={false}
                    textContentType="name"
                  />
                )}
              />

              <AppInput
                testID="input-profile-email"
                label="E-mail (apenas leitura)"
                icon="mail"
                value={user?.email || ''}
                editable={false}
                disabled={true}
                helperText="O e-mail é a chave de identidade da conta e não pode ser alterado no aplicativo."
              />

              <AppButton
                testID="btn-save-profile"
                variant="primary"
                title="Salvar Nome"
                icon="check"
                loading={isSubmitting}
                disabled={isSubmitting || !isDirty}
                onPress={handleSubmit(onSaveProfile)}
                style={styles.saveNameButton}
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  userInfo: {
    flex: 1,
    marginRight: spacing[2],
  },
  userName: {
    marginBottom: 2,
  },
  sectionSubtitle: {
    marginBottom: spacing[3],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  banner: {
    marginBottom: spacing[3],
  },
  formGroup: {
    gap: spacing[3],
  },
  saveNameButton: {
    alignSelf: 'flex-end',
    marginTop: spacing[1],
  },
});
