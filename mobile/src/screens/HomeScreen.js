import React, { useState, useEffect, useContext, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl,
  TouchableOpacity, Modal, TextInput, ScrollView,
  Alert, Platform, Animated, Dimensions, StatusBar, Image,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  { label: 'Other',             icon: 'ellipsis-horizontal-circle-outline' },
];

const QUICK = [
  { label: 'Books',       icon: 'book',           color: '#818cf8', glow: '#6366f1', cat: 'Books & Notes' },
  { label: 'Electronics', icon: 'phone-portrait',  color: '#34d399', glow: '#10b981', cat: 'Electronics' },
  { label: 'Cycles',      icon: 'bicycle',         color: '#38bdf8', glow: '#0284c7', cat: 'Cycles' },
  { label: 'Hostel',      icon: 'bed',             color: '#fb923c', glow: '#ea580c', cat: 'Hostel Essentials' },
  { label: 'Lost',        icon: 'search',          color: '#f472b6', glow: '#db2777', cat: '__lost__' },
];

const FEATURES = [
  { label: 'Campus Events',  icon: 'calendar',       color: '#818cf8', bg: '#1e1b4b', desc: 'Fests, seminars & more' },
  { label: 'Study Material', icon: 'document-text',  color: '#34d399', bg: '#064e3b', desc: 'Notes, PDFs & resources' },
  { label: 'Exam Schedule',  icon: 'clipboard',      color: '#fb923c', bg: '#431407', desc: 'Mid-sems & end-sems' },
  { label: 'Find Roomies',   icon: 'home',           color: '#38bdf8', bg: '#082f49', desc: 'Room & flatmate search' },
  { label: 'Campus Jobs',    icon: 'briefcase',      color: '#f472b6', bg: '#2d0a3e', desc: 'Part-time & internships' },
  { label: 'Food Share',     icon: 'fast-food',      color: '#fbbf24', bg: '#2c1800', desc: 'Mess deals & sharing' },
];

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

// ─── Events Calendar (preview strip on home) ──────────────────────────────────
const EventsCalendar = ({ events = [], navigation }) => {
  const featured = events[0] || null;
  const upcoming = events.slice(1, 5);
  const featFmt  = featured ? fmtEventDate(featured.startTime) : null;

  return (
    <View style={ev.wrap}>
      {/* Header */}
      <View style={ev.header}>
        <Text style={ev.title}>Events Calendar</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Events')}>
          <Text style={ev.fullBtn}>Full Schedule →</Text>
        </TouchableOpacity>
      </View>

      {events.length === 0 ? (
        /* Empty state — always visible so section is never invisible */
        <TouchableOpacity style={ev.emptyState} activeOpacity={0.8} onPress={() => navigation.navigate('Events')}>
          <Ionicons name="calendar-outline" size={32} color="#334155" />
          <Text style={ev.emptyTitle}>No upcoming events</Text>
          <Text style={ev.emptySub}>Tap to post the first event on your campus</Text>
        </TouchableOpacity>
      ) : (
        <>
          {/* Featured event banner */}
          {featured && featFmt && (
            <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('EventDetails', { event: featured })} style={ev.featured}>
              <View style={ev.featuredOverlay} />
              <View style={ev.featuredBadge}>
                <Text style={ev.featuredBadgeTxt}>UPCOMING EVENT</Text>
              </View>
              <Text style={ev.featuredTitle}>{featured.title}</Text>
              <View style={ev.featuredMeta}>
                <Ionicons name="time-outline" size={12} color="#a5b4fc" />
                <Text style={ev.featuredMetaTxt}>{featFmt.time}</Text>
                <Ionicons name="location-outline" size={12} color="#a5b4fc" style={{ marginLeft: 8 }} />
                <Text style={ev.featuredMetaTxt}>{featured.location}</Text>
              </View>
              <View style={ev.dateBadge}>
                <Text style={ev.dateBadgeDay}>{featFmt.date}</Text>
                <Text style={ev.dateBadgeMon}>{featFmt.month}</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Upcoming events — horizontal scroll */}
          {upcoming.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 20 }}>
              {upcoming.map(e => {
                const fmt   = fmtEventDate(e.startTime);
                const color = e.color || '#6366f1';
                return (
                  <TouchableOpacity
                    key={e._id}
                    style={[ev.card, { borderColor: color + '40' }]}
                    activeOpacity={0.8}
                    onPress={() => navigation.navigate('EventDetails', { event: e })}
                  >
                    <View style={[ev.cardDate, { backgroundColor: color + '22', borderColor: color + '50' }]}>
                      <Text style={[ev.cardDay, { color }]}>{fmt.date}</Text>
                      <Text style={[ev.cardMon, { color }]}>{fmt.month}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={ev.cardTimeRow}>
                        <Ionicons name="time-outline" size={11} color="#64748b" />
                        <Text style={ev.cardTime}>{fmt.time}</Text>
                      </View>
                      <Text style={ev.cardTitle} numberOfLines={2}>{e.title}</Text>
                      <View style={ev.cardLocRow}>
                        <Ionicons name="location-outline" size={11} color="#64748b" />
                        <Text style={ev.cardLoc} numberOfLines={1}>{e.location}</Text>
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
  const [sortOrder, setSortOrder]           = useState('none'); // 'none' | 'asc' | 'desc'

  const shimmer    = useRef(new Animated.Value(0)).current;
  const heroAnim   = useRef(new Animated.Value(0)).current;
  const sec1Anim   = useRef(new Animated.Value(0)).current;
  const sec2Anim   = useRef(new Animated.Value(0)).current;
  const sec3Anim   = useRef(new Animated.Value(0)).current;
  const sec4Anim   = useRef(new Animated.Value(0)).current;
  const suggestAnim = useRef(new Animated.Value(0)).current;
  const spotlightRef = useRef(null);
  const spotIdx    = useRef(0);
  const listRef       = useRef(null);
  const headerHeightRef = useRef(0);

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
    ])).start();
  }, []);

  useEffect(() => {
    Animated.stagger(140, [heroAnim, sec1Anim, sec2Anim, sec3Anim, sec4Anim].map(a =>
      Animated.timing(a, { toValue: 1, duration: 520, useNativeDriver: true })
    )).start();
  }, []);

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

  // Animate suggestion dropdown in/out
  useEffect(() => {
    Animated.spring(suggestAnim, {
      toValue: searchFocused && searchQuery.length > 0 ? 1 : 0,
      useNativeDriver: true,
      speed: 60,
      bounciness: 4,
    }).start();
  }, [searchFocused, searchQuery]);

  // Load & save recently visited items (per-user)
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
      /* silent — events section just stays empty */
    }
  }, [activeCampus]);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => { fetchItems(); fetchEvents(); }, 380);
    return () => clearTimeout(t);
  }, [fetchItems, fetchEvents]);

  const onRefresh = () => { setRefreshing(true); fetchItems(); fetchEvents(); };

  // Search suggestions (client-side filter — no debounce needed)
  const suggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return items
      .filter(item => (item.name || item.title || '').toLowerCase().includes(q))
      .slice(0, 8);
  }, [searchQuery, items]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter(item => {
      const matchesSearch = !q ||
        (item.name || item.title || '').toLowerCase().includes(q) ||
        (item.category || '').toLowerCase().includes(q);
      const matchesCategory = activeCategory === 'All' ||
        (item.category || '').toLowerCase() === activeCategory.toLowerCase();
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, activeCategory, items]);

  const sortedItems = useMemo(() => {
    if (sortOrder === 'asc')  return [...filteredItems].sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
    if (sortOrder === 'desc') return [...filteredItems].sort((a, b) => (b.price ?? -1) - (a.price ?? -1));
    return filteredItems;
  }, [filteredItems, sortOrder]);

  const displayItems = showAll ? sortedItems : sortedItems.slice(0, 10);

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
    Alert.alert(
      '🚀 Coming Soon',
      `${label} is on its way! We're building this feature for your campus.`,
      [{ text: 'Got it!', style: 'default' }]
    );
  };

  const spots  = items.slice(0, 6);

  const makeAnim = (anim, dy = 22) => ({
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [dy, 0] }) }],
  });

  const renderItem = useCallback(({ item, index }) => (
    <View style={index % 2 === 0 ? styles.colL : styles.colR}>
      <ItemCard item={item} onPress={() => handleItemPress(item)} compact />
    </View>
  ), [currentUser, isGuest, activeCampus]);

  // ─── List Header (sections above the items grid) ─────────────────────────
  const ListHeader = () => (
    <View onLayout={(e) => { headerHeightRef.current = e.nativeEvent.layout.height; }}>
      {/* ── Stats + campus info ── */}
      {isWindowShopping && (
        <Animated.View style={[styles.statsRow, makeAnim(heroAnim, 10)]}>
          <View style={[styles.statChip, { borderColor: '#fbbf2440' }]}>
            <Ionicons name="eye-outline" size={13} color="#fbbf24" />
            <Text style={[styles.statText, { color: '#fbbf24' }]}>Browse only</Text>
          </View>
        </Animated.View>
      )}

      {/* ── Campus Spotlight ── */}
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
                <View style={[styles.quickGlow, { backgroundColor: q.glow + '20' }]} />
                <Ionicons name={q.icon} size={26} color={q.color} />
              </View>
              <Text style={styles.quickLabel}>{q.label}</Text>
            </Press>
          ))}
        </View>
      </Animated.View>

      {/* ── Campus Features ── */}
      <Animated.View style={[styles.section, makeAnim(sec3Anim)]}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Campus Life</Text>
          <View style={styles.soonBadge}>
            <Text style={styles.soonText}>Coming Soon</Text>
          </View>
        </View>
        <View style={styles.featuresGrid}>
          {FEATURES.map((f) => (
            <Press key={f.label} onPress={() => handleFeature(f.label)} style={[styles.featureCard, { backgroundColor: f.bg }]}>
              {/* Glow blob */}
              <View style={[styles.featureBlob, { backgroundColor: f.color + '18' }]} />
              <View style={[styles.featureIconWrap, { borderColor: f.color + '40', backgroundColor: f.color + '18' }]}>
                <Ionicons name={f.icon} size={22} color={f.color} />
              </View>
              <Text style={styles.featureName}>{f.label}</Text>
              <Text style={styles.featureDesc} numberOfLines={1}>{f.desc}</Text>
              <View style={[styles.featureSoon, { borderColor: f.color + '50' }]}>
                <Text style={[styles.featureSoonText, { color: f.color }]}>🔒 Soon</Text>
              </View>
            </Press>
          ))}
        </View>
      </Animated.View>

      {/* ── Recent Activity ── */}
      {recentItems.length > 0 && (
        <Animated.View style={[styles.section, makeAnim(sec4Anim)]}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Recently Viewed</Text>
            <TouchableOpacity onPress={() => { setRecentItems([]); AsyncStorage.removeItem(getRecentKey(currentUser?.id)); }}>
              <Text style={styles.clearRecentTxt}>Clear</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 20 }}>
            {recentItems.map((item) => {
              const img = item.imageUrl || item.image || item.images?.[0];
              return (
                <Press key={item._id} onPress={() => handleItemPress(item)} style={styles.recentCard}>
                  {img
                    ? <Image source={{ uri: img }} style={styles.recentThumb} resizeMode="cover" />
                    : <View style={[styles.recentThumb, styles.recentThumbFallback]}><Ionicons name="cube-outline" size={18} color="#334155" /></View>
                  }
                  <Text style={styles.recentName} numberOfLines={2}>{item.name || item.title}</Text>
                  {item.price != null && <Text style={styles.recentPrice}>₹{item.price}</Text>}
                </Press>
              );
            })}
          </ScrollView>
        </Animated.View>
      )}

      {/* ── Filter Chips ── */}
      <View style={[styles.section, { paddingBottom: 0, marginBottom: 0 }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 20 }}>
          {CATEGORIES.map((cat) => {
            const active = activeCategory === cat.label;
            return (
              <Press key={cat.label} onPress={() => setActiveCategory(cat.label)} style={[styles.chip, active && styles.chipOn]}>
                <Ionicons name={cat.icon} size={13} color={active ? '#fff' : '#64748b'} style={{ marginRight: 5 }} />
                <Text style={[styles.chipTxt, active && styles.chipTxtOn]}>{cat.label}</Text>
              </Press>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Listings Label + Sort ── */}
      <View style={styles.listHead}>
        <Text style={styles.listTitle}>
          {activeCategory === 'All' ? 'All Listings' : activeCategory}
          {searchQuery ? `  ·  "${searchQuery}"` : ''}
        </Text>
        {!loading && <Text style={styles.listCount}>{filteredItems.length}</Text>}
      </View>
      {!loading && filteredItems.length > 0 && (
        <View style={styles.sortRow}>
          {[
            { key: 'none', label: 'Default' },
            { key: 'asc',  label: '₹ Low → High' },
            { key: 'desc', label: '₹ High → Low' },
          ].map(s => (
            <Press key={s.key} onPress={() => { setSortOrder(s.key); setShowAll(false); }} style={[styles.sortChip, sortOrder === s.key && styles.sortChipOn]}>
              <Text style={[styles.sortChipTxt, sortOrder === s.key && styles.sortChipTxtOn]}>{s.label}</Text>
            </Press>
          ))}
        </View>
      )}

      {loading && (
        <View style={styles.skRow}>
          {[0, 1, 2, 3].map(i => <Skeleton key={i} shimmer={shimmer} w={CARD_W} h={CARD_W * 1.25} radius={14} style={{ marginBottom: 16 }} />)}
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar backgroundColor="#07090f" barStyle="light-content" />

      {/* ── Sticky Top Bar ─────────────────────────────────────────────────── */}
      <Animated.View style={[styles.topBar, makeAnim(heroAnim, 18)]}>
        {/* Decorative orbs */}
        <View style={styles.orb1} />
        <View style={styles.orb2} />

        {/* Campus row */}
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
          <Ionicons name="search" size={17} color={searchFocused ? '#818cf8' : '#64748b'} style={{ marginRight: 9 }} />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search items on campus…`}
            placeholderTextColor="#475569"
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
              <Ionicons name="close-circle" size={17} color="#475569" />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Search Suggestions Dropdown ── */}
        {searchFocused && suggestions.length > 0 && (
          <Animated.View
            style={[
              styles.suggestBox,
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
                  style={[styles.suggestRow, idx < suggestions.length - 1 && styles.suggestBorder]}
                  onPress={() => handleSuggestionPress(item)}
                  activeOpacity={0.75}
                >
                  {/* Thumbnail */}
                  {img
                    ? <Image source={{ uri: img }} style={styles.suggestThumb} resizeMode="cover" />
                    : (
                      <View style={[styles.suggestThumb, styles.suggestThumbFallback]}>
                        <Ionicons name="cube-outline" size={16} color="#334155" />
                      </View>
                    )
                  }
                  {/* Text */}
                  <View style={{ flex: 1 }}>
                    {/* Highlighted name */}
                    <Text style={styles.suggestName} numberOfLines={1}>
                      {matchIdx >= 0 ? (
                        <>
                          <Text>{name.slice(0, matchIdx)}</Text>
                          <Text style={styles.suggestHighlight}>{name.slice(matchIdx, matchIdx + q.length)}</Text>
                          <Text>{name.slice(matchIdx + q.length)}</Text>
                        </>
                      ) : name}
                    </Text>
                    <Text style={styles.suggestMeta} numberOfLines={1}>
                      {item.category}{item.price != null ? `  ·  ₹${item.price}` : ''}
                    </Text>
                  </View>
                  <Ionicons name="arrow-forward" size={15} color="#334155" />
                </TouchableOpacity>
              );
            })}
          </Animated.View>
        )}

        {/* No match hint */}
        {searchFocused && searchQuery.length > 0 && suggestions.length === 0 && (
          <Animated.View style={[styles.noSuggestBox, { opacity: suggestAnim }]}>
            <Ionicons name="search-outline" size={16} color="#334155" />
            <Text style={styles.noSuggestText}>No items matching "{searchQuery}"</Text>
          </Animated.View>
        )}
      </Animated.View>

      {/* ── Main Content ─────────────────────────────────────────────────────── */}
      {loading ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.pad}>
          <ListHeader />
        </ScrollView>
      ) : (
        <FlatList
          ref={listRef}
          data={displayItems}
          keyExtractor={i => i._id}
          numColumns={2}
          contentContainerStyle={styles.pad}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6366f1']} tintColor="#6366f1" />
          }
          renderItem={renderItem}
          ListHeaderComponent={<ListHeader />}
          ListFooterComponent={
            <View>
              {/* View All / Show Less */}
              {!loading && sortedItems.length > 10 && (
                <Press onPress={() => setShowAll(v => !v)} style={styles.viewAllBtn}>
                  <Text style={styles.viewAllTxt}>
                    {showAll ? '↑  Show Less' : `View All  (${sortedItems.length})`}
                  </Text>
                  <Ionicons name={showAll ? 'chevron-up' : 'chevron-down'} size={15} color="#818cf8" />
                </Press>
              )}
              {/* Events Calendar */}
              <EventsCalendar events={events} navigation={navigation} />
            </View>
          }
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
  topRow: { position: 'absolute', top: 14, left: 14 },
  badge: {
    backgroundColor: 'rgba(99,102,241,0.75)', borderRadius: 20,
    paddingHorizontal: 11, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(165,180,252,0.4)',
  },
  badgeText: { color: '#e0e7ff', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  bottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16,
    backgroundColor: 'rgba(0,0,0,0.58)',
  },
  itemName: { fontSize: 17, fontWeight: '900', color: '#fff', marginBottom: 8 },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  price: { fontSize: 16, fontWeight: '800', color: '#34d399' },
  viewBtn: {
    backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  viewTxt: { color: '#fff', fontSize: 13, fontWeight: '800' },
});

// ─── Main styles ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#07090f' },
  pad:  { paddingBottom: 110 },

  // Top bar (sticky)
  topBar: {
    backgroundColor: '#07090f',
    paddingHorizontal: 18,
    paddingTop: Platform.OS === 'android' ? 10 : 6,
    paddingBottom: 14,
    zIndex: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#0f172a',
    overflow: 'visible',
  },
  orb1: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: '#6366f1', opacity: 0.07, top: -50, right: -40 },
  orb2: { position: 'absolute', width: 130, height: 130, borderRadius: 65, backgroundColor: '#06b6d4', opacity: 0.06, top: 10, left: -30 },

  heroTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  greeting: { fontSize: 13, color: '#64748b', fontWeight: '600', marginBottom: 4 },
  heroName: { fontSize: 24, fontWeight: '900', color: '#f1f5f9', maxWidth: SW * 0.55 },
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
    paddingHorizontal: 15, paddingVertical: 11,
    borderWidth: 1, borderColor: '#1e293b',
  },
  searchInput: { flex: 1, fontSize: 15, color: '#e2e8f0', padding: 0 },

  // Suggestions dropdown
  suggestBox: {
    backgroundColor: '#111827',
    borderRadius: 16, marginTop: 6,
    borderWidth: 1, borderColor: '#1e293b',
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5, shadowRadius: 16, elevation: 20,
    zIndex: 999,
  },
  suggestRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 11, gap: 12,
  },
  suggestBorder: { borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  suggestThumb: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#1e293b' },
  suggestThumbFallback: { alignItems: 'center', justifyContent: 'center' },
  suggestName: { fontSize: 14, fontWeight: '700', color: '#e2e8f0', marginBottom: 2 },
  suggestHighlight: { color: '#818cf8', fontWeight: '900', backgroundColor: 'rgba(99,102,241,0.15)' },
  suggestMeta: { fontSize: 12, color: '#475569', fontWeight: '500' },

  noSuggestBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#0f172a', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12, marginTop: 6,
    borderWidth: 1, borderColor: '#1e293b',
  },
  noSuggestText: { fontSize: 13, color: '#334155', fontStyle: 'italic' },

  // Stats row
  statsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 18, paddingTop: 14, marginBottom: 4 },
  statChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#0f172a', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: '#1e293b',
  },
  statText: { fontSize: 12, color: '#818cf8', fontWeight: '700' },

  // Section
  section: { paddingHorizontal: 18, marginBottom: 28 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sectionTitle: { fontSize: 17, fontWeight: '900', color: '#f1f5f9', marginBottom: 14, letterSpacing: 0.2 },
  soonBadge: {
    backgroundColor: '#1e1b4b', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: '#312e81',
  },
  soonText: { fontSize: 11, color: '#818cf8', fontWeight: '800' },

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
    borderWidth: 1.5, marginBottom: 8, overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6,
  },
  quickGlow: { ...StyleSheet.absoluteFillObject },
  quickLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '700', textAlign: 'center' },

  // Campus features grid
  featuresGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  featureCard: {
    width: (SW - 48) / 2, borderRadius: 20, padding: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  featureBlob: {
    position: 'absolute', width: 80, height: 80, borderRadius: 40,
    top: -20, right: -20,
  },
  featureIconWrap: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, marginBottom: 10,
  },
  featureName: { fontSize: 13, fontWeight: '800', color: '#f1f5f9', marginBottom: 3 },
  featureDesc: { fontSize: 11, color: '#64748b', fontWeight: '500', marginBottom: 10 },
  featureSoon: {
    alignSelf: 'flex-start', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, backgroundColor: 'rgba(0,0,0,0.3)',
  },
  featureSoonText: { fontSize: 10, fontWeight: '800' },

  // Pills
  pill: {
    backgroundColor: '#111827', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 9,
    borderWidth: 1, borderColor: '#1e293b', maxWidth: 200,
  },
  pillText: { fontSize: 13, color: '#cbd5e1', fontWeight: '600' },

  // Category chips
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
  listTitle: { fontSize: 16, fontWeight: '900', color: '#f1f5f9', flex: 1 },
  listCount: {
    fontSize: 13, color: '#6366f1', fontWeight: '800',
    backgroundColor: '#1e1b4b', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 3,
  },

  // Grid
  row:  { justifyContent: 'space-between', paddingHorizontal: 18 },
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
    backgroundColor: '#1e1b4b', alignItems: 'center', justifyContent: 'center',
    marginBottom: 18, borderWidth: 1, borderColor: '#312e81',
  },
  emptyTitle: { fontSize: 20, fontWeight: '900', color: '#f1f5f9', marginBottom: 8 },
  emptySub:   { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 20 },
  clearBtn:   { marginTop: 18, backgroundColor: '#4f46e5', borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12 },
  clearTxt:   { color: '#fff', fontWeight: '800', fontSize: 14 },

  // Modal
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#0f172a', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingTop: 12, paddingHorizontal: 20, paddingBottom: 36, maxHeight: '82%',
    borderWidth: 1, borderColor: '#1e293b',
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#334155', alignSelf: 'center', marginBottom: 18 },
  sheetTitle: { fontSize: 20, fontWeight: '900', color: '#f1f5f9', textAlign: 'center', marginBottom: 4 },
  sheetSub:   { fontSize: 13, color: '#64748b', textAlign: 'center', marginBottom: 16 },
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

  // Sort chips
  sortRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 18, marginBottom: 12 },
  sortChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0f172a', borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: '#1e293b',
  },
  sortChipOn: { backgroundColor: '#1e1b4b', borderColor: '#6366f1' },
  sortChipTxt: { fontSize: 11, color: '#64748b', fontWeight: '700' },
  sortChipTxtOn: { color: '#818cf8' },

  // View All button
  viewAllBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 18, marginTop: 16, marginBottom: 8,
    backgroundColor: '#111827', borderRadius: 16,
    paddingVertical: 14, borderWidth: 1, borderColor: '#1e293b',
  },
  viewAllTxt: { fontSize: 14, fontWeight: '800', color: '#818cf8' },

  // Recent cards
  clearRecentTxt: { fontSize: 12, color: '#ef4444', fontWeight: '700' },
  recentCard: {
    width: 110, backgroundColor: '#0f172a', borderRadius: 16,
    padding: 10, borderWidth: 1, borderColor: '#1e293b',
  },
  recentThumb: { width: '100%', height: 70, borderRadius: 10, marginBottom: 8, backgroundColor: '#1e293b' },
  recentThumbFallback: { alignItems: 'center', justifyContent: 'center' },
  recentName: { fontSize: 12, fontWeight: '700', color: '#cbd5e1', marginBottom: 4, lineHeight: 16 },
  recentPrice: { fontSize: 12, fontWeight: '800', color: '#34d399' },
});

// ─── Events Calendar styles ───────────────────────────────────────────────────
const ev = StyleSheet.create({
  wrap: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '900', color: '#f1f5f9' },
  fullBtn: { fontSize: 13, fontWeight: '800', color: '#818cf8' },

  emptyState: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 28, borderRadius: 16,
    borderWidth: 1, borderColor: '#1e293b', borderStyle: 'dashed',
    backgroundColor: '#0f1a2e', gap: 6,
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#475569' },
  emptySub:   { fontSize: 12, color: '#334155', textAlign: 'center' },

  featured: {
    height: 180, borderRadius: 20, overflow: 'hidden', backgroundColor: '#0d1117',
    marginBottom: 16, padding: 18, justifyContent: 'flex-end',
    borderWidth: 1, borderColor: '#312e81',
    shadowColor: '#6366f1', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 14, elevation: 10,
  },
  featuredOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20,16,50,0.72)',
  },
  featuredBadge: {
    position: 'absolute', top: 16, left: 18,
    backgroundColor: 'rgba(99,102,241,0.7)', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  featuredBadgeTxt: { fontSize: 10, fontWeight: '900', color: '#e0e7ff', letterSpacing: 1 },
  featuredTitle: { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 8 },
  featuredMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  featuredMetaTxt: { fontSize: 12, color: '#a5b4fc', fontWeight: '600' },
  dateBadge: {
    position: 'absolute', top: 12, right: 16,
    backgroundColor: '#1e1b4b', borderRadius: 12,
    width: 52, alignItems: 'center', paddingVertical: 8,
    borderWidth: 1, borderColor: '#4338ca',
  },
  dateBadgeDay: { fontSize: 22, fontWeight: '900', color: '#fff', lineHeight: 26 },
  dateBadgeMon: { fontSize: 10, fontWeight: '900', color: '#818cf8', letterSpacing: 1 },

  card: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    width: 210, backgroundColor: '#0f172a',
    borderRadius: 18, padding: 14, borderWidth: 1,
  },
  cardDate: {
    width: 46, alignItems: 'center', paddingVertical: 8,
    borderRadius: 12, borderWidth: 1,
  },
  cardDay: { fontSize: 20, fontWeight: '900', lineHeight: 24 },
  cardMon: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  cardTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  cardTime: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  cardTitle: { fontSize: 13, fontWeight: '800', color: '#e2e8f0', marginBottom: 6 },
  cardLocRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardLoc: { fontSize: 11, color: '#64748b', fontWeight: '500', flex: 1 },
});

export default HomeScreen;
