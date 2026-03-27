import React, { useState, useEffect, useContext, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl,
  TouchableOpacity, Modal, TextInput, ScrollView,
  Alert, Platform, Animated, Dimensions, StatusBar, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API from '../api/axios';
import ItemCard from '../components/ItemCard';
import { colleges } from '../utils/colleges';
import { AuthContext } from '../context/AuthContext';
import { useThemeStyles } from '../hooks/useThemeStyles'; // <-- Make sure path is correct

const { width: SW } = Dimensions.get('window');
const CARD_W = (SW - 48) / 2;
const SPOT_W = SW - 40;

// ─── AnimatedPressable ────────────────────────────────────────────────────────
const Press = ({ children, onPress, style, disabled }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const pressIn  = () => Animated.spring(scale, { toValue: 0.93, useNativeDriver: true, speed: 80, bounciness: 4 }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, speed: 80, bounciness: 6 }).start();
  return (
    <TouchableOpacity onPress={onPress} onPressIn={pressIn} onPressOut={pressOut} activeOpacity={1} disabled={disabled}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
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
  { label: 'Stationery',        icon: 'pencil-outline' },
  { label: 'Other',             icon: 'ellipsis-horizontal-circle-outline' },
];

const KNOWN_CATEGORIES = ['Cycles', 'Electronics', 'Books & Notes', 'Hostel Essentials', 'Stationery'];

const fmtEventDate = (iso) => {
  const d = new Date(iso);
  return {
    date:  String(d.getDate()).padStart(2, '0'),
    month: d.toLocaleString('en-IN', { month: 'short' }).toUpperCase(),
    time:  d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
  };
};

const getRecentKey = (userId) => `@kampuscart/recent_items_${userId || 'guest'}`;

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const Skeleton = ({ shimmer, w, h, radius = 10, style, themeColors }) => {
  const op = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.55] });
  return <Animated.View style={[{ width: w, height: h, borderRadius: radius, backgroundColor: themeColors.cardAccent, opacity: op }, style]} />;
};

// ─── Spotlight Card ───────────────────────────────────────────────────────────
const SpotlightCard = ({ item, onPress, themeColors }) => {
  const img = item.imageUrl || item.image || item.images?.[0];

  const spStyles = useMemo(() => StyleSheet.create({
    card: { width: SPOT_W, height: 215, borderRadius: 22, overflow: 'hidden',
      backgroundColor: themeColors.background,
      shadowColor: themeColors.primaryAction, shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15, shadowRadius: 16, elevation: 12, borderWidth: 1, borderColor: themeColors.cardAccent },
    img: { ...StyleSheet.absoluteFillObject },
    noImg: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: themeColors.cardAccent },
    topRow: { position: 'absolute', top: 14, left: 14 },
    badge: { backgroundColor: themeColors.primaryAccent + 'C0', borderRadius: 20, paddingHorizontal: 11, paddingVertical: 5,
      borderWidth: 1, borderColor: themeColors.primaryAccent + '65' },
    badgeText: { color: themeColors.textOnPrimary || '#ffffff', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
    bottom: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: 'rgba(0,0,0,0.58)' },
    itemName: { fontSize: 17, fontWeight: '900', color: '#fff', marginBottom: 8 },
    priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    price: { fontSize: 16, fontWeight: '800', color: '#34d399' },
    viewBtn: { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 6,
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
    viewTxt: { color: '#fff', fontSize: 13, fontWeight: '800' },
  }), [themeColors]);

  return (
    <Press onPress={onPress} style={spStyles.card}>
      {img
        ? <Image source={{ uri: img }} style={spStyles.img} resizeMode="cover" />
        : <View style={[spStyles.img, spStyles.noImg]}><Ionicons name="image-outline" size={36} color={themeColors.textTertiary} /></View>
      }
      <View style={spStyles.topRow}>
        <View style={spStyles.badge}><Text style={spStyles.badgeText}>✦  Campus Spotlight</Text></View>
      </View>
      <View style={spStyles.bottom}>
        <Text style={spStyles.itemName} numberOfLines={1}>{item.name || item.title}</Text>
        <View style={spStyles.priceRow}>
          {item.price != null && <Text style={spStyles.price}>₹{item.price}</Text>}
          <View style={spStyles.viewBtn}><Text style={spStyles.viewTxt}>View  →</Text></View>
        </View>
      </View>
    </Press>
  );
};

// ─── Events Calendar ──────────────────────────────────────────────────────────
const EventsCalendar = ({ events = [], navigation, themeColors }) => {
  const featured = events[0] || null;
  const upcoming = events.slice(1, 5);
  const featFmt  = featured ? fmtEventDate(featured.startTime) : null;

  const evStyles = useMemo(() => StyleSheet.create({
    wrap: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 32 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    title: { fontSize: 18, fontWeight: '900', color: themeColors.textMain },
    fullBtn: { fontSize: 13, fontWeight: '800', color: themeColors.primaryAccent },
    emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 28, borderRadius: 16,
      borderWidth: 1, borderColor: themeColors.inputBorder, borderStyle: 'dashed', backgroundColor: themeColors.inputBg, gap: 6 },
    emptyTitle: { fontSize: 15, fontWeight: '700', color: themeColors.textTertiary },
    emptySub: { fontSize: 12, color: themeColors.inputBorder, textAlign: 'center' },
    
    // FIXED: Pure, single solid gray background (mapped to cardAccent)
    featured: { 
      height: 180, borderRadius: 20, overflow: 'hidden', 
      backgroundColor: themeColors.cardAccent, // Solid color, no opacity added
      marginBottom: 16, padding: 18, justifyContent: 'flex-end', 
      borderWidth: 1, borderColor: themeColors.inputBorder,
      shadowColor: themeColors.textMain, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 6 
    },
    
    featuredBadge: { position: 'absolute', top: 16, left: 18, backgroundColor: themeColors.primaryAction, borderRadius: 6,
      paddingHorizontal: 10, paddingVertical: 4 },
    featuredBadgeTxt: { fontSize: 10, fontWeight: '900', color: themeColors.textOnPrimary || '#ffffff', letterSpacing: 1 },
    featuredTitle: { fontSize: 22, fontWeight: '900', color: themeColors.textMain, marginBottom: 8 },
    featuredMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    featuredMetaTxt: { fontSize: 12, color: themeColors.textSub, fontWeight: '600' },
    dateBadge: { position: 'absolute', top: 12, right: 16, backgroundColor: themeColors.inputBg, borderRadius: 12,
      width: 52, alignItems: 'center', paddingVertical: 8, borderWidth: 1, borderColor: themeColors.inputBorder },
    dateBadgeDay: { fontSize: 22, fontWeight: '900', color: themeColors.textMain, lineHeight: 26 },
    dateBadgeMon: { fontSize: 10, fontWeight: '900', color: themeColors.primaryAccent, letterSpacing: 1 },
    
    card: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, width: 210, backgroundColor: themeColors.inputBg,
      borderRadius: 18, padding: 14, borderWidth: 1, borderColor: themeColors.inputBorder },
    cardDate: { width: 46, alignItems: 'center', paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
    cardDay: { fontSize: 20, fontWeight: '900', lineHeight: 24 },
    cardMon: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    cardTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
    cardTime: { fontSize: 11, color: themeColors.textTertiary, fontWeight: '600' },
    cardTitle: { fontSize: 13, fontWeight: '800', color: themeColors.textBody, marginBottom: 6 },
    cardLocRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    cardLoc: { fontSize: 11, color: themeColors.textTertiary, fontWeight: '500', flex: 1 },
  }), [themeColors]);

  return (
    <View style={evStyles.wrap}>
      <View style={evStyles.header}>
        <Text style={evStyles.title}>Events Calendar</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Events')}>
          <Text style={evStyles.fullBtn}>Full Schedule →</Text>
        </TouchableOpacity>
      </View>

      {events.length === 0 ? (
        <TouchableOpacity style={evStyles.emptyState} activeOpacity={0.8} onPress={() => navigation.navigate('Events')}>
          <Ionicons name="calendar-outline" size={32} color={themeColors.textTertiary} />
          <Text style={evStyles.emptyTitle}>No upcoming events</Text>
          <Text style={evStyles.emptySub}>Tap to post the first event on your campus</Text>
        </TouchableOpacity>
      ) : (
        <>
          {featured && featFmt && (
            <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('EventDetails', { event: featured })} style={evStyles.featured}>
              {/* Removed featuredOverlay completely */}
              
              <View style={evStyles.featuredBadge}>
                <Text style={evStyles.featuredBadgeTxt}>UPCOMING EVENT</Text>
              </View>
              <Text style={evStyles.featuredTitle}>{featured.title}</Text>
              <View style={evStyles.featuredMeta}>
                <Ionicons name="time-outline" size={12} color={themeColors.primaryAccent} />
                <Text style={evStyles.featuredMetaTxt}>{featFmt.time}</Text>
                <Ionicons name="location-outline" size={12} color={themeColors.primaryAccent} style={{ marginLeft: 8 }} />
                <Text style={evStyles.featuredMetaTxt}>{featured.location}</Text>
              </View>
              <View style={evStyles.dateBadge}>
                <Text style={evStyles.dateBadgeDay}>{featFmt.date}</Text>
                <Text style={evStyles.dateBadgeMon}>{featFmt.month}</Text>
              </View>
            </TouchableOpacity>
          )}

          {upcoming.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 20 }}>
              {upcoming.map(e => {
                const fmt   = fmtEventDate(e.startTime);
                const color = e.color || themeColors.primaryAccent;
                return (
                  <TouchableOpacity
                    key={e._id}
                    style={[evStyles.card, { borderColor: color + '40' }]}
                    activeOpacity={0.8}
                    onPress={() => navigation.navigate('EventDetails', { event: e })}
                  >
                    <View style={[evStyles.cardDate, { backgroundColor: color + '1A', borderColor: color + '50' }]}>
                      <Text style={[evStyles.cardDay, { color }]}>{fmt.date}</Text>
                      <Text style={[evStyles.cardMon, { color }]}>{fmt.month}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={evStyles.cardTimeRow}>
                        <Ionicons name="time-outline" size={11} color={themeColors.textTertiary} />
                        <Text style={evStyles.cardTime}>{fmt.time}</Text>
                      </View>
                      <Text style={evStyles.cardTitle} numberOfLines={2}>{e.title}</Text>
                      <View style={evStyles.cardLocRow}>
                        <Ionicons name="location-outline" size={11} color={themeColors.textTertiary} />
                        <Text style={evStyles.cardLoc} numberOfLines={1}>{e.location}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </>
      )}
    </View>
  );
};


// ─── HomeScreen ───────────────────────────────────────────────────────────────
const HomeScreen = ({ navigation }) => {
  const { styles: mainStyles, colors } = useThemeStyles(createStyles);
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
  const [searchFocused, setSearchFocused]   = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [modalVisible, setModalVisible]     = useState(false);
  const [collegeSearch, setCollegeSearch]   = useState('');
  const [dotIndex, setDotIndex]             = useState(0);
  const [recentItems, setRecentItems]       = useState([]);
  const [showAll, setShowAll]               = useState(false);
  const [sortOrder, setSortOrder]           = useState('none');

  const QUICK = useMemo(() => [
    { label: 'Books',       icon: 'book',           color: colors.primaryAccent, glow: colors.primaryAction, cat: 'Books & Notes' },
    { label: 'Electronics', icon: 'phone-portrait', color: colors.secondaryAction, glow: '#10b981', cat: 'Electronics' },
    { label: 'Cycles',      icon: 'bicycle',        color: '#38bdf8', glow: '#0284c7', cat: 'Cycles' },
    { label: 'Hostel',      icon: 'bed',            color: '#fb923c', glow: '#ea580c', cat: 'Hostel Essentials' },
    { label: 'Lost',        icon: 'search',         color: '#f472b6', glow: '#db2777', cat: '__lost__' },
  ], [colors]);

  const FEATURES = useMemo(() => [
    { label: 'Campus Events',  icon: 'calendar',       color: colors.primaryAccent, bg: colors.card, desc: 'Fests, seminars & more' },
    { label: 'Study Material', icon: 'document-text',  color: colors.secondaryAction, bg: colors.card, desc: 'Notes, PDFs & resources' },
    { label: 'Exam Schedule',  icon: 'clipboard',      color: '#fb923c', bg: colors.card, desc: 'Mid-sems & end-sems' },
    { label: 'Sports',         icon: 'trophy',         color: '#38bdf8', bg: colors.card, desc: 'Register & compete' },
  ], [colors]);

  const shimmer    = useRef(new Animated.Value(0)).current;
  const heroAnim   = useRef(new Animated.Value(0)).current;
  const sec1Anim   = useRef(new Animated.Value(0)).current;
  const sec2Anim   = useRef(new Animated.Value(0)).current;
  const sec3Anim   = useRef(new Animated.Value(0)).current;
  const sec4Anim   = useRef(new Animated.Value(0)).current;
  const suggestAnim = useRef(new Animated.Value(0)).current;
  const spotlightRef = useRef(null);
  const spotIdx    = useRef(0);
  const listRef         = useRef(null);
  const headerHeightRef = useRef(0);
  const catScrollRef    = useRef(null);
  const catScrollX      = useRef(0);

  useEffect(() => {
    Animated.stagger(140, [heroAnim, sec1Anim, sec2Anim, sec3Anim, sec4Anim].map(a =>
      Animated.timing(a, { toValue: 1, duration: 520, useNativeDriver: true })
    )).start();
  }, []);

  useEffect(() => {
    if (items.length < 2) return;
    const spots = items.filter(i => !i.isSold).slice(0, 6);
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

  useEffect(() => {
    Animated.spring(suggestAnim, {
      toValue: searchFocused && searchQuery.length > 0 ? 1 : 0,
      useNativeDriver: true,
      speed: 60,
      bounciness: 4,
    }).start();
  }, [searchFocused, searchQuery]);

  useEffect(() => {
    const key = getRecentKey(currentUser?.id);
    setRecentItems([]);
    AsyncStorage.getItem(key)
      .then(raw => { if (raw) setRecentItems(JSON.parse(raw)); })
      .catch(() => {});
  }, [currentUser?.id]);

  const saveRecentItem = async (item) => {
    try {
      const key = getRecentKey(currentUser?.id);
      const raw = await AsyncStorage.getItem(key);
      const prev = raw ? JSON.parse(raw) : [];
      const next = [item, ...prev.filter(i => i._id !== item._id)].slice(0, 8);
      setRecentItems(next);
      await AsyncStorage.setItem(key, JSON.stringify(next));
    } catch {}
  };

  const isWindowShopping = !isGuest && currentUser &&
    activeCampus.name.toLowerCase() !== (currentUser.college || '').toLowerCase();

  const [events, setEvents] = useState([]);

  const fetchItems = useCallback(async () => {
    try {
      const url = `/items?college=${activeCampus.name}`;
      const res = await API.get(url);
      setItems(res.data);
    } catch (e) {
      console.error('fetchItems:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeCampus]);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await API.get(`/events?college=${encodeURIComponent(activeCampus.name)}`);
      setEvents(res.data || []);
    } catch {
      /* silent */
    }
  }, [activeCampus]);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => { fetchItems(); fetchEvents(); }, 380);
    return () => clearTimeout(t);
  }, [fetchItems, fetchEvents]);

  const onRefresh = () => { setRefreshing(true); fetchItems(); fetchEvents(); };

  const suggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return items
      .filter(item => !item.isSold && (item.name || item.title || '').toLowerCase().includes(q))
      .slice(0, 8);
  }, [searchQuery, items]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter(item => {
      const matchesSearch = !q ||
        (item.name || item.title || '').toLowerCase().includes(q) ||
        (item.category || '').toLowerCase().includes(q);
      const itemCat = (item.category || '').toLowerCase();
      const matchesCategory = activeCategory === 'All' ||
        (activeCategory === 'Other'
          ? !KNOWN_CATEGORIES.some(k => k.toLowerCase() === itemCat)
          : itemCat === activeCategory.toLowerCase());
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, activeCategory, items]);

  const sortedItems = useMemo(() => {
    let result = [...filteredItems];
    if (sortOrder === 'asc')  result.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
    if (sortOrder === 'desc') result.sort((a, b) => (b.price ?? -1) - (a.price ?? -1));
    return result.sort((a, b) => {
      const isASold = !!a.isSold;
      const isBSold = !!b.isSold;
      if (isASold && !isBSold) return 1;
      if (!isASold && isBSold) return -1;
      return 0;
    });
  }, [filteredItems, sortOrder]);

  const displayItems = showAll ? sortedItems : sortedItems.slice(0, 8);

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
    saveRecentItem(item);
    const isOwner = currentUser &&
      (item.seller === currentUser._id || item.seller?._id === currentUser._id);
    navigation.navigate('ItemDetails', { item, activeCollege: activeCampus.name, isOwner: !!isOwner });
  };

  const handleSuggestionPress = (item) => {
    setSearchQuery('');
    setSearchFocused(false);
    handleItemPress(item);
  };

  const handleQuick = (cat) => {
    if (cat === '__lost__') {
      navigation.navigate('LostFound');
    } else {
      setActiveCategory(cat);
      listRef.current?.scrollToOffset({ offset: headerHeightRef.current, animated: true });
    }
  };

  const handleFeature = (label) => {
    if (label === 'Study Material') { navigation.navigate('StudyMaterials'); return; }
    if (label === 'Sports')         { navigation.navigate('Sports');         return; }
    if (label === 'Campus Events')  { navigation.navigate('Events');         return; }
    Alert.alert(
      '🚀 Coming Soon',
      `${label} is on its way! We're building this feature for your campus.`,
      [{ text: 'Got it!', style: 'default' }]
    );
  };

  const spots = items.filter(i => i.status !== 'sold').slice(0, 6); // <-- Updated

  const makeAnim = (anim, dy = 22) => ({
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [dy, 0] }) }],
  });

  const renderItem = useCallback(({ item, index }) => (
    <View style={index % 2 === 0 ? mainStyles.colL : mainStyles.colR}>
      <ItemCard item={item} onPress={() => handleItemPress(item)} compact />
    </View>
  ), [currentUser, isGuest, activeCampus, mainStyles]);

  const ListHeader = () => (
    <View onLayout={(e) => { headerHeightRef.current = e.nativeEvent.layout.height; }}>
      {isWindowShopping && (
        <Animated.View style={[mainStyles.statsRow, makeAnim(heroAnim, 10)]}>
          <View style={[mainStyles.statChip, { borderColor: '#fbbf2440' }]}>
            <Ionicons name="eye-outline" size={13} color="#fbbf24" />
            <Text style={[mainStyles.statText, { color: '#fbbf24' }]}>Browse only</Text>
          </View>
        </Animated.View>
      )}

      {(spots.length > 0 || loading) && (
        <Animated.View style={[mainStyles.section, makeAnim(sec1Anim)]}>
          <View style={mainStyles.sectionHead}>
            <Text style={mainStyles.sectionTitle}>✦ Campus Spotlight</Text>
          </View>
          {loading ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingRight: 20 }}>
              {[0, 1, 2].map(i => <Skeleton key={i} shimmer={shimmer} w={SPOT_W} h={210} radius={22} themeColors={colors} />)}
            </ScrollView>
          ) : (
            <>
              <ScrollView
                ref={spotlightRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={SPOT_W + 14}
                decelerationRate="fast"
                contentContainerStyle={{ gap: 14, paddingRight: 20 }}
                onMomentumScrollEnd={(e) => {
                  const idx = Math.round(e.nativeEvent.contentOffset.x / (SPOT_W + 14));
                  setDotIndex(idx);
                  spotIdx.current = idx;
                }}
              >
                {spots.map(item => (
                  <SpotlightCard key={item._id} item={item} onPress={() => handleItemPress(item)} themeColors={colors} />
                ))}
              </ScrollView>
              {spots.length > 1 && (
                <View style={mainStyles.dots}>
                  {spots.map((_, i) => (
                    <View key={i} style={[mainStyles.dot, i === dotIndex && mainStyles.dotActive]} />
                  ))}
                </View>
              )}
            </>
          )}
        </Animated.View>
      )}

      <Animated.View style={[mainStyles.section, makeAnim(sec2Anim)]}>
        <Text style={mainStyles.sectionTitle}>Quick Actions</Text>
        <View style={mainStyles.quickRow}>
          {QUICK.map((q) => (
            <Press key={q.label} onPress={() => handleQuick(q.cat)} style={mainStyles.quickItem}>
              <View style={[mainStyles.quickCircle, { borderColor: q.glow + '40', shadowColor: q.glow }]}>
                <View style={[mainStyles.quickGlow, { backgroundColor: q.glow + '20' }]} />
                <Ionicons name={q.icon} size={26} color={q.color} />
              </View>
              <Text style={mainStyles.quickLabel}>{q.label}</Text>
            </Press>
          ))}
        </View>
      </Animated.View>

      <Animated.View style={[mainStyles.section, makeAnim(sec3Anim)]}>
        <View style={mainStyles.sectionHead}>
          <Text style={mainStyles.sectionTitle}>Campus Life</Text>
        </View>
        <View style={mainStyles.featuresGrid}>
          {FEATURES.map((f) => (
            <Press key={f.label} onPress={() => handleFeature(f.label)} style={[mainStyles.featureCard, { backgroundColor: f.bg }]}>
              <View style={[mainStyles.featureIconWrap, { borderColor: f.color + '40', backgroundColor: f.color + '18' }]}>
                <Ionicons name={f.icon} size={22} color={f.color} />
              </View>
              <Text style={mainStyles.featureName}>{f.label}</Text>
              <Text style={mainStyles.featureDesc} numberOfLines={1}>{f.desc}</Text>
              {['Study Material', 'Sports', 'Campus Events'].includes(f.label) ? (
                <View style={[mainStyles.featureSoon, { borderColor: f.color + '50', backgroundColor: f.color + '1A' }]}>
                  <Text style={[mainStyles.featureSoonText, { color: f.color }]}>Open →</Text>
                </View>
              ) : (
                <View style={[mainStyles.featureSoon, { borderColor: f.color + '50', backgroundColor: colors.cardAccent }]}>
                  <Text style={[mainStyles.featureSoonText, { color: f.color }]}>🔒 Soon</Text>
                </View>
              )}
            </Press>
          ))}
        </View>
      </Animated.View>

      {recentItems.length > 0 && (
        <Animated.View style={[mainStyles.section, makeAnim(sec4Anim)]}>
          <View style={mainStyles.sectionHead}>
            <Text style={mainStyles.sectionTitle}>Recently Viewed</Text>
            <TouchableOpacity onPress={() => { setRecentItems([]); AsyncStorage.removeItem(getRecentKey(currentUser?.id)); }}>
              <Text style={mainStyles.clearRecentTxt}>Clear</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 20 }}>
            {recentItems.map((item) => {
              const img = item.imageUrl || item.image || item.images?.[0];
              return (
                <Press key={item._id} onPress={() => handleItemPress(item)} style={mainStyles.recentCard}>
                  {img
                    ? <Image source={{ uri: img }} style={mainStyles.recentThumb} resizeMode="cover" />
                    : <View style={[mainStyles.recentThumb, mainStyles.recentThumbFallback]}><Ionicons name="cube-outline" size={18} color={colors.textTertiary} /></View>
                  }
                  <Text style={mainStyles.recentName} numberOfLines={2}>{item.name || item.title}</Text>
                  {item.price != null && <Text style={mainStyles.recentPrice}>₹{item.price}</Text>}
                </Press>
              );
            })}
          </ScrollView>
        </Animated.View>
      )}

      <View style={[mainStyles.section, { paddingBottom: 0, marginBottom: 0 }]}>
        <ScrollView
          ref={catScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingRight: 20 }}
          scrollEventThrottle={16}
          onScroll={(e) => { catScrollX.current = e.nativeEvent.contentOffset.x; }}
          onLayout={() => {
            if (catScrollX.current > 0) {
              catScrollRef.current?.scrollTo({ x: catScrollX.current, animated: false });
            }
          }}
        >
          {CATEGORIES.map((cat) => {
            const active = activeCategory === cat.label;
            return (
              <Press key={cat.label} onPress={() => setActiveCategory(cat.label)} style={[mainStyles.chip, active && mainStyles.chipOn]}>
                <Ionicons name={cat.icon} size={13} color={active ? (colors.textOnPrimary || '#ffffff') : colors.textTertiary} style={{ marginRight: 5 }} />
                <Text style={[mainStyles.chipTxt, active && mainStyles.chipTxtOn]}>{cat.label}</Text>
              </Press>
            );
          })}
        </ScrollView>
      </View>

      <View style={mainStyles.listHead}>
        <Text style={mainStyles.listTitle}>
          {activeCategory === 'All' ? 'All Listings' : activeCategory}
          {searchQuery ? `  ·  "${searchQuery}"` : ''}
        </Text>
        {!loading && <Text style={mainStyles.listCount}>{filteredItems.length}</Text>}
      </View>
      {!loading && filteredItems.length > 0 && (
        <View style={mainStyles.sortRow}>
          {[
            { key: 'none', label: 'Default' },
            { key: 'asc',  label: '₹ Low → High' },
            { key: 'desc', label: '₹ High → Low' },
          ].map(s => (
            <Press key={s.key} onPress={() => { setSortOrder(s.key); setShowAll(false); }} style={[mainStyles.sortChip, sortOrder === s.key && mainStyles.sortChipOn]}>
              <Text style={[mainStyles.sortChipTxt, sortOrder === s.key && mainStyles.sortChipTxtOn]}>{s.label}</Text>
            </Press>
          ))}
        </View>
      )}

      {loading && (
        <View style={mainStyles.skRow}>
          {[0, 1, 2, 3].map(i => <Skeleton key={i} shimmer={shimmer} w={CARD_W} h={CARD_W * 1.25} radius={14} style={{ marginBottom: 16 }} themeColors={colors} />)}
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={mainStyles.root} edges={['top']}>
      <StatusBar backgroundColor={colors.background} barStyle={colors.statusBarStyle} />

      <Animated.View style={[mainStyles.topBar, makeAnim(heroAnim, 18)]}>
        <View style={mainStyles.orb1} />
        <View style={mainStyles.orb2} />

        <View style={mainStyles.heroTop}>
          <View style={{ flex: 1 }}>
            <Text style={mainStyles.greeting}>{getGreeting()} 👋</Text>
            <Text style={mainStyles.heroName} numberOfLines={1}>
              {isGuest ? 'Guest' : (currentUser?.name?.split(' ')[0] || 'Student')}
            </Text>
          </View>
          <Press onPress={() => setModalVisible(true)} style={mainStyles.campusBadge}>
            <Text style={mainStyles.campusEmoji}>{activeCampus.emoji}</Text>
            <Text style={mainStyles.campusShort} numberOfLines={1}>
              {activeCampus.shortName || activeCampus.name}
            </Text>
            <Ionicons name="chevron-down" size={12} color={colors.primaryAccent} />
          </Press>
        </View>

        <View style={mainStyles.searchWrap}>
          <Ionicons name="search" size={17} color={searchFocused ? colors.primaryAccent : colors.textTertiary} style={{ marginRight: 9 }} />
          <TextInput
            style={mainStyles.searchInput}
            placeholder={`Search items on campus…`}
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
            returnKeyType="search"
            onSubmitEditing={() => {
              setSearchFocused(false);
              listRef.current?.scrollToOffset({ offset: headerHeightRef.current, animated: true });
            }}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchFocused(false); }}>
              <Ionicons name="close-circle" size={17} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        {searchFocused && suggestions.length > 0 && (
          <Animated.View
            style={[
              mainStyles.suggestBox,
              {
                opacity: suggestAnim,
                transform: [{ translateY: suggestAnim.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }],
              },
            ]}
          >
            {suggestions.map((item, idx) => {
              const img = item.imageUrl || item.image || item.images?.[0];
              const q = searchQuery.trim().toLowerCase();
              const name = item.name || item.title || '';
              const matchIdx = name.toLowerCase().indexOf(q);
              return (
                <TouchableOpacity
                  key={item._id}
                  style={[mainStyles.suggestRow, idx < suggestions.length - 1 && mainStyles.suggestBorder]}
                  onPress={() => handleSuggestionPress(item)}
                  activeOpacity={0.75}
                >
                  {img
                    ? <Image source={{ uri: img }} style={mainStyles.suggestThumb} resizeMode="cover" />
                    : (
                      <View style={[mainStyles.suggestThumb, mainStyles.suggestThumbFallback]}>
                        <Ionicons name="cube-outline" size={16} color={colors.textTertiary} />
                      </View>
                    )
                  }
                  <View style={{ flex: 1 }}>
                    <Text style={mainStyles.suggestName} numberOfLines={1}>
                      {matchIdx >= 0 ? (
                        <>
                          <Text>{name.slice(0, matchIdx)}</Text>
                          <Text style={mainStyles.suggestHighlight}>{name.slice(matchIdx, matchIdx + q.length)}</Text>
                          <Text>{name.slice(matchIdx + q.length)}</Text>
                        </>
                      ) : name}
                    </Text>
                    <Text style={mainStyles.suggestMeta} numberOfLines={1}>
                      {item.category}{item.price != null ? `  ·  ₹${item.price}` : ''}
                    </Text>
                  </View>
                  <Ionicons name="arrow-forward" size={15} color={colors.textTertiary} />
                </TouchableOpacity>
              );
            })}
          </Animated.View>
        )}

        {searchFocused && searchQuery.length > 0 && suggestions.length === 0 && (
          <Animated.View style={[mainStyles.noSuggestBox, { opacity: suggestAnim }]}>
            <Ionicons name="search-outline" size={16} color={colors.textTertiary} />
            <Text style={mainStyles.noSuggestText}>No items matching "{searchQuery}"</Text>
          </Animated.View>
        )}
      </Animated.View>

      {loading ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={mainStyles.pad}>
          <ListHeader />
        </ScrollView>
      ) : (
        <FlatList
          ref={listRef}
          data={displayItems}
          keyExtractor={i => i._id}
          numColumns={2}
          contentContainerStyle={mainStyles.pad}
          columnWrapperStyle={mainStyles.row}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
         refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              colors={[colors.primaryAction]} 
              tintColor={colors.primaryAction} 
              progressBackgroundColor={colors.card} // <-- Added this!
            />
          }
          renderItem={renderItem}
          ListHeaderComponent={ListHeader()}
          ListFooterComponent={
            <View>
              {!loading && sortedItems.length > 8 && (
                <Press onPress={() => setShowAll(v => !v)} style={mainStyles.viewAllBtn}>
                  <Text style={mainStyles.viewAllTxt}>
                    {showAll ? '↑  Show Less' : `View All  (${sortedItems.length})`}
                  </Text>
                  <Ionicons name={showAll ? 'chevron-up' : 'chevron-down'} size={15} color={colors.primaryAccent} />
                </Press>
              )}
              <EventsCalendar events={events} navigation={navigation} themeColors={colors} />
            </View>
          }
          ListEmptyComponent={
            <View style={mainStyles.emptyBox}>
              <View style={mainStyles.emptyOrb}>
                <Ionicons name="storefront-outline" size={44} color={colors.primaryAccent} />
              </View>
              <Text style={mainStyles.emptyTitle}>
                {searchQuery || activeCategory !== 'All' ? 'No results' : 'No listings yet'}
              </Text>
              <Text style={mainStyles.emptySub}>
                {searchQuery || activeCategory !== 'All'
                  ? 'Try different keywords or clear filters.'
                  : `Be the first to list on ${activeCampus.shortName || activeCampus.name}!`}
              </Text>
              {(searchQuery || activeCategory !== 'All') && (
                <Press onPress={() => { setSearchQuery(''); setActiveCategory('All'); }} style={mainStyles.clearBtn}>
                  <Text style={mainStyles.clearTxt}>Clear filters</Text>
                </Press>
              )}
            </View>
          }
        />
      )}

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={mainStyles.modalBg}>
          <View style={mainStyles.sheet}>
            <View style={mainStyles.sheetHandle} />
            <Text style={mainStyles.sheetTitle}>Window Shopping 🛍️</Text>
            <Text style={mainStyles.sheetSub}>Browse listings from any campus</Text>
            <View style={mainStyles.mSearch}>
              <Ionicons name="search" size={15} color={colors.textTertiary} style={{ marginRight: 8 }} />
              <TextInput
                style={mainStyles.mSearchInput}
                placeholder="Search colleges…"
                placeholderTextColor={colors.textTertiary}
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
                    style={[mainStyles.cRow, isActive && mainStyles.cRowActive]}
                    onPress={() => { setActiveCampus(item); setModalVisible(false); setCollegeSearch(''); }}
                    activeOpacity={0.7}
                  >
                    <Text style={mainStyles.cEmoji}>{item.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[mainStyles.cName, isActive && mainStyles.cNameActive]}>{item.name}</Text>
                      {item.location && <Text style={mainStyles.cLoc}>{item.location}</Text>}
                    </View>
                    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                      {isHome && <View style={mainStyles.homeBadge}><Text style={mainStyles.homeTxt}>Home</Text></View>}
                      {isActive && <Ionicons name="checkmark-circle" size={20} color={colors.primaryAccent} />}
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
            <TouchableOpacity style={mainStyles.cancelBtn} onPress={() => { setModalVisible(false); setCollegeSearch(''); }}>
              <Text style={mainStyles.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ─── Theme-Aware Style Generator ─────────────────────────────────────────────
const createStyles = (theme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.background },
  pad: { paddingBottom: 110 },
  topBar: { backgroundColor: theme.background, paddingHorizontal: 18,
    paddingTop: Platform.OS === 'android' ? 10 : 6, paddingBottom: 14, zIndex: 10,
    borderBottomWidth: 1, borderBottomColor: theme.cardAccent, overflow: 'visible' },
  orb1: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: theme.primaryAction, opacity: 0.07, top: -50, right: -40 },
  orb2: { position: 'absolute', width: 130, height: 130, borderRadius: 65, backgroundColor: theme.secondaryAction, opacity: 0.06, top: 10, left: -30 },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  greeting: { fontSize: 13, color: theme.textTertiary, fontWeight: '600', marginBottom: 4 },
  heroName: { fontSize: 24, fontWeight: '900', color: theme.textMain, maxWidth: SW * 0.55 },
  campusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: theme.card, borderRadius: 16,
    paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: theme.inputBorder,
    shadowColor: theme.primaryAction, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  campusEmoji: { fontSize: 16 },
  campusShort: { fontSize: 13, fontWeight: '800', color: theme.textBody, maxWidth: 80 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.inputBg, borderRadius: 16,
    paddingHorizontal: 15, paddingVertical: 11, borderWidth: 1, borderColor: theme.inputBorder },
  searchInput: { flex: 1, fontSize: 15, color: theme.textMain, padding: 0 },
  suggestBox: { backgroundColor: theme.card, borderRadius: 16, marginTop: 6, borderWidth: 1, borderColor: theme.inputBorder,
    overflow: 'hidden', shadowColor: theme.textMain, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15, shadowRadius: 16, elevation: 20, zIndex: 999 },
  suggestRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11, gap: 12 },
  suggestBorder: { borderBottomWidth: 1, borderBottomColor: theme.inputBorder },
  suggestThumb: { width: 40, height: 40, borderRadius: 10, backgroundColor: theme.inputBg },
  suggestThumbFallback: { alignItems: 'center', justifyContent: 'center' },
  suggestName: { fontSize: 14, fontWeight: '700', color: theme.textMain, marginBottom: 2 },
  suggestHighlight: { color: theme.primaryAccent, fontWeight: '900', backgroundColor: theme.primaryAccent + '25' },
  suggestMeta: { fontSize: 12, color: theme.textTertiary, fontWeight: '500' },
  noSuggestBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.inputBg, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12, marginTop: 6, borderWidth: 1, borderColor: theme.inputBorder },
  noSuggestText: { fontSize: 13, color: theme.textTertiary, fontStyle: 'italic' },
  statsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 18, paddingTop: 14, marginBottom: 4 },
  statChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: theme.inputBg, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: theme.inputBorder },
  statText: { fontSize: 12, color: theme.primaryAccent, fontWeight: '700' },
  section: { paddingHorizontal: 18, marginBottom: 28 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sectionTitle: { fontSize: 17, fontWeight: '900', color: theme.textMain, marginBottom: 14, letterSpacing: 0.2 },
  
  // "Coming Soon" Badge
  soonBadge: { backgroundColor: theme.cardAccent, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: theme.inputBorder },
  soonText: { fontSize: 11, color: theme.textSub, fontWeight: '800' },
  
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 12 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.inputBorder },
  dotActive: { width: 18, backgroundColor: theme.primaryAction },
  quickRow: { flexDirection: 'row', justifyContent: 'space-between' },
  quickItem: { alignItems: 'center', flex: 1 },
  quickCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: theme.inputBg, alignItems: 'center',
    justifyContent: 'center', borderWidth: 1.5, marginBottom: 8, overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 6 },
  quickGlow: { ...StyleSheet.absoluteFillObject },
  quickLabel: { fontSize: 11, color: theme.textTertiary, fontWeight: '700', textAlign: 'center' },
  featuresGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  featureCard: { width: (SW - 48) / 2, borderRadius: 20, padding: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: theme.cardAccent,
    shadowColor: theme.textMain, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 6 },
  featureIconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, marginBottom: 10 },
  featureName: { fontSize: 13, fontWeight: '800', color: theme.textMain, marginBottom: 3 },
  featureDesc: { fontSize: 11, color: theme.textTertiary, fontWeight: '500', marginBottom: 10 },
  featureSoon: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, backgroundColor: 'rgba(0,0,0,0.05)' },
  featureSoonText: { fontSize: 10, fontWeight: '800' },
  chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.inputBg, borderRadius: 20,
    paddingHorizontal: 13, paddingVertical: 7, borderWidth: 1, borderColor: theme.inputBorder },
  chipOn: { backgroundColor: theme.primaryAction, borderColor: theme.primaryAccent },
  
  // FIXED: Contrast check on active category chip text
  chipTxt: { fontSize: 12, color: theme.textTertiary, fontWeight: '700' },
  chipTxtOn: { color: theme.textOnPrimary || '#ffffff' },
  
  listHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 14 },
  listTitle: { fontSize: 16, fontWeight: '900', color: theme.textMain, flex: 1 },
  listCount: { fontSize: 13, color: theme.primaryAccent, fontWeight: '800',
    backgroundColor: theme.primaryAccent + '25', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 },
  row: { justifyContent: 'space-between', paddingHorizontal: 18 },
  colL: { width: CARD_W },
  colR: { width: CARD_W },
  skRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', paddingHorizontal: 18 },
  emptyBox: { alignItems: 'center', paddingTop: 48, paddingHorizontal: 36 },
  emptyOrb: { width: 96, height: 96, borderRadius: 48, backgroundColor: theme.primaryAccent + '25',
    alignItems: 'center', justifyContent: 'center', marginBottom: 18, borderWidth: 1, borderColor: theme.primaryAccent + '40' },
  emptyTitle: { fontSize: 20, fontWeight: '900', color: theme.textMain, marginBottom: 8 },
  emptySub: { fontSize: 13, color: theme.textTertiary, textAlign: 'center', lineHeight: 20 },
  clearBtn: { marginTop: 18, backgroundColor: theme.primaryAction, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12 },
  
  // FIXED: Contrast check on empty state buttons
  clearTxt: { color: theme.textOnPrimary || '#ffffff', fontWeight: '800', fontSize: 14 },
  
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: theme.background, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingTop: 12, paddingHorizontal: 20, paddingBottom: 36, maxHeight: '82%', borderWidth: 1, borderColor: theme.inputBorder },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: theme.inputBorder, alignSelf: 'center', marginBottom: 18 },
  sheetTitle: { fontSize: 20, fontWeight: '900', color: theme.textMain, textAlign: 'center', marginBottom: 4 },
  sheetSub: { fontSize: 13, color: theme.textTertiary, textAlign: 'center', marginBottom: 16 },
  mSearch: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.card, borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 11, marginBottom: 12, borderWidth: 1, borderColor: theme.inputBorder },
  mSearchInput: { flex: 1, fontSize: 14, color: theme.textMain, padding: 0 },
  cRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 8,
    borderBottomWidth: 1, borderBottomColor: theme.inputBorder, borderRadius: 14 },
  cRowActive: { backgroundColor: theme.primaryAction + '15' },
  cEmoji: { fontSize: 22, marginRight: 12 },
  cName: { fontSize: 15, fontWeight: '600', color: theme.textBody },
  cNameActive: { color: theme.primaryAccent, fontWeight: '800' },
  cLoc: { fontSize: 12, color: theme.textTertiary, marginTop: 2 },
  homeBadge: { backgroundColor: '#dcfce7', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  homeTxt: { fontSize: 10, color: '#15803d', fontWeight: '800' },
  cancelBtn: { marginTop: 16, backgroundColor: theme.card, borderRadius: 16,
    paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: theme.inputBorder },
  cancelTxt: { color: '#ef4444', fontWeight: '800', fontSize: 15 },
  sortRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 18, marginBottom: 12 },
  sortChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.inputBg, borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: theme.inputBorder },
  sortChipOn: { backgroundColor: theme.primaryAccent + '25', borderColor: theme.primaryAccent },
  sortChipTxt: { fontSize: 11, color: theme.textTertiary, fontWeight: '700' },
  sortChipTxtOn: { color: theme.primaryAccent },
  viewAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 18, marginTop: 16, marginBottom: 8, backgroundColor: theme.card, borderRadius: 16,
    paddingVertical: 14, borderWidth: 1, borderColor: theme.inputBorder },
  viewAllTxt: { fontSize: 14, fontWeight: '800', color: theme.primaryAccent },
  clearRecentTxt: { fontSize: 12, color: '#ef4444', fontWeight: '700' },
  recentCard: { width: 110, backgroundColor: theme.inputBg, borderRadius: 16,
    padding: 10, borderWidth: 1, borderColor: theme.inputBorder },
  recentThumb: { width: '100%', height: 70, borderRadius: 10, marginBottom: 8, backgroundColor: theme.card },
  recentThumbFallback: { alignItems: 'center', justifyContent: 'center' },
  recentName: { fontSize: 12, fontWeight: '700', color: theme.textBody, marginBottom: 4, lineHeight: 16 },
  recentPrice: { fontSize: 12, fontWeight: '800', color: theme.secondaryAction },
});

export default HomeScreen;