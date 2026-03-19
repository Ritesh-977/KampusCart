import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1588508065123-287b28e0141c?w=400&q=80';

const ItemCard = ({ item, onPress }) => {
  let imageUrl = FALLBACK_IMAGE;

  if (item.images && item.images.length > 0) {
    const firstImg = item.images[0];
    const rawPath = typeof firstImg === 'string' ? firstImg : firstImg?.url;
    if (rawPath && rawPath.startsWith('http')) {
      imageUrl = rawPath;
    }
  }

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
      
      <View style={styles.detailsContainer}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.price}>₹{item.price}</Text>
        </View>
        <Text style={styles.category}>{item.category || 'General'}</Text>
        <View style={styles.footer}>
          <Text style={styles.collegeText}>📍 {item.college}</Text>
          <Text style={styles.timeText}>{new Date(item.createdAt).toLocaleDateString()}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: '#ffffff', borderRadius: 12, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#f3f4f6', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
  image: { width: '100%', height: 180, backgroundColor: '#f3f4f6' },
  detailsContainer: { padding: 12 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  title: { fontSize: 16, fontWeight: 'bold', color: '#1f2937', flex: 1, marginRight: 10 },
  price: { fontSize: 16, fontWeight: 'bold', color: '#4f46e5' },
  category: { fontSize: 12, color: '#6b7280', textTransform: 'uppercase', fontWeight: '600', marginBottom: 10 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 10 },
  collegeText: { fontSize: 12, color: '#4b5563', fontWeight: '500' },
  timeText: { fontSize: 12, color: '#9ca3af' },
});

export default ItemCard;