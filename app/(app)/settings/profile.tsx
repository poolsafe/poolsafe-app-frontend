import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
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
import { AppCheckbox } from '@/components/primitives/AppCheckbox';
import { LegalDocumentModal } from '@/components/domain/LegalDocumentModal';
import { spacing } from '@/theme/tokens';
import { useAuth } from '@/providers/AuthContext';
import { authService } from '@/services/auth/auth-service';
import { ApiError } from '@/services/api/errors';
import { formatPhoneInput, normalizePhoneToE164 } from '@/utils/phone';
import {
  updateProfileSchema,
  type UpdateProfileFormData,
} from '@/schemas/account';

function formatDateTime(isoString?: string | null): string {
  if (!isoString) return 'Não registrado';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

export default function ProfileSettingsScreen() {
  const { user, tokens, updateUser, updateTokens } = useAuth();

  const [profileSuccessMessage, setProfileSuccessMessage] = useState<string | null>(null);
  const [profileGeneralError, setProfileGeneralError] = useState<string | null>(null);
  const [isRemovingPhone, setIsRemovingPhone] = useState(false);
  const [isRegisteringManifestations, setIsRegisteringManifestations] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<'termos-de-uso' | 'aviso-de-privacidade' | null>(null);

  const {
    control,
    handleSubmit,
    setError,
    reset,
    watch,
    setValue,
    formState: { isSubmitting, errors, isDirty },
  } = useForm<UpdateProfileFormData>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: user?.name || '',
      phone: user?.phone ? formatPhoneInput(user.phone) : '',
      phoneContactAuthorized: user?.phoneContactAuthorized ?? false,
    },
    mode: 'onBlur',
  });

  const watchedPhone = watch('phone');

  useEffect(() => {
    if (user) {
      reset({
        name: user.name || '',
        phone: user.phone ? formatPhoneInput(user.phone) : '',
        phoneContactAuthorized: user.phoneContactAuthorized ?? false,
      });
    }
  }, [user, reset]);

  const onSaveProfile = async (data: UpdateProfileFormData) => {
    if (!tokens) return;
    setProfileSuccessMessage(null);
    setProfileGeneralError(null);

    const hasPhone = Boolean(data.phone && data.phone.trim().length > 0);
    const payload = {
      name: data.name.trim(),
      phone: hasPhone ? normalizePhoneToE164(data.phone!) : null,
      phoneContactAuthorized: hasPhone ? Boolean(data.phoneContactAuthorized) : false,
    };

    try {
      const updatedUser = await authService.executeWithAuth(
        tokens,
        (accessToken) => authService.updateProfile(accessToken, payload),
        updateTokens,
      );

      updateUser(updatedUser);
      reset({
        name: updatedUser.name,
        phone: updatedUser.phone ? formatPhoneInput(updatedUser.phone) : '',
        phoneContactAuthorized: updatedUser.phoneContactAuthorized ?? false,
      });
      setProfileSuccessMessage('Dados do perfil salvos com sucesso!');
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
          } else if (field === 'phone') {
            setError('phone', { type: 'server', message });
            hasMappedField = true;
          } else if (field === 'phoneContactAuthorized') {
            setError('phoneContactAuthorized', { type: 'server', message });
            hasMappedField = true;
          }
        }
        if (!hasMappedField) {
          setProfileGeneralError(err.detail || 'Não foi possível atualizar o perfil.');
        }
      } else {
        setProfileGeneralError('Ocorreu uma falha inesperada. Tente novamente.');
      }
    }
  };

  const handleRemovePhone = () => {
    Alert.alert(
      'Remover telefone',
      'Deseja remover o telefone e revogar a autorização de contato complementar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            if (!tokens) return;
            setProfileSuccessMessage(null);
            setProfileGeneralError(null);
            setIsRemovingPhone(true);

            try {
              const updatedUser = await authService.executeWithAuth(
                tokens,
                (accessToken) =>
                  authService.updateProfile(accessToken, {
                    phone: null,
                    phoneContactAuthorized: false,
                  }),
                updateTokens,
              );

              updateUser(updatedUser);
              setValue('phone', '', { shouldDirty: false });
              setValue('phoneContactAuthorized', false, { shouldDirty: false });
              reset({
                name: updatedUser.name,
                phone: '',
                phoneContactAuthorized: false,
              });
              setProfileSuccessMessage('Telefone de contato removido e autorização revogada com sucesso.');
            } catch (err: unknown) {
              if (err instanceof ApiError) {
                setProfileGeneralError(err.detail || 'Não foi possível remover o telefone.');
              } else {
                setProfileGeneralError('Ocorreu uma falha inesperada ao remover o telefone.');
              }
            } finally {
              setIsRemovingPhone(false);
            }
          },
        },
      ],
    );
  };

  const handleRegisterManifestations = async () => {
    if (!tokens) return;
    setProfileSuccessMessage(null);
    setProfileGeneralError(null);
    setIsRegisteringManifestations(true);

    try {
      const updatedUser = await authService.executeWithAuth(
        tokens,
        (accessToken) =>
          authService.registerManifestations(accessToken, {
            termsAccepted: true,
            termsVersion: '1.0',
            privacyAware: true,
            privacyVersion: '1.0',
          }),
        updateTokens,
      );

      updateUser(updatedUser);
      setProfileSuccessMessage('Aceite dos Termos e ciência do Aviso de Privacidade registrados com sucesso!');
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setProfileGeneralError(err.detail || 'Não foi possível registrar as manifestações legais.');
      } else {
        setProfileGeneralError('Ocorreu uma falha inesperada ao registrar as manifestações.');
      }
    } finally {
      setIsRegisteringManifestations(false);
    }
  };

  const termsPending = !user?.termsAcceptedAt;
  const privacyPending = !user?.privacyAwareAt;
  const hasPendingManifestations = termsPending || privacyPending;

  return (
    <AppBackground edges={['top', 'left', 'right']}>
      <ScreenHeader
        showBack={true}
        title="Perfil da Conta"
        subtitle="Dados pessoais, telefone e manifestações legais"
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
          {/* Identificação e Telefone */}
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
                    disabled={isSubmitting || isRemovingPhone}
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

              <AppDivider marginVertical={spacing[2]} />

              <AppText variant="smallStrong" colorRole="primary" style={styles.sectionSubtitle}>
                Telefone de Contato (Opcional)
              </AppText>

              <Controller
                control={control}
                name="phone"
                render={({ field: { onChange, onBlur, value } }) => (
                  <AppInput
                    testID="input-profile-phone"
                    label="Telefone com DDD"
                    placeholder="(11) 98765-4321"
                    icon="phone"
                    keyboardType="phone-pad"
                    value={value || ''}
                    onChangeText={(text) => onChange(formatPhoneInput(text))}
                    onBlur={onBlur}
                    error={errors.phone?.message}
                    disabled={isSubmitting || isRemovingPhone}
                    helperText="Opcional. Utilizado exclusivamente para contato complementar da equipe sobre suporte, avisos operacionais e orientações relativas ao protótipo."
                  />
                )}
              />

              <Controller
                control={control}
                name="phoneContactAuthorized"
                render={({ field: { onChange, value } }) => (
                  <AppCheckbox
                    testID="checkbox-profile-phone-authorized"
                    checked={Boolean(value)}
                    onValueChange={onChange}
                    disabled={isSubmitting || isRemovingPhone}
                    badgeText="Opcional"
                    badgeVariant="info"
                    label="Autorizo o contato complementar da equipe do PoolSafe pelo telefone informado."
                    error={errors.phoneContactAuthorized?.message}
                  />
                )}
              />

              {Boolean(user?.phone) && (
                <View style={styles.phoneActions}>
                  <AppButton
                    testID="btn-remove-phone"
                    variant="ghost"
                    title="Remover Telefone de Contato"
                    icon="trash-2"
                    loading={isRemovingPhone}
                    disabled={isSubmitting || isRemovingPhone}
                    onPress={handleRemovePhone}
                  />
                </View>
              )}

              <AppButton
                testID="btn-save-profile"
                variant="primary"
                title="Salvar Alterações"
                icon="check"
                loading={isSubmitting}
                disabled={isSubmitting || !isDirty || isRemovingPhone}
                onPress={handleSubmit(onSaveProfile)}
                style={styles.saveButton}
              />
            </View>
          </AppCard>

          {/* Manifestações Legais */}
          <AppCard variant="glass" style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.userInfo}>
                <AppText variant="heading3">
                  Manifestações Legais
                </AppText>
                <AppText variant="small" colorRole="textSecondary">
                  Registro de conformidade com Termos de Uso e Privacidade
                </AppText>
              </View>
              <AppBadge
                label={hasPendingManifestations ? 'Pendente' : 'Conforme'}
                variant={hasPendingManifestations ? 'warning' : 'success'}
                icon={hasPendingManifestations ? 'alert-circle' : 'shield'}
              />
            </View>

            <AppDivider marginVertical={spacing[3]} />

            {/* Termos de Uso */}
            <View style={styles.legalItem}>
              <View style={styles.legalItemHeader}>
                <View style={styles.legalItemText}>
                  <AppText variant="smallStrong">Termos de Uso</AppText>
                  <AppText variant="caption" colorRole="textSecondary">
                    Versão: {user?.termsVersion || '1.0'}
                  </AppText>
                  <AppText variant="caption" colorRole={user?.termsAcceptedAt ? 'textSecondary' : 'warning'}>
                    {user?.termsAcceptedAt
                      ? `Aceito em: ${formatDateTime(user.termsAcceptedAt)}`
                      : 'Pendente de manifestação'}
                  </AppText>
                </View>
                <AppButton
                  testID="btn-view-terms"
                  variant="ghost"
                  title="Ler"
                  icon="file-text"
                  onPress={() => setSelectedDoc('termos-de-uso')}
                />
              </View>
            </View>

            <AppDivider marginVertical={spacing[2]} />

            {/* Aviso de Privacidade */}
            <View style={styles.legalItem}>
              <View style={styles.legalItemHeader}>
                <View style={styles.legalItemText}>
                  <AppText variant="smallStrong">Aviso de Privacidade</AppText>
                  <AppText variant="caption" colorRole="textSecondary">
                    Versão: {user?.privacyVersion || '1.0'}
                  </AppText>
                  <AppText variant="caption" colorRole={user?.privacyAwareAt ? 'textSecondary' : 'warning'}>
                    {user?.privacyAwareAt
                      ? `Ciente em: ${formatDateTime(user.privacyAwareAt)}`
                      : 'Pendente de manifestação'}
                  </AppText>
                </View>
                <AppButton
                  testID="btn-view-privacy"
                  variant="ghost"
                  title="Ler"
                  icon="file-text"
                  onPress={() => setSelectedDoc('aviso-de-privacidade')}
                />
              </View>
            </View>

            <AppDivider marginVertical={spacing[2]} />

            {/* Autorização de Telefone */}
            <View style={styles.legalItem}>
              <View style={styles.legalItemHeader}>
                <View style={styles.legalItemText}>
                  <AppText variant="smallStrong">Contato Telefônico</AppText>
                  <AppText variant="caption" colorRole="textSecondary">
                    Finalidade: Avisos operacionais e suporte ao protótipo
                  </AppText>
                  <AppText variant="caption" colorRole="textSecondary">
                    {user?.phoneContactAuthorized
                      ? `Autorizado em: ${formatDateTime(user.phoneContactGrantedAt)} (v${user.phoneContactVersion || '1.0'})`
                      : user?.phoneContactRevokedAt
                        ? `Revogado em: ${formatDateTime(user.phoneContactRevokedAt)}`
                        : 'Não concedido'}
                  </AppText>
                </View>
                <AppBadge
                  label={user?.phoneContactAuthorized ? 'Autorizado' : 'Inativo'}
                  variant={user?.phoneContactAuthorized ? 'success' : 'offline'}
                />
              </View>
            </View>

            {hasPendingManifestations && (
              <>
                <AppDivider marginVertical={spacing[3]} />
                <AppBanner
                  variant="warning"
                  message="Sua conta foi criada antes da vigência dos termos atuais ou está com manifestações pendentes."
                  style={styles.banner}
                />
                <AppButton
                  testID="btn-register-pending-manifestations"
                  variant="primary"
                  title="Registrar Aceite e Ciência dos Documentos"
                  icon="check-circle"
                  loading={isRegisteringManifestations}
                  disabled={isRegisteringManifestations}
                  onPress={handleRegisterManifestations}
                  style={styles.manifestationButton}
                />
              </>
            )}
          </AppCard>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal de Leitura dos Documentos */}
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
    marginBottom: spacing[2],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  banner: {
    marginBottom: spacing[3],
  },
  formGroup: {
    gap: spacing[3],
  },
  phoneActions: {
    alignItems: 'flex-start',
    marginTop: -spacing[1],
  },
  saveButton: {
    alignSelf: 'flex-end',
    marginTop: spacing[1],
  },
  legalItem: {
    paddingVertical: spacing[1],
  },
  legalItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing[2],
  },
  legalItemText: {
    flex: 1,
    gap: 2,
  },
  manifestationButton: {
    marginTop: spacing[2],
  },
});
