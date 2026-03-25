import React, { useRef } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStyles } from '../hooks/useThemeStyles'; // <-- Make sure path is correct

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1588508065123-287b28e0141c?w=400&q=80';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

// Function to safely map categories to theme colors dynamically
const getCategoryColors = (category, colors) => {
  const map = {
    'Cycles': colors.secondaryAccent,         // Greenish by default
    'Electronics': colors.primaryAction,      // Main action color
    'Books & Notes': '#fbbf24',               // Hardcoded yellow/amber (looks good on light & dark)
    'Hostel Essentials': colors.primaryAccent,// Secondary action color
    'Other': colors.textTertiary,             // Neutral gray
  };
  
  const baseColor = map[category] || map['Other'];
  
  // Return the solid text color and a 15% opacity version for the background badge
  return {
    text: baseColor,
    bg: baseColor + '26' // '26' is 15% opacity in hex
  };
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
  // 1. Initialize dynamic theme hook
  const { styles, colors } = useThemeStyles(createStyles);
  
  const scaleAnim = useRef(new Animated.Value(1)).current;

  let imageUrl = FALLBACK_IMAGE;
  if (item.images && item.images.length > 0) {
    const firstImg = item.images[0];
    const rawPath = typeof firstImg === 'string' ? firstImg : firstImg?.url;
    if (rawPath && rawPath.startsWith('http')) imageUrl = rawPath;
  }

  // Generate the dynamic category color based on the current theme
  const catColors = getCategoryColors(item.category, colors);

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
                <Ionicons name="images-outline" size={10} color="#ffffff" />
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
              <Ionicons name="time-outline" size={11} color={colors.textTertiary} />
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

// ─── Theme-Aware Style Generator ─────────────────────────────────────────────
const createStyles = (theme) => StyleSheet.create({
  // Grid card
  gridCard: {
    backgroundColor: theme.card,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: theme.textMain,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, // Reduced shadow opacity to look cleaner in light modes
    shadowRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.cardAccent,
  },
  gridImageWrapper: { position: 'relative' },
  gridImage: { width: '100%', height: CARD_WIDTH * 0.85, backgroundColor: theme.cardAccent },
  priceBadge: {
    position: 'absolute', bottom: 8, left: 8,
    backgroundColor: theme.primaryAction, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  priceBadgeText: {color: theme.textOnPrimary || '#ffffff', fontWeight: '800', fontSize: 12 }, // Locked to white for contrast
  multiImgBadge: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
    flexDirection: 'row', alignItems: 'center', gap: 3,
  },
  multiImgText: { color: theme.textOnPrimary || '#ffffff',fontSize: 10, fontWeight: '700' }, // Locked to white for contrast
  gridContent: { padding: 10 },
  gridTitle: { fontSize: 13, fontWeight: '700', color: theme.textMain, marginBottom: 6, lineHeight: 18 },
  catBadge: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, marginBottom: 6 },
  catBadgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  gridFooter: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  gridTime: { fontSize: 11, color: theme.textSub },

  // Full-width card
  card: {
    backgroundColor: theme.card, borderRadius: 16, marginBottom: 16,
    overflow: 'hidden', elevation: 3,
    borderWidth: 1, borderColor: theme.cardAccent,
    shadowColor: theme.textMain, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  image: { width: '100%', height: 200, backgroundColor: theme.cardAccent },
  detailsContainer: { padding: 14 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  title: { fontSize: 16, fontWeight: '700', color: theme.textMain, flex: 1, marginRight: 10 },
  price: { fontSize: 17, fontWeight: '800', color: theme.primaryAccent },
  category: { fontSize: 11, color: theme.textTertiary, textTransform: 'uppercase', fontWeight: '700', letterSpacing: 0.5, marginBottom: 10 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: theme.cardAccent, paddingTop: 10 },
  collegeText: { fontSize: 12, color: theme.textSub, fontWeight: '500' },
  timeText: { fontSize: 12, color: theme.textTertiary },
});

export default ItemCard;