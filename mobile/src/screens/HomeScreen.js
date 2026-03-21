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

const { width: SW } = Dimensions.get('window');
const CARD_W = (SW - 48) / 2;
const SPOT_W = SW - 40;

// ─── AnimatedPressable ────────────────────────────────────────────────────────
const Press = ({ children, onPress, style, disabled }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const pressIn = () =>
    Animated.spring(scale, { toValue: 0.93, useNativeDriver: true, speed: 80, bounciness: 4 }).start();
  const pressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 80, bounciness: 6 }).start();
  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      activeOpacity={1}
      disabled={disabled}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
};

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { label: 'All',               icon: 'apps-outline' },
  { label: 'Cycles',            icon: 'bicycle-outline' },
  { label: 'Electronics',       icon: 'phone-portrait-outline' },
  { label: 'Books & Notes',     icon: 'book-outline' },
  { label: 'Hostel Essentials', icon: 'bed-outline' },
  { label: 'Other',             icon: 'ellipsis-horizontal-circle-outline' },
];

const QUICK = [
  { label: 'Books',       icon: 'book',            color: '#818cf8', glow: '#6366f1', cat: 'Books & Notes' },
  { label: 'Electronics', icon: 'phone-portrait',  color: '#34d399', glow: '#10b981', cat: 'Electronics' },
  { label: 'Cycles',      icon: 'bicycle',         color: '#38bdf8', glow: '#0284c7', cat: 'Cycles' },
  { label: 'Hostel',      icon: 'bed',             color: '#fb923c', glow: '#ea580c', cat: 'Hostel Essentials' },
  { label: 'Lost',        icon: 'search',          color: '#f472b6', glow: '#db2777', cat: '__lost__' },
];

const TILES = [
  { label: 'Books',       icon: 'book',           bg: '#312e81', accent: '#6366f1', tall: true,  cat: 'Books & Notes' },
  { label: 'Electronics', icon: 'phone-portrait', bg: '#7c2d12', accent: '#fb923c', tall: false, cat: 'Electronics' },
  { label: 'Hostel',      icon: 'bed',            bg: '#064e3b', accent: '#34d399', tall: false, cat: 'Hostel Essentials' },
  { label: 'Cycles',      icon: 'bicycle',        bg: '#0c4a6e', accent: '#38bdf8', tall: false, cat: 'Cycles' },
  { label: 'Lost & Found',icon: 'search-circle',  bg: '#4a044e', accent: '#e879f9', tall: false, cat: '__lost__' },
];

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const Skeleton = ({ shimmer, w, h, radius = 10, style }) => {
  const op = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.55] });
  return <Animated.View style={[{ width: w, height: h, borderRadius: radius, backgroundColor: '#1e293b', opacity: op }, style]} />;
};

// ─── Spotlight Card ───────────────────────────────────────────────────────────
const SpotlightCard = ({ item, onPress }) => {
  const img = item.imageUrl || item.image || item.images?.[0];
  return (
    <Press onPress={onPress} style={sp.card}>
      {img
        ? <Image source={{ uri: img }} style={sp.img} resizeMode="cover" />
        : <View style={[sp.img, sp.noImg]}><Ionicons name="image-outline" size={36} color="#334155" /></View>
      }
      <View style={sp.grad} />
      <View style={sp.topRow}>
        <View style={sp.badge}><Text style={sp.badgeText}>✦  Campus Spotlight</Text></View>
      </View>
      <View style={sp.bottom}>
        <Text style={sp.itemName} numberOfLines={1}>{item.name || item.title}</Text>
        <View style={sp.priceRow}>
          {item.price != null && <Text style={sp.price}>₹{item.price}</Text>}
          <View style={sp.viewBtn}><Text style={sp.viewTxt}>View  →</Text></View>
        </View>
      </View>
    </Press>
  );
};

// ─── HomeScreen ───────────────────────────────────────────────────────────────
const HomeScreen = ({ navigation }) => {
  const { currentUser, isGuest, logout } = useContext(AuthContext);

  const getInitialCampus = () => {
    if (isGuest || !currentUser?.college) return colleges[0];
    const uc = currentUser.college.toLowerCase();
    return colleges.find(c => {
      const cn = c.name.toLowerCase(), cs = (c.shortName || '').toLowerCase();
      return cn === uc || cn.includes(uc) || uc.includes(cn) || (cs && uc.includes(cs));
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
  const [dotIndex, setDotIndex]             = useState(0);

  // Animations
  const shimmer    = useRef(new Animated.Value(0)).current;
  const heroAnim   = useRef(new Animated.Value(0)).current;
  const sec1Anim   = useRef(new Animated.Value(0)).current;
  const sec2Anim   = useRef(new Animated.Value(0)).current;
  const sec3Anim   = useRef(new Animated.Value(0)).current;
  const sec4Anim   = useRef(new Animated.Value(0)).current;
  const spotlightRef = useRef(null);
  const spotIdx    = useRef(0);

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
    ])).start();
  }, []);

  // Staggered entrance
  useEffect(() => {
    Animated.stagger(140, [heroAnim, sec1Anim, sec2Anim, sec3Anim, sec4Anim].map(a =>
      Animated.timing(a, { toValue: 1, duration: 520, useNativeDriver: true })
    )).start();
  }, []);

  // Auto-scroll spotlight
  useEffect(() => {
    if (items.length < 2) return;
    const spots = items.slice(0, 6);
    const t = setInterval(() => {
      spotIdx.current = (spotIdx.current + 1) % spots.length;
      spotlightRef.current?.scrollTo({ x: spotIdx.current * (SPOT_W + 14), animated: true });
      setDotIndex(spotIdx.current);
    }, 3200);
    return () => clearInterval(t);
  }, [items.length]);

  useEffect(() => {
    if (!isGuest && currentUser?.college) {
      const uc = currentUser.college.toLowerCase();
      const match = colleges.find(c => {
        const cn = c.name.toLowerCase(), cs = (c.shortName || '').toLowerCase();
        return cn === uc || cn.includes(uc) || uc.includes(cn) || (cs && uc.includes(cs));
      });
      if (match && match.name !== activeCampus.name) setActiveCampus(match);
    }
  }, [currentUser, isGuest]);

  const isWindowShopping = !isGuest && currentUser &&
    activeCampus.name.toLowerCase() !== (currentUser.college || '').toLowerCase();

  const fetchItems = useCallback(async () => {
    try {
      let url = `/items?college=${activeCampus.name}`;
      if (searchQuery)       url += `&search=${encodeURIComponent(searchQuery)}`;
      if (activeCategory !== 'All') url += `&category=${encodeURIComponent(activeCategory)}`;
      const res = await API.get(url);
      setItems(res.data);
    } catch (e) {
      console.error('fetchItems:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery, activeCategory, activeCampus]);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(fetchItems, 380);
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
      Alert.alert('Login Required', 'Log in to see details and contact sellers.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log In', onPress: logout },
      ]);
      return;
    }
    const isOwner = currentUser &&
      (item.seller === currentUser._id || item.seller?._id === currentUser._id);
    navigation.navigate('ItemDetails', { item, activeCollege: activeCampus.name, isOwner: !!isOwner });
  };

  const handleQuick = (cat) => {
    if (cat === '__lost__') navigation.navigate('LostFound');
    else setActiveCategory(cat);
  };

  const handleTile = (cat) => {
    if (cat === '__lost__') navigation.navigate('LostFound');
    else setActiveCategory(cat);
  };

  const spots = items.slice(0, 6);
  const recent = items.slice(0, 12);

  const makeAnim = (anim, dy = 22) => ({
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [dy, 0] }) }],
  });

  // ─── List Header ────────────────────────────────────────────────────────────
  const Header = () => (
    <View>
      {/* ── Hero ── */}
      <Animated.View style={[makeAnim(heroAnim, 18)]}>
        {/* Decorative orbs */}
        <View style={styles.orb1} />
        <View style={styles.orb2} />

        <View style={styles.heroInner}>
          <View style={styles.heroTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.greeting}>{getGreeting()} 👋</Text>
              <Text style={styles.heroName} numberOfLines={1}>
                {isGuest ? 'Guest' : (currentUser?.name?.split(' ')[0] || 'Student')}
              </Text>
            </View>
            <Press onPress={() => setModalVisible(true)} style={styles.campusBadge}>
              <Text style={styles.campusEmoji}>{activeCampus.emoji}</Text>
              <Text style={styles.campusShort} numberOfLines={1}>
                {activeCampus.shortName || activeCampus.name}
              </Text>
              <Ionicons name="chevron-down" size={12} color="#818cf8" />
            </Press>
          </View>

          {/* Search bar */}
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={17} color="#64748b" style={{ marginRight: 9 }} />
            <TextInput
              style={styles.searchInput}
              placeholder={`Search in ${activeCampus.shortName || 'campus'}…`}
              placeholderTextColor="#475569"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color="#475569" />
              </TouchableOpacity>
            )}
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statChip}>
              <Ionicons name="storefront-outline" size={13} color="#818cf8" />
              <Text style={styles.statText}>{items.length} listings</Text>
            </View>
            <View style={styles.statChip}>
              <Ionicons name="location-outline" size={13} color="#34d399" />
              <Text style={[styles.statText, { color: '#34d399' }]}>
                {activeCampus.shortName || activeCampus.name}
              </Text>
            </View>
            {isWindowShopping && (
              <View style={[styles.statChip, { borderColor: '#fbbf2440' }]}>
                <Ionicons name="eye-outline" size={13} color="#fbbf24" />
                <Text style={[styles.statText, { color: '#fbbf24' }]}>Browse only</Text>
              </View>
            )}
          </View>
        </View>
      </Animated.View>

      {/* ── Spotlight ── */}
      {(spots.length > 0 || loading) && (
        <Animated.View style={[styles.section, makeAnim(sec1Anim)]}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>✦ Campus Spotlight</Text>
          </View>

          {loading ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingRight: 20 }}>
              {[0, 1, 2].map(i => <Skeleton key={i} shimmer={shimmer} w={SPOT_W} h={210} radius={22} />)}
            </ScrollView>
          ) : (
            <>
              <ScrollView
                ref={spotlightRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 14, paddingRight: 20 }}
                onMomentumScrollEnd={(e) => {
                  const idx = Math.round(e.nativeEvent.contentOffset.x / (SPOT_W + 14));
                  setDotIndex(idx);
                  spotIdx.current = idx;
                }}
              >
                {spots.map(item => (
                  <SpotlightCard key={item._id} item={item} onPress={() => handleItemPress(item)} />
                ))}
              </ScrollView>
              {spots.length > 1 && (
                <View style={styles.dots}>
                  {spots.map((_, i) => (
                    <View key={i} style={[styles.dot, i === dotIndex && styles.dotActive]} />
                  ))}
                </View>
              )}
            </>
          )}
        </Animated.View>
      )}

      {/* ── Quick Actions ── */}
      <Animated.View style={[styles.section, makeAnim(sec2Anim)]}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickRow}>
          {QUICK.map((q) => (
            <Press key={q.label} onPress={() => handleQuick(q.cat)} style={styles.quickItem}>
              <View style={[styles.quickCircle, { borderColor: q.glow + '60', shadowColor: q.glow }]}>
                {/* Glow background */}
                <View style={[styles.quickGlow, { backgroundColor: q.glow + '20' }]} />
                <Ionicons name={q.icon} size={26} color={q.color} />
              </View>
              <Text style={styles.quickLabel}>{q.label}</Text>
            </Press>
          ))}
        </View>
      </Animated.View>

      {/* ── Trending Tiles ── */}
      <Animated.View style={[styles.section, makeAnim(sec3Anim)]}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Trending Now</Text>
          <Text style={styles.sectionSub}>{activeCampus.shortName || activeCampus.name}</Text>
        </View>
        <View style={styles.grid}>
          {/* Tall left tile */}
          <Press onPress={() => handleTile(TILES[0].cat)} style={[styles.tile, styles.tileTall, { backgroundColor: TILES[0].bg }]}>
            <View style={[styles.tileAccent, { backgroundColor: TILES[0].accent + '25' }]} />
            <View style={[styles.tileCircle, { backgroundColor: TILES[0].accent + '30', borderColor: TILES[0].accent + '50' }]}>
              <Ionicons name={TILES[0].icon} size={30} color={TILES[0].accent} />
            </View>
            <Text style={styles.tileName}>{TILES[0].label}</Text>
            <View style={[styles.tilePill, { backgroundColor: TILES[0].accent + '30' }]}>
              <Text style={[styles.tilePillText, { color: TILES[0].accent }]}>Shop →</Text>
            </View>
          </Press>

          {/* Right 2×2 */}
          <View style={styles.tileRight}>
            {TILES.slice(1).map((tile) => (
              <Press key={tile.label} onPress={() => handleTile(tile.cat)} style={[styles.tile, styles.tileSmall, { backgroundColor: tile.bg }]}>
                <View style={[styles.tileAccent, { backgroundColor: tile.accent + '20' }]} />
                <Ionicons name={tile.icon} size={22} color={tile.accent} style={{ marginBottom: 6 }} />
                <Text style={styles.tileNameSm} numberOfLines={1}>{tile.label}</Text>
              </Press>
            ))}
          </View>
        </View>
      </Animated.View>

      {/* ── Recent Activity ── */}
      {recent.length > 0 && (
        <Animated.View style={[styles.section, makeAnim(sec4Anim)]}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 20 }}>
            {recent.map((item) => (
              <Press key={item._id} onPress={() => handleItemPress(item)} style={styles.pill}>
                <Text style={styles.pillText} numberOfLines={1}>{item.name || item.title}</Text>
              </Press>
            ))}
          </ScrollView>
        </Animated.View>
      )}

      {/* ── Filter Bar ── */}
      <View style={[styles.section, { paddingBottom: 0 }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 20 }}>
          {CATEGORIES.map((cat) => {
            const active = activeCategory === cat.label;
            return (
              <Press
                key={cat.label}
                onPress={() => setActiveCategory(cat.label)}
                style={[styles.chip, active && styles.chipOn]}
              >
                <Ionicons name={cat.icon} size={13} color={active ? '#fff' : '#64748b'} style={{ marginRight: 5 }} />
                <Text style={[styles.chipTxt, active && styles.chipTxtOn]}>{cat.label}</Text>
              </Press>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Listings Label ── */}
      <View style={styles.listHead}>
        <Text style={styles.listTitle}>
          {activeCategory === 'All' ? 'All Listings' : activeCategory}
        </Text>
        {!loading && <Text style={styles.listCount}>{items.length}</Text>}
      </View>

      {/* Skeleton grid while loading */}
      {loading && (
        <View style={styles.skRow}>
          {[0, 1, 2, 3].map(i => <Skeleton key={i} shimmer={shimmer} w={CARD_W} h={CARD_W * 1.25} radius={14} style={{ marginBottom: 16 }} />)}
        </View>
      )}
    </View>
  );

  const renderItem = useCallback(({ item, index }) => (
    <View style={index % 2 === 0 ? styles.colL : styles.colR}>
      <ItemCard item={item} onPress={() => handleItemPress(item)} compact />
    </View>
  ), [currentUser, isGuest, activeCampus]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar backgroundColor="#07090f" barStyle="light-content" />

      {loading ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.pad}>
          <Header />
        </ScrollView>
      ) : (
        <FlatList
          data={items}
          keyExtractor={i => i._id}
          numColumns={2}
          contentContainerStyle={styles.pad}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6366f1']} tintColor="#6366f1" />}
          renderItem={renderItem}
          ListHeaderComponent={<Header />}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <View style={styles.emptyOrb}>
                <Ionicons name="storefront-outline" size={44} color="#818cf8" />
              </View>
              <Text style={styles.emptyTitle}>
                {searchQuery || activeCategory !== 'All' ? 'No results' : 'No listings yet'}
              </Text>
              <Text style={styles.emptySub}>
                {searchQuery || activeCategory !== 'All'
                  ? 'Try different keywords or clear filters.'
                  : `Be the first to list on ${activeCampus.shortName || activeCampus.name}!`}
              </Text>
              {(searchQuery || activeCategory !== 'All') && (
                <Press onPress={() => { setSearchQuery(''); setActiveCategory('All'); }} style={styles.clearBtn}>
                  <Text style={styles.clearTxt}>Clear filters</Text>
                </Press>
              )}
            </View>
          }
        />
      )}

      {/* ── Campus Picker Modal ── */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBg}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Window Shopping 🛍️</Text>
            <Text style={styles.sheetSub}>Browse listings from any campus</Text>
            <View style={styles.mSearch}>
              <Ionicons name="search" size={15} color="#64748b" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.mSearchInput}
                placeholder="Search colleges…"
                placeholderTextColor="#64748b"
                value={collegeSearch}
                onChangeText={setCollegeSearch}
              />
            </View>
            <FlatList
              data={filteredColleges}
              keyExtractor={i => i.id}
              style={{ flexGrow: 0 }}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isActive = item.name === activeCampus.name;
                const isHome = !isGuest && currentUser &&
                  item.name.toLowerCase() === (currentUser.college || '').toLowerCase();
                return (
                  <TouchableOpacity
                    style={[styles.cRow, isActive && styles.cRowActive]}
                    onPress={() => { setActiveCampus(item); setModalVisible(false); setCollegeSearch(''); }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cEmoji}>{item.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.cName, isActive && styles.cNameActive]}>{item.name}</Text>
                      {item.location && <Text style={styles.cLoc}>{item.location}</Text>}
                    </View>
                    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                      {isHome && <View style={styles.homeBadge}><Text style={styles.homeTxt}>Home</Text></View>}
                      {isActive && <Ionicons name="checkmark-circle" size={20} color="#6366f1" />}
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
            <TouchableOpacity style={styles.cancelBtn} onPress={() => { setModalVisible(false); setCollegeSearch(''); }}>
              <Text style={styles.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ─── Spotlight styles ─────────────────────────────────────────────────────────
const sp = StyleSheet.create({
  card: {
    width: SPOT_W, height: 215, borderRadius: 22, overflow: 'hidden',
    backgroundColor: '#0f172a',
    shadowColor: '#6366f1', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 16, elevation: 12,
  },
  img: { ...StyleSheet.absoluteFillObject },
  noImg: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1e293b' },
  grad: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    // Simulate gradient with two overlapping views
  },
  topRow: { position: 'absolute', top: 14, left: 14, right: 14 },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(99,102,241,0.75)',
    borderRadius: 20, paddingHorizontal: 11, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(165,180,252,0.4)',
  },
  badgeText: { color: '#e0e7ff', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  bottom: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: 'rgba(0,0,0,0.55)' },
  itemName: { fontSize: 17, fontWeight: '900', color: '#fff', marginBottom: 8 },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  price: { fontSize: 16, fontWeight: '800', color: '#34d399' },
  viewBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  viewTxt: { color: '#fff', fontSize: 13, fontWeight: '800' },
});

// ─── Main styles ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#07090f' },
  pad: { paddingBottom: 110 },

  // Decorative orbs
  orb1: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: '#6366f1', opacity: 0.07,
    top: -60, right: -60,
  },
  orb2: {
    position: 'absolute', width: 150, height: 150, borderRadius: 75,
    backgroundColor: '#06b6d4', opacity: 0.06,
    top: 20, left: -40,
  },

  // Hero
  heroInner: { paddingHorizontal: 18, paddingTop: Platform.OS === 'android' ? 10 : 6, paddingBottom: 20 },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 18 },
  greeting: { fontSize: 13, color: '#64748b', fontWeight: '600', marginBottom: 4 },
  heroName: { fontSize: 26, fontWeight: '900', color: '#f1f5f9', maxWidth: SW * 0.55 },
  campusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#111827', borderRadius: 16,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: '#1e3a5f',
    shadowColor: '#6366f1', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  campusEmoji: { fontSize: 16 },
  campusShort: { fontSize: 13, fontWeight: '800', color: '#cbd5e1', maxWidth: 80 },

  // Search
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0f172a', borderRadius: 16,
    paddingHorizontal: 15, paddingVertical: 12,
    borderWidth: 1, borderColor: '#1e293b', marginBottom: 14,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#e2e8f0', padding: 0 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 8 },
  statChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#0f172a', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: '#1e293b',
  },
  statText: { fontSize: 12, color: '#818cf8', fontWeight: '700' },

  // Section
  section: { paddingHorizontal: 18, marginBottom: 28 },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 },
  sectionTitle: { fontSize: 17, fontWeight: '900', color: '#f1f5f9', marginBottom: 14, letterSpacing: 0.2 },
  sectionSub: { fontSize: 12, color: '#64748b', fontWeight: '600' },

  // Dots
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 12 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#1e293b' },
  dotActive: { width: 18, backgroundColor: '#6366f1' },

  // Quick actions
  quickRow: { flexDirection: 'row', justifyContent: 'space-between' },
  quickItem: { alignItems: 'center', flex: 1 },
  quickCircle: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, marginBottom: 8,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6,
    overflow: 'hidden',
  },
  quickGlow: { ...StyleSheet.absoluteFillObject },
  quickLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '700', textAlign: 'center' },

  // Trending grid
  grid: { flexDirection: 'row', gap: 10 },
  tileRight: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { borderRadius: 20, overflow: 'hidden', padding: 14, justifyContent: 'flex-end' },
  tileTall: { width: (SW - 56) * 0.42, aspectRatio: 0.72, justifyContent: 'flex-end' },
  tileSmall: { width: '47%', aspectRatio: 1.05, justifyContent: 'center', alignItems: 'flex-start' },
  tileAccent: { ...StyleSheet.absoluteFillObject },
  tileCircle: {
    width: 54, height: 54, borderRadius: 27,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, marginBottom: 12,
  },
  tileName: { fontSize: 15, fontWeight: '900', color: '#fff', marginBottom: 10 },
  tileNameSm: { fontSize: 12, fontWeight: '800', color: '#fff' },
  tilePill: { alignSelf: 'flex-start', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  tilePillText: { fontSize: 12, fontWeight: '800' },

  // Pills
  pill: {
    backgroundColor: '#111827', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 9,
    borderWidth: 1, borderColor: '#1e293b', maxWidth: 200,
  },
  pillText: { fontSize: 13, color: '#cbd5e1', fontWeight: '600' },

  // Filter chips
  chip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0f172a', borderRadius: 20,
    paddingHorizontal: 13, paddingVertical: 7,
    borderWidth: 1, borderColor: '#1e293b',
  },
  chipOn: { backgroundColor: '#4f46e5', borderColor: '#6366f1' },
  chipTxt: { fontSize: 12, color: '#64748b', fontWeight: '700' },
  chipTxtOn: { color: '#fff' },

  // Listings header
  listHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 14,
  },
  listTitle: { fontSize: 17, fontWeight: '900', color: '#f1f5f9' },
  listCount: {
    fontSize: 13, color: '#6366f1', fontWeight: '800',
    backgroundColor: '#1e1b4b', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 3,
  },

  // Item grid
  row: { justifyContent: 'space-between', paddingHorizontal: 18 },
  colL: { width: CARD_W },
  colR: { width: CARD_W },
  skRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12,
    justifyContent: 'space-between', paddingHorizontal: 18,
  },

  // Empty
  emptyBox: { alignItems: 'center', paddingTop: 48, paddingHorizontal: 36 },
  emptyOrb: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: '#1e1b4b', alignItems: 'center', justifyContent: 'center', marginBottom: 18,
    borderWidth: 1, borderColor: '#312e81',
  },
  emptyTitle: { fontSize: 20, fontWeight: '900', color: '#f1f5f9', marginBottom: 8 },
  emptySub: { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 20 },
  clearBtn: {
    marginTop: 18, backgroundColor: '#4f46e5', borderRadius: 14,
    paddingHorizontal: 24, paddingVertical: 12,
  },
  clearTxt: { color: '#fff', fontWeight: '800', fontSize: 14 },

  // Modal
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#0f172a', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingTop: 12, paddingHorizontal: 20, paddingBottom: 36, maxHeight: '82%',
    borderWidth: 1, borderColor: '#1e293b',
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#334155', alignSelf: 'center', marginBottom: 18 },
  sheetTitle: { fontSize: 20, fontWeight: '900', color: '#f1f5f9', textAlign: 'center', marginBottom: 4 },
  sheetSub: { fontSize: 13, color: '#64748b', textAlign: 'center', marginBottom: 16 },
  mSearch: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1e293b', borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 11, marginBottom: 12,
    borderWidth: 1, borderColor: '#334155',
  },
  mSearchInput: { flex: 1, fontSize: 14, color: '#f1f5f9', padding: 0 },
  cRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 13, paddingHorizontal: 8,
    borderBottomWidth: 1, borderBottomColor: '#1e293b', borderRadius: 14,
  },
  cRowActive: { backgroundColor: 'rgba(99,102,241,0.12)' },
  cEmoji: { fontSize: 22, marginRight: 12 },
  cName: { fontSize: 15, fontWeight: '600', color: '#e2e8f0' },
  cNameActive: { color: '#818cf8', fontWeight: '800' },
  cLoc: { fontSize: 12, color: '#475569', marginTop: 2 },
  homeBadge: { backgroundColor: '#dcfce7', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  homeTxt: { fontSize: 10, color: '#15803d', fontWeight: '800' },
  cancelBtn: {
    marginTop: 16, backgroundColor: '#1e293b', borderRadius: 16,
    paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: '#334155',
  },
  cancelTxt: { color: '#ef4444', fontWeight: '800', fontSize: 15 },
});

export default HomeScreen;
