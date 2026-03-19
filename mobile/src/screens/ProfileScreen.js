import React, { useState, useEffect, useContext, useCallback } from 'react';
import { 
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity, 
  FlatList, ActivityIndicator, RefreshControl, Alert, Image, Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native'; // 🚀 Refreshes data when you navigate back!
import { AuthContext } from '../context/AuthContext';
import API from '../api/axios';
import ItemCard from '../components/ItemCard';

const { width } = Dimensions.get('window');

const ProfileScreen = ({ navigation }) => {
  const { logout, isGuest, currentUser } = useContext(AuthContext); 
  
  const [userProfile, setUserProfile] = useState(null);
  const [myItems, setMyItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProfileData = async () => {
    if (isGuest) {
      setLoading(false);
      return;
    }

    try {
      // 🚀 Fetch BOTH Profile Data and Listings at the same time
      const [profileRes, itemsRes] = await Promise.all([
        API.get('/users/profile'),
        API.get('/items/my-listings')
      ]);

      setUserProfile(profileRes.data);
      
      if (itemsRes.data && itemsRes.data.items) {
        setMyItems(itemsRes.data.items);
      } else if (Array.isArray(itemsRes.data)) {
        setMyItems(itemsRes.data);
      }
    } catch (error) {
      console.error("Error fetching profile data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 🚀 useFocusEffect runs every time the user clicks the Profile tab 
  // (great for updating the screen immediately after they edit their profile)
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
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log Out", style: "destructive", onPress: logout }
    ]);
  };

  if (isGuest) {
    return (
      <View style={styles.guestContainer}>
        <Ionicons name="lock-closed-outline" size={60} color="#9ca3af" />
        <Text style={styles.guestTitle}>Login Required</Text>
        <Text style={styles.guestSubtitle}>You must have an account to view your profile.</Text>
        <TouchableOpacity style={styles.guestBtn} onPress={logout}>
          <Text style={styles.guestBtnText}>Log In / Sign Up</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Fallback images if the user hasn't uploaded any yet
  const coverImg = userProfile?.coverImage 
    ? { uri: userProfile.coverImage } 
    : { uri: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=800&q=80' }; // Abstract gradient fallback

  const profileImg = userProfile?.profilePic 
    ? { uri: userProfile.profilePic } 
    : { uri: 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png' };

  // 🚀 THE BEAUTIFUL NEW PROFILE HEADER
  const renderHeader = () => (
    <View style={styles.headerWrapper}>
      {/* Cover Photo */}
      <Image source={coverImg} style={styles.coverImage} />
      
      {/* Settings / Logout Icon overlay */}
      <TouchableOpacity style={styles.logoutBtnOverlay} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={22} color="#fff" />
      </TouchableOpacity>

      <View style={styles.profileDetailsContainer}>
        {/* Avatar & Edit Button Row */}
        <View style={styles.avatarRow}>
          <View style={styles.avatarContainer}>
            <Image source={profileImg} style={styles.avatarImage} />
          </View>
          
          <TouchableOpacity 
            style={styles.editProfileBtn} 
            onPress={() => navigation.navigate('EditProfile', { userProfile })}
          >
            <Text style={styles.editProfileText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* User Info */}
        <Text style={styles.userName}>{userProfile?.name || currentUser?.name || "Student"}</Text>
        <Text style={styles.userCollege}>📍 {userProfile?.college || currentUser?.college}</Text>

        <View style={styles.infoRow}>
          {userProfile?.year && <Text style={styles.infoTag}>🎓 Year {userProfile.year}</Text>}
          {userProfile?.phone && <Text style={styles.infoTag}>📞 {userProfile.phone}</Text>}
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{myItems.length}</Text>
            <Text style={styles.statLabel}>Active Listings</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Your Storefront</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      ) : (
        <FlatList
          data={myItems}
          keyExtractor={(item) => item._id}
          ListHeaderComponent={renderHeader} // 🚀 Puts the profile UI at the top of the scroll list!
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4f46e5']} />}
          renderItem={({ item }) => (
            <ItemCard 
              item={item} 
              onPress={() => navigation.navigate('EditItem', { item: item })} 
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="pricetag-outline" size={60} color="#d1d5db" />
              <Text style={styles.emptyText}>You haven't posted any items yet.</Text>
              <TouchableOpacity style={styles.emptyButton} onPress={() => navigation.navigate('Sell')}>
                <Text style={styles.emptyButtonText}>Start Selling</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

// --- STYLES ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // Header Styles
  headerWrapper: { marginBottom: 10 },
  coverImage: { width: width, height: 160, backgroundColor: '#d1d5db' },
  logoutBtnOverlay: { position: 'absolute', top: 40, right: 15, backgroundColor: 'rgba(0,0,0,0.5)', padding: 8, borderRadius: 20 },
  
  profileDetailsContainer: { paddingHorizontal: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6', paddingBottom: 20 },
  avatarRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: -40, marginBottom: 15 },
  avatarContainer: { width: 90, height: 90, borderRadius: 45, borderWidth: 4, borderColor: '#fff', backgroundColor: '#e5e7eb', overflow: 'hidden', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
  avatarImage: { width: '100%', height: '100%' },
  
  editProfileBtn: { borderWidth: 1, borderColor: '#d1d5db', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#fff', marginBottom: 5 },
  editProfileText: { fontWeight: 'bold', color: '#374151' },
  
  userName: { fontSize: 24, fontWeight: '900', color: '#1f2937', marginBottom: 4 },
  userCollege: { fontSize: 14, color: '#6b7280', fontWeight: '600', marginBottom: 10 },
  
  infoRow: { flexDirection: 'row', marginBottom: 15 },
  infoTag: { backgroundColor: '#f3f4f6', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, marginRight: 10, fontSize: 13, color: '#4b5563', fontWeight: '500' },
  
  statsContainer: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 15, marginTop: 5 },
  statBox: { marginRight: 30 },
  statNumber: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
  statLabel: { fontSize: 13, color: '#6b7280' },
  
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#374151', marginHorizontal: 20, marginTop: 25, marginBottom: 10 },
  listContainer: { paddingBottom: 30 },
  
  emptyContainer: { alignItems: 'center', marginTop: 40 },
  emptyText: { fontSize: 16, color: '#6b7280', marginTop: 15, marginBottom: 20 },
  emptyButton: { backgroundColor: '#4f46e5', paddingVertical: 12, paddingHorizontal: 25, borderRadius: 10 },
  emptyButtonText: { color: '#ffffff', fontWeight: 'bold', fontSize: 16 },

  guestContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#f9fafb' },
  guestTitle: { fontSize: 20, fontWeight: 'bold', marginTop: 15, color: '#1f2937' },
  guestSubtitle: { textAlign: 'center', color: '#6b7280', marginTop: 10, marginBottom: 20 },
  guestBtn: { backgroundColor: '#4f46e5', padding: 15, borderRadius: 10, width: '100%', alignItems: 'center' },
  guestBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});

export default ProfileScreen;