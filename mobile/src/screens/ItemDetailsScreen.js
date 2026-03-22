import React, { useState, useContext, useEffect } from 'react';
import {
  View, Text, Image, StyleSheet, ScrollView,
  TouchableOpacity, SafeAreaView, Alert, Linking,
  ActivityIndicator, Dimensions, Modal, Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import API from '../api/axios';

const { width } = Dimensions.get('window');

const REPORT_REASONS = [
  { label: 'Spam or Duplicate',      icon: 'copy-outline',      value: 'Spam or duplicate listing' },
  { label: 'Inappropriate Content',  icon: 'eye-off-outline',   value: 'Inappropriate content' },
  { label: 'Wrong Category',         icon: 'pricetag-outline',  value: 'Wrong category' },
  { label: 'Misleading Price',       icon: 'alert-circle-outline', value: 'Misleading price' },
];

const ItemDetailsScreen = ({ route, navigation }) => {
  const { item, activeCollege, isOwner } = route.params;
  const { currentUser } = useContext(AuthContext);

  const [isSold, setIsSold]                   = useState(item.isSold || false);
  const [loadingAction, setLoadingAction]     = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isWishlisted, setIsWishlisted]       = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [reportVisible, setReportVisible]     = useState(false);
  const [reportSubmitting, setReportSubmitting] = useState(false);

  const isLocalCampus =
    item.college?.toLowerCase() === currentUser?.college?.toLowerCase();

  // ── Fetch wishlist status on mount ──────────────────────────────────────────
  useEffect(() => {
    const checkWishlist = async () => {
      try {
        const res = await API.get('/users/wishlist');
        const ids = (res.data || []).map(w => w._id || w);
        setIsWishlisted(ids.includes(item._id));
      } catch (_) {
        // silent — wishlist state just defaults to false
      }
    };
    if (!isOwner) checkWishlist();
  }, []);

  // ── WhatsApp ────────────────────────────────────────────────────────────────
  const handleWhatsApp = async () => {
    if (!isLocalCampus) {
      Alert.alert('Window Shopping', `You can only buy from your home campus. This item is at ${item.college}.`);
      return;
    }
    if (!item.contactNumber) {
      Alert.alert('No Contact Info', "The seller didn't provide a phone number.");
      return;
    }
    let phone = item.contactNumber.replace(/\D/g, '');
    if (phone.length === 10) phone = '91' + phone;
    const message = `Hi! I saw your listing for "${item.title}" (₹${item.price}) on KampusCart. Is it still available?`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Error', 'Could not open WhatsApp.');
    }
  };

  // ── In-app chat ─────────────────────────────────────────────────────────────
  const handleInAppChat = async () => {
    if (!isLocalCampus) {
      Alert.alert('Window Shopping', 'You can only message sellers from your home campus.');
      return;
    }
    const sellerId = item.seller?._id || item.seller;
    if (!sellerId) { Alert.alert('Error', 'Cannot find seller info.'); return; }
    try {
      setLoadingAction(true);
      const response = await API.post('/chat', { userId: sellerId });
      navigation.navigate('ChatTab', {
        screen: 'ChatRoom',
        params: { chat: response.data, otherUser: { _id: sellerId, name: item.sellerName, profilePic: null } },
      });
    } catch {
      Alert.alert('Error', 'Could not open chat. Please try again.');
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
      Alert.alert('Error', 'Could not update wishlist.');
    } finally {
      setWishlistLoading(false);
    }
  };

  // ── Share ───────────────────────────────────────────────────────────────────
  const handleShare = async () => {
    try {
      await Share.share({
        title: item.title,
        message:
          `🛒 *${item.title}*\n` +
          `💰 ₹${Number(item.price).toLocaleString('en-IN')}\n` +
          `📍 ${item.location || item.college}\n` +
          `📦 ${item.category || 'General'}\n\n` +
          `${item.description ? item.description.slice(0, 120) + '…' : ''}\n\n` +
          `Found on KampusCart — the campus marketplace!`,
      });
    } catch {
      /* user cancelled share */
    }
  };

  // ── Report ──────────────────────────────────────────────────────────────────
  const submitReport = async (reason) => {
    setReportSubmitting(true);
    try {
      await API.post(`/items/${item._id}/report`, { reason });
      setReportVisible(false);
      Alert.alert('Reported ✓', 'Thanks for helping keep the campus clean!');
    } catch {
      Alert.alert('Error', 'Could not submit report.');
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
            Alert.alert('Deleted', 'Your listing has been removed.');
            navigation.navigate('Profile');
          } catch {
            Alert.alert('Error', 'Failed to delete item.');
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
      Alert.alert('Error', 'Failed to update status.');
    } finally {
      setLoadingAction(false);
    }
  };

  const onScroll = (event) => {
    const index = event.nativeEvent.contentOffset.x / event.nativeEvent.layoutMeasurement.width;
    setCurrentImageIndex(Math.round(index));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 110 }}>

        {/* ── IMAGE CAROUSEL ── */}
        <View style={styles.carouselContainer}>
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={onScroll}>
            {item.images && item.images.length > 0 ? (
              item.images.map((img, index) => (
                <Image key={index} source={{ uri: img.url || img }} style={styles.image} resizeMode="contain" />
              ))
            ) : (
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1588508065123-287b28e0141c?w=400&q=80' }}
                style={styles.image}
              />
            )}
          </ScrollView>

          {item.images && item.images.length > 1 && (
            <View style={styles.paginationContainer}>
              {item.images.map((_, index) => (
                <View key={index} style={[styles.dot, currentImageIndex === index ? styles.activeDot : styles.inactiveDot]} />
              ))}
            </View>
          )}

          {isSold && (
            <View style={styles.soldBadge}>
              <Text style={styles.soldBadgeText}>SOLD</Text>
            </View>
          )}

          {/* Share button — top left */}
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
            <Ionicons name="share-social-outline" size={20} color="#ffffff" />
          </TouchableOpacity>

          {/* Wishlist button — top right */}
          {!isOwner && (
            <TouchableOpacity style={styles.wishlistBtn} onPress={handleToggleWishlist} disabled={wishlistLoading}>
              <Ionicons
                name={isWishlisted ? 'heart' : 'heart-outline'}
                size={22}
                color={isWishlisted ? '#ef4444' : '#ffffff'}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* ── DETAILS ── */}
        <View style={styles.detailsContainer}>

          <View style={styles.titleRow}>
            <Text style={[styles.title, isSold && styles.titleSold]} numberOfLines={2}>{item.title}</Text>
            <Text style={styles.price}>₹{Number(item.price).toLocaleString('en-IN')}</Text>
          </View>

          <View style={styles.categoryRow}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{item.category || 'General'}</Text>
            </View>
            {!isOwner && (
              <View style={styles.actionIcons}>
                <TouchableOpacity style={styles.iconBtn} onPress={handleShare}>
                  <Ionicons name="share-social-outline" size={17} color="#94a3b8" />
                  <Text style={styles.iconBtnText}>Share</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconBtn} onPress={() => setReportVisible(true)}>
                  <Ionicons name="flag-outline" size={17} color="#64748b" />
                  <Text style={styles.iconBtnText}>Report</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Info card */}
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={18} color="#818cf8" />
              <Text style={styles.infoText}>{item.location || item.college}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={18} color="#818cf8" />
              <Text style={styles.infoText}>
                Listed {new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
            </View>
            {item.sellerName && (
              <View style={[styles.infoRow, { marginBottom: 0 }]}>
                <Ionicons name="person-outline" size={18} color="#818cf8" />
                <Text style={styles.infoText}>Seller: {item.sellerName}</Text>
              </View>
            )}
          </View>

          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{item.description || 'No description provided.'}</Text>

          <View style={styles.safetyCard}>
            <Ionicons name="shield-checkmark-outline" size={18} color="#4ade80" />
            <Text style={styles.safetyText}>
              Meet in a public place (hostel mess, library) for safe transactions.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* ── BOTTOM ACTION BAR ── */}
      <View style={styles.bottomBar}>
        {isOwner ? (
          <View style={styles.ownerControls}>
            <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={handleDelete} disabled={loadingAction}>
              <Ionicons name="trash-outline" size={18} color="#ffffff" />
              <Text style={styles.actionBtnText}>Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, isSold ? styles.availableBtn : styles.soldBtn]}
              onPress={handleToggleSold}
              disabled={loadingAction}
            >
              {loadingAction ? <ActivityIndicator color="#fff" size="small" /> : (
                <>
                  <Ionicons name={isSold ? 'refresh-outline' : 'checkmark-circle-outline'} size={18} color="#fff" />
                  <Text style={styles.actionBtnText}>{isSold ? 'Mark Available' : 'Mark Sold'}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.buyerControls}>
            <TouchableOpacity
              style={[styles.chatBtn, (!isLocalCampus || isSold) && styles.btnDisabled]}
              onPress={handleInAppChat}
              disabled={!isLocalCampus || isSold || loadingAction}
            >
              {loadingAction ? <ActivityIndicator color="#818cf8" size="small" /> : (
                <>
                  <Ionicons name="chatbubble-outline" size={20} color="#818cf8" />
                  <Text style={styles.chatBtnText}>Message</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.whatsappBtn, (!isLocalCampus || isSold) && styles.btnDisabled]}
              onPress={handleWhatsApp}
              disabled={!isLocalCampus || isSold}
            >
              <Ionicons name="logo-whatsapp" size={20} color="#ffffff" />
              <Text style={styles.whatsappBtnText}>
                {isSold ? 'Sold Out' : isLocalCampus ? 'WhatsApp' : 'View Only'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ── REPORT BOTTOM SHEET ── */}
      <Modal visible={reportVisible} transparent animationType="slide" onRequestClose={() => setReportVisible(false)}>
        <TouchableOpacity style={styles.reportOverlay} activeOpacity={1} onPress={() => setReportVisible(false)} />
        <View style={styles.reportSheet}>
          {/* Handle + Header */}
          <View style={styles.reportHandle} />
          <View style={styles.reportHeader}>
            <Text style={styles.reportTitle}>Report Listing</Text>
            <TouchableOpacity style={styles.reportCloseBtn} onPress={() => setReportVisible(false)}>
              <Ionicons name="close" size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>
          <Text style={styles.reportSubtitle}>Why are you reporting this listing?</Text>

          {REPORT_REASONS.map((r) => (
            <TouchableOpacity
              key={r.value}
              style={styles.reportRow}
              onPress={() => submitReport(r.value)}
              disabled={reportSubmitting}
              activeOpacity={0.7}
            >
              <View style={styles.reportIconBox}>
                <Ionicons name={r.icon} size={18} color="#818cf8" />
              </View>
              <Text style={styles.reportRowText}>{r.label}</Text>
              {reportSubmitting ? (
                <ActivityIndicator size="small" color="#64748b" />
              ) : (
                <Ionicons name="chevron-forward" size={16} color="#334155" />
              )}
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={styles.reportCancelBtn} onPress={() => setReportVisible(false)}>
            <Text style={styles.reportCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0f172a' },
  container: { flex: 1, backgroundColor: '#0f172a' },

  // Carousel
  carouselContainer: { width, height: 320, backgroundColor: '#1e293b' },
  image: { width, height: 320, resizeMode: 'contain', backgroundColor: '#1e293b' },
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

  // Details
  detailsContainer: { padding: 20, backgroundColor: '#0f172a' },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  title: { fontSize: 22, fontWeight: '800', color: '#f1f5f9', flex: 1, marginRight: 10, lineHeight: 28 },
  titleSold: { textDecorationLine: 'line-through', color: '#64748b' },
  price: { fontSize: 26, fontWeight: '900', color: '#818cf8' },

  categoryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  categoryBadge: { backgroundColor: 'rgba(79,70,229,0.2)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  categoryText: { fontSize: 13, color: '#818cf8', fontWeight: '700', textTransform: 'uppercase' },
  actionIcons: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4 },
  iconBtnText: { fontSize: 12, color: '#64748b', fontWeight: '600' },

  infoCard: {
    backgroundColor: '#1e293b', padding: 14, borderRadius: 12,
    marginBottom: 20, borderWidth: 1, borderColor: '#334155',
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  infoText: { fontSize: 14, color: '#94a3b8', marginLeft: 8, fontWeight: '500' },

  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#f1f5f9', marginBottom: 8 },
  description: { fontSize: 15, color: '#94a3b8', lineHeight: 24, marginBottom: 20 },

  safetyCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: 'rgba(22,163,74,0.1)', padding: 12, borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(22,163,74,0.25)',
  },
  safetyText: { fontSize: 13, color: '#4ade80', marginLeft: 8, flex: 1, lineHeight: 18 },

  // Bottom Bar
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 14, backgroundColor: '#1e293b',
    borderTopWidth: 1, borderTopColor: '#334155',
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 8,
  },
  ownerControls: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flex: 1, flexDirection: 'row', paddingVertical: 14, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  deleteBtn: { backgroundColor: '#ef4444' },
  soldBtn: { backgroundColor: '#4f46e5' },
  availableBtn: { backgroundColor: '#10b981' },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 15, marginLeft: 6 },
  buyerControls: { flexDirection: 'row', gap: 10 },
  chatBtn: {
    flex: 1, flexDirection: 'row', paddingVertical: 14, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(79,70,229,0.15)', borderWidth: 1.5, borderColor: '#4f46e5',
  },
  chatBtnText: { color: '#818cf8', fontWeight: '700', fontSize: 15, marginLeft: 6 },
  whatsappBtn: {
    flex: 2, flexDirection: 'row', paddingVertical: 14, borderRadius: 12,
    backgroundColor: '#25D366', alignItems: 'center', justifyContent: 'center',
  },
  whatsappBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 15, marginLeft: 6 },
  btnDisabled: { backgroundColor: '#273549', borderColor: '#334155' },

  // Report sheet
  reportOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
  },
  reportSheet: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingBottom: 36,
    borderWidth: 1, borderColor: '#334155',
  },
  reportHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#334155',
    alignSelf: 'center', marginTop: 12, marginBottom: 16,
  },
  reportHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4,
  },
  reportTitle: { fontSize: 18, fontWeight: '800', color: '#f1f5f9' },
  reportCloseBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#273549', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#334155',
  },
  reportSubtitle: { fontSize: 13, color: '#64748b', marginBottom: 20 },
  reportRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#273549',
  },
  reportIconBox: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(79,70,229,0.15)',
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  reportRowText: { flex: 1, fontSize: 15, color: '#f1f5f9', fontWeight: '500' },
  reportCancelBtn: {
    marginTop: 16, paddingVertical: 14,
    backgroundColor: '#273549', borderRadius: 12, alignItems: 'center',
  },
  reportCancelText: { color: '#ef4444', fontWeight: '700', fontSize: 15 },
});

export default ItemDetailsScreen;
