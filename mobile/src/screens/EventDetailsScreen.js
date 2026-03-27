import React, { useContext, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  SafeAreaView, Alert, Linking, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import API from '../api/axios';
import { useThemeStyles } from '../hooks/useThemeStyles'; // <-- Make sure path is correct

const fmt = (iso) => {
  const d = new Date(iso);
  const date  = d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const time  = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const dateShort = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleString('en-IN', { month: 'short' }).toUpperCase();
  return { date, time, dateShort, month };
};

const addToGoogleCalendar = async (event) => {
  const start = new Date(event.startTime);
  const end   = new Date(start.getTime() + (event.duration || 60) * 60 * 1000);
  const fmtZ  = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const url   =
    `https://calendar.google.com/calendar/render?action=TEMPLATE` +
    `&text=${encodeURIComponent(event.title)}` +
    `&dates=${fmtZ(start)}/${fmtZ(end)}` +
    `&details=${encodeURIComponent(event.description || '')}` +
    `&location=${encodeURIComponent(event.location)}`;
  await Linking.openURL(url);
};

const EventDetailsScreen = ({ navigation, route }) => {
  // 1. Initialize dynamic theme hook
  const { styles, colors } = useThemeStyles(createStyles);

  const { event: initialEvent } = route.params;
  const { currentUser, isGuest } = useContext(AuthContext);

  const [event, setEvent]       = useState(initialEvent);
  const [deleting, setDeleting] = useState(false);

  // Use event's custom color, fallback to the theme's primaryAction
  const color       = event.color || colors.primaryAction;
  const { date, time, dateShort, month } = fmt(event.startTime);
  const isOrganizer = !isGuest && String(event.organizer?.user) === String(currentUser?.id || currentUser?._id);
  const hasPhone    = !!event.organizer?.phone;

  const handleDelete = () => {
    Alert.alert('Delete Event', 'Permanently delete this event?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            setDeleting(true);
            await API.delete(`/events/${event._id}`);
            navigation.goBack();
          } catch {
            Alert.alert('Error', 'Could not delete event.');
            setDeleting(false);
          }
        },
      },
    ]);
  };

  const callOrganizer = () => {
    if (!event.organizer?.phone) return;
    Linking.openURL(`tel:${event.organizer.phone}`);
  };

  const whatsappOrganizer = () => {
    if (!event.organizer?.phone) return;
    let p = event.organizer.phone.replace(/\D/g, '');
    if (p.length === 10) p = '91' + p;
    const msg = `Hi! I saw the event "${event.title}" on KampusCart. Can you share more details?`;
    Linking.openURL(`https://wa.me/${p}?text=${encodeURIComponent(msg)}`);
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: color + '40' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Event Details</Text>
        {isOrganizer ? (
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => navigation.navigate('PostEvent', { event, college: event.college })}
            >
              <Ionicons name="create-outline" size={20} color={colors.primaryAccent} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerIconBtn, { marginLeft: 4 }]}
              onPress={handleDelete}
              disabled={deleting}
            >
              {deleting
                ? <ActivityIndicator size="small" color="#ef4444" />
                : <Ionicons name="trash-outline" size={20} color="#ef4444" />
              }
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ width: 72 }} />
        )}
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* Color accent banner */}
        <View style={[styles.banner, { backgroundColor: color + '18', borderColor: color + '35' }]}>
          <View style={[styles.datePill, { backgroundColor: color + '25', borderColor: color + '60' }]}>
            <Text style={[styles.dateDay, { color }]}>{dateShort}</Text>
            <Text style={[styles.dateMon, { color }]}>{month}</Text>
          </View>
          <View style={styles.bannerText}>
            <Text style={styles.eventTitle}>{event.title}</Text>
            <View style={styles.metaRow}>
              <Ionicons name="time-outline" size={14} color={color} />
              <Text style={[styles.metaTxt, { color }]}>{time}</Text>
              {event.duration > 0 && (
                <Text style={styles.durationTxt}> · {event.duration} min</Text>
              )}
            </View>
          </View>
        </View>

        {/* Info cards */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: color + '18' }]}>
              <Ionicons name="location-outline" size={18} color={color} />
            </View>
            <View style={styles.infoTextBlock}>
              <Text style={styles.infoLabel}>Venue</Text>
              <Text style={styles.infoValue}>{event.location}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: color + '18' }]}>
              <Ionicons name="calendar-outline" size={18} color={color} />
            </View>
            <View style={styles.infoTextBlock}>
              <Text style={styles.infoLabel}>Date</Text>
              <Text style={styles.infoValue}>{date}</Text>
            </View>
          </View>

          {event.duration > 0 && (
            <>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <View style={[styles.infoIcon, { backgroundColor: color + '18' }]}>
                  <Ionicons name="hourglass-outline" size={18} color={color} />
                </View>
                <View style={styles.infoTextBlock}>
                  <Text style={styles.infoLabel}>Duration</Text>
                  <Text style={styles.infoValue}>{event.duration} minutes</Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Description */}
        {!!event.description && (
          <>
            <Text style={styles.sectionTitle}>About this Event</Text>
            <View style={styles.descCard}>
              <Text style={styles.descText}>{event.description}</Text>
            </View>
          </>
        )}

        {/* Add to calendar */}
        <TouchableOpacity
          style={[styles.calBtn, { borderColor: color + '50' }]}
          onPress={() => addToGoogleCalendar(event)}
        >
          <Ionicons name="calendar-outline" size={18} color={color} />
          <Text style={[styles.calBtnText, { color }]}>Add to Google Calendar</Text>
        </TouchableOpacity>

        {/* Organizer section */}
        <Text style={styles.sectionTitle}>Organizer</Text>
        <View style={styles.organizerCard}>
          <View style={[styles.orgAvatar, { backgroundColor: color + '22' }]}>
            <Ionicons name="person-outline" size={22} color={color} />
          </View>
          <View style={styles.orgInfo}>
            <Text style={styles.orgName}>{event.organizer?.name || 'Campus Organizer'}</Text>
            {hasPhone
              ? <Text style={styles.orgPhone}>{event.organizer.phone}</Text>
              : <Text style={styles.orgNoPhone}>No contact number provided</Text>
            }
          </View>
          {hasPhone && (
            <View style={styles.contactBtns}>
              <TouchableOpacity style={styles.contactBtn} onPress={callOrganizer}>
                <Ionicons name="call-outline" size={18} color="#34d399" />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.contactBtn, { marginTop: 8 }]} onPress={whatsappOrganizer}>
                <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Organizer actions */}
        {isOrganizer && (
          <View style={styles.ownerActions}>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => navigation.navigate('PostEvent', { event, college: event.college })}
            >
              <Ionicons name="create-outline" size={18} color={colors.primaryAccent} />
              <Text style={styles.editBtnText}>Edit Event</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={handleDelete}
              disabled={deleting}
            >
              {deleting
                ? <ActivityIndicator color="#ef4444" size="small" />
                : <>
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    <Text style={styles.deleteBtnText}>Delete Event</Text>
                  </>
              }
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Theme-Aware Style Generator ─────────────────────────────────────────────
const createStyles = (theme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.background },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 48 : 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    backgroundColor: theme.header,
  },
  backBtn: { padding: 4, marginRight: 8 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: theme.textMain },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  headerIconBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: theme.card, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: theme.cardAccent,
  },

  body: { padding: 20, paddingBottom: 48 },

  banner: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 18, borderWidth: 1,
    padding: 16, marginBottom: 20, gap: 14,
  },
  datePill: {
    width: 54, borderRadius: 12, borderWidth: 1,
    alignItems: 'center', paddingVertical: 8,
  },
  dateDay: { fontSize: 22, fontWeight: '900', lineHeight: 26 },
  dateMon: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  bannerText: { flex: 1 },
  eventTitle: { fontSize: 20, fontWeight: '800', color: theme.textMain, lineHeight: 26, marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  metaTxt: { fontSize: 13, fontWeight: '600', marginLeft: 4 },
  durationTxt: { fontSize: 13, color: theme.textTertiary },

  infoCard: {
    backgroundColor: theme.card, borderRadius: 16,
    borderWidth: 1, borderColor: theme.cardAccent,
    paddingVertical: 4, marginBottom: 20,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  infoIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  infoTextBlock: { flex: 1 },
  infoLabel: { fontSize: 11, color: theme.textSub, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  infoValue: { fontSize: 15, color: theme.textMain, fontWeight: '500' },
  divider: { height: 1, backgroundColor: theme.cardAccent, marginHorizontal: 14 },

  sectionTitle: { fontSize: 14, fontWeight: '800', color: theme.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },

  descCard: {
    backgroundColor: theme.card, borderRadius: 14,
    borderWidth: 1, borderColor: theme.cardAccent,
    padding: 16, marginBottom: 20,
  },
  descText: { fontSize: 15, color: theme.textSub, lineHeight: 24 },

  calBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1, borderRadius: 14,
    paddingVertical: 14, marginBottom: 28,
    backgroundColor: theme.primaryAction + '0F', // Adds a very light tint based on the primary action
  },
  calBtnText: { fontSize: 15, fontWeight: '700' },

  organizerCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.card, borderRadius: 16,
    borderWidth: 1, borderColor: theme.cardAccent,
    padding: 16, marginBottom: 24, gap: 14,
  },
  orgAvatar: {
    width: 48, height: 48, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center',
  },
  orgInfo: { flex: 1 },
  orgName: { fontSize: 16, fontWeight: '700', color: theme.textMain, marginBottom: 2 },
  orgPhone: { fontSize: 13, color: theme.textSub },
  orgNoPhone: { fontSize: 13, color: theme.textTertiary, fontStyle: 'italic' },
  contactBtns: { alignItems: 'center' },
  contactBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: theme.inputBg, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: theme.inputBorder,
  },

  ownerActions: { flexDirection: 'row', gap: 12 },
  editBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: theme.primaryAction + '15', borderRadius: 14,
    paddingVertical: 14, borderWidth: 1, borderColor: theme.primaryAction + '40',
  },
  editBtnText: { color: theme.primaryAccent, fontWeight: '700', fontSize: 15 },
  deleteBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: 14,
    paddingVertical: 14, borderWidth: 1, borderColor: '#ef444430',
  },
  deleteBtnText: { color: '#ef4444', fontWeight: '700', fontSize: 15 },
});

export default EventDetailsScreen;