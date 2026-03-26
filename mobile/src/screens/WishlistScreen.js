import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, SafeAreaView,
  ActivityIndicator, TouchableOpacity, Alert, Platform, RefreshControl, StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import API from '../api/axios';
import ItemCard from '../components/ItemCard';
import { useThemeStyles } from '../hooks/useThemeStyles'; // <-- Update path as needed

const WishlistScreen = ({ navigation }) => {
  // 1. Initialize dynamic theme hook
  const { styles, colors } = useThemeStyles(createStyles);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchWishlist = async () => {
    try {
      const response = await API.get('/users/wishlist');
      setItems(response.data);
    } catch (error) {
      console.error('Wishlist fetch error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchWishlist();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchWishlist();
  };

  const handleRemoveFromWishlist = async (itemId) => {
    Alert.alert('Remove from Wishlist', 'Remove this item from your saved list?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await API.post('/users/wishlist', { itemId });
            setItems(prev => prev.filter(i => i._id !== itemId));
          } catch (e) {
            Alert.alert('Error', 'Could not remove item.');
          }
        }
      }
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.header} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Wishlist</Text>
        <Text style={styles.headerCount}>{items.length} items</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primaryAction} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              colors={[colors.primaryAction]} 
              tintColor={colors.primaryAction} 
              progressBackgroundColor={colors.card} // <-- Added this!
            />
          }
          renderItem={({ item }) => (
            <View>
              <ItemCard
                item={item}
                onPress={() => navigation.navigate('ItemDetails', {
                  item,
                  activeCollege: item.college,
                })}
              />
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => handleRemoveFromWishlist(item._id)}
              >
                <Ionicons name="heart-dislike-outline" size={16} color="#ef4444" />
                <Text style={styles.removeBtnText}>Remove</Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={{ fontSize: 60, marginBottom: 16 }}>🤍</Text>
              <Text style={styles.emptyTitle}>Your wishlist is empty</Text>
              <Text style={styles.emptySubtitle}>
                Save items you're interested in by tapping the heart icon on any listing.
              </Text>
              <TouchableOpacity
            refreshC    style={styles.browseBtn}
                onPress={() => navigation.getParent()?.navigate('Home')}
              >
                <Text style={styles.browseBtnText}>Browse Items</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

// ─── Theme-Aware Style Generator ─────────────────────────────────────────────
const createStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 50 : 14,
    paddingBottom: 14, backgroundColor: theme.header,
    borderBottomWidth: 1, borderBottomColor: theme.headerDivider,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: theme.textMain },
  headerCount: { fontSize: 14, color: theme.textSub, fontWeight: '600', minWidth: 40, textAlign: 'right' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16 },

  removeBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 8, marginTop: -12,
  },
  removeBtnText: { fontSize: 13, color: '#ef4444', marginLeft: 4, fontWeight: '600' }, // Kept semantic red for destructive action

  emptyContainer: {
    alignItems: 'center', paddingTop: 60, paddingHorizontal: 32,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: theme.textMain, marginBottom: 8, textAlign: 'center' },
  emptySubtitle: { fontSize: 15, color: theme.textSub, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  browseBtn: {
    backgroundColor: theme.primaryAction, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12,
  },
  browseBtnText: { color: theme.textOnPrimary || '#ffffff', fontWeight: 'bold', fontSize: 15 }, // Contrast lock
});

export default WishlistScreen;