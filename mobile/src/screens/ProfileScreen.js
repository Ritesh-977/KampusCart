import React, { useState, useContext, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  FlatList, ActivityIndicator, RefreshControl, Alert, Image, Dimensions, Platform,
  Modal, Pressable, Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import API from '../api/axios';
import ItemCard from '../components/ItemCard';

const { width } = Dimensions.get('window');

const ProfileScreen = ({ navigation }) => {
  const { logout, isGuest, currentUser } = useContext(AuthContext);

  const [userProfile, setUserProfile] = useState(null);
  const [myItems, setMyItems] = useState([]);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  const fetchProfileData = async () => {
    if (isGuest) { setLoading(false); return; }

    try {
      const [profileRes, itemsRes, wishlistRes] = await Promise.all([
        API.get('/users/profile'),
        API.get('/items/my-listings'),
        API.get('/users/wishlist'),
      ]);

      setUserProfile(profileRes.data);

      const rawItems = itemsRes.data?.items || itemsRes.data || [];
      setMyItems(Array.isArray(rawItems) ? rawItems : []);
      setWishlistCount(Array.isArray(wishlistRes.data) ? wishlistRes.data.length : 0);
    } catch (error) {
      console.error('Profile fetch error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProfileData();
    }, [isGuest])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfileData();
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout }
    ]);
  };

  // Guest screen
  if (isGuest) {
    return (
      <View style={styles.guestContainer}>
        <View style={styles.guestIconCircle}>
          <Ionicons name="person" size={40} color="#4f46e5" />
        </View>
        <Text style={styles.guestTitle}>Your Profile</Text>
        <Text style={styles.guestSubtitle}>
          Sign in to view your profile, manage listings, and save items to your wishlist.
        </Text>
        <TouchableOpacity style={styles.guestBtn} onPress={logout}>
          <Text style={styles.guestBtnText}>Sign In / Register</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const coverImg = userProfile?.coverImage
    ? { uri: userProfile.coverImage }
    : { uri: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=800&q=80' };

  const profileImg = userProfile?.profilePic
    ? { uri: userProfile.profilePic }
    : { uri: 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png' };

  const renderHeader = () => (
    <View style={styles.headerWrapper}>
      {/* Cover with top status-bar spacing */}
      <View style={styles.coverWrapper}>
        <Image source={coverImg} style={styles.coverImage} />
      </View>

      {/* Menu trigger */}
      <TouchableOpacity style={styles.menuBtn} onPress={() => setMenuVisible(true)}>
        <Ionicons name="ellipsis-vertical" size={20} color="#fff" />
      </TouchableOpacity>

      {/* Profile section */}
      <View style={styles.profileSection}>
        <View style={styles.avatarRow}>
          <View style={styles.avatarContainer}>
            <Image source={profileImg} style={styles.avatarImage} />
          </View>
          <TouchableOpacity
            style={styles.editProfileBtn}
            onPress={() => navigation.navigate('EditProfile', { userProfile })}
          >
            <Ionicons name="create-outline" size={16} color="#374151" />
            <Text style={styles.editProfileText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.userName}>{userProfile?.name || currentUser?.name || 'Student'}</Text>
        <Text style={styles.userCollege}>
          <Ionicons name="location-outline" size={14} color="#6b7280" /> {userProfile?.college || currentUser?.college}
        </Text>

        {/* Info tags */}
        <View style={styles.tagsRow}>
          {userProfile?.year && (
            <View style={styles.tag}>
              <Ionicons name="school-outline" size={13} color="#4f46e5" />
              <Text style={styles.tagText}> {userProfile.year}</Text>
            </View>
          )}
          {userProfile?.phone && (
            <View style={styles.tag}>
              <Ionicons name="call-outline" size={13} color="#4f46e5" />
              <Text style={styles.tagText}> {userProfile.phone}</Text>
            </View>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{myItems.length}</Text>
            <Text style={styles.statLabel}>Listings</Text>
          </View>
          <View style={styles.statDivider} />
          <TouchableOpacity style={styles.statItem} onPress={() => navigation.navigate('Wishlist')}>
            <Text style={styles.statNumber}>{wishlistCount}</Text>
            <Text style={styles.statLabel}>Saved</Text>
          </TouchableOpacity>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{myItems.filter(i => i.isSold).length}</Text>
            <Text style={styles.statLabel}>Sold</Text>
          </View>
        </View>
      </View>

      <View style={styles.sectionDivider}>
        <Text style={styles.sectionTitle}>Your Listings</Text>
        <Text style={styles.sectionCount}>{myItems.length} items</Text>
      </View>
    </View>
  );

  const menuItems = [
    {
      icon: 'heart-outline', label: 'Wishlist',
      color: '#f87171', bg: 'rgba(239,68,68,0.15)',
      onPress: () => { setMenuVisible(false); navigation.navigate('Wishlist'); },
    },
    {
      icon: 'pricetag-outline', label: 'Sell an Item',
      color: '#818cf8', bg: 'rgba(79,70,229,0.2)',
      onPress: () => { setMenuVisible(false); navigation.navigate('Sell'); },
    },
    {
      icon: 'search-circle-outline', label: 'Lost & Found',
      color: '#fbbf24', bg: 'rgba(245,158,11,0.15)',
      onPress: () => { setMenuVisible(false); navigation.navigate('LostFound'); },
    },
  ];

  return (
    <SafeAreaView style={styles.container}>

      {/* ── Bottom-sheet menu ─────────────────────────────── */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setMenuVisible(false)} />
        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.sheetHandle} />

          {/* User mini-card */}
          <View style={styles.sheetUser}>
            <Image
              source={{ uri: userProfile?.profilePic || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png' }}
              style={styles.sheetAvatar}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetName} numberOfLines={1}>
                {userProfile?.name || currentUser?.name || 'Student'}
              </Text>
              <Text style={styles.sheetCollege} numberOfLines={1}>
                {userProfile?.college || currentUser?.college}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.sheetEditBtn}
              onPress={() => { setMenuVisible(false); navigation.navigate('EditProfile', { userProfile }); }}
            >
              <Text style={styles.sheetEditText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.sheetDivider} />

          {/* Action rows */}
          {menuItems.map((item) => (
            <TouchableOpacity key={item.label} style={styles.sheetRow} onPress={item.onPress} activeOpacity={0.7}>
              <View style={[styles.sheetIconCircle, { backgroundColor: item.bg }]}>
                <Ionicons name={item.icon} size={20} color={item.color} />
              </View>
              <Text style={styles.sheetRowLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color="#d1d5db" />
            </TouchableOpacity>
          ))}

          <View style={styles.sheetDivider} />

          {/* Log out */}
          <TouchableOpacity
            style={styles.sheetRow}
            onPress={() => {
              setMenuVisible(false);
              setTimeout(handleLogout, 300);
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.sheetIconCircle, { backgroundColor: 'rgba(239,68,68,0.15)' }]}>
              <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            </View>
            <Text style={[styles.sheetRowLabel, { color: '#ef4444' }]}>Log Out</Text>
          </TouchableOpacity>

          <View style={{ height: Platform.OS === 'ios' ? 24 : 12 }} />
        </View>
      </Modal>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      ) : (
        <FlatList
          data={myItems}
          keyExtractor={(item) => item._id}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4f46e5']} />}
          renderItem={({ item }) => (
            <ItemCard
              item={item}
              onPress={() => navigation.navigate('EditItem', { item })}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="pricetag-outline" size={60} color="#d1d5db" />
              <Text style={styles.emptyTitle}>No listings yet</Text>
              <Text style={styles.emptySubtitle}>Start selling items from your room, hostel, or campus!</Text>
              <TouchableOpacity
                style={styles.startSellingBtn}
                onPress={() => navigation.navigate('Sell')}
              >
                <Text style={styles.startSellingText}>Start Selling</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },

  headerWrapper: { backgroundColor: '#0f172a', marginBottom: 8 },
  coverWrapper: {
    paddingTop: Platform.OS === 'android' ? 36 : 52,
    backgroundColor: '#1e293b',
  },
  coverImage: { width, height: 150, backgroundColor: '#1e293b' },
  menuBtn: {
    position: 'absolute', top: Platform.OS === 'android' ? 46 : 62,
    right: 10, backgroundColor: 'rgba(0,0,0,0.55)',
    padding: 8, borderRadius: 20,
  },

  // ── Bottom sheet ─────────────────────────────────────────
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 12, paddingHorizontal: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4, shadowRadius: 16, elevation: 20,
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#334155',
    alignSelf: 'center', marginBottom: 18,
  },
  sheetUser: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 18,
  },
  sheetAvatar: {
    width: 48, height: 48, borderRadius: 24,
    marginRight: 12, backgroundColor: '#273549',
  },
  sheetName: { fontSize: 16, fontWeight: '700', color: '#f1f5f9', marginBottom: 2 },
  sheetCollege: { fontSize: 13, color: '#94a3b8' },
  sheetEditBtn: {
    borderWidth: 1, borderColor: '#334155', paddingVertical: 6,
    paddingHorizontal: 12, borderRadius: 16,
  },
  sheetEditText: { fontSize: 13, fontWeight: '600', color: '#94a3b8' },
  sheetDivider: { height: 1, backgroundColor: '#334155', marginVertical: 8 },
  sheetRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 13,
  },
  sheetIconCircle: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  sheetRowLabel: {
    flex: 1, fontSize: 15, fontWeight: '600', color: '#f1f5f9',
  },

  profileSection: {
    backgroundColor: '#1e293b', paddingHorizontal: 20,
    paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#334155',
  },
  avatarRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-end', marginTop: -44, marginBottom: 14,
  },
  avatarContainer: {
    width: 88, height: 88, borderRadius: 44,
    borderWidth: 4, borderColor: '#1e293b', backgroundColor: '#273549',
    overflow: 'hidden', elevation: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4,
  },
  avatarImage: { width: '100%', height: '100%' },
  editProfileBtn: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#334155', paddingVertical: 7,
    paddingHorizontal: 14, borderRadius: 20, backgroundColor: '#273549', marginBottom: 4,
  },
  editProfileText: { fontWeight: '600', color: '#94a3b8', fontSize: 13, marginLeft: 4 },

  userName: { fontSize: 22, fontWeight: '900', color: '#f1f5f9', marginBottom: 4 },
  userCollege: { fontSize: 14, color: '#94a3b8', fontWeight: '600', marginBottom: 12 },

  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
  tag: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(79,70,229,0.2)', paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 10, marginRight: 8, marginBottom: 6,
  },
  tagText: { fontSize: 13, color: '#818cf8', fontWeight: '600' },

  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: '#334155', paddingTop: 16,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 20, fontWeight: '800', color: '#f1f5f9' },
  statLabel: { fontSize: 12, color: '#64748b', marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: '#334155' },

  sectionDivider: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: '#0f172a', marginTop: 8,
    borderBottomWidth: 1, borderBottomColor: '#1e293b',
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#f1f5f9' },
  sectionCount: { fontSize: 14, color: '#64748b' },

  listContainer: { paddingHorizontal: 16, paddingBottom: 30 },

  emptyContainer: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#f1f5f9', marginTop: 14, marginBottom: 6 },
  emptySubtitle: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  startSellingBtn: { backgroundColor: '#4f46e5', paddingVertical: 12, paddingHorizontal: 28, borderRadius: 10 },
  startSellingText: { color: '#ffffff', fontWeight: 'bold', fontSize: 15 },

  // Guest
  guestContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 24, backgroundColor: '#0f172a',
  },
  guestIconCircle: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: 'rgba(79,70,229,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  guestTitle: { fontSize: 22, fontWeight: '800', color: '#f1f5f9', marginBottom: 8 },
  guestSubtitle: { textAlign: 'center', color: '#94a3b8', fontSize: 15, lineHeight: 22, marginBottom: 24 },
  guestBtn: {
    backgroundColor: '#4f46e5', paddingVertical: 14, borderRadius: 12,
    width: '100%', alignItems: 'center',
  },
  guestBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});

export default ProfileScreen;
