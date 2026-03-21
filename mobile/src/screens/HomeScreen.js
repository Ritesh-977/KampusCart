import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl,
  TouchableOpacity, Modal, TextInput, ScrollView,
  Alert, Platform, Animated, Dimensions, StatusBar, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import API from '../api/axios';
import ItemCard from '../components/ItemCard';
import { colleges } from '../utils/colleges';
import { AuthContext } from '../context/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;
const SPOTLIGHT_W = SCREEN_WIDTH - 48;

const CATEGORIES = [
  { label: 'All',               icon: 'apps-outline' },
  { label: 'Cycles',            icon: 'bicycle-outline' },
  { label: 'Electronics',       icon: 'phone-portrait-outline' },
  { label: 'Books & Notes',     icon: 'book-outline' },
  { label: 'Hostel Essentials', icon: 'bed-outline' },
  { label: 'Other',             icon: 'ellipsis-horizontal-circle-outline' },
];

const QUICK_ACTIONS = [
  { label: 'Books',       icon: 'book-outline',           color: '#818cf8', bg: 'rgba(129,140,248,0.15)', category: 'Books & Notes' },
  { label: 'Electronics', icon: 'phone-portrait-outline', color: '#22d3ee', bg: 'rgba(34,211,238,0.15)',  category: 'Electronics' },
  { label: 'Cycles',      icon: 'bicycle-outline',        color: '#4ade80', bg: 'rgba(74,222,128,0.15)',  category: 'Cycles' },
  { label: 'Hostel',      icon: 'bed-outline',            color: '#f472b6', bg: 'rgba(244,114,182,0.15)', category: 'Hostel Essentials' },
  { label: 'Lost',        icon: 'search-outline',         color: '#fbbf24', bg: 'rgba(251,191,36,0.15)',  category: 'lost' },
];

const TRENDING_TILES = [
  { label: 'Books & Notes',     colors: ['#3b82f6', '#4f46e5'], tall: true },
  { label: 'Electronics',       colors: ['#f97316', '#ef4444'], tall: false },
  { label: 'Hostel Essentials', colors: ['#22c55e', '#10b981'], tall: false },
  { label: 'Cycles',            colors: ['#a3e635', '#22c55e'], tall: false },
  { label: 'Lost & Found',      colors: ['#ec4899', '#9333ea'], tall: false },
];

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const SkeletonCard = ({ shimmer }) => {
  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });
  return (
    <View style={[sk.card, { width: CARD_WIDTH }]}>
      <Animated.View style={[sk.img, { opacity }]} />
      <View style={sk.body}>
        <Animated.View style={[sk.line, { width: '85%', opacity }]} />
        <Animated.View style={[sk.line, { width: '50%', marginTop: 6, opacity }]} />
      </View>
    </View>
  );
};

// ─── Spotlight Card ───────────────────────────────────────────────────────────
const SpotlightCard = ({ item, onPress }) => {
  const img = item.imageUrl || item.image || item.images?.[0] || null;
  return (
    <TouchableOpacity style={sp.card} onPress={onPress} activeOpacity={0.9}>
      {img ? (
        <Image source={{ uri: img }} style={sp.img} resizeMode="cover" />
      ) : (
        <View style={[sp.img, { backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center' }]}>
          <Ionicons name="image-outline" size={40} color="#334155" />
        </View>
      )}
      {/* Dark gradient overlay */}
      <View style={sp.overlay} />
      <View style={sp.badge}>
        <Text style={sp.badgeText}>Campus Spotlight</Text>
      </View>
      <View style={sp.footer}>
        <Text style={sp.itemName} numberOfLines={1}>
          {item.category ? `${item.category}: ` : ''}{item.name || item.title}
        </Text>
        <TouchableOpacity style={sp.viewBtn} onPress={onPress}>
          <Text style={sp.viewBtnText}>View</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
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

  const [activeCampus, setActiveCampus]     = useState(getInitialCampus);
  const [items, setItems]                   = useState([]);
  const [loading, setLoading]               = useState(true);
  const [refreshing, setRefreshing]         = useState(false);
  const [searchQuery, setSearchQuery]       = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [modalVisible, setModalVisible]     = useState(false);
  const [collegeSearch, setCollegeSearch]   = useState('');

  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

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

  const userCampusName = currentUser?.college || '';
  const isWindowShopping = !isGuest && currentUser &&
    activeCampus.name.toLowerCase() !== userCampusName.toLowerCase();

  const fetchItems = useCallback(async () => {
    try {
      let url = `/items?college=${activeCampus.name}`;
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
      if (activeCategory !== 'All') url += `&category=${encodeURIComponent(activeCategory)}`;
      const res = await API.get(url);
      setItems(res.data);
    } catch (e) {
      console.error('Error fetching items:', e);
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
      Alert.alert('Login Required', 'Please log in to view item details.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log In', onPress: logout },
      ]);
      return;
    }
    const isOwner = currentUser &&
      (item.seller === currentUser._id || item.seller?._id === currentUser._id);
    navigation.navigate('ItemDetails', { item, activeCollege: activeCampus.name, isOwner: !!isOwner });
  };

  const handleQuickAction = (action) => {
    if (action.category === 'lost') {
      navigation.navigate('LostFound');
    } else {
      setActiveCategory(action.category);
    }
  };

  const handleTrendingTile = (label) => {
    if (label === 'Lost & Found') {
      navigation.navigate('LostFound');
    } else {
      setActiveCategory(label);
    }
  };

  const spotlightItems = items.slice(0, 6);
  const recentItems = items.slice(0, 10);

  const renderItem = useCallback(({ item, index }) => (
    <View style={index % 2 === 0 ? styles.gridLeft : styles.gridRight}>
      <ItemCard item={item} onPress={() => handleItemPress(item)} compact />
    </View>
  ), [currentUser, isGuest, activeCampus]);

  // ─── List Header ────────────────────────────────────────────────────────────
  const ListHeader = () => (
    <View>
      {/* ── Campus Header ── */}
      <View style={styles.campusHeader}>
        <TouchableOpacity
          style={styles.campusNameRow}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.campusTitle} numberOfLines={1}>
            {activeCampus.shortName || activeCampus.name}
          </Text>
          <Ionicons name="pencil" size={16} color="#818cf8" style={{ marginLeft: 6 }} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.changeBtn}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.changeBtnText}>Change</Text>
        </TouchableOpacity>
      </View>

      {/* ── Window-shopping banner ── */}
      {isWindowShopping && (
        <View style={styles.bannerWrap}>
          <Ionicons name="eye-outline" size={13} color="#fbbf24" style={{ marginRight: 6 }} />
          <Text style={styles.bannerText}>
            Viewing <Text style={styles.bannerHighlight}>{activeCampus.shortName || activeCampus.name}</Text> — browse only
          </Text>
        </View>
      )}

      {/* ── Campus Spotlight ── */}
      {spotlightItems.length > 0 && (
        <View style={styles.section}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.spotlightScroll}
            pagingEnabled
          >
            {spotlightItems.map((item) => (
              <SpotlightCard
                key={item._id}
                item={item}
                onPress={() => handleItemPress(item)}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* ── Quick Actions ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickRow}>
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.label}
              style={styles.quickItem}
              onPress={() => handleQuickAction(action)}
              activeOpacity={0.75}
            >
              <View style={[styles.quickCircle, { backgroundColor: action.bg, borderColor: action.color + '40' }]}>
                <Ionicons name={action.icon} size={26} color={action.color} />
              </View>
              <Text style={styles.quickLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Trending Grid ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Trending in {activeCampus.shortName || activeCampus.name}
        </Text>
        <View style={styles.trendingGrid}>
          {/* Left tall tile */}
          <TouchableOpacity
            style={[styles.tile, styles.tileTall, { backgroundColor: TRENDING_TILES[0].colors[0] }]}
            onPress={() => handleTrendingTile(TRENDING_TILES[0].label)}
            activeOpacity={0.85}
          >
            <View style={[styles.tileOverlay, { backgroundColor: TRENDING_TILES[0].colors[1] + '80' }]} />
            <Text style={styles.tileLabel}>{TRENDING_TILES[0].label.replace(' & Notes', '')}</Text>
          </TouchableOpacity>

          {/* Right 2x2 grid */}
          <View style={styles.tileRightCol}>
            {TRENDING_TILES.slice(1).map((tile) => (
              <TouchableOpacity
                key={tile.label}
                style={[styles.tile, styles.tileSmall, { backgroundColor: tile.colors[0] }]}
                onPress={() => handleTrendingTile(tile.label)}
                activeOpacity={0.85}
              >
                <View style={[styles.tileOverlay, { backgroundColor: tile.colors[1] + '80' }]} />
                <Text style={styles.tileLabel} numberOfLines={1}>
                  {tile.label.replace(' Essentials', '').replace(' & Notes', '')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* ── Recent Activity ── */}
      {recentItems.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.activityScroll}
          >
            {recentItems.map((item) => (
              <TouchableOpacity
                key={item._id}
                style={styles.activityPill}
                onPress={() => handleItemPress(item)}
                activeOpacity={0.8}
              >
                <Text style={styles.activityText} numberOfLines={1}>{item.name || item.title}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ── Search + Categories ── */}
      <View style={[styles.section, { paddingBottom: 0 }]}>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={17} color="#64748b" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search on ${activeCampus.shortName || 'campus'}…`}
            placeholderTextColor="#64748b"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={17} color="#64748b" />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsContent}
          style={{ marginBottom: 4 }}
        >
          {CATEGORIES.map((cat) => {
            const active = activeCategory === cat.label;
            return (
              <TouchableOpacity
                key={cat.label}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setActiveCategory(cat.label)}
                activeOpacity={0.75}
              >
                <Ionicons name={cat.icon} size={12} color={active ? '#fff' : '#94a3b8'} style={{ marginRight: 4 }} />
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{cat.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Listings header ── */}
      <View style={styles.listingsHeader}>
        <Text style={styles.listingsTitle}>
          {activeCategory === 'All' ? 'All Listings' : activeCategory}
        </Text>
        {!loading && <Text style={styles.listingsCount}>{items.length} items</Text>}
      </View>

      {/* Skeleton while loading */}
      {loading && (
        <View style={styles.skeletonGrid}>
          {[0, 1, 2, 3].map(i => (
            <View key={i} style={i % 2 === 0 ? styles.gridLeft : styles.gridRight}>
              <SkeletonCard shimmer={shimmer} />
            </View>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar backgroundColor="#0f172a" barStyle="light-content" />

      {loading ? (
        <ScrollView contentContainerStyle={styles.gridPad} showsVerticalScrollIndicator={false}>
          <ListHeader />
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
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4f46e5']} tintColor="#4f46e5" />
          }
          renderItem={renderItem}
          ListHeaderComponent={<ListHeader />}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIcon}>
                <Ionicons name="storefront-outline" size={48} color="#c7d2fe" />
              </View>
              <Text style={styles.emptyTitle}>
                {searchQuery || activeCategory !== 'All' ? 'No results found' : 'No listings yet'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery || activeCategory !== 'All'
                  ? 'Try different keywords or clear filters.'
                  : `Be the first to list at ${activeCampus.shortName || activeCampus.name}!`}
              </Text>
              {(searchQuery || activeCategory !== 'All') && (
                <TouchableOpacity style={styles.clearBtn} onPress={() => { setSearchQuery(''); setActiveCategory('All'); }}>
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
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Window Shopping 🛍️</Text>
            <Text style={styles.modalSubtitle}>Browse listings from any campus</Text>
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
                      <Text style={[styles.collegeName, isActive && styles.collegeNameActive]}>{item.name}</Text>
                      {item.location && <Text style={styles.collegeLocation}>{item.location}</Text>}
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
  card: { backgroundColor: '#1e293b', borderRadius: 16, overflow: 'hidden', marginBottom: 16 },
  img: { width: '100%', height: CARD_WIDTH * 0.85, backgroundColor: '#273549' },
  body: { padding: 10 },
  line: { height: 11, backgroundColor: '#273549', borderRadius: 6 },
});

// ─── Spotlight styles ─────────────────────────────────────────────────────────
const sp = StyleSheet.create({
  card: {
    width: SPOTLIGHT_W, height: 220, borderRadius: 20, overflow: 'hidden',
    marginRight: 16, backgroundColor: '#1e293b',
  },
  img: { ...StyleSheet.absoluteFillObject },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  badge: {
    position: 'absolute', top: 14, left: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  footer: {
    position: 'absolute', bottom: 14, left: 14, right: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  itemName: { fontSize: 16, fontWeight: '800', color: '#fff', flex: 1, marginRight: 10 },
  viewBtn: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  viewBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});

// ─── Main styles ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  gridPad: { paddingBottom: 100 },

  // Campus header
  campusHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 12 : 8, paddingBottom: 16,
  },
  campusNameRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  campusTitle: { fontSize: 22, fontWeight: '900', color: '#f1f5f9', maxWidth: '80%' },
  changeBtn: {
    backgroundColor: '#1e293b', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 7,
    borderWidth: 1, borderColor: '#334155',
  },
  changeBtnText: { color: '#94a3b8', fontSize: 13, fontWeight: '700' },

  // Banner
  bannerWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(251,191,36,0.1)', marginHorizontal: 16, marginBottom: 12,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(251,191,36,0.25)',
  },
  bannerText: { color: '#94a3b8', fontSize: 12, flex: 1 },
  bannerHighlight: { color: '#fbbf24', fontWeight: '700' },

  // Section
  section: { paddingHorizontal: 16, marginBottom: 24 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#f1f5f9', marginBottom: 14 },

  // Spotlight
  spotlightScroll: { paddingRight: 16 },

  // Quick actions
  quickRow: { flexDirection: 'row', justifyContent: 'space-between' },
  quickItem: { alignItems: 'center', flex: 1 },
  quickCircle: {
    width: 58, height: 58, borderRadius: 29,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, marginBottom: 8,
  },
  quickLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '600', textAlign: 'center' },

  // Trending grid
  trendingGrid: { flexDirection: 'row', gap: 10, height: 200 },
  tileRightCol: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { borderRadius: 18, overflow: 'hidden', justifyContent: 'flex-end', padding: 12 },
  tileTall: { width: (SCREEN_WIDTH - 58) * 0.42, alignSelf: 'stretch' },
  tileSmall: { width: '47%', height: 90 },
  tileOverlay: { ...StyleSheet.absoluteFillObject },
  tileLabel: { fontSize: 13, fontWeight: '800', color: '#fff', zIndex: 1 },

  // Recent activity
  activityScroll: { gap: 8, paddingRight: 16 },
  activityPill: {
    backgroundColor: '#1e293b', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: '#334155', maxWidth: 180,
  },
  activityText: { fontSize: 13, color: '#cbd5e1', fontWeight: '500' },

  // Search
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1e293b', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 10,
    marginBottom: 12, borderWidth: 1, borderColor: '#334155',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#e2e8f0', padding: 0 },

  // Chips
  chipsContent: { paddingRight: 16, gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1e293b', borderRadius: 20,
    paddingHorizontal: 11, paddingVertical: 6,
    borderWidth: 1, borderColor: '#334155',
  },
  chipActive: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  chipText: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  chipTextActive: { color: '#fff' },

  // Listings header
  listingsHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, marginBottom: 12, marginTop: 16,
  },
  listingsTitle: { fontSize: 17, fontWeight: '800', color: '#f1f5f9' },
  listingsCount: { fontSize: 13, color: '#64748b', fontWeight: '600' },

  // Skeleton grid
  skeletonGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    justifyContent: 'space-between', paddingHorizontal: 16,
  },

  // Item grid
  row: { justifyContent: 'space-between', paddingHorizontal: 16 },
  gridLeft:  { width: CARD_WIDTH },
  gridRight: { width: CARD_WIDTH },

  // Empty
  emptyWrap: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 32 },
  emptyIcon: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: 'rgba(79,70,229,0.15)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#f1f5f9', marginBottom: 6 },
  emptySubtitle: { fontSize: 13, color: '#94a3b8', textAlign: 'center', lineHeight: 20 },
  clearBtn: {
    marginTop: 16, backgroundColor: '#4f46e5',
    borderRadius: 12, paddingHorizontal: 22, paddingVertical: 10,
  },
  clearBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#1e293b', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingTop: 12, paddingHorizontal: 20, paddingBottom: 36, maxHeight: '80%',
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#334155', alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#f1f5f9', textAlign: 'center', marginBottom: 4 },
  modalSubtitle: { fontSize: 13, color: '#94a3b8', textAlign: 'center', marginBottom: 14 },
  modalSearch: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#273549', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12,
    borderWidth: 1, borderColor: '#334155',
  },
  modalSearchInput: { flex: 1, fontSize: 14, color: '#f1f5f9', padding: 0 },
  collegeList: { flexGrow: 0 },
  collegeRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 13, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: '#334155', borderRadius: 12,
  },
  collegeRowActive: { backgroundColor: 'rgba(79,70,229,0.2)' },
  collegeEmoji: { fontSize: 22, marginRight: 12 },
  collegeInfo: { flex: 1 },
  collegeName: { fontSize: 15, fontWeight: '600', color: '#f1f5f9' },
  collegeNameActive: { color: '#818cf8', fontWeight: '800' },
  collegeLocation: { fontSize: 12, color: '#64748b', marginTop: 2 },
  collegeMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  homeBadge: { backgroundColor: '#dcfce7', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  homeBadgeText: { fontSize: 10, color: '#15803d', fontWeight: '700' },
  modalClose: {
    marginTop: 16, backgroundColor: '#273549', borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
  },
  modalCloseText: { color: '#ef4444', fontWeight: '700', fontSize: 15 },
});

export default HomeScreen;
