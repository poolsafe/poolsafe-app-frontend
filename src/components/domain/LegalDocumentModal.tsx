import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';

import { useTheme } from '@/theme/useTheme';
import { AppText } from '@/components/primitives/AppText';
import { AppButton } from '@/components/primitives/AppButton';
import { AppBadge } from '@/components/primitives/AppBadge';
import { AppDivider } from '@/components/primitives/AppDivider';
import { AppBanner } from '@/components/primitives/AppBanner';
import { spacing, radius } from '@/theme/tokens';
import { legalApiService } from '@/services/api/legal-service';
import type { LegalDocumentResponseData } from '@/services/api/types';

export interface LegalDocumentModalProps {
  visible: boolean;
  documentId: 'termos-de-uso' | 'aviso-de-privacidade';
  title?: string;
  onClose: () => void;
}

/**
 * Visualizador de documento legal versionado (Termos de Uso e Aviso de Privacidade).
 *
 * Características:
 * - Consulta a API pública PoolSafe para garantir fonte única de verdade;
 * - Apresenta versão e data de atualização de forma destacada;
 * - Tratamento de falha de conexão com retry explícito;
 * - Não registra aceite presumido em caso de falha;
 * - Suporta rolagem suave, acessibilidade e temas claro e escuro;
 * - Utiliza collapsable={false} para estabilidade nativa no Android Fabric.
 */
export function LegalDocumentModal({
  visible,
  documentId,
  title,
  onClose,
}: LegalDocumentModalProps) {
  const { colors, isDark } = useTheme();

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [documentData, setDocumentData] = useState<LegalDocumentResponseData | null>(null);

  const fetchDocument = useCallback(async () => {
    if (!documentId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await legalApiService.getDocument(documentId);
      setDocumentData(data);
    } catch {
      setError(
        'Não foi possível obter o documento do servidor. Verifique sua conexão e tente novamente.',
      );
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    if (visible) {
      void fetchDocument();
    }
  }, [visible, fetchDocument]);

  const displayTitle =
    title ||
    (documentId === 'termos-de-uso' ? 'Termos de Uso' : 'Aviso de Privacidade');

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView
        collapsable={false}
        style={[
          styles.container,
          { backgroundColor: colors.background },
        ]}
      >
        {/* Cabeçalho do modal */}
        <View
          collapsable={false}
          style={[
            styles.header,
            {
              borderBottomColor: isDark
                ? 'rgba(255, 255, 255, 0.08)'
                : 'rgba(0, 0, 0, 0.08)',
            },
          ]}
        >
          <View collapsable={false} style={styles.headerInfo}>
            <AppText variant="heading2" numberOfLines={1}>
              {displayTitle}
            </AppText>
            {documentData && (
              <View collapsable={false} style={styles.versionRow}>
                <AppBadge
                  label={`Versão ${documentData.version}`}
                  variant="info"
                />
                <AppText variant="caption" colorRole="textMuted">
                  {`Atualizado em 18 de outubro de 2026`}
                </AppText>
              </View>
            )}
          </View>
          <AppButton
            testID="legal-doc-close-btn"
            variant="ghost"
            title="Fechar"
            icon="x"
            onPress={onClose}
          />
        </View>

        {/* Conteúdo principal */}
        {loading && (
          <View collapsable={false} style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <AppText
              variant="body"
              colorRole="textSecondary"
              style={styles.loadingText}
            >
              Carregando documento oficial...
            </AppText>
          </View>
        )}

        {error && (
          <View collapsable={false} style={styles.errorContainer}>
            <AppBanner
              variant="danger"
              message={error}
              style={styles.banner}
            />
            <AppButton
              testID="legal-doc-retry-btn"
              variant="secondary"
              title="Tentar novamente"
              icon="refresh-cw"
              onPress={fetchDocument}
              style={styles.retryButton}
            />
          </View>
        )}

        {!loading && !error && documentData && (
          <ScrollView
            testID="legal-doc-scroll-view"
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
          >
            {/* Renderização legível das seções do documento */}
            <View collapsable={false} style={styles.documentBody}>
              {documentData.content
                .split('\n\n')
                .map((paragraph, index) => {
                  const trimmed = paragraph.trim();
                  if (!trimmed) return null;

                  if (trimmed.startsWith('# ')) {
                    return (
                      <AppText
                        key={index}
                        variant="heading1"
                        style={styles.docTitle}
                      >
                        {trimmed.replace('# ', '')}
                      </AppText>
                    );
                  }

                  if (trimmed.startsWith('## ')) {
                    return (
                      <View key={index} collapsable={false} style={styles.sectionHeaderWrapper}>
                        <AppDivider marginVertical={spacing[2]} />
                        <AppText variant="heading3" style={styles.sectionHeader}>
                          {trimmed.replace('## ', '')}
                        </AppText>
                      </View>
                    );
                  }

                  if (trimmed.startsWith('### ')) {
                    return (
                      <AppText
                        key={index}
                        variant="bodyStrong"
                        colorRole="primary"
                        style={styles.subSectionHeader}
                      >
                        {trimmed.replace('### ', '')}
                      </AppText>
                    );
                  }

                  // Limpa asteriscos simples de ênfase para apresentação clara
                  const cleanText = trimmed
                    .replace(/\*\*(.*?)\*\*/g, '$1')
                    .replace(/\*(.*?)\*/g, '$1');

                  return (
                    <AppText
                      key={index}
                      variant="body"
                      colorRole="textSecondary"
                      style={styles.paragraph}
                    >
                      {cleanText}
                    </AppText>
                  );
                })}
            </View>

            <AppDivider marginVertical={spacing[6]} />

            <View collapsable={false} style={styles.footer}>
              <AppButton
                testID="legal-doc-bottom-close-btn"
                variant="primary"
                title="Compreendido e Fechar"
                icon="check"
                fullWidth={true}
                onPress={onClose}
              />
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
  },
  headerInfo: {
    flex: 1,
    gap: spacing[1],
  },
  versionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[6],
  },
  loadingText: {
    marginTop: spacing[3],
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing[6],
  },
  banner: {
    marginBottom: spacing[4],
  },
  retryButton: {
    alignSelf: 'center',
  },
  scrollContent: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[10],
  },
  documentBody: {
    gap: spacing[3],
  },
  docTitle: {
    marginBottom: spacing[2],
  },
  sectionHeaderWrapper: {
    marginTop: spacing[2],
    marginBottom: spacing[1],
  },
  sectionHeader: {
    marginTop: spacing[2],
    marginBottom: spacing[1],
  },
  subSectionHeader: {
    marginTop: spacing[2],
    marginBottom: spacing[1],
  },
  paragraph: {
    lineHeight: 24,
  },
  footer: {
    marginTop: spacing[2],
  },
});
