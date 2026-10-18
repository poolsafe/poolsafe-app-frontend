import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';

import { AppBackground } from '@/components/layout/AppBackground';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { AppCard } from '@/components/primitives/AppCard';
import { AppText } from '@/components/primitives/AppText';
import { AppButton } from '@/components/primitives/AppButton';
import { AppBadge } from '@/components/primitives/AppBadge';
import { AppDivider } from '@/components/primitives/AppDivider';
import { AppIcon } from '@/components/primitives/AppIcon';
import { LegalDocumentModal } from '@/components/domain/LegalDocumentModal';
import { spacing, radius } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export default function AboutScreen() {
  const { colors, isDark } = useTheme();
  const [selectedDoc, setSelectedDoc] = useState<'termos-de-uso' | 'aviso-de-privacidade' | null>(null);

  return (
    <AppBackground edges={['top', 'left', 'right']}>
      <ScreenHeader
        showBack={true}
        title="Sobre o PoolSafe"
        subtitle="Informações do projeto, termos e privacidade"
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Identidade do Projeto */}
        <AppCard variant="glass" style={styles.card}>
          <View style={styles.headerRow}>
            <View
              style={[
                styles.iconPod,
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
              <AppIcon name="shield" size={28} color={colors.primary} decorative={true} />
            </View>

            <View style={styles.headerInfo}>
              <AppText variant="heading3">PoolSafe</AppText>
              <AppText variant="small" colorRole="textSecondary">
                Monitoramento Inteligente de Piscinas
              </AppText>
            </View>

            <AppBadge label="v1.0 Protótipo" variant="info" />
          </View>

          <AppDivider marginVertical={spacing[3]} />

          <AppText variant="body" colorRole="textSecondary" style={styles.description}>
            O PoolSafe é um protótipo acadêmico de Trabalho de Conclusão de Curso (TCC) em Engenharia de Computação,
            desenvolvido para detecção precoce e alerta de incidentes de afogamento em piscinas residenciais
            por meio de visão computacional em borda e conectividade em nuvem.
          </AppText>

          <AppDivider marginVertical={spacing[3]} />

          <View style={styles.infoRow}>
            <AppText variant="caption" colorRole="textMuted">Equipe:</AppText>
            <AppText variant="smallStrong">Cristyan, Daniel, Jonatas</AppText>
          </View>
          <View style={styles.infoRow}>
            <AppText variant="caption" colorRole="textMuted">Contato:</AppText>
            <AppText variant="smallStrong">poolsafeoficial@gmail.com</AppText>
          </View>
        </AppCard>

        {/* Documentos Legais e Políticas */}
        <AppCard variant="default" style={styles.card}>
          <AppText variant="heading3" style={styles.sectionTitle}>
            Documentos e Transparência
          </AppText>
          <AppText variant="small" colorRole="textSecondary" style={styles.sectionSubtitle}>
            Consulte a versão vigente dos documentos legais que regem a utilização do protótipo.
          </AppText>

          <AppDivider marginVertical={spacing[3]} />

          {/* Termos de Uso */}
          <View style={styles.docItem}>
            <View style={styles.docInfo}>
              <View style={styles.docTitleRow}>
                <AppText variant="smallStrong">Termos de Uso</AppText>
                <AppBadge label="v1.0" variant="info" />
              </View>
              <AppText variant="caption" colorRole="textSecondary">
                Última atualização: 18 de outubro de 2026
              </AppText>
              <AppText variant="caption" colorRole="textMuted">
                Regras de utilização do protótipo, limitações de responsabilidade e segurança.
              </AppText>
            </View>

            <AppButton
              testID="btn-about-view-terms"
              variant="secondary"
              title="Ler Documento"
              icon="file-text"
              onPress={() => setSelectedDoc('termos-de-uso')}
              style={styles.docButton}
            />
          </View>

          <AppDivider marginVertical={spacing[3]} />

          {/* Aviso de Privacidade */}
          <View style={styles.docItem}>
            <View style={styles.docInfo}>
              <View style={styles.docTitleRow}>
                <AppText variant="smallStrong">Aviso de Privacidade</AppText>
                <AppBadge label="v1.0" variant="info" />
              </View>
              <AppText variant="caption" colorRole="textSecondary">
                Última atualização: 18 de outubro de 2026
              </AppText>
              <AppText variant="caption" colorRole="textMuted">
                Tratamento de dados pessoais, imagens, retenção e direitos do titular no escopo do projeto.
              </AppText>
            </View>

            <AppButton
              testID="btn-about-view-privacy"
              variant="secondary"
              title="Ler Documento"
              icon="file-text"
              onPress={() => setSelectedDoc('aviso-de-privacidade')}
              style={styles.docButton}
            />
          </View>
        </AppCard>
      </ScrollView>

      {/* Modal de Leitura do Documento */}
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
  scrollContent: {
    padding: spacing[4],
    gap: spacing[4],
    paddingBottom: spacing[8],
  },
  card: {
    padding: spacing[4],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  iconPod: {
    width: 48,
    height: 48,
    borderRadius: radius.medium,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  description: {
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[1],
  },
  sectionTitle: {
    marginBottom: spacing[1],
  },
  sectionSubtitle: {
    lineHeight: 18,
  },
  docItem: {
    gap: spacing[2],
  },
  docInfo: {
    gap: 4,
  },
  docTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  docButton: {
    alignSelf: 'flex-start',
    marginTop: spacing[1],
  },
});
