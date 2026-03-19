import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl, SafeAreaView,
  TouchableOpacity, Modal, TextInput, ScrollView, Alert, Platform,
  Animated, Dimensions, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import API from '../api/axios';
import ItemCard from '../components/ItemCard';
import { colleges } from '../utils/colleges';
import { AuthContext } from '../context/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

const CATEGORIES = [
  { label: 'All',              icon: 'apps-outline' },
  { label: 'Cycles',           icon: 'bicycle-outline' },
  { label: 'Electronics',      icon: 'phone-portrait-outline' },
  { label: 'Books & Notes',    icon: 'book-outline' },
  { label: 'Hostel Essentials',icon: 'bed-outline' },
  { label: 'Other',            icon: 'ellipsis-horizontal-circle-outline' },
];

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

// ─── Skeleton Card ────────────────────────────────────────────────────────────
const SkeletonCard = ({ shimmer }) => {
  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.75] });
  return (
    <View style={[sk.card, { width: CARD_WIDTH }]}>
      <Animated.View style={[sk.img, { opacity }]} />
      <View style={sk.body}>
        <Animated.View style={[sk.line, { width: '85%', opacity }]} />
        <Animated.View style={[sk.line, { width: '50%', marginTop: 6, opacity }]} />
        <Animated.View style={[sk.line, { width: '65%', marginTop: 6, opacity }]} />
      </View>
    </View>
  );
};

const HomeScreen = ({ navigation }) => {
  const { currentUser, isGuest, logout } = useContext(AuthContext);

  const getInitialCampus = () => {
    if (isGuest || !currentUser?.college) return colleges[0];
    const userCol = currentUser.college.toLowerCase();
    return colleges.find(c => {
      const cName = c.name.toLowerCase();
      const cShort = (c.shortName || '').toLowerCase();
      return cName === userCol || cName.includes(userCol) || userCol.includes(cName) || (cShort && userCol.includes(cShort));
    }) || colleges[0];
  };

  const [activeCampus, setActiveCampus]       = useState(getInitialCampus);
  const [items, setItems]                     = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [refreshing, setRefreshing]           = useState(false);
  const [searchQuery, setSearchQuery]         = useState('');
  const [activeCategory, setActiveCategory]   = useState('All');
  const [modalVisible, setModalVisible]       = useState(false);
  const [collegeSearch, setCollegeSearch]     = useState('');
  const [searchFocused, setSearchFocused]     = useState(false);

  // ── Animations ──────────────────────────────────────────────────────────────
  const shimmer      = useRef(new Animated.Value(0)).current;
  const headerFade   = useRef(new Animated.Value(0)).current;
  const headerSlide  = useRef(new Animated.Value(-20)).current;
  const searchScale  = useRef(new Animated.Value(1)).current;
  const bannerAnim   = useRef(new Animated.Value(0)).current;

  // shimmer loop for skeletons
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  // header entrance
  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerFade,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(headerSlide, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
    ]).start();
  }, []);

  // auto-switch campus when user data loads
  useEffect(() => {
    if (!isGuest && currentUser?.college) {
      const userCol = currentUser.college.toLowerCase();
      const match = colleges.find(c => {
        const cName = c.name.toLowerCase();
        const cShort = (c.shortName || '').toLowerCase();
        return cName === userCol || cName.includes(userCol) || userCol.includes(cName) || (cShort && userCol.includes(cShort));
      });
      if (match && match.name !== activeCampus.name) setActiveCampus(match);
    }
  }, [currentUser, isGuest]);

  const userCampusName  = currentUser?.college || '';
  const isWindowShopping = !isGuest && currentUser &&
    activeCampus.name.toLowerCase() !== userCampusName.toLowerCase();

  // banner entrance
  useEffect(() => {
    Animated.timing(bannerAnim, {
      toValue: isWindowShopping ? 1 : 0,
      duration: 350,
      useNativeDriver: true,
    }).start();
  }, [isWindowShopping]);

  // search bar focus animation
  const handleSearchFocus = () => {
    setSearchFocused(true);
    Animated.spring(searchScale, { toValue: 1.02, useNativeDriver: true, speed: 50 }).start();
  };
  const handleSearchBlur = () => {
    setSearchFocused(false);
    Animated.spring(searchScale, { toValue: 1, useNativeDriver: true, speed: 20 }).start();
  };

  const fetchItems = useCallback(async () => {
    try {
      let url = `/items?college=${activeCampus.name}`;
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
      if (activeCategory !== 'All') url += `&category=${encodeURIComponent(activeCategory)}`;
      const response = await API.get(url);
      setItems(response.data);
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery, activeCategory, activeCampus]);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(fetchItems, 400);
    return () => clearTimeout(t);
  }, [fetchItems]);

  const onRefresh = () => { setRefreshing(true); fetchItems(); };

  const filteredColleges = colleges
    .filter(c => c.emailDomain !== null)
    .filter(c =>
      !collegeSearch ||
      c.name.toLowerCase().includes(collegeSearch.toLowerCase()) ||
      (c.shortName || '').toLowerCase().includes(collegeSearch.toLowerCase())
    );

  const handleItemPress = (item) => {
    if (isGuest) {
      Alert.alert('Login Required', 'Please log in to view item details and contact sellers.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log In / Sign Up', onPress: logout },
      ]);
      return;
    }
    const isOwner = !isGuest && currentUser &&
      (item.seller === currentUser._id || item.seller?._id === currentUser._id);
    navigation.navigate('ItemDetails', { item, activeCollege: activeCampus.name, isOwner: !!isOwner });
  };

  const renderItem = useCallback(({ item, index }) => (
    <View style={index % 2 === 0 ? styles.gridLeft : styles.gridRight}>
      <ItemCard item={item} onPress={() => handleItemPress(item)} compact />
    </View>
  ), [currentUser, isGuest, activeCampus]);

  const renderSkeleton = () => (
    <View style={styles.gridRow}>
      {[0, 1, 2, 3, 4, 5].map(i => (
        <View key={i} style={i % 2 === 0 ? styles.gridLeft : styles.gridRight}>
          <SkeletonCard shimmer={shimmer} />
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#0f172a" barStyle="light-content" />

      {/* ── Header ── */}
      <Animated.View
        style={[
          styles.header,
          { opacity: headerFade, transform: [{ translateY: headerSlide }] },
        ]}
      >
        {/* Top row: greeting + Lost & Found */}
        <View style={styles.topRow}>
          <View style={styles.greetingBlock}>
            <Text style={styles.greeting}>{getGreeting()} 👋</Text>
            <TouchableOpacity style={styles.campusPill} onPress={() => setModalVisible(true)} activeOpacity={0.8}>
              <Text style={styles.campusEmoji}>{activeCampus.emoji}</Text>
              <Text style={styles.campusName} numberOfLines={1}>
                {activeCampus.shortName || activeCampus.name}
              </Text>
              <Ionicons name="chevron-down" size={14} color="#a5b4fc" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.lostFoundBtn}
            onPress={() => navigation.navigate('LostFound')}
            activeOpacity={0.8}
          >
            <Ionicons name="search-circle" size={18} color="#fbbf24" />
            <Text style={styles.lostFoundText}>Lost & Found</Text>
          </TouchableOpacity>
        </View>

        {/* Search bar */}
        <Animated.View style={[styles.searchWrap, { transform: [{ scale: searchScale }] }]}>
          <Ionicons name="search" size={18} color={searchFocused ? '#a5b4fc' : '#64748b'} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search on ${activeCampus.shortName || 'campus'}…`}
            placeholderTextColor="#64748b"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={handleSearchFocus}
            onBlur={handleSearchBlur}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#64748b" />
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* Category chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll} contentContainerStyle={styles.chipsContent}>
          {CATEGORIES.map((cat) => {
            const active = activeCategory === cat.label;
            return (
              <TouchableOpacity
                key={cat.label}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setActiveCategory(cat.label)}
                activeOpacity={0.75}
              >
                <Ionicons name={cat.icon} size={13} color={active ? '#fff' : '#94a3b8'} style={{ marginRight: 4 }} />
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{cat.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </Animated.View>

      {/* ── Window-shopping banner ── */}
      <Animated.View
        style={[
          styles.bannerWrap,
          {
            opacity: bannerAnim,
            transform: [{ translateY: bannerAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }],
            display: isWindowShopping ? 'flex' : 'none',
          },
        ]}
      >
        <Ionicons name="eye-outline" size={13} color="#fbbf24" style={{ marginRight: 6 }} />
        <Text style={styles.bannerText}>
          Viewing <Text style={styles.bannerHighlight}>{activeCampus.shortName || activeCampus.name}</Text> — browse only, can't contact sellers.
        </Text>
      </Animated.View>

      {/* ── List ── */}
      {loading ? (
        <ScrollView contentContainerStyle={styles.gridPad} showsVerticalScrollIndicator={false}>
          {renderSkeleton()}
        </ScrollView>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item._id}
          numColumns={2}
          contentContainerStyle={styles.gridPad}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#4f46e5']}
              tintColor="#4f46e5"
            />
          }
          renderItem={renderItem}
          ListHeaderComponent={
            items.length > 0 ? (
              <View style={styles.listHeader}>
                <Text style={styles.listHeaderText}>
                  {activeCategory === 'All' ? 'All listings' : activeCategory}
                </Text>
                <Text style={styles.listHeaderCount}>{items.length} items</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIcon}>
                <Ionicons name="storefront-outline" size={52} color="#c7d2fe" />
              </View>
              <Text style={styles.emptyTitle}>
                {searchQuery || activeCategory !== 'All' ? 'No results found' : 'No listings yet'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery || activeCategory !== 'All'
                  ? 'Try different keywords or clear your filters.'
                  : `Be the first to list something at ${activeCampus.shortName || activeCampus.name}!`}
              </Text>
              {(searchQuery || activeCategory !== 'All') && (
                <TouchableOpacity
                  style={styles.clearBtn}
                  onPress={() => { setSearchQuery(''); setActiveCategory('All'); }}
                >
                  <Text style={styles.clearBtnText}>Clear filters</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {/* ── Campus picker modal ── */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            {/* Handle */}
            <View style={styles.modalHandle} />

            <Text style={styles.modalTitle}>Window Shopping 🛍️</Text>
            <Text style={styles.modalSubtitle}>Browse listings from any campus</Text>

            {/* Search */}
            <View style={styles.modalSearch}>
              <Ionicons name="search" size={16} color="#94a3b8" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search colleges…"
                placeholderTextColor="#94a3b8"
                value={collegeSearch}
                onChangeText={setCollegeSearch}
              />
            </View>

            <FlatList
              data={filteredColleges}
              keyExtractor={(item) => item.id}
              style={styles.collegeList}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isActive = item.name === activeCampus.name;
                const isUserCampus = !isGuest && currentUser &&
                  item.name.toLowerCase() === (currentUser.college || '').toLowerCase();
                return (
                  <TouchableOpacity
                    style={[styles.collegeRow, isActive && styles.collegeRowActive]}
                    onPress={() => { setActiveCampus(item); setModalVisible(false); setCollegeSearch(''); }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.collegeEmoji}>{item.emoji}</Text>
                    <View style={styles.collegeInfo}>
                      <Text style={[styles.collegeName, isActive && styles.collegeNameActive]}>
                        {item.name}
                      </Text>
                      {item.location && (
                        <Text style={styles.collegeLocation}>{item.location}</Text>
                      )}
                    </View>
                    <View style={styles.collegeMeta}>
                      {isUserCampus && (
                        <View style={styles.homeBadge}>
                          <Text style={styles.homeBadgeText}>Home</Text>
                        </View>
                      )}
                      {isActive && <Ionicons name="checkmark-circle" size={20} color="#4f46e5" />}
                    </View>
                  </TouchableOpacity>
                );
              }}
            />

            <TouchableOpacity style={styles.modalClose} onPress={() => { setModalVisible(false); setCollegeSearch(''); }}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ─── Skeleton styles ──────────────────────────────────────────────────────────
const sk = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden',
    marginBottom: 16, elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4,
  },
  img: { width: '100%', height: CARD_WIDTH * 0.85, backgroundColor: '#e2e8f0' },
  body: { padding: 10 },
  line: { height: 12, backgroundColor: '#e2e8f0', borderRadius: 6 },
});

// ─── Main styles ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },

  // Header
  header: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 48 : 14,
    paddingBottom: 14,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 8,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  topRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between', marginBottom: 14,
  },
  greetingBlock: { flex: 1, marginRight: 12 },
  greeting: { fontSize: 13, color: '#94a3b8', fontWeight: '500', marginBottom: 5 },
  campusPill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(79,70,229,0.2)', alignSelf: 'flex-start',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(165,180,252,0.3)',
  },
  campusEmoji: { fontSize: 14, marginRight: 5 },
  campusName: { fontSize: 14, fontWeight: '800', color: '#e2e8f0', marginRight: 4, maxWidth: 160 },

  lostFoundBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(251,191,36,0.15)', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(251,191,36,0.3)',
  },
  lostFoundText: { fontSize: 11, color: '#fbbf24', fontWeight: '700', marginLeft: 4 },

  // Search
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1e293b', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1, borderColor: '#334155',
  },
  searchInput: { flex: 1, fontSize: 15, color: '#e2e8f0', padding: 0 },

  // Chips
  chipsScroll: { marginBottom: 2 },
  chipsContent: { paddingRight: 16, gap: 8, flexDirection: 'row' },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1e293b', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: '#334155',
  },
  chipActive: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  chipText: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  chipTextActive: { color: '#fff' },

  // Banner
  bannerWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1e293b', marginHorizontal: 16, marginTop: 12,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1, borderColor: '#334155',
  },
  bannerText: { color: '#94a3b8', fontSize: 12, flex: 1 },
  bannerHighlight: { color: '#fbbf24', fontWeight: '700' },

  // Grid
  gridPad: { padding: 16, paddingBottom: 100 },
  row: { justifyContent: 'space-between' },
  gridRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  gridLeft:  { width: CARD_WIDTH },
  gridRight: { width: CARD_WIDTH },

  // List header
  listHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 14,
  },
  listHeaderText: { fontSize: 17, fontWeight: '800', color: '#1e293b' },
  listHeaderCount: { fontSize: 13, color: '#64748b', fontWeight: '600' },

  // Empty
  emptyWrap: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyIcon: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: '#e0e7ff', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#1e293b', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 20 },
  clearBtn: {
    marginTop: 20, backgroundColor: '#4f46e5',
    borderRadius: 12, paddingHorizontal: 24, paddingVertical: 10,
  },
  clearBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingTop: 12, paddingHorizontal: 20, paddingBottom: 36, maxHeight: '80%',
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0',
    alignSelf: 'center', marginBottom: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a', textAlign: 'center', marginBottom: 4 },
  modalSubtitle: { fontSize: 13, color: '#64748b', textAlign: 'center', marginBottom: 14 },
  modalSearch: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f1f5f9', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  modalSearchInput: { flex: 1, fontSize: 14, color: '#0f172a', padding: 0 },
  collegeList: { flexGrow: 0 },
  collegeRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 13, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
    borderRadius: 12,
  },
  collegeRowActive: { backgroundColor: '#ede9fe' },
  collegeEmoji: { fontSize: 22, marginRight: 12 },
  collegeInfo: { flex: 1 },
  collegeName: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  collegeNameActive: { color: '#4f46e5', fontWeight: '800' },
  collegeLocation: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  collegeMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  homeBadge: {
    backgroundColor: '#dcfce7', borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  homeBadgeText: { fontSize: 10, color: '#15803d', fontWeight: '700' },
  modalClose: {
    marginTop: 16, backgroundColor: '#f1f5f9', borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
  },
  modalCloseText: { color: '#ef4444', fontWeight: '700', fontSize: 15 },
});

export default HomeScreen;
