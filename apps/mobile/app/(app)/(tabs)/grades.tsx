import { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { mobileApiClient } from '../../../src/lib/api-client';

interface GradeItem {
  id: string;
  value: number;
  weight: number;
  type: string;
  subjectName?: string;
  date: string;
  notes?: string;
}

interface GradesResponse {
  grades: GradeItem[];
  average?: number;
}

export default function GradesScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery<GradesResponse>({
    queryKey: ['mobile-grades-libretto'],
    queryFn: () => mobileApiClient<GradesResponse>('/grades/student/my-grades').catch(() => ({ grades: [] })),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const grades = data?.grades || [];
  const totalGrades = grades.length;
  const sufficientGrades = grades.filter((g) => g.value >= 6).length;
  const insufficientGrades = totalGrades - sufficientGrades;

  return (
    <View style={styles.container}>
      {/* Header Summary */}
      <View style={styles.headerCard}>
        <View style={styles.headerItem}>
          <Text style={styles.headerNumber}>{totalGrades}</Text>
          <Text style={styles.headerLabel}>Totale Voti</Text>
        </View>
        <View style={styles.headerDivider} />
        <View style={styles.headerItem}>
          <Text style={[styles.headerNumber, { color: '#16a34a' }]}>{sufficientGrades}</Text>
          <Text style={styles.headerLabel}>Sufficienti</Text>
        </View>
        <View style={styles.headerDivider} />
        <View style={styles.headerItem}>
          <Text style={[styles.headerNumber, { color: '#dc2626' }]}>{insufficientGrades}</Text>
          <Text style={styles.headerLabel}>Insufficienti</Text>
        </View>
      </View>

      {/* List */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Caricamento valutazioni...</Text>
        </View>
      ) : (
        <FlatList
          data={grades}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>Nessun voto nel libretto</Text>
              <Text style={styles.emptySubtitle}>
                Le valutazioni inserite dai docenti compariranno qui in tempo reale.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.gradeCard}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.subjectName}>{item.subjectName || 'Materia Didattica'}</Text>
                  <Text style={styles.gradeMeta}>
                    {new Date(item.date).toLocaleDateString('it-IT')} • {item.type} • Peso: {item.weight}x
                  </Text>
                </View>

                <View
                  style={[
                    styles.badge,
                    item.value >= 6 ? styles.badgeSuccess : styles.badgeDanger,
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      item.value >= 6 ? styles.textSuccess : styles.textDanger,
                    ]}
                  >
                    {item.value.toFixed(1)}
                  </Text>
                </View>
              </View>

              {item.notes ? (
                <View style={styles.notesContainer}>
                  <Text style={styles.notesText}>Note: {item.notes}</Text>
                </View>
              ) : null}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 16,
    justifyContent: 'space-around',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  headerItem: {
    alignItems: 'center',
  },
  headerDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#e2e8f0',
  },
  headerNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  headerLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  gradeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subjectName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  gradeMeta: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  badge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeSuccess: {
    backgroundColor: '#dcfce7',
  },
  badgeDanger: {
    backgroundColor: '#fee2e2',
  },
  badgeText: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  textSuccess: {
    color: '#16a34a',
  },
  textDanger: {
    color: '#dc2626',
  },
  notesContainer: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  notesText: {
    fontSize: 13,
    color: '#475569',
    fontStyle: 'italic',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 6,
  },
});
