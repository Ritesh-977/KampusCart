import React, { useState, useContext, useEffect, useMemo } from 'react';
import * as ExpoLinking from 'expo-linking';
import Toast from 'react-native-toast-message';
import {
  View, Text, Image, ScrollView,
  TouchableOpacity, SafeAreaView, Alert, Linking,
  ActivityIndicator, Dimensions, Modal, Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import API from '../api/axios';

const { width } = Dimensions.get('window');

const REPORT_REASONS = [
  { label: 'Spam or Duplicate',      icon: 'copy-outline',      value: 'Spam or duplicate listing' },
  { label: 'Inappropriate Content',  icon: 'eye-off-outline',   value: 'Inappropriate content' },
  { label: 'Wrong Category',         icon: 'pricetag-outline',  value: 'Wrong category' },
  { label: 'Misleading Price',       icon: 'alert-circle-outline', value: 'Misleading price' },
];

const ItemDetailsScreen = ({ route, navigation }) => {
  // Two entry paths:
  //  Normal navigation: { item, activeCollege, isOwner }  — full object passed by HomeScreen
  //  Deep link arrival: { itemId }                        — only the ID from the URL
  const { item: routeItem, activeCollege, isOwner: routeIsOwner, itemId } = route.params;

  const { currentUser } = useContext(AuthContext);
  const { theme } = useTheme();

  // item may be null on first render if we arrived via a deep link
  const [item, setItem]                       = useState(routeItem ?? null);
  const [deepLinkLoading, setDeepLinkLoading] = useState(!routeItem && !!itemId);
  const [deepLinkError, setDeepLinkError]     = useState(false);

  // Fetch the full item when the screen is opened via a deep link
  useEffect(() => {
    if (routeItem || !itemId) return;           // nothing to fetch
    let cancelled = false;

    API.get(`/items/${itemId}`)
      .then((res) => {
        if (!cancelled) {
          setItem(res.data);
          setIsSold(res.data.isSold ?? false);
        }
      })
      .catch(() => { if (!cancelled) setDeepLinkError(true); })
      .finally(() => { if (!cancelled) setDeepLinkLoading(false); });

    return () => { cancelled = true; };
  }, [itemId, routeItem]);

  // isOwner: explicit when navigated normally; derived from currentUser when deep-linked
  const isOwner = routeIsOwner ??
    (!!currentUser && !!item &&
      currentUser._id === (item.seller?._id?.toString() ?? item.seller?.toString()));

  const [isSold, setIsSold]                   = useState(routeItem?.isSold || false);
  const [loadingAction, setLoadingAction]     = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isWishlisted, setIsWishlisted]       = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [reportVisible, setReportVisible]     = useState(false);
  const [reportSubmitting, setReportSubmitting] = useState(false);

  const memoStyles = useMemo(() => ({
    safeArea: { flex: 1, backgroundColor: theme.background },
    container: { flex: 1, backgroundColor: theme.background },
    carouselContainer: { width, height: 320, backgroundColor: theme.card },
    image: { width, height: 320, resizeMode: 'contain', backgroundColor: theme.card },
    paginationContainer: {
      position: 'absolute', bottom: 14,
      flexDirection: 'row', width: '100%', justifyContent: 'center',
    },
    dot: { width: 7, height: 7, borderRadius: 4, marginHorizontal: 3 },
    activeDot: { backgroundColor: '#ffffff', width: 20 },
    inactiveDot: { backgroundColor: 'rgba(255,255,255,0.35)' },
    soldBadge: {
      position: 'absolute', top: 16, left: 16,
      backgroundColor: '#ef4444', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8,
    },
    soldBadgeText: { color: '#ffffff', fontWeight: '900', fontSize: 14, letterSpacing: 1 },
    shareBtn: {
      position: 'absolute', top: 16, left: 16,
      backgroundColor: 'rgba(0,0,0,0.5)', padding: 8, borderRadius: 20,
    },
    wishlistBtn: {
      position: 'absolute', top: 16, right: 16,
      backgroundColor: 'rgba(0,0,0,0.5)', padding: 8, borderRadius: 20,
    },
    detailsContainer: { padding: 20, backgroundColor: theme.background },
    titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
    title: { fontSize: 22, fontWeight: '800', color: theme.textMain, flex: 1, marginRight: 10, lineHeight: 28 },
    titleSold: { textDecorationLine: 'line-through', color: theme.textTertiary },
    price: { fontSize: 26, fontWeight: '900', color: theme.primaryAccent },
    categoryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    categoryBadge: { backgroundColor: theme.primaryAccent + '20', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
    categoryText: { fontSize: 13, color: theme.primaryAccent, fontWeight: '700', textTransform: 'uppercase' },
    actionIcons: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4 },
    iconBtnText: { fontSize: 12, color: theme.textTertiary, fontWeight: '600' },
    infoCard: {
      backgroundColor: theme.card, padding: 14, borderRadius: 12,
      marginBottom: 20, borderWidth: 1, borderColor: theme.inputBorder,
    },
    infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    infoText: { fontSize: 14, color: theme.textSub, marginLeft: 8, fontWeight: '500' },
    sectionTitle: { fontSize: 17, fontWeight: '700', color: theme.textMain, marginBottom: 8 },
    description: { fontSize: 15, color: theme.textSub, lineHeight: 24, marginBottom: 20 },
    safetyCard: {
      flexDirection: 'row', alignItems: 'flex-start',
      backgroundColor: theme.secondaryAction + '15', padding: 12, borderRadius: 10,
      borderWidth: 1, borderColor: theme.secondaryAction + '40',
    },
    safetyText: { fontSize: 13, color: theme.secondaryAction, marginLeft: 8, flex: 1, lineHeight: 18 },
    bottomBar: {
      position: 'absolute', bottom: 0, left: 0, right: 0,
      padding: 14, backgroundColor: theme.card,
      borderTopWidth: 1, borderTopColor: theme.inputBorder,
      shadowColor: '#000', shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.3, shadowRadius: 6, elevation: 8,
    },
    ownerControls: { flexDirection: 'row', gap: 10 },
    actionBtn: {
      flex: 1, flexDirection: 'row', paddingVertical: 14, borderRadius: 12,
      alignItems: 'center', justifyContent: 'center',
    },
    deleteBtn: { backgroundColor: '#ef4444' },
    soldBtn: { backgroundColor: theme.primaryAction },
    availableBtn: { backgroundColor: theme.secondaryAction },
    actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 15, marginLeft: 6 },
    buyerControls: { flexDirection: 'row', gap: 10 },
    chatBtn: {
      flex: 1, flexDirection: 'row', paddingVertical: 14, borderRadius: 12,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: theme.primaryAccent + '15', borderWidth: 1.5, borderColor: theme.primaryAccent,
    },
    chatBtnText: { color: theme.primaryAccent, fontWeight: '700', fontSize: 15, marginLeft: 6 },
    whatsappBtn: {
      flex: 2, flexDirection: 'row', paddingVertical: 14, borderRadius: 12,
      backgroundColor: '#25D366', alignItems: 'center', justifyContent: 'center',
    },
    whatsappBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 15, marginLeft: 6 },
    btnDisabled: { backgroundColor: theme.inputBg, borderColor: theme.inputBorder },
    reportOverlay: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    },
    reportSheet: {
      backgroundColor: theme.card,
      borderTopLeftRadius: 28, borderTopRightRadius: 28,
      paddingHorizontal: 20, paddingBottom: 36,
      borderWidth: 1, borderColor: theme.inputBorder,
    },
    reportHandle: {
      width: 40, height: 4, borderRadius: 2, backgroundColor: theme.inputBorder,
      alignSelf: 'center', marginTop: 12, marginBottom: 16,
    },
    reportHeader: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4,
    },
    reportTitle: { fontSize: 18, fontWeight: '800', color: theme.textMain },
    reportCloseBtn: {
      width: 32, height: 32, borderRadius: 16,
      backgroundColor: theme.inputBg, alignItems: 'center', justifyContent: 'center',
      borderWidth: 1, borderColor: theme.inputBorder,
    },
    reportSubtitle: { fontSize: 13, color: theme.textTertiary, marginBottom: 20 },
    reportRow: {
      flexDirection: 'row', alignItems: 'center',
      paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.inputBg,
    },
    reportIconBox: {
      width: 36, height: 36, borderRadius: 10,
      backgroundColor: theme.primaryAccent + '15',
      alignItems: 'center', justifyContent: 'center', marginRight: 14,
    },
    reportRowText: { flex: 1, fontSize: 15, color: theme.textMain, fontWeight: '500' },
    reportCancelBtn: {
      marginTop: 16, paddingVertical: 14,
      backgroundColor: theme.inputBg, borderRadius: 12, alignItems: 'center',
    },
    reportCancelText: { color: '#ef4444', fontWeight: '700', fontSize: 15 },
  }), [theme]);

  // 👇 SAFE OPTIONAL CHAINING
  const isLocalCampus =
    item?.college?.toLowerCase() === currentUser?.college?.toLowerCase();

  // ── Fetch wishlist status on mount OR when deep-linked item loads ───────────
  useEffect(() => {
    const checkWishlist = async () => {
      // 👇 GUARD: Do not fetch the wishlist if the item hasn't loaded yet
      if (!item || !item._id) return; 

      try {
        const res = await API.get('/users/wishlist');
        const ids = (res.data || []).map(w => w._id || w);
        setIsWishlisted(ids.includes(item._id)); // Now safe!
      } catch (_) {
        // silent — wishlist state just defaults to false
      }
    };
    
    if (!isOwner) checkWishlist();
    
  // 👇 ADD DEPENDENCIES: Re-run this hook once the deep link API fetches the item
  }, [item?._id, isOwner]); 

  // ── WhatsApp ────────────────────────────────────────────────────────────────
  const handleWhatsApp = async () => {
    if (!isLocalCampus) {
      Toast.show({ type: 'error', text1: 'Window Shopping', text2: `You can only buy from your home campus. This item is at ${item.college}.` });
      return;
    }
    if (!item.contactNumber) {
      Toast.show({ type: 'error', text1: 'No Contact Info', text2: "The seller didn't provide a phone number." });
      return;
    }
    let phone = item.contactNumber.replace(/\D/g, '');
    if (phone.length === 10) phone = '91' + phone;
    const message = `Hi! I saw your listing for "${item.title}" (₹${item.price}) on KampusCart. Is it still available?`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    try {
      await Linking.openURL(url);
    } catch {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Could not open WhatsApp.' });
    }
  };

  // ── In-app chat ─────────────────────────────────────────────────────────────
  const handleInAppChat = async () => {
    if (!isLocalCampus) {
      Toast.show({ type: 'error', text1: 'Window Shopping', text2: 'You can only message sellers from your home campus.' });
      return;
    }
    const sellerId = item.seller?._id || item.seller;
    if (!sellerId) { Toast.show({ type: 'error', text1: 'Error', text2: 'Cannot find seller info.' }); return; }
    try {
      setLoadingAction(true);
      const response = await API.post('/chat', { userId: sellerId });
      navigation.navigate('ChatTab', {
        screen: 'ChatList',
        params: {
          pendingChat: {
            chat: response.data,
            otherUser: { _id: sellerId, name: item.seller?.name || item.sellerName, profilePic: null },
          },
        },
      });
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Could not open chat. Please try again.',
      });
    } finally {
      setLoadingAction(false);
    }
  };

  // ── Wishlist toggle (with optimistic update) ────────────────────────────────
  const handleToggleWishlist = async () => {
    if (wishlistLoading) return;
    setWishlistLoading(true);
    const prev = isWishlisted;
    setIsWishlisted(!prev);          // optimistic
    try {
      await API.post('/users/wishlist', { itemId: item._id });
    } catch {
      setIsWishlisted(prev);         // revert on failure
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Could not update wishlist.',
      });
    } finally {
      setWishlistLoading(false);
    }
  };

  // ── Share ───────────────────────────────────────────────────────────────────
  const handleShare = async () => {
    // Single HTTPS link — the OS intercepts it and opens the app if installed
    // (Android App Link / iOS Universal Link). Falls back to the web browser
    // automatically when the app is not present. No custom scheme needed.
    const url      = `https://www.kampuscart.site/item/${item._id}`;
    const priceStr = `₹${Number(item.price).toLocaleString('en-IN')}`;
    const location = item.location || item.college || '';
    const snippet  = item.description
      ? item.description.slice(0, 100).trimEnd() + '…'
      : '';

    const message = `Check out this deal on KampusCart! 🛒\n\n*${item.title}* — ${priceStr}\n\n${url}`;

    try {
      await Share.share({
        title: item.title,
        message,
        url, // iOS Share Sheet uses `url` as the canonical link
      });
    } catch {
      /* user cancelled the share sheet */
    }
  };

  // ── Report ──────────────────────────────────────────────────────────────────
  const submitReport = async (reason) => {
    setReportSubmitting(true);
    try {
      await API.post(`/items/${item._id}/report`, { reason });
      setReportVisible(false);
      Toast.show({
        type: 'success',
        text1: 'Reported ✓',
        text2: 'Thanks for helping keep the campus clean!',
      });
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Could not submit report.',
      });

    } finally {
      setReportSubmitting(false);
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = () => {
    Alert.alert('Delete Listing', 'Permanently delete this listing?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            setLoadingAction(true);
            await API.delete(`/items/${item._id}`);
            Toast.show({
              type: 'success',
              text1: 'Deleted',
              text2: 'Your listing has been removed.',
            });
            navigation.navigate('Profile');
          } catch {
            Toast.show({
              type: 'error',
              text1: 'Error',
              text2: 'Failed to delete item.',
            });
          } finally {
            setLoadingAction(false);
          }
        },
      },
    ]);
  };

  // ── Toggle sold ─────────────────────────────────────────────────────────────
  const handleToggleSold = async () => {
    try {
      setLoadingAction(true);
      const response = await API.patch(`/items/${item._id}/status`);
      setIsSold(response.data.isSold);
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to update status.',
      });

    } finally {
      setLoadingAction(false);
    }
  };

  const onScroll = (event) => {
    const index = event.nativeEvent.contentOffset.x / event.nativeEvent.layoutMeasurement.width;
    setCurrentImageIndex(Math.round(index));
  };

  // ── Deep-link loading / error guards ────────────────────────────────────────
  if (deepLinkLoading) {
    return (
      <SafeAreaView style={[memoStyles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.primaryAccent} />
      </SafeAreaView>
    );
  }

  if (deepLinkError || !item) {
    return (
      <SafeAreaView style={[memoStyles.safeArea, { justifyContent: 'center', alignItems: 'center', gap: 12 }]}>
        <Ionicons name="cloud-offline-outline" size={48} color={theme.textTertiary} />
        <Text style={{ color: theme.textTertiary, fontSize: 15, fontWeight: '600' }}>
          Item not found
        </Text>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={{ color: theme.primaryAccent, fontSize: 14 }}>Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={memoStyles.safeArea}>
      <ScrollView style={memoStyles.container} contentContainerStyle={{ paddingBottom: 110 }}>

        {/* ── IMAGE CAROUSEL ── */}
        <View style={memoStyles.carouselContainer}>
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={onScroll}>
            {item.images && item.images.length > 0 ? (
              item.images.map((img, index) => (
                <Image key={index} source={{ uri: img.url || img }} style={memoStyles.image} resizeMode="contain" />
              ))
            ) : (
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1588508065123-287b28e0141c?w=400&q=80' }}
                style={memoStyles.image}
              />
            )}
          </ScrollView>

          {item.images && item.images.length > 1 && (
            <View style={memoStyles.paginationContainer}>
              {item.images.map((_, index) => (
                <View key={index} style={[memoStyles.dot, currentImageIndex === index ? memoStyles.activeDot : memoStyles.inactiveDot]} />
              ))}
            </View>
          )}

          {isSold && (
            <View style={memoStyles.soldBadge}>
              <Text style={memoStyles.soldBadgeText}>SOLD</Text>
            </View>
          )}

          {/* Share button — top left */}
          <TouchableOpacity style={memoStyles.shareBtn} onPress={handleShare}>
            <Ionicons name="share-social-outline" size={20} color="#ffffff" />
          </TouchableOpacity>

          {/* Wishlist button — top right */}
          {!isOwner && (
            <TouchableOpacity style={memoStyles.wishlistBtn} onPress={handleToggleWishlist} disabled={wishlistLoading}>
              <Ionicons
                name={isWishlisted ? 'heart' : 'heart-outline'}
                size={22}
                color={isWishlisted ? '#ef4444' : '#ffffff'}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* ── DETAILS ── */}
        <View style={memoStyles.detailsContainer}>

          <View style={memoStyles.titleRow}>
            <Text style={[memoStyles.title, isSold && memoStyles.titleSold]} numberOfLines={2}>{item.title}</Text>
            <Text style={memoStyles.price}>₹{Number(item.price).toLocaleString('en-IN')}</Text>
          </View>

          <View style={memoStyles.categoryRow}>
            <View style={memoStyles.categoryBadge}>
              <Text style={memoStyles.categoryText}>{item.category || 'General'}</Text>
            </View>
            {!isOwner && (
              <View style={memoStyles.actionIcons}>
                <TouchableOpacity style={memoStyles.iconBtn} onPress={handleShare}>
                  <Ionicons name="share-social-outline" size={17} color={theme.textTertiary} />
                  <Text style={memoStyles.iconBtnText}>Share</Text>
                </TouchableOpacity>
                <TouchableOpacity style={memoStyles.iconBtn} onPress={() => setReportVisible(true)}>
                  <Ionicons name="flag-outline" size={17} color={theme.textTertiary} />
                  <Text style={memoStyles.iconBtnText}>Report</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Info card */}
          <View style={memoStyles.infoCard}>
            <View style={memoStyles.infoRow}>
              <Ionicons name="location-outline" size={18} color={theme.primaryAccent} />
              <Text style={memoStyles.infoText}>{item.location || item.college}</Text>
            </View>
            <View style={memoStyles.infoRow}>
              <Ionicons name="time-outline" size={18} color={theme.primaryAccent} />
              <Text style={memoStyles.infoText}>
                Listed {new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
            </View>
            {(item.sellerName || item.seller?.name) && (
              <TouchableOpacity
                style={[memoStyles.infoRow, { marginBottom: 0 }]}
                onPress={() => {
                  const sellerId = item.seller?._id || item.seller;
                  if (sellerId) {
                    navigation.navigate('SellerProfile', {
                      sellerId,
                      sellerName: item.seller?.name || item.sellerName,
                    });
                  }
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="person-circle-outline" size={18} color={theme.primaryAccent} />
                <Text style={[memoStyles.infoText, { flex: 1 }]}>
                  {item.seller?.name || item.sellerName}
                </Text>
                <Ionicons name="chevron-forward" size={14} color={theme.textTertiary} />
              </TouchableOpacity>
            )}
          </View>

          <Text style={memoStyles.sectionTitle}>Description</Text>
          <Text style={memoStyles.description}>{item.description || 'No description provided.'}</Text>

          <View style={memoStyles.safetyCard}>
            <Ionicons name="shield-checkmark-outline" size={18} color={theme.secondaryAction} />
            <Text style={memoStyles.safetyText}>
              Meet in a public place (hostel mess, library) for safe transactions.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* ── BOTTOM ACTION BAR ── */}
      <View style={memoStyles.bottomBar}>
        {isOwner ? (
          <View style={memoStyles.ownerControls}>
            <TouchableOpacity style={[memoStyles.actionBtn, memoStyles.deleteBtn]} onPress={handleDelete} disabled={loadingAction}>
              <Ionicons name="trash-outline" size={18} color="#ffffff" />
              <Text style={memoStyles.actionBtnText}>Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[memoStyles.actionBtn, isSold ? memoStyles.availableBtn : memoStyles.soldBtn]}
              onPress={handleToggleSold}
              disabled={loadingAction}
            >
              {loadingAction ? <ActivityIndicator color="#fff" size="small" /> : (
                <>
                  <Ionicons name={isSold ? 'refresh-outline' : 'checkmark-circle-outline'} size={18} color="#fff" />
                  <Text style={memoStyles.actionBtnText}>{isSold ? 'Mark Available' : 'Mark Sold'}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={memoStyles.buyerControls}>
            <TouchableOpacity
              style={[memoStyles.chatBtn, (!isLocalCampus || isSold) && memoStyles.btnDisabled]}
              onPress={handleInAppChat}
              disabled={!isLocalCampus || isSold || loadingAction}
            >
              {loadingAction ? <ActivityIndicator color={theme.primaryAccent} size="small" /> : (
                <>
                  <Ionicons name="chatbubble-outline" size={20} color={theme.primaryAccent} />
                  <Text style={memoStyles.chatBtnText}>Message</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[memoStyles.whatsappBtn, (!isLocalCampus || isSold) && memoStyles.btnDisabled]}
              onPress={handleWhatsApp}
              disabled={!isLocalCampus || isSold}
            >
              <Ionicons name="logo-whatsapp" size={20} color="#ffffff" />
              <Text style={memoStyles.whatsappBtnText}>
                {isSold ? 'Sold Out' : isLocalCampus ? 'WhatsApp' : 'View Only'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ── REPORT BOTTOM SHEET ── */}
      <Modal visible={reportVisible} transparent animationType="slide" onRequestClose={() => setReportVisible(false)}>
        <TouchableOpacity style={memoStyles.reportOverlay} activeOpacity={1} onPress={() => setReportVisible(false)} />
        <View style={memoStyles.reportSheet}>
          {/* Handle + Header */}
          <View style={memoStyles.reportHandle} />
          <View style={memoStyles.reportHeader}>
            <Text style={memoStyles.reportTitle}>Report Listing</Text>
            <TouchableOpacity style={memoStyles.reportCloseBtn} onPress={() => setReportVisible(false)}>
              <Ionicons name="close" size={20} color={theme.textSub} />
            </TouchableOpacity>
          </View>
          <Text style={memoStyles.reportSubtitle}>Why are you reporting this listing?</Text>

          {REPORT_REASONS.map((r) => (
            <TouchableOpacity
              key={r.value}
              style={memoStyles.reportRow}
              onPress={() => submitReport(r.value)}
              disabled={reportSubmitting}
              activeOpacity={0.7}
            >
              <View style={memoStyles.reportIconBox}>
                <Ionicons name={r.icon} size={18} color={theme.primaryAccent} />
              </View>
              <Text style={memoStyles.reportRowText}>{r.label}</Text>
              {reportSubmitting ? (
                <ActivityIndicator size="small" color={theme.textTertiary} />
              ) : (
                <Ionicons name="chevron-forward" size={16} color={theme.inputBorder} />
              )}
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={memoStyles.reportCancelBtn} onPress={() => setReportVisible(false)}>
            <Text style={memoStyles.reportCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

export default ItemDetailsScreen;