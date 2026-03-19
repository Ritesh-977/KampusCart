import React, { useRef } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1588508065123-287b28e0141c?w=400&q=80';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

const CATEGORY_COLORS = {
  'Cycles': { bg: 'rgba(5,150,105,0.18)', text: '#34d399' },
  'Electronics': { bg: 'rgba(37,99,235,0.18)', text: '#60a5fa' },
  'Books & Notes': { bg: 'rgba(202,138,4,0.18)', text: '#fbbf24' },
  'Hostel Essentials': { bg: 'rgba(147,51,234,0.18)', text: '#c084fc' },
  'Other': { bg: 'rgba(100,116,139,0.18)', text: '#94a3b8' },
};

const timeAgo = (dateStr) => {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const ItemCard = ({ item, onPress, compact = false }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  let imageUrl = FALLBACK_IMAGE;
  if (item.images && item.images.length > 0) {
    const firstImg = item.images[0];
    const rawPath = typeof firstImg === 'string' ? firstImg : firstImg?.url;
    if (rawPath && rawPath.startsWith('http')) imageUrl = rawPath;
  }

  const catColors = CATEGORY_COLORS[item.category] || CATEGORY_COLORS['Other'];

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true, speed: 50 }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 20 }).start();
  };

  if (compact) {
    // 2-column grid card
    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }], width: CARD_WIDTH }}>
        <TouchableOpacity
          style={styles.gridCard}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={1}
        >
          <View style={styles.gridImageWrapper}>
            <Image source={{ uri: imageUrl }} style={styles.gridImage} resizeMode="cover" />
            <View style={styles.priceBadge}>
              <Text style={styles.priceBadgeText}>₹{Number(item.price).toLocaleString('en-IN')}</Text>
            </View>
            {item.images && item.images.length > 1 && (
              <View style={styles.multiImgBadge}>
                <Ionicons name="images-outline" size={10} color="#fff" />
                <Text style={styles.multiImgText}>{item.images.length}</Text>
              </View>
            )}
          </View>
          <View style={styles.gridContent}>
            <Text style={styles.gridTitle} numberOfLines={2}>{item.title}</Text>
            <View style={[styles.catBadge, { backgroundColor: catColors.bg }]}>
              <Text style={[styles.catBadgeText, { color: catColors.text }]} numberOfLines={1}>
                {item.category || 'General'}
              </Text>
            </View>
            <View style={styles.gridFooter}>
              <Ionicons name="time-outline" size={11} color="#9ca3af" />
              <Text style={styles.gridTime}>{timeAgo(item.createdAt)}</Text>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // Full-width card (fallback)
  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
        <View style={styles.detailsContainer}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.price}>₹{Number(item.price).toLocaleString('en-IN')}</Text>
          </View>
          <Text style={styles.category}>{item.category || 'General'}</Text>
          <View style={styles.footer}>
            <Text style={styles.collegeText}>📍 {item.college}</Text>
            <Text style={styles.timeText}>{timeAgo(item.createdAt)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  // Grid card
  gridCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  gridImageWrapper: { position: 'relative' },
  gridImage: { width: '100%', height: CARD_WIDTH * 0.85, backgroundColor: '#273549' },
  priceBadge: {
    position: 'absolute', bottom: 8, left: 8,
    backgroundColor: '#4f46e5', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  priceBadgeText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  multiImgBadge: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
    flexDirection: 'row', alignItems: 'center', gap: 3,
  },
  multiImgText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  gridContent: { padding: 10 },
  gridTitle: { fontSize: 13, fontWeight: '700', color: '#f1f5f9', marginBottom: 6, lineHeight: 18 },
  catBadge: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, marginBottom: 6 },
  catBadgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  gridFooter: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  gridTime: { fontSize: 11, color: '#64748b' },

  // Full-width card
  card: {
    backgroundColor: '#1e293b', borderRadius: 16, marginBottom: 16,
    overflow: 'hidden', elevation: 3,
    borderWidth: 1, borderColor: '#334155',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 8,
  },
  image: { width: '100%', height: 200, backgroundColor: '#273549' },
  detailsContainer: { padding: 14 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  title: { fontSize: 16, fontWeight: '700', color: '#f1f5f9', flex: 1, marginRight: 10 },
  price: { fontSize: 17, fontWeight: '800', color: '#818cf8' },
  category: { fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: '700', letterSpacing: 0.5, marginBottom: 10 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#334155', paddingTop: 10 },
  collegeText: { fontSize: 12, color: '#94a3b8', fontWeight: '500' },
  timeText: { fontSize: 12, color: '#64748b' },
});

export default ItemCard;
