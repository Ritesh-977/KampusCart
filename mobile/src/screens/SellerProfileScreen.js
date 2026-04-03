import React, {
  useState,
  useEffect,
  useContext,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Animated,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import API from '../api/axios';

const { width } = Dimensions.get('window');

const FALLBACK_AVATAR =
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&q=80';

const ITEMS_PER_PAGE = 10;
const CARD_GAP = 12;
const H_PADDING = 16;
const CARD_WIDTH = (width - H_PADDING * 2 - CARD_GAP) / 2;

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonBox({ width: w, height: h, borderRadius = 8, style }) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { width: w, height: h, borderRadius, backgroundColor: '#333' },
        { opacity },
        style,
      ]}
    />
  );
}

function HeaderSkeleton({ theme }) {
  return (
    <View style={{ backgroundColor: theme.background, paddingBottom: 16 }}>
      {/* Cover */}
      <SkeletonBox width="100%" height={130} borderRadius={0} />
      {/* Avatar */}
      <View style={{ paddingHorizontal: H_PADDING }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: -36 }}>
          <SkeletonBox width={72} height={72} borderRadius={36} />
        </View>
        <SkeletonBox width={160} height={18} style={{ marginTop: 12 }} />
        <SkeletonBox width={120} height={13} style={{ marginTop: 8 }} />
        <SkeletonBox width={100} height={13} style={{ marginTop: 6 }} />
        <View style={{ flexDirection: 'row', gap: 16, marginTop: 14 }}>
          <SkeletonBox width={60} height={32} borderRadius={8} />
          <SkeletonBox width={60} height={32} borderRadius={8} />
        </View>
      </View>
    </View>
  );
}

function ItemCardSkeleton({ theme }) {
  return (
    <View
      style={{
        width: CARD_WIDTH,
        backgroundColor: theme.card,
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: CARD_GAP,
        borderWidth: 1,
        borderColor: theme.inputBorder,
      }}
    >
      <SkeletonBox width={CARD_WIDTH} height={CARD_WIDTH} borderRadius={0} />
      <View style={{ padding: 8, gap: 6 }}>
        <SkeletonBox width="80%" height={13} />
        <SkeletonBox width="40%" height={16} />
      </View>
    </View>
  );
}

// ─── Item Card ────────────────────────────────────────────────────────────────

const ItemCard = React.memo(function ItemCard({ item, onPress, theme }) {
  const imgUri =
    item.images?.[0]?.url || item.images?.[0] || null;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          width: CARD_WIDTH,
          backgroundColor: theme.card,
          borderColor: theme.inputBorder,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {imgUri ? (
        <Image source={{ uri: imgUri }} style={styles.cardImage} resizeMode="cover" />
      ) : (
        <View style={[styles.cardImage, { backgroundColor: theme.inputBg, justifyContent: 'center', alignItems: 'center' }]}>
          <Ionicons name="image-outline" size={32} color={theme.textTertiary} />
        </View>
      )}
      {item.isSold && (
        <View style={styles.soldBadge}>
          <Text style={styles.soldBadgeText}>SOLD</Text>
        </View>
      )}
      <View style={styles.cardBody}>
        <Text style={[styles.cardTitle, { color: theme.textMain }]} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={[styles.cardPrice, { color: theme.primaryAccent }]}>
          ₹{Number(item.price).toLocaleString('en-IN')}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

// ─── Profile Header ───────────────────────────────────────────────────────────

const ProfileHeader = React.memo(function ProfileHeader({ user, totalListings, theme }) {
  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : null;

  return (
    <View style={{ backgroundColor: theme.background, marginBottom: 4 }}>
      {/* Cover Image */}
      <View style={{ width: '100%', height: 130, backgroundColor: theme.card }}>
        {user?.coverImage ? (
          <Image
            source={{ uri: user.coverImage }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              width: '100%',
              height: '100%',
              backgroundColor: theme.primaryAccent + '25',
            }}
          />
        )}
      </View>

      {/* Avatar + Name row */}
      <View style={{ paddingHorizontal: H_PADDING }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: -36 }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              borderWidth: 3,
              borderColor: theme.background,
              overflow: 'hidden',
              backgroundColor: theme.card,
            }}
          >
            <Image
              source={{ uri: user?.profilePic || FALLBACK_AVATAR }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          </View>
        </View>

        <Text
          style={{
            fontSize: 20,
            fontWeight: '800',
            color: theme.textMain,
            marginTop: 10,
          }}
        >
          {user?.name || 'Seller'}
        </Text>

        {user?.college && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
            <Ionicons name="school-outline" size={13} color={theme.textTertiary} />
            <Text style={{ fontSize: 13, color: theme.textTertiary, marginLeft: 4 }}>
              {user.college}
            </Text>
          </View>
        )}

        {memberSince && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
            <Ionicons name="calendar-outline" size={13} color={theme.textTertiary} />
            <Text style={{ fontSize: 13, color: theme.textTertiary, marginLeft: 4 }}>
              Member since {memberSince}
            </Text>
          </View>
        )}

        {/* Stats row */}
        <View
          style={{
            flexDirection: 'row',
            gap: 24,
            marginTop: 14,
            paddingBottom: 16,
            borderBottomWidth: 1,
            borderBottomColor: theme.inputBorder,
          }}
        >
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: theme.textMain }}>
              {totalListings ?? '—'}
            </Text>
            <Text style={{ fontSize: 12, color: theme.textTertiary, marginTop: 2 }}>
              Active
            </Text>
          </View>
          {user?.year ? (
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: theme.textMain }}>
                {user.year}
              </Text>
              <Text style={{ fontSize: 12, color: theme.textTertiary, marginTop: 2 }}>
                Year
              </Text>
            </View>
          ) : null}
        </View>

        <Text
          style={{
            fontSize: 16,
            fontWeight: '700',
            color: theme.textMain,
            paddingTop: 14,
            paddingBottom: 10,
          }}
        >
          Active Listings
        </Text>
      </View>
    </View>
  );
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

const SellerProfileScreen = ({ route, navigation }) => {
  const { sellerId, sellerName } = route.params;
  const { currentUser } = useContext(AuthContext);
  const { theme } = useTheme();

  const [user, setUser]           = useState(null);
  const [items, setItems]         = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage]           = useState(1);

  // Three-state loading: 'initial' | 'more' | false
  const [loading, setLoading]     = useState('initial');
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]         = useState(null);

  // Prevent duplicate in-flight requests
  const fetchingRef = useRef(false);

  // ── Set header title ──────────────────────────────────────────────────────
  useEffect(() => {
    navigation.setOptions({ title: sellerName || 'Seller Profile' });
  }, [sellerName]);

  // ── Fetch page ────────────────────────────────────────────────────────────
  const fetchPage = useCallback(
    async (targetPage, isRefresh = false) => {
      if (fetchingRef.current) return;
      fetchingRef.current = true;

      if (isRefresh) {
        setRefreshing(true);
        setError(null);
      } else if (targetPage === 1) {
        setLoading('initial');
        setError(null);
      } else {
        setLoading('more');
      }

      try {
        const res = await API.get(
          `/users/${sellerId}/profile?page=${targetPage}&limit=${ITEMS_PER_PAGE}`
        );
        const { user: fetchedUser, items: fetchedItems, pagination: pag } = res.data;

        if (targetPage === 1 || isRefresh) {
          setUser(fetchedUser);
          setItems(fetchedItems);
        } else {
          setItems((prev) => [...prev, ...fetchedItems]);
        }

        setPagination(pag);
        setPage(targetPage);
      } catch (err) {
        setError('Failed to load profile. Tap to retry.');
      } finally {
        setLoading(false);
        setRefreshing(false);
        fetchingRef.current = false;
      }
    },
    [sellerId]
  );

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetchPage(1);
  }, [fetchPage]);

  // ── Pull-to-refresh ───────────────────────────────────────────────────────
  const handleRefresh = useCallback(() => {
    fetchPage(1, true);
  }, [fetchPage]);

  // ── Infinite scroll ───────────────────────────────────────────────────────
  const handleEndReached = useCallback(() => {
    if (loading || !pagination?.hasMore) return;
    fetchPage(page + 1);
  }, [loading, pagination, page, fetchPage]);

  // ── Navigate to item ──────────────────────────────────────────────────────
  const handleItemPress = useCallback(
    (item) => {
      const isOwner = currentUser?._id === (item.seller?._id || item.seller);
      navigation.navigate('ItemDetails', {
        item,
        activeCollege: currentUser?.college,
        isOwner,
      });
    },
    [currentUser, navigation]
  );

  // ── Render functions ──────────────────────────────────────────────────────
  const renderItem = useCallback(
    ({ item }) => (
      <ItemCard item={item} onPress={() => handleItemPress(item)} theme={theme} />
    ),
    [handleItemPress, theme]
  );

  const keyExtractor = useCallback((item) => item._id, []);

  const ListHeader = useMemo(() => {
    if (loading === 'initial') return <HeaderSkeleton theme={theme} />;
    if (!user) return null;
    return (
      <ProfileHeader
        user={user}
        totalListings={pagination?.total}
        theme={theme}
      />
    );
  }, [loading, user, pagination, theme]);

  const ListEmpty = useMemo(() => {
    if (loading === 'initial') {
      // Show skeleton cards
      return (
        <View style={[styles.gridRow, { paddingHorizontal: H_PADDING }]}>
          {Array.from({ length: 4 }).map((_, i) => (
            <ItemCardSkeleton key={i} theme={theme} />
          ))}
        </View>
      );
    }
    if (error) {
      return (
        <TouchableOpacity
          style={styles.centeredBlock}
          onPress={() => fetchPage(1)}
          activeOpacity={0.7}
        >
          <Ionicons name="cloud-offline-outline" size={48} color={theme.textTertiary} />
          <Text style={[styles.errorText, { color: theme.textTertiary }]}>{error}</Text>
        </TouchableOpacity>
      );
    }
    return (
      <View style={styles.centeredBlock}>
        <Ionicons name="cube-outline" size={48} color={theme.textTertiary} />
        <Text style={[styles.emptyText, { color: theme.textTertiary }]}>
          No active listings
        </Text>
      </View>
    );
  }, [loading, error, theme, fetchPage]);

  const ListFooter = useMemo(() => {
    if (loading === 'more') {
      return (
        <View style={{ paddingVertical: 20, alignItems: 'center' }}>
          <ActivityIndicator color={theme.primaryAccent} />
        </View>
      );
    }
    if (pagination && !pagination.hasMore && items.length > 0) {
      return (
        <Text
          style={{
            textAlign: 'center',
            color: theme.textTertiary,
            fontSize: 13,
            paddingVertical: 20,
          }}
        >
          All listings shown
        </Text>
      );
    }
    return null;
  }, [loading, pagination, items.length, theme]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        numColumns={2}
        columnWrapperStyle={{
          paddingHorizontal: H_PADDING,
          gap: CARD_GAP,
        }}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        ListFooterComponent={ListFooter}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.3}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.primaryAccent}
            colors={[theme.primaryAccent]}
          />
        }
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        // Performance: pre-render windows are tuned for a 2-col grid
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews
      />
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: CARD_GAP,
    borderWidth: 1,
  },
  cardImage: {
    width: '100%',
    height: CARD_WIDTH,
  },
  soldBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  soldBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cardBody: {
    padding: 8,
    gap: 4,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 17,
  },
  cardPrice: {
    fontSize: 15,
    fontWeight: '800',
  },
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
  },
  centeredBlock: {
    alignItems: 'center',
    paddingTop: 48,
    paddingHorizontal: H_PADDING,
    gap: 12,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
  },
});

export default SellerProfileScreen;
