import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
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
import { registerSchema, RegisterFormData } from '@/schemas/auth';
import { useAuth } from '@/providers/AuthContext';
import { ApiError } from '@/services/api/errors';

export default function RegisterScreen() {
  const router = useRouter();
  const { register: registerAccount } = useAuth();
  const [generalError, setGeneralError] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      },
    );

    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      },
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);


  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 250);
  };

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      passwordConfirmation: '',
    },
    mode: 'onBlur',
  });

  const onSubmit = async (data: RegisterFormData) => {
    setGeneralError(null);
    try {
      // passwordConfirmation NÃO é enviado à API
      await registerAccount({
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        password: data.password, // preserva rigorosamente todos os caracteres da senha
      });

      // Transição atômica para a área autenticada após persistência da sessão
      router.replace('/(app)/(tabs)');
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.isAccountCannotBeCreated()) {
          // Mensagem não enumerável por requisito de segurança (não revela se e-mail já existe)
          setGeneralError(
            'Não foi possível concluir o cadastro com os dados informados. Verifique as informações ou acerte seu acesso.',
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
          setGeneralError('Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.');
          return;
        }

        // Mapeia erros de validação RFC 9457 para os campos
        const fieldErrors = err.getFieldErrors();
        let hasMappedField = false;

        for (const [field, message] of Object.entries(fieldErrors)) {
          if (field === 'name' || field === 'email' || field === 'password') {
            setError(field as keyof RegisterFormData, { type: 'server', message });
            hasMappedField = true;
          }
        }

        if (!hasMappedField) {
          setGeneralError(err.detail || 'Ocorreu um erro ao criar a conta. Tente novamente.');
        }
      } else {
        setGeneralError('Ocorreu uma falha inesperada. Tente novamente em instantes.');
      }
    }
  };

  return (
    <AppBackground edges={['top', 'bottom', 'left', 'right']}>
      <ScreenHeader
        title="Cadastro"
        subtitle="Nova conta de responsável"
        showBack={true}
        onBack={() => router.back()}
        showThemeToggle={true}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: keyboardHeight > 0 ? keyboardHeight + spacing[6] : spacing[10] },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <AppCard variant="glass" style={styles.card}>
            <AppText variant="heading2" style={styles.title}>
              Criar Conta
            </AppText>

            <AppText variant="body" colorRole="textSecondary" style={styles.subtitle}>
              Cadastre-se para monitorar áreas de piscina e receber alertas em tempo real.
            </AppText>

            {generalError && (
              <AppBanner
                testID="register-error-banner"
                variant="danger"
                message={generalError}
                style={styles.banner}
              />
            )}

            <View style={styles.form}>
              <Controller
                control={control}
                name="name"
                render={({ field: { onChange, onBlur, value } }) => (
                  <AppInput
                    testID="register-input-name"
                    label="Nome completo"
                    placeholder="Seu nome de responsável"
                    icon="user"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.name?.message}
                    disabled={isSubmitting}
                    autoCapitalize="words"
                    autoCorrect={false}
                    autoComplete="name"
                    textContentType="name"
                  />
                )}
              />

              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <AppInput
                    testID="register-input-email"
                    label="E-mail"
                    placeholder="seu.email@exemplo.com"
                    icon="mail"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.email?.message}
                    disabled={isSubmitting}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    textContentType="emailAddress"
                  />
                )}
              />

              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <AppInput
                    testID="register-input-password"
                    label="Senha"
                    placeholder="Mínimo de 8 caracteres"
                    icon="lock"
                    isPassword={true}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.password?.message}
                    helperText="Entre 8 e 128 caracteres."
                    disabled={isSubmitting}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="new-password"
                    textContentType="newPassword"
                  />
                )}
              />

              <Controller
                control={control}
                name="passwordConfirmation"
                render={({ field: { onChange, onBlur, value } }) => (
                  <AppInput
                    testID="register-input-password-confirmation"
                    label="Confirmação de Senha"
                    placeholder="Repita a senha exatamente"
                    icon="check"
                    isPassword={true}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    onFocus={scrollToBottom}
                    error={errors.passwordConfirmation?.message}
                    disabled={isSubmitting}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="new-password"
                    textContentType="newPassword"
                  />
                )}
              />

              <View style={styles.actionContainer}>
                <AppButton
                  testID="register-submit-button"
                  variant="primary"
                  title="Cadastrar"
                  icon="user-plus"
                  fullWidth={true}
                  loading={isSubmitting}
                  disabled={isSubmitting}
                  onPress={handleSubmit(onSubmit)}
                />
              </View>
            </View>

            <AppDivider marginVertical={spacing[4]} />

            <View style={styles.loginContainer}>
              <AppText variant="small" colorRole="textMuted" style={styles.loginPrompt}>
                Já possui uma conta?
              </AppText>
              <AppButton
                testID="register-go-to-login"
                variant="secondary"
                title="Ir para o Login"
                icon="log-in"
                fullWidth={true}
                disabled={isSubmitting}
                onPress={() => router.back()}
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
    flexGrow: 1,
    padding: spacing[4],
    paddingBottom: spacing[12],
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
  loginContainer: {
    alignItems: 'center',
    gap: spacing[2],
  },
  loginPrompt: {
    textAlign: 'center',
  },
});
