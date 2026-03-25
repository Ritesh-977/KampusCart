import React, { useState, useCallback, useContext, useRef, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  SafeAreaView, ActivityIndicator, Alert,
  Platform, RefreshControl, TextInput, Modal, ScrollView, StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import { useThemeStyles } from '../hooks/useThemeStyles'; // <-- Update path as needed

// ── Constants ─────────────────────────────────────────────────────────────────

const SEMESTERS = ['All', '1', '2', '3', '4', '5', '6', '7', '8'];

// ── Helper to build dynamic tab/category meta ──
const getCategoryMeta = (colors) => ({
  'Exam Paper': { color: colors.primaryAccent,   bg: colors.primaryAccent + '1A',   icon: 'document-text-outline', label: 'Exam Papers' },
  'Note':       { color: colors.secondaryAccent, bg: colors.secondaryAccent + '1A', icon: 'pencil-outline',        label: 'Notes' },
  'Book':       { color: colors.tertiaryAccent,  bg: colors.tertiaryAccent + '1A',  icon: 'book-outline',          label: 'Books' },
});

// ── StudyMaterialsScreen ──────────────────────────────────────────────────────

const StudyMaterialsScreen = ({ navigation }) => {
  // 1. Initialize dynamic theme hook
  const { styles, colors } = useThemeStyles(createStyles);
  
  // Create dynamic category colors
  const CATEGORY_META = getCategoryMeta(colors);
  const TABS = Object.keys(CATEGORY_META).map(key => ({
    key,
    ...CATEGORY_META[key]
  }));

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

  // ── Load and Save User Preferences (Semester & Tab) ─────────────────────────
  useEffect(() => {
    const loadSavedPreferences = async () => {
      try {
        // Load Semester
        const savedSem = await AsyncStorage.getItem('@kampuscart_semester');
        if (savedSem !== null) {
          setSemester(savedSem);
        }
        
        // Load Active Tab
        const savedTab = await AsyncStorage.getItem('@kampuscart_activeTab');
        if (savedTab !== null) {
          setActiveTab(savedTab);
        }
      } catch (error) {
        console.log('Could not load user preferences');
      }
    };
    loadSavedPreferences();
  }, []);

  const handleSemesterSelect = async (selectedSem) => {
    setSemester(selectedSem);
    setShowSemPicker(false);
    try {
      await AsyncStorage.setItem('@kampuscart_semester', selectedSem);
    } catch (error) {
      console.log('Could not save semester preference');
    }
  };

  const handleTabSelect = async (selectedTab) => {
    setActiveTab(selectedTab);
    try {
      await AsyncStorage.setItem('@kampuscart_activeTab', selectedTab);
    } catch (error) {
      console.log('Could not save tab preference');
    }
  };

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

  const handleOpen = (item) => {
    navigation.navigate('MaterialViewer', {
      title:    item.subjectName,
      fileUrl:  item.fileUrl,
      fileType: item.fileType,
    });
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
    const meta = CATEGORY_META[item.category] || CATEGORY_META['Note'];
    
    // Bulletproof Uploader Check
    const uploaderId = item.uploadedBy?._id || item.uploadedBy?.id || item.uploadedBy;
    const currentUserId = currentUser?._id || currentUser?.id;
    const isUploader = !isGuest && currentUserId && uploaderId && String(uploaderId) === String(currentUserId);

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

          {/* Subject replacing Title */}
          <Text style={styles.cardTitle} numberOfLines={2}>{item.subjectName}</Text>
          
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
  const activeTabMeta = CATEGORY_META[activeTab];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.header} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Study Materials</Text>
        {!isGuest && (
          <TouchableOpacity
            style={styles.uploadBtn}
            onPress={() => navigation.navigate('UploadMaterial')}
          >
            <Ionicons name="cloud-upload-outline" size={18} color={colors.textOnPrimary || '#ffffff'} />
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
              onPress={() => handleTabSelect(tab.key)} 
            >
              <Ionicons name={tab.icon} size={14} color={active ? tab.color : colors.textTertiary} />
              <Text style={[styles.tabText, active ? { color: tab.color } : { color: colors.textSub }]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Filters ── */}
      <View style={styles.filterRow}>
        {/* Semester picker */}
        <TouchableOpacity style={styles.filterChip} onPress={() => setShowSemPicker(true)}>
          <Ionicons name="layers-outline" size={13} color={colors.primaryAction} />
          <Text style={styles.filterChipText}>
            {semester === 'All' ? 'All Sems' : `Sem ${semester}`}
          </Text>
          <Ionicons name="chevron-down" size={12} color={colors.textTertiary} />
        </TouchableOpacity>

        {/* Subject search */}
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={14} color={colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search subject…"
            placeholderTextColor={colors.textTertiary}
            value={subjectQuery}
            onChangeText={setSubjectQuery}
            onSubmitEditing={() => fetchMaterials(true)}
            returnKeyType="search"
          />
          {subjectQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSubjectQuery('')}>
              <Ionicons name="close-circle" size={15} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── List ── */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={activeTabMeta?.color || colors.primaryAction} />
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
              colors={[activeTabMeta?.color || colors.primaryAction]}
              tintColor={activeTabMeta?.color || colors.primaryAction}
            />
          }
          onEndReached={onLoadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={loadingMore ? (
            <ActivityIndicator color={colors.textTertiary} style={{ marginVertical: 16 }} />
          ) : null}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="folder-open-outline" size={64} color={colors.cardAccent} />
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
                onPress={() => handleSemesterSelect(s)}
              >
                <Text style={[styles.pickerRowText, semester === s && styles.pickerRowTextActive]}>
                  {s === 'All' ? 'All Semesters' : `Semester ${s}`}
                </Text>
                {semester === s && <Ionicons name="checkmark" size={18} color={colors.primaryAccent} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const createStyles = (theme) => StyleSheet.create({
  safe:   { flex: 1, backgroundColor: theme.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 12 : 12,
    paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: theme.headerDivider,
    backgroundColor: theme.header,
  },
  backBtn:     { padding: 4, marginRight: 10 },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: theme.textMain },
  uploadBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: theme.primaryAction,
    justifyContent: 'center', alignItems: 'center',
  },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    backgroundColor: theme.header,
    borderBottomWidth: 1, borderBottomColor: theme.headerDivider,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 13, gap: 5,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabText: { fontSize: 13, fontWeight: '700' },

  // Filters
  filterRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10, gap: 10,
    backgroundColor: theme.formBackground,
    borderBottomWidth: 1, borderBottomColor: theme.headerDivider,
  },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: theme.card, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1, borderColor: theme.cardAccent,
  },
  filterChipText: { fontSize: 12, fontWeight: '600', color: theme.textSub },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: theme.card, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1, borderColor: theme.cardAccent,
  },
  searchInput: { flex: 1, color: theme.textMain, fontSize: 13, padding: 0 },

  // List
  list: { padding: 14, paddingBottom: 40 },

  // Card
  card: {
    flexDirection: 'row',
    backgroundColor: theme.card,
    borderRadius: 14, borderWidth: 1, borderColor: theme.cardAccent,
    marginBottom: 12, overflow: 'hidden',
  },
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
    backgroundColor: theme.cardAccent, paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6,
  },
  semText: { fontSize: 11, fontWeight: '700', color: theme.textSub },
  delBtn: { 
    padding: 6, 
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderRadius: 8,
    marginLeft: 8,
  },

  cardTitle:    { fontSize: 15, fontWeight: '700', color: theme.textMain, lineHeight: 21, marginBottom: 8 },
  cardUploader: { fontSize: 11, color: theme.textTertiary, fontStyle: 'italic', marginBottom: 10 },

  openBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1, borderRadius: 9,
    paddingVertical: 8, marginTop: 4,
  },
  openBtnText: { fontSize: 13, fontWeight: '700' },

  // Empty state
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyTitle:      { fontSize: 18, fontWeight: '700', color: theme.textMain, marginTop: 14, marginBottom: 6 },
  emptySub:        { fontSize: 14, color: theme.textSub, textAlign: 'center', lineHeight: 20 },
  emptyUploadBtn:  { marginTop: 20, paddingVertical: 12, paddingHorizontal: 28, borderRadius: 12 },
  emptyUploadText: { color: theme.textOnPrimary || '#ffffff', fontWeight: '700', fontSize: 15 }, // Keep white for contrast on colored background

  // Semester modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  pickerSheet: {
    backgroundColor: theme.card,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 36,
    borderTopWidth: 1, borderColor: theme.cardAccent,
    maxHeight: '60%',
  },
  pickerTitle:         { fontSize: 16, fontWeight: '800', color: theme.textMain, marginBottom: 12 },
  pickerRow:           { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.cardAccent, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pickerRowActive:     { backgroundColor: theme.primaryAction + '1A', borderRadius: 8, paddingHorizontal: 8 },
  pickerRowText:       { fontSize: 15, color: theme.textSub },
  pickerRowTextActive: { color: theme.primaryAccent, fontWeight: '700' },
});

export default StudyMaterialsScreen;