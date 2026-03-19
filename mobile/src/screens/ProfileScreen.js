import React, { useState, useContext, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  FlatList, ActivityIndicator, RefreshControl, Alert, Image, Dimensions, Platform
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
      {/* Cover */}
      <Image source={coverImg} style={styles.coverImage} />

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#fff" />
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

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.quickActionBtn}
          onPress={() => navigation.navigate('Wishlist')}
        >
          <Ionicons name="heart-outline" size={20} color="#ef4444" />
          <Text style={styles.quickActionText}>Wishlist</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionBtn}
          onPress={() => navigation.navigate('Sell')}
        >
          <Ionicons name="add-circle-outline" size={20} color="#4f46e5" />
          <Text style={styles.quickActionText}>Sell Item</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionBtn}
          onPress={() => navigation.navigate('LostFound')}
        >
          <Ionicons name="search-outline" size={20} color="#f59e0b" />
          <Text style={styles.quickActionText}>Lost & Found</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sectionDivider}>
        <Text style={styles.sectionTitle}>Your Listings</Text>
        <Text style={styles.sectionCount}>{myItems.length} items</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
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
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  headerWrapper: { backgroundColor: '#f9fafb', marginBottom: 8 },
  coverImage: { width, height: 160, backgroundColor: '#d1d5db' },
  logoutBtn: {
    position: 'absolute', top: Platform.OS === 'android' ? 55 : 16,
    right: 14, backgroundColor: 'rgba(0,0,0,0.45)',
    padding: 8, borderRadius: 20,
  },

  profileSection: {
    backgroundColor: '#ffffff', paddingHorizontal: 20,
    paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  avatarRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-end', marginTop: -44, marginBottom: 14,
  },
  avatarContainer: {
    width: 88, height: 88, borderRadius: 44,
    borderWidth: 4, borderColor: '#ffffff', backgroundColor: '#e5e7eb',
    overflow: 'hidden', elevation: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 4,
  },
  avatarImage: { width: '100%', height: '100%' },
  editProfileBtn: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#d1d5db', paddingVertical: 7,
    paddingHorizontal: 14, borderRadius: 20, backgroundColor: '#ffffff', marginBottom: 4,
  },
  editProfileText: { fontWeight: '600', color: '#374151', fontSize: 13, marginLeft: 4 },

  userName: { fontSize: 22, fontWeight: '900', color: '#1f2937', marginBottom: 4 },
  userCollege: { fontSize: 14, color: '#6b7280', fontWeight: '600', marginBottom: 12 },

  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
  tag: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#eef2ff', paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 10, marginRight: 8, marginBottom: 6,
  },
  tagText: { fontSize: 13, color: '#4f46e5', fontWeight: '600' },

  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 16,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 20, fontWeight: '800', color: '#1f2937' },
  statLabel: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: '#e5e7eb' },

  quickActions: {
    flexDirection: 'row', backgroundColor: '#ffffff',
    paddingVertical: 14, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  quickActionBtn: {
    flex: 1, alignItems: 'center', gap: 4,
  },
  quickActionText: { fontSize: 11, color: '#374151', fontWeight: '600', textAlign: 'center' },

  sectionDivider: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: '#ffffff', marginTop: 8,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1f2937' },
  sectionCount: { fontSize: 14, color: '#9ca3af' },

  listContainer: { paddingHorizontal: 16, paddingBottom: 30 },

  emptyContainer: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#374151', marginTop: 14, marginBottom: 6 },
  emptySubtitle: { fontSize: 14, color: '#9ca3af', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  startSellingBtn: { backgroundColor: '#4f46e5', paddingVertical: 12, paddingHorizontal: 28, borderRadius: 10 },
  startSellingText: { color: '#ffffff', fontWeight: 'bold', fontSize: 15 },

  // Guest
  guestContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 24, backgroundColor: '#f9fafb',
  },
  guestIconCircle: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: '#eef2ff', justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  guestTitle: { fontSize: 22, fontWeight: '800', color: '#1f2937', marginBottom: 8 },
  guestSubtitle: { textAlign: 'center', color: '#6b7280', fontSize: 15, lineHeight: 22, marginBottom: 24 },
  guestBtn: {
    backgroundColor: '#4f46e5', paddingVertical: 14, borderRadius: 12,
    width: '100%', alignItems: 'center',
  },
  guestBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});

export default ProfileScreen;
