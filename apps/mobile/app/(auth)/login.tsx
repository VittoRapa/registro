import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { mobileApiClient, MobileApiError } from '../../src/lib/api-client';
import { useMobileAuthStore, MobileUser } from '../../src/lib/auth-store';

interface LoginResponse {
  requires2Fa?: boolean;
  tempToken?: string;
  accessToken: string;
  refreshToken: string;
  user: MobileUser;
}

export default function LoginScreen() {
  const router = useRouter();
  const saveSession = useMobileAuthStore((state) => state.saveSession);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [requires2Fa, setRequires2Fa] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!identifier.trim() || !password) {
      setErrorMessage('Inserisci nome utente e password');
      return;
    }

    if (requires2Fa && !totpCode.trim()) {
      setErrorMessage('Inserisci il codice TOTP a 6 cifre');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);

      const payload: Record<string, string> = {
        identifier: identifier.trim(),
        password,
      };

      if (requires2Fa && tempToken) {
        payload.tempToken = tempToken;
        payload.totp = totpCode.trim();
      }

      const res = await mobileApiClient<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.requires2Fa && res.tempToken) {
        setRequires2Fa(true);
        setTempToken(res.tempToken);
        return;
      }

      await saveSession(res.user, res.accessToken, res.refreshToken);
      router.replace('/(app)/(tabs)');
    } catch (err) {
      if (err instanceof MobileApiError) {
        setErrorMessage(err.problem?.detail || err.message);
      } else {
        setErrorMessage('Impossibile completare l\'accesso. Verifica la connessione.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Registro Elettronico</Text>
          <Text style={styles.subtitle}>
            Accedi con le credenziali fornite dalla tua scuola
          </Text>
        </View>

        {errorMessage ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <View style={styles.form}>
          <Text style={styles.label}>Nome utente o Matricola</Text>
          <TextInput
            style={styles.input}
            value={identifier}
            onChangeText={setIdentifier}
            placeholder="es. mario.rossi o 20250001"
            placeholderTextColor="#94a3b8"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isLoading && !requires2Fa}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••••••"
            placeholderTextColor="#94a3b8"
            secureTextEntry
            editable={!isLoading && !requires2Fa}
          />

          {requires2Fa ? (
            <View style={styles.twoFactorBox}>
              <Text style={styles.twoFactorTitle}>Autenticazione a Due Fattori (2FA)</Text>
              <Text style={styles.twoFactorSubtitle}>
                Inserisci il codice temporaneo generato dall'app Authenticator
              </Text>
              <TextInput
                style={[styles.input, styles.totpInput]}
                value={totpCode}
                onChangeText={setTotpCode}
                placeholder="123456"
                placeholderTextColor="#94a3b8"
                keyboardType="number-pad"
                maxLength={8}
                editable={!isLoading}
              />
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>
                {requires2Fa ? 'Verifica Codice 2FA' : 'Accedi al Registro'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 13,
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0f172a',
    marginBottom: 16,
  },
  totpInput: {
    textAlign: 'center',
    letterSpacing: 4,
    fontSize: 20,
    fontWeight: 'bold',
  },
  twoFactorBox: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  twoFactorTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1d4ed8',
    marginBottom: 4,
  },
  twoFactorSubtitle: {
    fontSize: 12,
    color: '#3b82f6',
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
