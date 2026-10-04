import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Modal,
  Pressable,
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
import { AppBadge } from '@/components/primitives/AppBadge';
import { AppBanner } from '@/components/primitives/AppBanner';
import { AppDivider } from '@/components/primitives/AppDivider';
import { AlertReadinessSection } from '@/components/domain/AlertReadinessSection';
import { spacing, radius } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { useAuth } from '@/providers/AuthContext';
import { authService } from '@/services/auth/auth-service';
import { ApiError } from '@/services/api/errors';
import {
  updateProfileSchema,
  changePasswordSchema,
  UpdateProfileFormData,
  ChangePasswordFormData,
} from '@/schemas/account';

export default function SettingsScreen() {
  const router = useRouter();
  const { themeMode, setThemeMode, isDark, colors } = useTheme();
  const { user, tokens, logout, updateUser, updateTokens } = useAuth();

  // Estados de feedback do Perfil
  const [profileSuccessMessage, setProfileSuccessMessage] = useState<string | null>(null);
  const [profileGeneralError, setProfileGeneralError] = useState<string | null>(null);

  // Estados de feedback da Alteração de Senha
  const [passwordSuccessMessage, setPasswordSuccessMessage] = useState<string | null>(null);
  const [passwordGeneralError, setPasswordGeneralError] = useState<string | null>(null);

  // Modal de logout
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Formulário de Perfil (somente Nome)
  const {
    control: profileControl,
    handleSubmit: handleProfileSubmit,
    setError: setProfileError,
    reset: resetProfileForm,
    formState: { isSubmitting: isSubmittingProfile, errors: profileErrors, isDirty: isProfileDirty },
  } = useForm<UpdateProfileFormData>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: user?.name || '',
    },
    mode: 'onBlur',
  });

  // Sincroniza formulário com usuário quando carregado
  useEffect(() => {
    if (user?.name) {
      resetProfileForm({ name: user.name });
    }
  }, [user?.name, resetProfileForm]);

  // Formulário de Alteração de Senha
  const {
    control: passwordControl,
    handleSubmit: handlePasswordSubmit,
    setError: setPasswordError,
    reset: resetPasswordForm,
    formState: { isSubmitting: isSubmittingPassword, errors: passwordErrors },
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      newPasswordConfirmation: '',
    },
    mode: 'onBlur',
  });

  // Submissão de atualização do Nome
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

      // Atualiza imediatamente os dados exibidos no aplicativo
      updateUser(updatedUser);
      resetProfileForm({ name: updatedUser.name });
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
            setProfileError('name', { type: 'server', message });
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

  // Submissão de alteração de Senha
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

      // Preserva a sessão atual e limpa os campos
      resetPasswordForm();
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
            setPasswordError(field as keyof ChangePasswordFormData, {
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

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      setShowLogoutConfirm(false);
      // Impede retorno à área autenticada pelo botão Voltar
      router.replace('/(public)/login');
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <AppBackground edges={['top', 'left', 'right']}>
      <ScreenHeader
        title="Definições"
        subtitle="Configurações e informações da conta"
        showThemeToggle={true}
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
          {/* Card 1: Perfil da Conta */}
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
              Dados da Conta
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
              {/* Nome do Usuário (editável) */}
              <Controller
                control={profileControl}
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
                    error={profileErrors.name?.message}
                    disabled={isSubmittingProfile}
                    autoCapitalize="words"
                    autoCorrect={false}
                    textContentType="name"
                  />
                )}
              />

              {/* E-mail (somente leitura no MVP) */}
              <AppInput
                testID="input-profile-email"
                label="E-mail (apenas leitura)"
                icon="mail"
                value={user?.email || ''}
                editable={false}
                disabled={true}
                helperText="O e-mail é a chave de identidade da conta e não pode ser alterado no MVP."
              />

              <AppButton
                testID="btn-save-profile"
                variant="primary"
                title="Salvar Nome"
                icon="check"
                loading={isSubmittingProfile}
                disabled={isSubmittingProfile || !isProfileDirty}
                onPress={handleProfileSubmit(onSaveProfile)}
                style={styles.saveNameButton}
              />
            </View>
          </AppCard>

          {/* Card 2: Segurança e Senha */}
          <AppCard variant="default" style={styles.card}>
            <AppText variant="heading3" style={styles.sectionTitle}>
              Segurança e Senha
            </AppText>
            <AppText variant="body" colorRole="textSecondary" style={styles.sectionDescription}>
              Altere sua senha de acesso. A alteração mantém ativa esta sessão e revoga todas as
              demais sessões registradas.
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
              {/* Senha Atual */}
              <Controller
                control={passwordControl}
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
                    error={passwordErrors.currentPassword?.message}
                    disabled={isSubmittingPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="password"
                  />
                )}
              />

              {/* Nova Senha */}
              <Controller
                control={passwordControl}
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
                    error={passwordErrors.newPassword?.message}
                    disabled={isSubmittingPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="newPassword"
                    helperText="Entre 8 e 128 caracteres. Espaços são preservados."
                  />
                )}
              />

              {/* Confirmação da Nova Senha */}
              <Controller
                control={passwordControl}
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
                    error={passwordErrors.newPasswordConfirmation?.message}
                    disabled={isSubmittingPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="newPassword"
                  />
                )}
              />

              <AppButton
                testID="btn-change-password"
                variant="secondary"
                title="Alterar Senha"
                icon="shield"
                loading={isSubmittingPassword}
                disabled={isSubmittingPassword}
                fullWidth={true}
                onPress={handlePasswordSubmit(onChangePassword)}
                style={styles.changePasswordButton}
              />
            </View>
          </AppCard>

          {/* Card 3: Notificações e Prontidão Android (Fatia 8A) */}
          <AlertReadinessSection />

          {/* Card 4: Sessão e Saída */}
          <AppCard variant="raised" style={styles.card}>
            <AppText variant="heading3" style={styles.sectionTitle}>
              Sessão
            </AppText>
            <AppText variant="body" colorRole="textSecondary" style={styles.sectionDescription}>
              Encerre a sessão ativa neste dispositivo a qualquer momento.
            </AppText>

            <AppButton
              testID="settings-logout-button"
              variant="danger"
              title="Sair da Conta"
              icon="log-out"
              fullWidth={true}
              onPress={() => setShowLogoutConfirm(true)}
            />
          </AppCard>

          {/* Card 4: Aparência e Tema */}
          <AppCard variant="default" style={styles.card}>
            <AppText variant="heading3" style={styles.sectionTitle}>
              Aparência
            </AppText>
            <AppText variant="body" colorRole="textSecondary" style={styles.sectionDescription}>
              Personalize o tema visual de acordo com o ambiente.
            </AppText>

            <View style={styles.themeGroup}>
              <AppButton
                variant={themeMode === 'dark' ? 'primary' : 'secondary'}
                title="Tema Escuro (Deep Ocean)"
                icon="moon"
                onPress={() => setThemeMode('dark')}
              />
              <AppButton
                variant={themeMode === 'light' ? 'primary' : 'secondary'}
                title="Tema Claro (Versão White)"
                icon="sun"
                onPress={() => setThemeMode('light')}
              />
              <AppButton
                variant={themeMode === 'system' ? 'primary' : 'secondary'}
                title={`Automático do Sistema (${isDark ? 'Escuro' : 'Claro'})`}
                icon="smartphone"
                onPress={() => setThemeMode('system')}
              />
            </View>
          </AppCard>

          {/* Modo Dev (apenas em desenvolvimento) */}
          {__DEV__ && (
            <AppCard variant="raised" style={styles.card}>
              <AppText variant="smallStrong" colorRole="primary" style={styles.devTitle}>
                Ferramentas de Desenvolvimento
              </AppText>
              <AppButton
                variant="ghost"
                title="Voltar ao Gateway Dev"
                icon="corner-up-left"
                onPress={() => {
                  if (router.canDismiss()) {
                    router.dismissAll();
                  } else {
                    router.navigate('/');
                  }
                }}
              />
            </AppCard>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal de Confirmação de Logout — Seção 14.13 Design System */}
      <Modal
        visible={showLogoutConfirm}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          if (!isLoggingOut) setShowLogoutConfirm(false);
        }}
      >
        <Pressable
          style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}
          onPress={() => {
            if (!isLoggingOut) setShowLogoutConfirm(false);
          }}
        >
          <Pressable
            style={styles.modalContentWrapper}
            onPress={(e) => e.stopPropagation()}
          >
            <AppCard variant="raised" style={styles.modalCard}>
              <AppText variant="heading3" style={styles.modalTitle}>
                Encerrar sessão?
              </AppText>

              <AppText variant="body" colorRole="textSecondary" style={styles.modalDescription}>
                Você precisará informar seu e-mail e senha para acessar o monitoramento novamente.
              </AppText>

              <View style={styles.modalActions}>
                <AppButton
                  testID="settings-logout-cancel"
                  variant="secondary"
                  title="Cancelar"
                  disabled={isLoggingOut}
                  style={styles.modalButton}
                  onPress={() => setShowLogoutConfirm(false)}
                />
                <AppButton
                  testID="settings-logout-confirm"
                  variant="danger"
                  title="Sair"
                  icon="log-out"
                  loading={isLoggingOut}
                  disabled={isLoggingOut}
                  style={styles.modalButton}
                  onPress={handleConfirmLogout}
                />
              </View>
            </AppCard>
          </Pressable>
        </Pressable>
      </Modal>
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
  sectionTitle: {
    marginBottom: spacing[1],
  },
  sectionSubtitle: {
    marginBottom: spacing[3],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  saveNameButton: {
    alignSelf: 'flex-end',
    marginTop: spacing[1],
  },
  changePasswordButton: {
    marginTop: spacing[2],
  },
  themeGroup: {
    gap: spacing[2],
  },
  devTitle: {
    marginBottom: spacing[2],
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  },
  modalContentWrapper: {
    width: '100%',
    maxWidth: 400,
  },
  modalCard: {
    padding: spacing[4],
    borderRadius: radius.large,
  },
  modalTitle: {
    marginBottom: spacing[2],
  },
  modalDescription: {
    marginBottom: spacing[4],
    lineHeight: 22,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing[2],
    justifyContent: 'flex-end',
  },
  modalButton: {
    flex: 1,
  },
});
