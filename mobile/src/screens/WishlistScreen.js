import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, SafeAreaView,
  ActivityIndicator, TouchableOpacity, Alert, Platform, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import API from '../api/axios';
import ItemCard from '../components/ItemCard';

const WishlistScreen = ({ navigation }) => {
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

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#f1f5f9" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Wishlist</Text>
        <Text style={styles.headerCount}>{items.length} items</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4f46e5']} tintColor="#4f46e5" progressBackgroundColor="#1e293b" />}
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
                style={styles.browseBtn}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 50 : 14,
    paddingBottom: 14, backgroundColor: '#1e293b',
    borderBottomWidth: 1, borderBottomColor: '#334155',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#f1f5f9' },
  headerCount: { fontSize: 14, color: '#64748b', fontWeight: '600', minWidth: 40, textAlign: 'right' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16 },

  removeBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 8, marginTop: -12,
  },
  removeBtnText: { fontSize: 13, color: '#f87171', marginLeft: 4, fontWeight: '600' },

  emptyContainer: {
    alignItems: 'center', paddingTop: 60, paddingHorizontal: 32,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#f1f5f9', marginBottom: 8 },
  emptySubtitle: { fontSize: 15, color: '#64748b', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  browseBtn: {
    backgroundColor: '#4f46e5', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12,
  },
  browseBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 15 },
});

export default WishlistScreen;
