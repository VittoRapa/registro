import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { mobileApiClient } from '../../../src/lib/api-client';

interface SharedNoteItem {
  id: string;
  title: string;
  description?: string;
  subject?: { name: string };
  author?: { firstName: string; lastName: string; role: string };
  averageRating?: number;
  bayesianRating?: number;
  ratingsCount?: number;
  isTeacherVerified?: boolean;
}

interface SharedNotesResponse {
  data: SharedNoteItem[];
}

export default function NotesScreen() {
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery<SharedNotesResponse>({
    queryKey: ['mobile-shared-notes', search],
    queryFn: () =>
      mobileApiClient<SharedNotesResponse>(
        `/shared-notes?search=${encodeURIComponent(search.trim())}`,
      ).catch(() => ({ data: [] })),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const notes = data?.data || [];

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Cerca appunti (es. derivate, rivoluzione, foscolo)..."
          placeholderTextColor="#94a3b8"
          returnKeyType="search"
        />
      </View>

      {/* List */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Caricamento appunti didattici...</Text>
        </View>
      ) : (
        <FlatList
          data={notes}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>Nessun appunto trovato</Text>
              <Text style={styles.emptySubtitle}>
                Prova a modificare i termini di ricerca o esplora per materia.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.noteCard} activeOpacity={0.7}>
              <View style={styles.cardHeader}>
                <View style={styles.subjectTag}>
                  <Text style={styles.subjectTagText}>{item.subject?.name || 'Materia'}</Text>
                </View>
                {item.isTeacherVerified ? (
                  <View style={styles.verifiedTag}>
                    <Text style={styles.verifiedTagText}>Certificato Docente</Text>
                  </View>
                ) : null}
              </View>

              <Text style={styles.noteTitle}>{item.title}</Text>
              {item.description ? (
                <Text style={styles.noteDescription} numberOfLines={2}>
                  {item.description}
                </Text>
              ) : null}

              <View style={styles.cardFooter}>
                <Text style={styles.authorText}>
                  Di {item.author?.firstName} {item.author?.lastName}
                </Text>

                <View style={styles.ratingBadge}>
                  <Text style={styles.ratingText}>
                    ★ {item.bayesianRating ? item.bayesianRating.toFixed(1) : '5.0'}
                  </Text>
                  <Text style={styles.ratingsCount}>({item.ratingsCount || 0})</Text>
                </View>
              </View>
            </TouchableOpacity>
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
  searchContainer: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  searchInput: {
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  noteCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  subjectTag: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  subjectTagText: {
    color: '#2563eb',
    fontSize: 11,
    fontWeight: '700',
  },
  verifiedTag: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  verifiedTagText: {
    color: '#16a34a',
    fontSize: 11,
    fontWeight: '700',
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  noteDescription: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  authorText: {
    fontSize: 12,
    color: '#64748b',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#d97706',
  },
  ratingsCount: {
    fontSize: 11,
    color: '#94a3b8',
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
