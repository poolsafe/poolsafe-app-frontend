import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Modal, Pressable } from 'react-native';
import { useRouter } from 'expo-router';

import { AppBackground } from '@/components/layout/AppBackground';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { AppCard } from '@/components/primitives/AppCard';
import { AppText } from '@/components/primitives/AppText';
import { AppButton } from '@/components/primitives/AppButton';
import { AppBadge } from '@/components/primitives/AppBadge';
import { AppDivider } from '@/components/primitives/AppDivider';
import { spacing, radius } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { useAuth } from '@/providers/AuthContext';

export default function SettingsScreen() {
  const router = useRouter();
  const { themeMode, setThemeMode, isDark, colors } = useTheme();
  const { user, logout } = useAuth();

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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
        subtitle="Configurações e informações"
        showThemeToggle={true}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Card do Usuário Autenticado */}
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

          <AppButton
            testID="settings-logout-button"
            variant="danger"
            title="Sair da Conta"
            icon="log-out"
            fullWidth={true}
            onPress={() => setShowLogoutConfirm(true)}
          />
        </AppCard>

        {/* Card de Aparência e Tema */}
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
    gap: spacing[4],
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
  sectionDescription: {
    marginBottom: spacing[3],
    lineHeight: 22,
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
