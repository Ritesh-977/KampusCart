import React, { useState, useCallback, useContext } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  SafeAreaView, ActivityIndicator, Alert, StatusBar, RefreshControl, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import API from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import { useThemeStyles } from '../hooks/useThemeStyles'; // <-- Update path as needed

const SPORT_EMOJI = {
  Cricket: '🏏', Football: '⚽', Basketball: '🏀', Volleyball: '🏐',
  Badminton: '🏸', 'Table Tennis': '🏓', Chess: '♟️',
  Athletics: '🏃', Kabaddi: '🤼', Other: '🏆',
};

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const SportsScreen = ({ navigation }) => {
  // 1. Initialize dynamic theme hook
  const { styles, colors } = useThemeStyles(createStyles);

  const { currentUser, isGuest } = useContext(AuthContext);
  const [sports, setSports]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSports = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await API.get(`/sports?college=${encodeURIComponent(currentUser?.college || '')}`);
      setSports(res.data?.data || []);
    } catch {
      Alert.alert('Error', 'Could not load sports events. Pull to refresh.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUser?.college]);

  useFocusEffect(useCallback(() => { fetchSports(); }, [fetchSports]));

  const onRefresh = () => { setRefreshing(true); fetchSports(true); };

  const renderSport = ({ item }) => {
    const now           = new Date();
    const deadlinePassed = new Date(item.lastRegistrationDate) < now;
    const isClosed      = !item.isOpen || deadlinePassed;
    const emoji         = SPORT_EMOJI[item.sportType] || '🏆';

    return (
      <TouchableOpacity
        style={[styles.card, isClosed && styles.cardDim]}
        onPress={() => navigation.navigate('SportDetails', { sport: item })}
        activeOpacity={0.8}
      >
        <View style={styles.emojiBox}>
          <Text style={styles.emoji}>{emoji}</Text>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.cardTopRow}>
            <Text style={styles.sportType}>{item.sportType}</Text>
            {/* Maintained semantic colors (red/green) for Open/Closed status */}
            <View style={[styles.statusPill, isClosed ? styles.pillClosed : styles.pillOpen]}>
              <Text style={[styles.statusTxt, { color: isClosed ? '#ef4444' : '#34d399' }]}>
                {isClosed ? 'Closed' : 'Open'}
              </Text>
            </View>
          </View>

          <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>

          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={12} color={colors.textTertiary} />
            <Text style={styles.metaTxt} numberOfLines={1}>{item.venue}</Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={12} color={colors.textTertiary} />
            <Text style={styles.metaTxt}>{fmtDate(item.eventDate)}</Text>
          </View>

          <View style={styles.cardFooter}>
            <View style={styles.feePill}>
              <Text style={styles.feeTxt}>
                {item.registrationFee > 0 ? `₹${item.registrationFee} fee` : 'Free'}
              </Text>
            </View>
            <View style={styles.teamRow}>
              <Ionicons name="people-outline" size={11} color={colors.primaryAccent} />
              <Text style={styles.teamTxt}>
                {item.teamSize === 1 ? 'Individual' : `Team of ${item.teamSize}`}
                {'  ·  '}{item.registrationCount || 0} registered
              </Text>
            </View>
          </View>

          {!isClosed && (
            <Text style={styles.deadlineTxt}>
              Deadline: {fmtDate(item.lastRegistrationDate)}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.header} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sports</Text>
        {!isGuest ? (
          <TouchableOpacity
            style={styles.postBtn}
            onPress={() => navigation.navigate('PostSport', {})}
          >
            <Ionicons name="add" size={18} color="#ffffff" />
            <Text style={styles.postBtnTxt}>Post</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 64 }} />
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primaryAction} />
        </View>
      ) : (
        <FlatList
          data={sports}
          keyExtractor={item => item._id}
          renderItem={renderSport}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primaryAction} colors={[colors.primaryAction]} />
          }
          contentContainerStyle={[styles.list, !sports.length && styles.listEmpty]}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>🏆</Text>
              <Text style={styles.emptyTitle}>No sports events yet</Text>
              <Text style={styles.emptySub}>
                Be the first to organize a sport on your campus!
              </Text>
              {!isGuest && (
                <TouchableOpacity
                  style={styles.emptyBtn}
                  onPress={() => navigation.navigate('PostSport', {})}
                >
                  <Text style={styles.emptyBtnTxt}>Post a Sport Event</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

export default SportsScreen;

// ─── Theme-Aware Style Generator ─────────────────────────────────────────────
const createStyles = (theme) => StyleSheet.create({
  safe:         { flex: 1, backgroundColor: theme.background },
  header:       { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 10,
    marginTop: Platform.OS === 'ios' ? 20 : 0,
    borderBottomWidth: 1, 
    borderBottomColor: theme.headerDivider, 
    backgroundColor: theme.header 
  },
  iconBtn:      { width: 40, height: 40, justifyContent: 'center' },
  headerTitle:  { flex: 1, color: theme.textMain, fontSize: 18, fontWeight: '700' },
  postBtn:      { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.primaryAction, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  postBtnTxt:   { color: '#ffffff', fontSize: 13, fontWeight: '700' }, // Locked to white for contrast
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list:         { padding: 16, gap: 12 },
  listEmpty:    { flexGrow: 1 },

  card: {
    backgroundColor: theme.card,
    borderRadius: 16,
    flexDirection: 'row',
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: theme.cardAccent,
  },
  cardDim:   { opacity: 0.6 },
  emojiBox:  { width: 54, height: 54, borderRadius: 14, backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center', alignSelf: 'flex-start', borderWidth: 1, borderColor: theme.cardAccent },
  emoji:     { fontSize: 28 },
  cardBody:  { flex: 1 },

  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  sportType:  { fontSize: 11, color: theme.primaryAccent, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  
  // Semantic badging (Red/Green)
  statusPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, borderWidth: 1 },
  pillOpen:   { borderColor: '#34d39950', backgroundColor: 'rgba(52,211,153,0.08)' },
  pillClosed: { borderColor: '#ef444450', backgroundColor: 'rgba(239,68,68,0.08)' },
  statusTxt:  { fontSize: 10, fontWeight: '700' },

  cardTitle: { fontSize: 14, fontWeight: '700', color: theme.textMain, marginBottom: 6, lineHeight: 20 },
  metaRow:   { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  metaTxt:   { fontSize: 12, color: theme.textSub, flex: 1 },

  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  feePill:    { backgroundColor: theme.primaryAction + '1A', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  feeTxt:     { fontSize: 11, color: theme.primaryAccent, fontWeight: '600' },
  teamRow:    { flexDirection: 'row', alignItems: 'center', gap: 3 },
  teamTxt:    { fontSize: 11, color: theme.textSub },
  deadlineTxt: { fontSize: 11, color: '#fbbf24', marginTop: 4 }, // Semantic amber

  emptyBox:    { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, gap: 8, paddingVertical: 80 },
  emptyEmoji:  { fontSize: 64, marginBottom: 8 },
  emptyTitle:  { fontSize: 18, fontWeight: '700', color: theme.textMain },
  emptySub:    { fontSize: 14, color: theme.textSub, textAlign: 'center', lineHeight: 20 },
  emptyBtn:    { marginTop: 12, backgroundColor: theme.primaryAction, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 },
  emptyBtnTxt: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
});