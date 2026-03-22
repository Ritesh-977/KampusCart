import React, { useState, useCallback, useContext, useRef } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  SafeAreaView, ActivityIndicator, Alert, Linking,
  Platform, RefreshControl, TextInput, Modal, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import API from '../api/axios';
import { AuthContext } from '../context/AuthContext';

// ── Constants ─────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'Exam Paper', label: 'Exam Papers', icon: 'document-text-outline', color: '#818cf8' },
  { key: 'Note',       label: 'Notes',        icon: 'pencil-outline',         color: '#34d399' },
  { key: 'Book',       label: 'Books',         icon: 'book-outline',           color: '#f472b6' },
];

const SEMESTERS = ['All', '1', '2', '3', '4', '5', '6', '7', '8'];

const CATEGORY_META = {
  'Exam Paper': { color: '#818cf8', bg: 'rgba(129,140,248,0.12)', icon: 'document-text-outline' },
  'Note':       { color: '#34d399', bg: 'rgba(52,211,153,0.12)',  icon: 'pencil-outline' },
  'Book':       { color: '#f472b6', bg: 'rgba(244,114,182,0.12)', icon: 'book-outline' },
};

// ── StudyMaterialsScreen ──────────────────────────────────────────────────────

const StudyMaterialsScreen = ({ navigation }) => {
  const { currentUser, isGuest } = useContext(AuthContext);

  const [activeTab, setActiveTab]       = useState('Exam Paper');
  const [materials, setMaterials]       = useState([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [loadingMore, setLoadingMore]   = useState(false);

  // Filters
  const [semester, setSemester]         = useState('All');
  const [subjectQuery, setSubjectQuery] = useState('');
  const [showSemPicker, setShowSemPicker] = useState(false);

  // Pagination
  const pageRef     = useRef(1);
  const hasMoreRef  = useRef(true);

  // ── Fetch ────────────────────────────────────────────────────────────────────

  const buildParams = (page = 1) => {
    const params = {
      category: activeTab,
      college:  currentUser?.college || '',
      page,
      limit:    15,
    };
    if (semester !== 'All') params.semester = semester;
    if (subjectQuery.trim()) params.subject = subjectQuery.trim();
    return params;
  };

  const fetchMaterials = async (reset = true) => {
    if (reset) {
      pageRef.current   = 1;
      hasMoreRef.current = true;
      setLoading(true);
    }
    try {
      const res  = await API.get('/materials', { params: buildParams(pageRef.current) });
      const data = res.data?.data || [];
      setMaterials(reset ? data : prev => [...prev, ...data]);
      hasMoreRef.current = res.data?.pagination?.hasMore ?? false;
    } catch {
      Alert.alert('Error', 'Could not load materials. Pull to refresh.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchMaterials(true); }, [activeTab, semester, subjectQuery]));

  const onRefresh = () => { setRefreshing(true); fetchMaterials(true); };

  const onLoadMore = () => {
    if (loadingMore || !hasMoreRef.current) return;
    setLoadingMore(true);
    pageRef.current += 1;
    fetchMaterials(false);
  };

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleOpen = async (item) => {
    try {
      await Linking.openURL(item.fileUrl);
    } catch {
      Alert.alert('Error', 'Could not open this file.');
    }
  };

  const handleDelete = (id) => {
    Alert.alert('Delete Material', 'Are you sure you want to delete this material?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await API.delete(`/materials/${id}`);
            setMaterials(prev => prev.filter(m => m._id !== id));
          } catch {
            Alert.alert('Error', 'Could not delete material.');
          }
        },
      },
    ]);
  };

  // ── Render item ──────────────────────────────────────────────────────────────

  const renderItem = ({ item }) => {
    const meta       = CATEGORY_META[item.category] || CATEGORY_META['Note'];
    const isUploader = !isGuest && String(item.uploadedBy?._id || item.uploadedBy) === String(currentUser?._id);

    return (
      <View style={styles.card}>
        {/* Left accent */}
        <View style={[styles.cardAccent, { backgroundColor: meta.color }]} />

        <View style={styles.cardContent}>
          {/* Category badge + delete */}
          <View style={styles.cardTop}>
            <View style={[styles.badge, { backgroundColor: meta.bg, borderColor: meta.color + '40' }]}>
              <Ionicons name={meta.icon} size={11} color={meta.color} />
              <Text style={[styles.badgeText, { color: meta.color }]}>{item.category}</Text>
            </View>
            <View style={styles.cardTopRight}>
              <View style={styles.semBadge}>
                <Text style={styles.semText}>Sem {item.semester}</Text>
              </View>
              {isUploader && (
                <TouchableOpacity onPress={() => handleDelete(item._id)} style={styles.delBtn}>
                  <Ionicons name="trash-outline" size={15} color="#ef4444" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Title + subject */}
          <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
          <View style={styles.cardMeta}>
            <Ionicons name="book-outline" size={12} color="#64748b" />
            <Text style={styles.cardSubject} numberOfLines={1}>{item.subjectName}</Text>
          </View>
          {item.uploadedBy?.name && (
            <Text style={styles.cardUploader}>by {item.uploadedBy.name}</Text>
          )}

          {/* Open button */}
          <TouchableOpacity
            style={[styles.openBtn, { borderColor: meta.color + '50', backgroundColor: meta.bg }]}
            onPress={() => handleOpen(item)}
          >
            <Ionicons
              name={item.fileType === 'image' ? 'image-outline' : 'document-outline'}
              size={15}
              color={meta.color}
            />
            <Text style={[styles.openBtnText, { color: meta.color }]}>
              {item.fileType === 'image' ? 'View Image' : 'Open PDF'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ── Active tab meta ───────────────────────────────────────────────────────────
  const activeTabMeta = TABS.find(t => t.key === activeTab);

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#f1f5f9" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Study Materials</Text>
        {!isGuest && (
          <TouchableOpacity
            style={styles.uploadBtn}
            onPress={() => navigation.navigate('UploadMaterial')}
          >
            <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Top Tabs ── */}
      <View style={styles.tabRow}>
        {TABS.map(tab => {
          const active = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, active && { borderBottomColor: tab.color, borderBottomWidth: 2.5 }]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Ionicons name={tab.icon} size={14} color={active ? tab.color : '#475569'} />
              <Text style={[styles.tabText, active && { color: tab.color }]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Filters ── */}
      <View style={styles.filterRow}>
        {/* Semester picker */}
        <TouchableOpacity style={styles.filterChip} onPress={() => setShowSemPicker(true)}>
          <Ionicons name="layers-outline" size={13} color="#818cf8" />
          <Text style={styles.filterChipText}>
            {semester === 'All' ? 'All Sems' : `Sem ${semester}`}
          </Text>
          <Ionicons name="chevron-down" size={12} color="#64748b" />
        </TouchableOpacity>

        {/* Subject search */}
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={14} color="#64748b" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search subject…"
            placeholderTextColor="#475569"
            value={subjectQuery}
            onChangeText={setSubjectQuery}
            onSubmitEditing={() => fetchMaterials(true)}
            returnKeyType="search"
          />
          {subjectQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSubjectQuery('')}>
              <Ionicons name="close-circle" size={15} color="#475569" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── List ── */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={activeTabMeta?.color || '#818cf8'} />
        </View>
      ) : (
        <FlatList
          data={materials}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[activeTabMeta?.color || '#818cf8']}
              tintColor={activeTabMeta?.color || '#818cf8'}
            />
          }
          onEndReached={onLoadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={loadingMore ? (
            <ActivityIndicator color="#475569" style={{ marginVertical: 16 }} />
          ) : null}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="folder-open-outline" size={64} color="#1e293b" />
              <Text style={styles.emptyTitle}>No {activeTabMeta?.label} yet</Text>
              <Text style={styles.emptySub}>
                {isGuest
                  ? 'Login to upload materials for your campus.'
                  : 'Be the first to upload for your campus!'}
              </Text>
              {!isGuest && (
                <TouchableOpacity
                  style={[styles.emptyUploadBtn, { backgroundColor: activeTabMeta?.color }]}
                  onPress={() => navigation.navigate('UploadMaterial')}
                >
                  <Text style={styles.emptyUploadText}>Upload Material</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {/* ── Semester Picker Modal ── */}
      <Modal visible={showSemPicker} transparent animationType="fade" onRequestClose={() => setShowSemPicker(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowSemPicker(false)} />
        <View style={styles.pickerSheet}>
          <Text style={styles.pickerTitle}>Select Semester</Text>
          <ScrollView>
            {SEMESTERS.map(s => (
              <TouchableOpacity
                key={s}
                style={[styles.pickerRow, semester === s && styles.pickerRowActive]}
                onPress={() => { setSemester(s); setShowSemPicker(false); }}
              >
                <Text style={[styles.pickerRowText, semester === s && styles.pickerRowTextActive]}>
                  {s === 'All' ? 'All Semesters' : `Semester ${s}`}
                </Text>
                {semester === s && <Ionicons name="checkmark" size={18} color="#818cf8" />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#0f172a' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 48 : 12,
    paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: '#1e293b',
    backgroundColor: '#0f172a',
  },
  backBtn:     { padding: 4, marginRight: 10 },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: '#f1f5f9' },
  uploadBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#4f46e5',
    justifyContent: 'center', alignItems: 'center',
  },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderBottomWidth: 1, borderBottomColor: '#1e293b',
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 13, gap: 5,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabText: { fontSize: 13, fontWeight: '700', color: '#475569' },

  // Filters
  filterRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10, gap: 10,
    backgroundColor: '#0a0f1a',
    borderBottomWidth: 1, borderBottomColor: '#1e293b',
  },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#1e293b', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1, borderColor: '#334155',
  },
  filterChipText: { fontSize: 12, fontWeight: '600', color: '#94a3b8' },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#1e293b', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1, borderColor: '#334155',
  },
  searchInput: { flex: 1, color: '#f1f5f9', fontSize: 13, padding: 0 },

  // List
  list: { padding: 14, paddingBottom: 40 },

  // Card
  card: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 14, borderWidth: 1, borderColor: '#273549',
    marginBottom: 12, overflow: 'hidden',
  },
  cardAccent:  { width: 4 },
  cardContent: { flex: 1, padding: 13 },
  cardTop: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 8,
  },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 8, borderWidth: 1,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },
  cardTopRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  semBadge: {
    backgroundColor: '#273549', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6,
  },
  semText: { fontSize: 11, fontWeight: '700', color: '#94a3b8' },
  delBtn: { padding: 4 },

  cardTitle:    { fontSize: 15, fontWeight: '700', color: '#f1f5f9', lineHeight: 21, marginBottom: 4 },
  cardMeta:     { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 2 },
  cardSubject:  { fontSize: 12, color: '#64748b', flex: 1 },
  cardUploader: { fontSize: 11, color: '#334155', fontStyle: 'italic', marginBottom: 10 },

  openBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1, borderRadius: 9,
    paddingVertical: 8, marginTop: 4,
  },
  openBtnText: { fontSize: 13, fontWeight: '700' },

  // Empty state
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyTitle:      { fontSize: 18, fontWeight: '700', color: '#f1f5f9', marginTop: 14, marginBottom: 6 },
  emptySub:        { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 20 },
  emptyUploadBtn:  { marginTop: 20, paddingVertical: 12, paddingHorizontal: 28, borderRadius: 12 },
  emptyUploadText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Semester modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  pickerSheet: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 36,
    borderTopWidth: 1, borderColor: '#334155',
    maxHeight: '60%',
  },
  pickerTitle:         { fontSize: 16, fontWeight: '800', color: '#f1f5f9', marginBottom: 12 },
  pickerRow:           { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#273549', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pickerRowActive:     { backgroundColor: 'rgba(129,140,248,0.07)', borderRadius: 8, paddingHorizontal: 8 },
  pickerRowText:       { fontSize: 15, color: '#94a3b8' },
  pickerRowTextActive: { color: '#818cf8', fontWeight: '700' },
});

export default StudyMaterialsScreen;
