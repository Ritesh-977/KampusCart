import React, { useState, useCallback, useContext } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  SafeAreaView, ActivityIndicator, Alert, Linking, Platform, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Calendar from 'expo-calendar';
import API from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import { useThemeStyles } from '../hooks/useThemeStyles'; // <-- Update path as needed

// Retained colorful fallbacks for events without custom colors
const ACCENT_COLORS = ['#6366f1', '#818cf8', '#34d399', '#f472b6', '#fbbf24', '#38bdf8', '#fb923c'];

const formatDateTime = (iso) => {
  const d = new Date(iso);
  const date  = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleString('en-IN', { month: 'short' }).toUpperCase();
  const time  = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  return { date, month, time };
};

const EventsScreen = ({ navigation, route }) => {
  // 1. Initialize dynamic theme hook
  const { styles, colors } = useThemeStyles(createStyles);

  const { currentUser, isGuest } = useContext(AuthContext);
  const college = route.params?.college || currentUser?.college || '';

  const [events, setEvents]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [calLoading, setCalLoading] = useState(null);

  const fetchEvents = async () => {
    try {
      const res = await API.get(`/events?college=${encodeURIComponent(college)}`);
      setEvents(res.data || []);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchEvents(); }, [college]));

  const onRefresh = () => { setRefreshing(true); fetchEvents(); };

  // ── Add to device calendar ──────────────────────────────────────────────────
  const addToCalendar = async (event) => {
    try {
      setCalLoading(event._id);
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow calendar access in your device settings.');
        return;
      }
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const writable  = calendars.find(c => c.allowsModifications) || calendars[0];
      if (!writable) { Alert.alert('Error', 'No writable calendar found on your device.'); return; }

      const startDate = new Date(event.startTime);
      const endDate   = new Date(startDate.getTime() + (event.duration || 60) * 60 * 1000);

      await Calendar.createEventAsync(writable.id, {
        title:    event.title,
        location: event.location,
        notes:    event.description || '',
        startDate,
        endDate,
        timeZone: 'Asia/Kolkata',
      });
      Alert.alert('Added ✓', `"${event.title}" has been saved to your calendar.`);
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not add to calendar.');
    } finally {
      setCalLoading(null);
    }
  };

  // ── Contact organizer ───────────────────────────────────────────────────────
  const callOrganizer = (phone) => {
    if (!phone) { Alert.alert('No number', 'The organizer did not add a phone number.'); return; }
    Linking.openURL(`tel:${phone}`);
  };

  const whatsappOrganizer = async (phone, title) => {
    if (!phone) { Alert.alert('No number', 'The organizer did not add a phone number.'); return; }
    let p = phone.replace(/\D/g, '');
    if (p.length === 10) p = '91' + p;
    const msg = `Hi! I saw the event "${title}" on KampusCart. Can you share more details?`;
    await Linking.openURL(`https://wa.me/${p}?text=${encodeURIComponent(msg)}`);
  };

  // ── Delete event ─────────────────────────────────────────────────────────────
  const handleDelete = (eventId) => {
    Alert.alert('Delete Event', 'Are you sure you want to delete this event?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await API.delete(`/events/${eventId}`);
            setEvents(prev => prev.filter(e => e._id !== eventId));
          } catch {
            Alert.alert('Error', 'Could not delete event.');
          }
        },
      },
    ]);
  };

  // ── Render one event card ───────────────────────────────────────────────────
  const renderEvent = ({ item, index }) => {
    const color       = item.color || ACCENT_COLORS[index % ACCENT_COLORS.length];
    const { date, month, time } = formatDateTime(item.startTime);
    const isOrganizer = !isGuest && String(item.organizer?.user) === String(currentUser?._id);
    const hasPhone    = !!item.organizer?.phone;

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => navigation.navigate('EventDetails', { event: item })}
        style={[styles.card, { borderColor: color + '35' }]}
      >
        {/* Color bar */}
        <View style={[styles.colorBar, { backgroundColor: color }]} />

        <View style={styles.cardBody}>
          {/* Date badge + title row */}
          <View style={styles.topRow}>
            <View style={[styles.dateBadge, { backgroundColor: color + '22', borderColor: color + '55' }]}>
              <Text style={[styles.dateDay, { color }]}>{date}</Text>
              <Text style={[styles.dateMon, { color }]}>{month}</Text>
            </View>
            <View style={styles.titleBlock}>
              <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
              <View style={styles.metaRow}>
                <Ionicons name="time-outline" size={13} color={colors.textTertiary} />
                <Text style={styles.metaText}>{time}</Text>
                {item.duration > 0 && (
                  <Text style={styles.metaDuration}> · {item.duration} min</Text>
                )}
              </View>
              <View style={styles.metaRow}>
                <Ionicons name="location-outline" size={13} color={colors.textTertiary} />
                <Text style={styles.metaText} numberOfLines={1}>{item.location}</Text>
              </View>
            </View>
            {isOrganizer && (
              <View style={styles.ownerBtns}>
                <TouchableOpacity
                  onPress={(e) => { e.stopPropagation?.(); navigation.navigate('PostEvent', { event: item, college: item.college }); }}
                  style={styles.iconBtn}
                >
                  <Ionicons name="create-outline" size={16} color={colors.primaryAccent} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={(e) => { e.stopPropagation?.(); handleDelete(item._id); }}
                  style={[styles.iconBtn, { marginTop: 4 }]}
                >
                  <Ionicons name="trash-outline" size={16} color="#ef4444" />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Description */}
          {!!item.description && (
            <Text style={styles.description} numberOfLines={3}>{item.description}</Text>
          )}

          {/* Action row */}
          <View style={styles.actionRow}>
            {/* Add to Calendar */}
            <TouchableOpacity
              style={[styles.calBtn, { borderColor: color + '60' }]}
              onPress={() => addToCalendar(item)}
              disabled={calLoading === item._id}
            >
              {calLoading === item._id
                ? <ActivityIndicator size="small" color={color} />
                : <Ionicons name="calendar-outline" size={15} color={color} />
              }
              <Text style={[styles.calBtnText, { color }]}>Add to Calendar</Text>
            </TouchableOpacity>

            {/* Contact organizer */}
            {hasPhone && (
              <View style={styles.contactRow}>
                <TouchableOpacity
                  style={styles.contactBtn}
                  onPress={() => callOrganizer(item.organizer.phone)}
                >
                  <Ionicons name="call-outline" size={16} color="#34d399" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.contactBtn}
                  onPress={() => whatsappOrganizer(item.organizer.phone, item.title)}
                >
                  <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Organizer credit */}
          <Text style={styles.organizer}>
            Organized by  {item.organizer?.name || 'Campus'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Campus Events</Text>
        {!isGuest && (
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => navigation.navigate('PostEvent', { college })}
          >
            <Ionicons name="add" size={22} color={colors.textOnPrimary || '#ffffff'} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primaryAction} />
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={item => item._id}
          renderItem={renderEvent}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primaryAction]} tintColor={colors.primaryAction} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={64} color={colors.textTertiary} />
              <Text style={styles.emptyTitle}>No upcoming events</Text>
              <Text style={styles.emptySub}>
                {isGuest ? 'Login to post campus events.' : 'Be the first to post an event on your campus!'}
              </Text>
              {!isGuest && (
                <TouchableOpacity
                  style={styles.emptyPostBtn}
                  onPress={() => navigation.navigate('PostEvent', { college })}
                >
                  <Text style={styles.emptyPostTxt}>Post an Event</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

// ─── Theme-Aware Style Generator ─────────────────────────────────────────────
const createStyles = (theme) => StyleSheet.create({
  safe:   { flex: 1, backgroundColor: theme.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 48 : 12,
    paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: theme.headerDivider,
    backgroundColor: theme.header,
  },
  backBtn: { padding: 4, marginRight: 10 },
  headerTitle: { flex: 1, fontSize: 22, fontWeight: '800', color: theme.textMain },
  addBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: theme.primaryAction,
    justifyContent: 'center', alignItems: 'center',
  },

  list: { padding: 16, paddingBottom: 40 },

  // Event card
  card: {
    flexDirection: 'row',
    backgroundColor: theme.card,
    borderRadius: 16, borderWidth: 1,
    marginBottom: 16, overflow: 'hidden',
  },
  colorBar: { width: 4 },
  cardBody: { flex: 1, padding: 14 },

  topRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  dateBadge: {
    width: 48, borderRadius: 10, borderWidth: 1,
    alignItems: 'center', paddingVertical: 6, marginRight: 12,
  },
  dateDay: { fontSize: 18, fontWeight: '900', lineHeight: 22 },
  dateMon: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },

  titleBlock: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: theme.textMain, marginBottom: 4, lineHeight: 22 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  metaText: { fontSize: 12, color: theme.textTertiary, marginLeft: 4 },
  metaDuration: { fontSize: 12, color: theme.textTertiary },

  ownerBtns: { alignItems: 'center' },
  iconBtn: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: theme.inputBg, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: theme.inputBorder,
  },

  description: { fontSize: 14, color: theme.textSub, lineHeight: 20, marginBottom: 12 },

  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  calBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8, paddingHorizontal: 14,
    borderRadius: 10, borderWidth: 1,
    backgroundColor: theme.primaryAction + '0F', // Adds a light tint of primary color behind calendar btn
  },
  calBtnText: { fontSize: 13, fontWeight: '600' },

  contactRow: { flexDirection: 'row', gap: 8 },
  contactBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: theme.inputBg,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: theme.inputBorder,
  },

  organizer: { fontSize: 12, color: theme.textTertiary, fontStyle: 'italic' },

  // Empty state
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: theme.textMain, marginTop: 16, marginBottom: 6 },
  emptySub: { fontSize: 14, color: theme.textSub, textAlign: 'center', lineHeight: 20 },
  emptyPostBtn: {
    marginTop: 20, backgroundColor: theme.primaryAction,
    paddingVertical: 12, paddingHorizontal: 28, borderRadius: 12,
  },
  emptyPostTxt: { color: theme.textOnPrimary || '#ffffff', fontWeight: '700', fontSize: 15 },
});

export default EventsScreen;