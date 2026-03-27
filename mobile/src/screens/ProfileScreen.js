import React, { useState, useContext, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  FlatList, ActivityIndicator, RefreshControl, Alert, Image, Dimensions, Platform,
  Modal, Pressable, Animated, PanResponder
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import API from '../api/axios';
import ItemCard from '../components/ItemCard';

const { width } = Dimensions.get('window');

const ProfileScreen = ({ navigation }) => {
  const { logout, isGuest, currentUser } = useContext(AuthContext);
  const { theme, toggleTheme } = useTheme();

  const [userProfile, setUserProfile] = useState(null);
  const [myItems, setMyItems] = useState([]);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [aboutVisible, setAboutVisible] = useState(false);
  const returnToMenuRef = useRef(false);

  // ── Gesture-driven bottom sheet ──────────────────────────────────────────
  const sheetY = useRef(new Animated.Value(600)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (menuVisible) {
      sheetY.setValue(600);
      Animated.parallel([
        Animated.spring(sheetY, { toValue: 0, useNativeDriver: true, bounciness: 3, speed: 16 }),
        Animated.timing(backdropOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [menuVisible]);

  const closeMenu = (then, reopenOnBack = false) => {
    Animated.parallel([
      Animated.timing(sheetY, { toValue: 600, duration: 260, useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => {
      setMenuVisible(false);
      sheetY.setValue(600);
      if (reopenOnBack) returnToMenuRef.current = true;
      then?.();
    });
  };

  const menuPan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, gs) => gs.dy > 6 && Math.abs(gs.dy) > Math.abs(gs.dx),
    onPanResponderMove: (_, gs) => {
      sheetY.setValue(Math.max(0, gs.dy));
    },
    onPanResponderRelease: (_, gs) => {
      if (gs.dy > 120 || gs.vy > 0.8) {
        closeMenu();
      } else {
        Animated.spring(sheetY, { toValue: 0, useNativeDriver: true, bounciness: 5 }).start();
      }
    },
  })).current;

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
      if (returnToMenuRef.current) {
        returnToMenuRef.current = false;
        setTimeout(() => setMenuVisible(true), 150);
      }
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
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, backgroundColor: theme.background }}>
        <View style={{ width: 90, height: 90, borderRadius: 45, backgroundColor: `${theme.primaryAction}20`, justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
          <Ionicons name="person" size={40} color={theme.primaryAction} />
        </View>
        <Text style={{ fontSize: 22, fontWeight: '800', color: theme.textMain, marginBottom: 8 }}>Your Profile</Text>
        <Text style={{ textAlign: 'center', color: theme.textSub, fontSize: 15, lineHeight: 22, marginBottom: 24 }}>
          Sign in to view your profile, manage listings, and save items to your wishlist.
        </Text>
        <TouchableOpacity style={{ backgroundColor: theme.primaryAction, paddingVertical: 14, borderRadius: 12, width: '100%', alignItems: 'center' }} onPress={logout}>
          <Text style={{ color: theme.textOnPrimary || '#ffffff', fontWeight: 'bold', fontSize: 16 }}>Sign In / Register</Text>
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
    <View style={{ backgroundColor: theme.background, marginBottom: 8 }}>
      {/* Cover with top status-bar spacing */}
      <View style={{ paddingTop: Platform.OS === 'android' ? 36 : 52, backgroundColor: theme.card }}>
        <Image source={coverImg} style={{ width, height: 150, backgroundColor: theme.card }} />
      </View>

      {/* Menu trigger */}
      <TouchableOpacity style={{ position: 'absolute', top: Platform.OS === 'android' ? 46 : 62, right: 10, backgroundColor: 'rgba(0,0,0,0.55)', padding: 8, borderRadius: 20 }} onPress={() => setMenuVisible(true)}>
        <Ionicons name="ellipsis-vertical" size={20} color="#fff" />
      </TouchableOpacity>

      {/* Profile section */}
      <View style={{ backgroundColor: theme.card, paddingHorizontal: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: theme.inputBorder }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: -44, marginBottom: 14 }}>
          <View style={{ width: 88, height: 88, borderRadius: 44, borderWidth: 4, borderColor: theme.card, backgroundColor: theme.cardAccent, overflow: 'hidden', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 }}>
            <Image source={profileImg} style={{ width: '100%', height: '100%' }} />
          </View>
          <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: theme.inputBorder, paddingVertical: 7, paddingHorizontal: 14, borderRadius: 20, backgroundColor: theme.cardAccent, marginBottom: 4 }} onPress={() => navigation.navigate('EditProfile', { userProfile })}>
            <Ionicons name="create-outline" size={16} color={theme.textSub} />
            <Text style={{ fontWeight: '600', color: theme.textSub, fontSize: 13, marginLeft: 4 }}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        <Text style={{ fontSize: 22, fontWeight: '900', color: theme.textMain, marginBottom: 4 }}>{userProfile?.name || currentUser?.name || 'Student'}</Text>
        <Text style={{ fontSize: 14, color: theme.textSub, fontWeight: '600', marginBottom: 12 }}>
          <Ionicons name="location-outline" size={14} color={theme.textSub} /> {userProfile?.college || currentUser?.college}
        </Text>

        {/* Info tags */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 }}>
          {userProfile?.year && (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: `${theme.primaryAccent}30`, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, marginRight: 8, marginBottom: 6 }}>
              <Ionicons name="school-outline" size={13} color={theme.primaryAccent} />
              <Text style={{ fontSize: 13, color: theme.primaryAccent, fontWeight: '600' }}> {userProfile.year}</Text>
            </View>
          )}
          {userProfile?.phone && (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: `${theme.primaryAccent}30`, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, marginRight: 8, marginBottom: 6 }}>
              <Ionicons name="call-outline" size={13} color={theme.primaryAccent} />
              <Text style={{ fontSize: 13, color: theme.primaryAccent, fontWeight: '600' }}> {userProfile.phone}</Text>
            </View>
          )}
        </View>

        {/* Stats */}
        <View style={{ flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: theme.inputBorder, paddingTop: 16 }}>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: theme.textMain }}>{myItems.length}</Text>
            <Text style={{ fontSize: 12, color: theme.textTertiary, marginTop: 2 }}>Listings</Text>
          </View>
          <View style={{ width: 1, height: 32, backgroundColor: theme.inputBorder }} />
          <TouchableOpacity style={{ flex: 1, alignItems: 'center' }} onPress={() => navigation.navigate('Wishlist')}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: theme.textMain }}>{wishlistCount}</Text>
            <Text style={{ fontSize: 12, color: theme.textTertiary, marginTop: 2 }}>Saved</Text>
          </TouchableOpacity>
          <View style={{ width: 1, height: 32, backgroundColor: theme.inputBorder }} />
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: theme.textMain }}>{myItems.filter(i => i.isSold).length}</Text>
            <Text style={{ fontSize: 12, color: theme.textTertiary, marginTop: 2 }}>Sold</Text>
          </View>
        </View>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: theme.background, marginTop: 8, borderBottomWidth: 1, borderBottomColor: theme.card }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: theme.textMain }}>Your Listings</Text>
        <Text style={{ fontSize: 14, color: theme.textTertiary }}>{myItems.length} items</Text>
      </View>
    </View>
  );

  const menuItems = [
    {
      icon: 'heart-outline', label: 'Wishlist',
      color: '#f87171', bg: 'rgba(239,68,68,0.15)',
      onPress: () => closeMenu(() => navigation.navigate('Wishlist')),
    },
    {
      icon: 'pricetag-outline', label: 'Sell an Item',
      color: theme.primaryAccent, bg: `${theme.primaryAccent}20`,
      onPress: () => closeMenu(() => navigation.navigate('Sell')),
    },
    {
      icon: 'search-circle-outline', label: 'Lost & Found',
      color: '#fbbf24', bg: 'rgba(245,158,11,0.15)',
      onPress: () => closeMenu(() => navigation.navigate('LostFound')),
    },
    {
      icon: 'moon-outline', label: 'Theme',
      color: theme.secondaryAction, bg: `${theme.secondaryAction}20`,
      onPress: () => closeMenu(toggleTheme),
    },
    {
      icon: 'notifications-outline', label: 'Notifications',
      color: '#34d399', bg: 'rgba(52,211,153,0.15)',
      onPress: () => closeMenu(() => navigation.navigate('NotificationSettings'), true),
    },
    {
      icon: 'chatbox-ellipses-outline', label: 'Feedback',
      color: '#f472b6', bg: 'rgba(244,114,182,0.15)',
      onPress: () => closeMenu(() => navigation.navigate('Feedback'), true),
    },
    {
      icon: 'call-outline', label: 'Contact Us',
      color: '#fb923c', bg: 'rgba(251,146,60,0.15)',
      onPress: () => closeMenu(() => navigation.navigate('ContactUs'), true),
    },
    {
      icon: 'information-circle-outline', label: 'About',
      color: '#60a5fa', bg: 'rgba(96,165,250,0.15)',
      onPress: () => closeMenu(() => setAboutVisible(true)),
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>

      {/* ── Bottom-sheet menu ─────────────────────────────── */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => closeMenu()}
      >
        <View style={{ flex: 1 }}>
          <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', opacity: backdropOpacity }}>
            <Pressable style={{ flex: 1 }} onPress={() => closeMenu()} />
          </Animated.View>
        </View>
        <Animated.View
          style={{ backgroundColor: theme.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12, paddingHorizontal: 20, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 20, transform: [{ translateY: sheetY }], position: 'absolute', left: 0, right: 0, bottom: 0 }}
          {...menuPan.panHandlers}
        >
          {/* Handle */}
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: theme.inputBorder, alignSelf: 'center', marginBottom: 18 }} />

          {/* User mini-card */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}>
            <Image
              source={{ uri: userProfile?.profilePic || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png' }}
              style={{ width: 48, height: 48, borderRadius: 24, marginRight: 12, backgroundColor: theme.cardAccent }}
            />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: theme.textMain, marginBottom: 2 }} numberOfLines={1}>
                {userProfile?.name || currentUser?.name || 'Student'}
              </Text>
              <Text style={{ fontSize: 13, color: theme.textSub }} numberOfLines={1}>
                {userProfile?.college || currentUser?.college}
              </Text>
            </View>
            <TouchableOpacity
              style={{ borderWidth: 1, borderColor: theme.inputBorder, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16 }}
              onPress={() => closeMenu(() => navigation.navigate('EditProfile', { userProfile }))}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: theme.textSub }}>Edit Profile</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 1, backgroundColor: theme.inputBorder, marginVertical: 8 }} />

          {/* Action rows */}
          {menuItems.map((item) => (
            <TouchableOpacity key={item.label} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 13 }} onPress={item.onPress} activeOpacity={0.7}>
              <View style={{ width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 14, backgroundColor: item.bg }}>
                <Ionicons name={item.icon} size={20} color={item.color} />
              </View>
              <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: theme.textMain }}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.textTertiary} />
            </TouchableOpacity>
          ))}

          <View style={{ height: 1, backgroundColor: theme.inputBorder, marginVertical: 8 }} />

          {/* Log out */}
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 13 }}
            onPress={() => closeMenu(handleLogout)}
            activeOpacity={0.7}
          >
            <View style={{ width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 14, backgroundColor: 'rgba(239,68,68,0.15)' }}>
              <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            </View>
            <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: '#ef4444' }}>Log Out</Text>
          </TouchableOpacity>

          <View style={{ height: Platform.OS === 'ios' ? 24 : 12 }} />
        </Animated.View>
      </Modal>

      {/* ── About sub-menu ────────────────────────────────── */}
      <Modal
        visible={aboutVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setAboutVisible(false)}
      >
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} onPress={() => { setAboutVisible(false); setTimeout(() => setMenuVisible(true), 300); }} />
        <View style={{ backgroundColor: theme.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12, paddingHorizontal: 20, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 20 }}>
          {/* Handle */}
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: theme.inputBorder, alignSelf: 'center', marginBottom: 18 }} />

          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}>
            <TouchableOpacity onPress={() => { setAboutVisible(false); setTimeout(() => setMenuVisible(true), 300); }} style={{ marginRight: 12 }}>
              <Ionicons name="arrow-back" size={22} color={theme.textMain} />
            </TouchableOpacity>
            <Text style={{ fontSize: 17, fontWeight: '700', color: theme.textMain }}>About</Text>
          </View>

          <View style={{ height: 1, backgroundColor: theme.inputBorder, marginBottom: 8 }} />

          {[
            { icon: 'apps-outline',             label: 'About App',      color: '#60a5fa', bg: 'rgba(96,165,250,0.15)',  route: 'AboutApp' },
            { icon: 'shield-checkmark-outline', label: 'Privacy Policy', color: '#34d399', bg: 'rgba(52,211,153,0.15)', route: 'PrivacyPolicy' },
            { icon: 'document-text-outline',    label: 'Terms of Use',   color: '#fbbf24', bg: 'rgba(251,191,36,0.15)', route: 'TermsOfUse' },
            { icon: 'cloud-download-outline',   label: 'App Updates',    color: '#a78bfa', bg: 'rgba(167,139,250,0.15)',route: 'AppUpdates' },
          ].map((item) => (
            <TouchableOpacity
              key={item.label}
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 13 }}
              activeOpacity={0.7}
              onPress={() => { setAboutVisible(false); navigation.navigate(item.route); }}
            >
              <View style={{ width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 14, backgroundColor: item.bg }}>
                <Ionicons name={item.icon} size={20} color={item.color} />
              </View>
              <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: theme.textMain }}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.textTertiary} />
            </TouchableOpacity>
          ))}

          <View style={{ height: Platform.OS === 'ios' ? 24 : 12 }} />
        </View>
      </Modal>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
          <ActivityIndicator size="large" color={theme.primaryAction} />
        </View>
      ) : (
        <FlatList
          data={myItems}
          keyExtractor={(item) => item._id}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 30 }}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              colors={[theme.primaryAction]} 
              tintColor={theme.primaryAction} 
              progressBackgroundColor={theme.card} // <-- Added this!
            />
          }
          renderItem={({ item }) => (
            <ItemCard
              item={item}
              onPress={() => navigation.navigate('EditItem', { item })}
            />
          )}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 40, paddingHorizontal: 32 }}>
              <Ionicons name="pricetag-outline" size={60} color={theme.textTertiary} />
              <Text style={{ fontSize: 18, fontWeight: '700', color: theme.textMain, marginTop: 14, marginBottom: 6 }}>No listings yet</Text>
              <Text style={{ fontSize: 14, color: theme.textSub, textAlign: 'center', lineHeight: 20, marginBottom: 20 }}>Start selling items from your room, hostel, or campus!</Text>
              <TouchableOpacity style={{ backgroundColor: theme.primaryAction, paddingVertical: 12, paddingHorizontal: 28, borderRadius: 10 }} onPress={() => navigation.navigate('Sell')}>
                <Text style={{ color: theme.textOnPrimary || '#ffffff', fontWeight: 'bold', fontSize: 15 }}>Start Selling</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

export default ProfileScreen;
