import React, { useState, useCallback, useContext } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  SafeAreaView, ActivityIndicator, Alert, StatusBar, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import API from '../api/axios';
import { AuthContext } from '../context/AuthContext';

const SPORT_EMOJI = {
  Cricket: '🏏', Football: '⚽', Basketball: '🏀', Volleyball: '🏐',
  Badminton: '🏸', 'Table Tennis': '🏓', Chess: '♟️',
  Athletics: '🏃', Kabaddi: '🤼', Other: '🏆',
};

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const SportsScreen = ({ navigation }) => {
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
            <View style={[styles.statusPill, isClosed ? styles.pillClosed : styles.pillOpen]}>
              <Text style={[styles.statusTxt, { color: isClosed ? '#ef4444' : '#34d399' }]}>
                {isClosed ? 'Closed' : 'Open'}
              </Text>
            </View>
          </View>

          <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>

          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={12} color="#64748b" />
            <Text style={styles.metaTxt} numberOfLines={1}>{item.venue}</Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={12} color="#64748b" />
            <Text style={styles.metaTxt}>{fmtDate(item.eventDate)}</Text>
          </View>

          <View style={styles.cardFooter}>
            <View style={styles.feePill}>
              <Text style={styles.feeTxt}>
                {item.registrationFee > 0 ? `₹${item.registrationFee} fee` : 'Free'}
              </Text>
            </View>
            <View style={styles.teamRow}>
              <Ionicons name="people-outline" size={11} color="#818cf8" />
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
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={22} color="#f1f5f9" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sports</Text>
        {!isGuest ? (
          <TouchableOpacity
            style={styles.postBtn}
            onPress={() => navigation.navigate('PostSport', {})}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.postBtnTxt}>Post</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 64 }} />
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#818cf8" />
        </View>
      ) : (
        <FlatList
          data={sports}
          keyExtractor={item => item._id}
          renderItem={renderSport}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#818cf8" colors={['#818cf8']} />
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

const styles = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: '#0f172a' },
  header:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  iconBtn:      { width: 40, height: 40, justifyContent: 'center' },
  headerTitle:  { flex: 1, color: '#f1f5f9', fontSize: 18, fontWeight: '700' },
  postBtn:      { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#818cf8', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  postBtnTxt:   { color: '#fff', fontSize: 13, fontWeight: '700' },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list:         { padding: 16, gap: 12 },
  listEmpty:    { flexGrow: 1 },

  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    flexDirection: 'row',
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardDim:   { opacity: 0.6 },
  emojiBox:  { width: 54, height: 54, borderRadius: 14, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center', alignSelf: 'flex-start' },
  emoji:     { fontSize: 28 },
  cardBody:  { flex: 1 },

  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  sportType:  { fontSize: 11, color: '#818cf8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, borderWidth: 1 },
  pillOpen:   { borderColor: '#34d39950', backgroundColor: 'rgba(52,211,153,0.08)' },
  pillClosed: { borderColor: '#ef444450', backgroundColor: 'rgba(239,68,68,0.08)' },
  statusTxt:  { fontSize: 10, fontWeight: '700' },

  cardTitle: { fontSize: 14, fontWeight: '700', color: '#f1f5f9', marginBottom: 6, lineHeight: 20 },
  metaRow:   { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  metaTxt:   { fontSize: 12, color: '#64748b', flex: 1 },

  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  feePill:    { backgroundColor: 'rgba(129,140,248,0.12)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  feeTxt:     { fontSize: 11, color: '#818cf8', fontWeight: '600' },
  teamRow:    { flexDirection: 'row', alignItems: 'center', gap: 3 },
  teamTxt:    { fontSize: 11, color: '#64748b' },
  deadlineTxt: { fontSize: 11, color: '#fbbf24', marginTop: 4 },

  emptyBox:    { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, gap: 8, paddingVertical: 80 },
  emptyEmoji:  { fontSize: 64, marginBottom: 8 },
  emptyTitle:  { fontSize: 18, fontWeight: '700', color: '#f1f5f9' },
  emptySub:    { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 20 },
  emptyBtn:    { marginTop: 12, backgroundColor: '#818cf8', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 },
  emptyBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
