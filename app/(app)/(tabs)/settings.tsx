import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Modal,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';

import { AppBackground } from '@/components/layout/AppBackground';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { AppCard } from '@/components/primitives/AppCard';
import { AppText } from '@/components/primitives/AppText';
import { AppButton } from '@/components/primitives/AppButton';
import { AppIcon, FeatherIconName } from '@/components/primitives/AppIcon';
import { AppBadge } from '@/components/primitives/AppBadge';
import { AppDivider } from '@/components/primitives/AppDivider';
import { spacing, radius } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { useAuth } from '@/providers/AuthContext';
import { useAlertReadiness } from '@/providers/ReadinessContext';

interface SettingsMenuItemProps {
  testID?: string;
  icon: FeatherIconName;
  title: string;
  subtitle: string;
  onPress: () => void;
  showBadgeDot?: boolean;
  isDestructive?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
}

function SettingsMenuItem({
  testID,
  icon,
  title,
  subtitle,
  onPress,
  showBadgeDot = false,
  isDestructive = false,
  isFirst = false,
  isLast = false,
}: SettingsMenuItemProps) {
  const { colors, isDark } = useTheme();

  const radiusStyle = {
    borderTopLeftRadius: isFirst ? radius.large : 0,
    borderTopRightRadius: isFirst ? radius.large : 0,
    borderBottomLeftRadius: isLast ? radius.large : 0,
    borderBottomRightRadius: isLast ? radius.large : 0,
  };

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${subtitle}${showBadgeDot ? ', com pendência' : ''}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuItemPressable,
        radiusStyle,
        pressed && (isDark ? styles.menuItemPressedDark : styles.menuItemPressedLight),
      ]}
    >
      <View style={[styles.menuItemRow, radiusStyle]}>
        {/* Ícone à esquerda */}
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: isDestructive
                ? isDark
                  ? 'rgba(239, 68, 68, 0.14)'
                  : 'rgba(239, 68, 68, 0.10)'
                : isDark
                  ? 'rgba(0, 217, 232, 0.12)'
                  : 'rgba(0, 123, 141, 0.10)',
            },
          ]}
        >
          <AppIcon
            name={icon}
            size={22}
            color={isDestructive ? colors.danger : colors.primary}
            decorative={true}
          />
          {showBadgeDot && (
            <View
              testID="readiness-item-badge-dot"
              style={[
                styles.iconBadgeDot,
                {
                  backgroundColor: colors.danger,
                  borderColor: isDark ? '#051726' : '#FFFFFF',
                },
              ]}
            />
          )}
        </View>

        {/* Textos no centro */}
        <View style={styles.menuTextContainer}>
          <View style={styles.titleRow}>
            <AppText
              variant="heading3"
              style={[
                styles.menuTitle,
                isDestructive && { color: colors.danger },
              ]}
            >
              {title}
            </AppText>
            {showBadgeDot && (
              <View style={styles.badgeRow}>
                <View
                  style={[
                    styles.textBadgeDot,
                    { backgroundColor: colors.danger },
                  ]}
                />
                <AppText
                  variant="caption"
                  style={[styles.badgeText, { color: colors.danger }]}
                >
                  Pendente
                </AppText>
              </View>
            )}
          </View>
          <AppText
            variant="small"
            colorRole="textSecondary"
            numberOfLines={1}
            style={styles.menuSubtitle}
          >
            {subtitle}
          </AppText>
        </View>

        {/* Chevron indicativo à direita */}
        <AppIcon
          name="chevron-right"
          size={20}
          color={colors.textMuted}
          decorative={true}
        />
      </View>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, isDark, themeMode } = useTheme();
  const { user, logout } = useAuth();
  const { hasPendingReadiness } = useAlertReadiness();

  // Modal de logout
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      setShowLogoutConfirm(false);
      router.replace('/(public)/login');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const getThemeSubtitle = () => {
    if (themeMode === 'dark') return 'Escuro (Deep Ocean)';
    if (themeMode === 'light') return 'Claro (Versão White)';
    return `Automático do Sistema (${isDark ? 'Escuro' : 'Claro'})`;
  };

  return (
    <AppBackground edges={['top', 'left', 'right']}>
      <ScreenHeader
        title="Definições"
        subtitle="Configurações e informações do sistema"
        showThemeToggle={false}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Card Resumo do Usuário (topo da tela) */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Perfil de ${user?.name || 'Responsável'}. Toque para gerenciar perfil.`}
          onPress={() => router.push('/(app)/settings/profile')}
          style={({ pressed }) => [
            styles.profileCardWrapper,
            pressed && styles.pressedScale,
          ]}
        >
          <AppCard variant="glass" style={styles.profileCard}>
            <View style={styles.profileRow}>
              <View
                style={[
                  styles.avatarPod,
                  {
                    backgroundColor: isDark
                      ? 'rgba(0, 217, 232, 0.16)'
                      : 'rgba(0, 123, 141, 0.12)',
                    borderColor: isDark
                      ? 'rgba(0, 217, 232, 0.35)'
                      : 'rgba(0, 123, 141, 0.25)',
                  },
                ]}
              >
                <AppIcon name="user" size={26} color={colors.primary} decorative={true} />
              </View>

              <View style={styles.profileInfo}>
                <AppText variant="heading3" numberOfLines={1} style={styles.profileName}>
                  {user?.name || 'Responsável PoolSafe'}
                </AppText>
                <AppText variant="small" colorRole="textSecondary" numberOfLines={1}>
                  {user?.email || 'Sessão ativa'}
                </AppText>
              </View>

              <AppBadge label="Ativo" variant="success" icon="check-circle" />
            </View>
          </AppCard>
        </Pressable>

        <AppDivider marginVertical={spacing[1]} />

        {/* Lista de Opções (Estilo Lista de Ajustes / WhatsApp) */}
        <AppCard variant="default" style={styles.menuContainerCard}>
          <SettingsMenuItem
            testID="settings-item-profile"
            icon="user-check"
            title="Perfil da Conta"
            subtitle="Nome completo e e-mail cadastrado"
            isFirst={true}
            onPress={() => router.push('/(app)/settings/profile')}
          />

          <View style={[styles.itemSeparator, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

          <SettingsMenuItem
            testID="settings-item-security"
            icon="shield"
            title="Segurança e Senha"
            subtitle="Alterar senha de acesso e sessões ativas"
            onPress={() => router.push('/(app)/settings/security')}
          />

          <View style={[styles.itemSeparator, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

          <SettingsMenuItem
            testID="settings-item-readiness"
            icon="bell"
            title="Prontidão de Alertas"
            subtitle="Diagnóstico do Android e alarmes críticos"
            showBadgeDot={hasPendingReadiness}
            onPress={() => router.push('/(app)/settings/readiness')}
          />

          <View style={[styles.itemSeparator, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

          <SettingsMenuItem
            testID="settings-item-appearance"
            icon="moon"
            title="Aparência"
            subtitle={getThemeSubtitle()}
            onPress={() => router.push('/(app)/settings/appearance')}
          />

          <View style={[styles.itemSeparator, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

          <SettingsMenuItem
            testID="settings-item-about"
            icon="info"
            title="Sobre e Termos Legais"
            subtitle="Termos de Uso, Privacidade e informações do projeto"
            isLast={true}
            onPress={() => router.push('/(app)/settings/about' as any)}
          />
        </AppCard>

        {/* Card com Ações de Sessão */}
        <AppCard variant="default" style={styles.menuContainerCard}>
          <SettingsMenuItem
            testID="settings-item-logout"
            icon="log-out"
            title="Sair da Conta"
            subtitle="Encerrar sessão neste aparelho"
            isDestructive={true}
            isFirst={true}
            isLast={!__DEV__}
            onPress={() => setShowLogoutConfirm(true)}
          />

          {__DEV__ && (
            <>
              <View style={[styles.itemSeparator, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />
              <SettingsMenuItem
                testID="settings-item-dev"
                icon="terminal"
                title="Ferramentas de Desenvolvimento"
                subtitle="Retornar ao Gateway Dev"
                isLast={true}
                onPress={() => {
                  if (router.canDismiss()) {
                    router.dismissAll();
                  } else {
                    router.navigate('/');
                  }
                }}
              />
            </>
          )}
        </AppCard>
      </ScrollView>

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
  scrollContent: {
    padding: spacing[4],
    gap: spacing[3],
    paddingBottom: spacing[8],
  },
  profileCardWrapper: {
    borderRadius: radius.large,
  },
  pressedScale: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  profileCard: {
    padding: spacing[4],
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  avatarPod: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    marginBottom: 2,
  },
  menuContainerCard: {
    padding: 0,
    borderRadius: radius.large,
    // Sem overflow: 'hidden' para evitar que o Fabric crie ReactClippingViewGroup
    // suscetível a erros de addViewAt durante transições de retorno (back) no Android
  },
  menuItemPressable: {
    width: '100%',
  },
  menuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3] + 2,
    paddingHorizontal: spacing[4],
    gap: spacing[3],
    width: '100%',
  },
  menuItemPressedDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  menuItemPressedLight: {
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconBadgeDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    zIndex: 5,
  },
  menuTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  menuTitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  textBadgeDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  menuSubtitle: {
    marginTop: 2,
    lineHeight: 18,
  },
  itemSeparator: {
    height: 1,
    marginLeft: spacing[4] + 40 + spacing[3], // 16 + 40 + 12 = 68dp, alinhado ao texto
    marginRight: spacing[4],
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
