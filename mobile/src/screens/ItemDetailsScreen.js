import React, { useState, useContext } from 'react';
import {
  View, Text, Image, StyleSheet, ScrollView,
  TouchableOpacity, SafeAreaView, Alert, Linking,
  ActivityIndicator, Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import API from '../api/axios';

const { width } = Dimensions.get('window');

const ItemDetailsScreen = ({ route, navigation }) => {
  const { item, activeCollege, isOwner } = route.params;
  const { currentUser } = useContext(AuthContext);

  const [isSold, setIsSold] = useState(item.isSold || false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isWishlisted, setIsWishlisted] = useState(false);

  const isLocalCampus = item.college === activeCollege;

  // ---- WHATSAPP ----
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
    const url = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`;

    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('WhatsApp Not Found', 'Please install WhatsApp to contact the seller.');
      }
    } catch {
      Alert.alert('Error', 'Could not open WhatsApp.');
    }
  };

  // ---- IN-APP CHAT ----
  const handleInAppChat = async () => {
    if (!isLocalCampus) {
      Alert.alert('Window Shopping', 'You can only message sellers from your home campus.');
      return;
    }

    const sellerId = item.seller?._id || item.seller;
    if (!sellerId) {
      Alert.alert('Error', 'Cannot find seller info.');
      return;
    }

    try {
      setLoadingAction(true);
      const response = await API.post('/chat', { userId: sellerId });
      navigation.navigate('ChatTab', {
        screen: 'ChatRoom',
        params: {
          chat: response.data,
          otherUser: { _id: sellerId, name: item.sellerName, profilePic: null },
        },
      });
    } catch (error) {
      Alert.alert('Error', 'Could not open chat. Please try again.');
    } finally {
      setLoadingAction(false);
    }
  };

  // ---- WISHLIST ----
  const handleToggleWishlist = async () => {
    try {
      await API.post('/users/wishlist', { itemId: item._id });
      setIsWishlisted(prev => !prev);
    } catch (e) {
      Alert.alert('Error', 'Could not update wishlist.');
    }
  };

  // ---- REPORT ----
  const handleReport = () => {
    Alert.alert(
      'Report Listing',
      'Why are you reporting this listing?',
      [
        { text: 'Spam / Duplicate', onPress: () => submitReport('Spam or duplicate listing') },
        { text: 'Inappropriate Content', onPress: () => submitReport('Inappropriate content') },
        { text: 'Wrong Category', onPress: () => submitReport('Wrong category') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const submitReport = async (reason) => {
    try {
      await API.post(`/items/${item._id}/report`, { reason });
      Alert.alert('Reported', 'Thanks for helping keep the campus clean!');
    } catch (e) {
      Alert.alert('Error', 'Could not submit report.');
    }
  };

  // ---- DELETE ----
  const handleDelete = () => {
    Alert.alert('Delete Listing', 'Permanently delete this listing?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
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
        }
      }
    ]);
  };

  // ---- TOGGLE SOLD ----
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

        {/* IMAGE CAROUSEL */}
        <View style={styles.carouselContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onScroll}
          >
            {item.images && item.images.length > 0 ? (
              item.images.map((img, index) => (
                <Image
                  key={index}
                  source={{ uri: img.url || img }}
                  style={styles.image}
                  resizeMode="cover"
                />
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
                <View
                  key={index}
                  style={[styles.dot, currentImageIndex === index ? styles.activeDot : styles.inactiveDot]}
                />
              ))}
            </View>
          )}

          {isSold && (
            <View style={styles.soldBadge}>
              <Text style={styles.soldBadgeText}>SOLD</Text>
            </View>
          )}

          {/* Wishlist button (top right) */}
          {!isOwner && (
            <TouchableOpacity style={styles.wishlistBtn} onPress={handleToggleWishlist}>
              <Ionicons
                name={isWishlisted ? 'heart' : 'heart-outline'}
                size={24}
                color={isWishlisted ? '#ef4444' : '#ffffff'}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* DETAILS */}
        <View style={styles.detailsContainer}>

          {/* Title + Price */}
          <View style={styles.titleRow}>
            <Text style={[styles.title, isSold && styles.titleSold]} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={styles.price}>₹{item.price}</Text>
          </View>

          <View style={styles.categoryRow}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{item.category || 'General'}</Text>
            </View>
            {/* Report button */}
            {!isOwner && (
              <TouchableOpacity onPress={handleReport} style={styles.reportBtn}>
                <Ionicons name="flag-outline" size={16} color="#9ca3af" />
                <Text style={styles.reportText}>Report</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Location & Time card */}
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={18} color="#4f46e5" />
              <Text style={styles.infoText}>{item.college}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={18} color="#4f46e5" />
              <Text style={styles.infoText}>Listed {new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
            </View>
            {item.sellerName && (
              <View style={styles.infoRow}>
                <Ionicons name="person-outline" size={18} color="#4f46e5" />
                <Text style={styles.infoText}>Seller: {item.sellerName}</Text>
              </View>
            )}
          </View>

          {/* Description */}
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>
            {item.description || 'No description provided.'}
          </Text>

          {/* Safety tip */}
          <View style={styles.safetyCard}>
            <Ionicons name="shield-checkmark-outline" size={18} color="#16a34a" />
            <Text style={styles.safetyText}>
              Meet in a public place (hostel mess, library) for safe transactions.
            </Text>
          </View>

        </View>
      </ScrollView>

      {/* BOTTOM ACTION BAR */}
      <View style={styles.bottomBar}>
        {isOwner ? (
          <View style={styles.ownerControls}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.deleteBtn]}
              onPress={handleDelete}
              disabled={loadingAction}
            >
              <Ionicons name="trash-outline" size={18} color="#ffffff" />
              <Text style={styles.actionBtnText}>Delete</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, isSold ? styles.availableBtn : styles.soldBtn]}
              onPress={handleToggleSold}
              disabled={loadingAction}
            >
              {loadingAction ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
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
              {loadingAction ? (
                <ActivityIndicator color="#4f46e5" size="small" />
              ) : (
                <>
                  <Ionicons name="chatbubble-outline" size={20} color="#4f46e5" />
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

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  container: { flex: 1 },

  // Carousel
  carouselContainer: { width, height: 320, backgroundColor: '#f3f4f6' },
  image: { width, height: 320, resizeMode: 'cover' },
  paginationContainer: {
    position: 'absolute', bottom: 14,
    flexDirection: 'row', width: '100%', justifyContent: 'center',
  },
  dot: { width: 7, height: 7, borderRadius: 4, marginHorizontal: 3 },
  activeDot: { backgroundColor: '#ffffff', width: 20 },
  inactiveDot: { backgroundColor: 'rgba(255,255,255,0.5)' },
  soldBadge: {
    position: 'absolute', top: 16, left: 16,
    backgroundColor: '#ef4444', paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 8,
  },
  soldBadgeText: { color: '#ffffff', fontWeight: '900', fontSize: 14, letterSpacing: 1 },
  wishlistBtn: {
    position: 'absolute', top: 16, right: 16,
    backgroundColor: 'rgba(0,0,0,0.4)', padding: 8, borderRadius: 20,
  },

  // Details
  detailsContainer: { padding: 20 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  title: { fontSize: 22, fontWeight: '800', color: '#1f2937', flex: 1, marginRight: 10, lineHeight: 28 },
  titleSold: { textDecorationLine: 'line-through', color: '#9ca3af' },
  price: { fontSize: 26, fontWeight: '900', color: '#4f46e5' },

  categoryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  categoryBadge: { backgroundColor: '#eef2ff', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  categoryText: { fontSize: 13, color: '#4f46e5', fontWeight: '700', textTransform: 'uppercase' },
  reportBtn: { flexDirection: 'row', alignItems: 'center', padding: 4 },
  reportText: { fontSize: 13, color: '#9ca3af', marginLeft: 3 },

  infoCard: {
    backgroundColor: '#f9fafb', padding: 14, borderRadius: 12,
    marginBottom: 20, borderWidth: 1, borderColor: '#f3f4f6',
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  infoText: { fontSize: 14, color: '#374151', marginLeft: 8, fontWeight: '500' },

  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1f2937', marginBottom: 8 },
  description: { fontSize: 15, color: '#4b5563', lineHeight: 24, marginBottom: 20 },

  safetyCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#f0fdf4', padding: 12, borderRadius: 10,
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  safetyText: { fontSize: 13, color: '#166534', marginLeft: 8, flex: 1, lineHeight: 18 },

  // Bottom Bar
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 14, backgroundColor: '#ffffff',
    borderTopWidth: 1, borderTopColor: '#f3f4f6',
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 8,
  },

  // Owner controls
  ownerControls: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flex: 1, flexDirection: 'row', paddingVertical: 14, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  deleteBtn: { backgroundColor: '#ef4444' },
  soldBtn: { backgroundColor: '#4f46e5' },
  availableBtn: { backgroundColor: '#10b981' },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 15, marginLeft: 6 },

  // Buyer controls
  buyerControls: { flexDirection: 'row', gap: 10 },
  chatBtn: {
    flex: 1, flexDirection: 'row', paddingVertical: 14, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#eef2ff', borderWidth: 1.5, borderColor: '#4f46e5',
  },
  chatBtnText: { color: '#4f46e5', fontWeight: '700', fontSize: 15, marginLeft: 6 },
  whatsappBtn: {
    flex: 2, flexDirection: 'row', paddingVertical: 14, borderRadius: 12,
    backgroundColor: '#25D366', alignItems: 'center', justifyContent: 'center',
  },
  whatsappBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 15, marginLeft: 6 },
  btnDisabled: { backgroundColor: '#e5e7eb', borderColor: '#e5e7eb' },
});

export default ItemDetailsScreen;
