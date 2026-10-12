import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMobileAuthStore } from '../../../src/lib/auth-store';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useMobileAuthStore();

  const handleLogout = () => {
    Alert.alert(
      'Disconnessione',
      'Sei sicuro di voler uscire dal tuo account?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Esci',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      {/* User Info Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.firstName?.[0]}
            {user?.lastName?.[0]}
          </Text>
        </View>

        <Text style={styles.userName}>
          {user?.firstName} {user?.lastName}
        </Text>
        <Text style={styles.userUsername}>@{user?.username}</Text>

        <View style={styles.roleTag}>
          <Text style={styles.roleTagText}>
            {user?.role === 'STUDENT'
              ? 'Studente Iscritto'
              : user?.role === 'PARENT'
                ? 'Genitore / Tutore Legale'
                : user?.role === 'TEACHER'
                  ? 'Personale Docente'
                  : 'Utente Scolastico'}
          </Text>
        </View>
      </View>

      {/* Details Card */}
      <View style={styles.detailsCard}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Email</Text>
          <Text style={styles.detailValue}>{user?.email || 'Non specificata'}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Codice Istituto</Text>
          <Text style={styles.detailValue}>{user?.schoolId ? 'Collegato' : 'N/D'}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Sicurezza</Text>
          <Text style={styles.detailValue}>Token SecureStore Cifrato</Text>
        </View>
      </View>

      {/* GDPR / Legal info */}
      <View style={styles.legalBox}>
        <Text style={styles.legalTitle}>Diritto alla Privacy (GDPR)</Text>
        <Text style={styles.legalBody}>
          I tuoi dati sono protetti in conformità al Regolamento UE 2016/679. Puoi richiedere l'esportazione completa o la rettifica dei tuoi dati personali in qualsiasi momento.
        </Text>
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.7}>
        <Text style={styles.logoutButtonText}>Disconnetti Account</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16,
    gap: 16,
  },
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  userUsername: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  roleTag: {
    marginTop: 10,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleTagText: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '600',
  },
  detailsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
  },
  legalBox: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 14,
  },
  legalTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  legalBody: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
  },
  logoutButton: {
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 'auto',
  },
  logoutButtonText: {
    color: '#dc2626',
    fontSize: 15,
    fontWeight: '700',
  },
});
