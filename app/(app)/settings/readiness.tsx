import React from 'react';
import { StyleSheet, ScrollView } from 'react-native';

import { AppBackground } from '@/components/layout/AppBackground';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { AlertReadinessSection } from '@/components/domain/AlertReadinessSection';
import { useAlertReadiness } from '@/providers/ReadinessContext';
import { spacing } from '@/theme/tokens';

export default function ReadinessSettingsScreen() {
  // publishDiagnosis tem referência estável: evita recriar o refreshDiagnosis da seção
  // a cada render (o que causava consultas nativas e re-renders em cadeia).
  const { publishDiagnosis } = useAlertReadiness();

  return (
    <AppBackground edges={['top', 'left', 'right']}>
      <ScreenHeader
        showBack={true}
        title="Prontidão de Alertas"
        subtitle="Diagnóstico do Android e alarmes críticos"
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <AlertReadinessSection onDiagnosisEvaluated={publishDiagnosis} />
      </ScrollView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: spacing[4],
    paddingBottom: spacing[8],
  },
});
