import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { mobileApiClient } from '../../../src/lib/api-client';
import { useMobileAuthStore } from '../../../src/lib/auth-store';

interface GradeItem {
  id: string;
  value: number;
  weight: number;
  type: string;
  subjectName?: string;
  date: string;
}

interface GradesResponse {
  grades: GradeItem[];
  average?: number;
}

export default function DashboardScreen() {
  const user = useMobileAuthStore((state) => state.user);
  const [refreshing, setRefreshing] = useState(false);

  const { data: gradesData, isLoading, refetch } = useQuery<GradesResponse>({
    queryKey: ['mobile-dashboard-grades'],
    queryFn: () => mobileApiClient<GradesResponse>('/grades/student/my-grades').catch(() => ({ grades: [] })),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const todayStr = new Intl.DateTimeFormat('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  const average =
    gradesData?.average ??
    (gradesData?.grades && gradesData.grades.length > 0
      ? (
          gradesData.grades.reduce((sum, g) => sum + g.value * (g.weight || 1), 0) /
          gradesData.grades.reduce((sum, g) => sum + (g.weight || 1), 0)
        ).toFixed(2)
      : null);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Welcome Card */}
      <View style={styles.welcomeCard}>
        <Text style={styles.dateText}>{todayStr.toUpperCase()}</Text>
        <Text style={styles.welcomeTitle}>
          Ciao, {user?.firstName} {user?.lastName}
        </Text>
        <Text style={styles.roleSubtitle}>
          Ruolo: {user?.role === 'STUDENT' ? 'Studente' : user?.role === 'PARENT' ? 'Genitore' : user?.role}
        </Text>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Media Generale</Text>
          {isLoading ? (
            <ActivityIndicator size="small" color="#2563eb" />
          ) : (
            <Text
              style={[
                styles.statValue,
                average && Number(average) >= 6 ? styles.statSuccess : styles.statDanger,
              ]}
            >
              {average ? average : 'N/D'}
            </Text>
          )}
          <Text style={styles.statHint}>Su tutti gli scrutini</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Valutazioni</Text>
          <Text style={styles.statValue}>
            {gradesData?.grades ? gradesData.grades.length : 0}
          </Text>
          <Text style={styles.statHint}>Voti registrati</Text>
        </View>
      </View>

      {/* Latest Grades Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ultime Valutazioni</Text>
        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 12 }} color="#2563eb" />
        ) : gradesData?.grades && gradesData.grades.length > 0 ? (
          gradesData.grades.slice(0, 3).map((g) => (
            <View key={g.id} style={styles.gradeRow}>
              <View style={styles.gradeInfo}>
                <Text style={styles.gradeSubject}>{g.subjectName || 'Materia'}</Text>
                <Text style={styles.gradeDate}>
                  {new Date(g.date).toLocaleDateString('it-IT')} • Tipo: {g.type}
                </Text>
              </View>
              <View
                style={[
                  styles.gradeBadge,
                  g.value >= 6 ? styles.badgeSuccess : styles.badgeDanger,
                ]}
              >
                <Text
                  style={[
                    styles.gradeBadgeText,
                    g.value >= 6 ? styles.textSuccess : styles.textDanger,
                  ]}
                >
                  {g.value.toFixed(1)}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>Nessun voto registrato finora.</Text>
        )}
      </View>

      {/* Agenda & Avvisi */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bacheca Didattica & Orario</Text>
        <View style={styles.noticeCard}>
          <Text style={styles.noticeTitle}>Anno Scolastico 2025/2026</Text>
          <Text style={styles.noticeBody}>
            Tutte le comunicazioni, orari di ricevimento e circolari sono costantemente sincronizzati con il registro di classe.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
    gap: 16,
  },
  welcomeCard: {
    backgroundColor: '#1e3a8a',
    borderRadius: 16,
    padding: 20,
    elevation: 2,
  },
  dateText: {
    color: '#93c5fd',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  welcomeTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  roleSubtitle: {
    color: '#bfdbfe',
    fontSize: 13,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginVertical: 4,
  },
  statSuccess: {
    color: '#16a34a',
  },
  statDanger: {
    color: '#dc2626',
  },
  statHint: {
    fontSize: 11,
    color: '#94a3b8',
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  gradeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  gradeInfo: {
    flex: 1,
  },
  gradeSubject: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  gradeDate: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  gradeBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeSuccess: {
    backgroundColor: '#dcfce7',
  },
  badgeDanger: {
    backgroundColor: '#fee2e2',
  },
  gradeBadgeText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  textSuccess: {
    color: '#16a34a',
  },
  textDanger: {
    color: '#dc2626',
  },
  noticeCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 12,
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1d4ed8',
    marginBottom: 4,
  },
  noticeBody: {
    fontSize: 13,
    color: '#3b82f6',
    lineHeight: 18,
  },
  emptyText: {
    fontSize: 13,
    color: '#64748b',
    fontStyle: 'italic',
  },
});
