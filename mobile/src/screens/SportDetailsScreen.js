import React, { useState, useContext } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  StatusBar, ScrollView, Alert, Image, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import API from '../api/axios';

const SPORT_EMOJI = {
  Cricket: '🏏', Football: '⚽', Basketball: '🏀', Volleyball: '🏐',
  Badminton: '🏸', 'Table Tennis': '🏓', Chess: '♟️',
  Athletics: '🏃', Kabaddi: '🤼', Other: '🏆',
};

const fmtFull  = (iso) => new Date(iso).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const fmtShort = (iso) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

// ── Info row inside a section card ───────────────────────────────────────────
const InfoRow = ({ icon, label, value }) => (
  <View style={s.infoRow}>
    <View style={s.infoIcon}>
      <Ionicons name={icon} size={15} color="#818cf8" />
    </View>
    <View style={s.infoTexts}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue}>{value}</Text>
    </View>
  </View>
);

// ── Screen ────────────────────────────────────────────────────────────────────
const SportDetailsScreen = ({ navigation, route }) => {
  const { sport: init } = route.params;
  const [sport, setSport]   = useState(init);
  const { currentUser, isGuest } = useContext(AuthContext);

  const userId        = currentUser?._id || currentUser?.id;
  const isOrganizer   = !isGuest && !!userId && String(sport.organizer?.user) === String(userId);
  const deadlinePassed = new Date(sport.lastRegistrationDate) < new Date();
  const canRegister   = !isGuest && sport.isOpen && !deadlinePassed;
  const isClosed      = !sport.isOpen || deadlinePassed;
  const emoji         = SPORT_EMOJI[sport.sportType] || '🏆';

  const handleDelete = () => {
    Alert.alert(
      'Delete Sport Event',
      'This will also delete all registrations. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              await API.delete(`/sports/${sport._id}`);
              navigation.goBack();
            } catch {
              Alert.alert('Error', 'Could not delete. Try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.iconBtn}>
          <Ionicons name="arrow-back" size={22} color="#f1f5f9" />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>{sport.title}</Text>
        {isOrganizer && (
          <View style={s.headerActions}>
            <TouchableOpacity
              onPress={() => navigation.navigate('PostSport', { sport })}
              style={s.iconBtn}
            >
              <Ionicons name="pencil" size={18} color="#818cf8" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDelete} style={s.iconBtn}>
              <Ionicons name="trash-outline" size={18} color="#ef4444" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* ── Banner ── */}
        <View style={s.banner}>
          <Text style={s.bannerEmoji}>{emoji}</Text>
          <View style={s.bannerInfo}>
            <View style={s.typeBadge}>
              <Text style={s.typeText}>{sport.sportType}</Text>
            </View>
            <Text style={s.bannerTitle}>{sport.title}</Text>
            <View style={[s.openBadge, isClosed ? s.badgeRed : s.badgeGreen]}>
              <Text style={[s.openTxt, { color: isClosed ? '#ef4444' : '#34d399' }]}>
                {isClosed ? '● Registration Closed' : '● Registration Open'}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Details ── */}
        <View style={s.section}>
          <InfoRow icon="calendar-outline"      label="Event Date"             value={fmtFull(sport.eventDate)} />
          <InfoRow icon="location-outline"      label="Venue"                  value={sport.venue} />
          <InfoRow icon="time-outline"          label="Registration Deadline"  value={fmtShort(sport.lastRegistrationDate)} />
          <InfoRow icon="people-outline"        label="Team Size"
            value={sport.teamSize === 1 ? 'Individual' : `${sport.teamSize} players per team`}
          />
          {sport.maxTeams && (
            <InfoRow icon="list-outline" label="Max Teams" value={`${sport.maxTeams} teams`} />
          )}
          <InfoRow icon="cash-outline" label="Registration Fee"
            value={sport.registrationFee > 0 ? `₹${sport.registrationFee}` : 'Free'}
          />
          {sport.registrationCount !== undefined && (
            isOrganizer ? (
              <TouchableOpacity
                style={s.regsRow}
                onPress={() => navigation.navigate('SportRegistrations', {
                  sportId: sport._id,
                  sportTitle: sport.title,
                })}
                activeOpacity={0.7}
              >
                <View style={s.infoIcon}>
                  <Ionicons name="checkmark-circle-outline" size={15} color="#818cf8" />
                </View>
                <View style={s.infoTexts}>
                  <Text style={s.infoLabel}>Teams Registered</Text>
                  <Text style={s.infoValue}>
                    {sport.registrationCount} team{sport.registrationCount !== 1 ? 's' : ''}
                  </Text>
                </View>
                <View style={s.viewRegsPill}>
                  <Text style={s.viewRegsPillTxt}>View →</Text>
                </View>
              </TouchableOpacity>
            ) : (
              <InfoRow icon="checkmark-circle-outline" label="Teams Registered"
                value={`${sport.registrationCount} team${sport.registrationCount !== 1 ? 's' : ''}`}
              />
            )
          )}
        </View>

        {/* ── Description ── */}
        {!!sport.description && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>About</Text>
            <Text style={s.bodyText}>{sport.description}</Text>
          </View>
        )}

        {/* ── Rules ── */}
        {!!sport.rules && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Rules & Guidelines</Text>
            <Text style={s.bodyText}>{sport.rules}</Text>
          </View>
        )}

        {/* ── Payment QR ── */}
        {sport.registrationFee > 0 && !!sport.qrCodeUrl && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Payment QR Code</Text>
            <Text style={s.qrSub}>Scan to pay ₹{sport.registrationFee} registration fee</Text>
            <View style={s.qrWrapper}>
              <Image source={{ uri: sport.qrCodeUrl }} style={s.qrImage} resizeMode="contain" />
            </View>
            <Text style={s.qrNote}>
              After payment, attach the screenshot as payment proof when registering.
            </Text>
          </View>
        )}

        {/* ── Organizer ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Organizer</Text>
          <View style={s.orgCard}>
            <View style={s.orgAvatar}>
              <Ionicons name="person" size={20} color="#818cf8" />
            </View>
            <View style={s.orgInfo}>
              <Text style={s.orgName}>{sport.organizer?.name}</Text>
              {!!sport.organizer?.phone && (
                <View style={s.orgBtns}>
                  <TouchableOpacity
                    style={s.orgBtn}
                    onPress={() => Linking.openURL(`tel:${sport.organizer.phone}`)}
                  >
                    <Ionicons name="call-outline" size={14} color="#34d399" />
                    <Text style={[s.orgBtnTxt, { color: '#34d399' }]}>Call</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.orgBtn}
                    onPress={() => Linking.openURL(`https://wa.me/${sport.organizer.phone.replace(/\D/g, '')}`)}
                  >
                    <Ionicons name="logo-whatsapp" size={14} color="#25d366" />
                    <Text style={[s.orgBtnTxt, { color: '#25d366' }]}>WhatsApp</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* ── Organizer: view registrations ── */}
        {isOrganizer && (
          <TouchableOpacity
            style={s.viewRegsBtn}
            onPress={() => navigation.navigate('SportRegistrations', {
              sportId: sport._id,
              sportTitle: sport.title,
            })}
          >
            <Ionicons name="people" size={18} color="#fff" />
            <Text style={s.viewRegsTxt}>View All Registrations</Text>
          </TouchableOpacity>
        )}

        {/* ── Register button ── */}
        {!isOrganizer && (
          <TouchableOpacity
            style={[s.registerBtn, !canRegister && s.registerBtnOff]}
            onPress={() => {
              if (isGuest) {
                Alert.alert('Login Required', 'Please log in to register for sports.');
                return;
              }
              if (!canRegister) return;
              navigation.navigate('SportRegistration', { sport });
            }}
          >
            <Ionicons
              name={canRegister ? 'trophy-outline' : 'lock-closed-outline'}
              size={18}
              color="#fff"
            />
            <Text style={s.registerBtnTxt}>
              {isGuest
                ? 'Login to Register'
                : canRegister
                  ? 'Register Now'
                  : 'Registration Closed'}
            </Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default SportDetailsScreen;

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: '#0f172a' },
  header:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  iconBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle:   { flex: 1, color: '#f1f5f9', fontSize: 16, fontWeight: '700', marginHorizontal: 4 },
  headerActions: { flexDirection: 'row' },
  scroll:  { flex: 1 },
  content: { padding: 16 },

  // Banner
  banner:      { flexDirection: 'row', gap: 14, backgroundColor: '#1e293b', borderRadius: 20, padding: 18, marginBottom: 12, alignItems: 'flex-start' },
  bannerEmoji: { fontSize: 48, lineHeight: 56 },
  bannerInfo:  { flex: 1, gap: 6 },
  typeBadge:   { alignSelf: 'flex-start', borderWidth: 1, borderColor: '#818cf840', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  typeText:    { fontSize: 11, color: '#818cf8', fontWeight: '700', textTransform: 'uppercase' },
  bannerTitle: { fontSize: 17, fontWeight: '800', color: '#f1f5f9', lineHeight: 24 },
  openBadge:   { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  badgeGreen:  { borderColor: '#34d39940', backgroundColor: 'rgba(52,211,153,0.08)' },
  badgeRed:    { borderColor: '#ef444440', backgroundColor: 'rgba(239,68,68,0.08)' },
  openTxt:     { fontSize: 11, fontWeight: '700' },

  // Section card
  section:      { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, marginBottom: 12, gap: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: '#818cf8' },
  bodyText:     { fontSize: 14, color: '#94a3b8', lineHeight: 22 },

  // Info row
  infoRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  infoIcon:   { width: 30, height: 30, borderRadius: 8, backgroundColor: 'rgba(129,140,248,0.1)', justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  infoTexts:  { flex: 1 },
  infoLabel:  { fontSize: 10, color: '#475569', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  infoValue:  { fontSize: 14, color: '#f1f5f9', fontWeight: '600', marginTop: 1 },

  // QR
  qrSub:     { fontSize: 12, color: '#64748b', marginTop: -6 },
  qrWrapper: { alignItems: 'center', padding: 16, backgroundColor: '#fff', borderRadius: 14 },
  qrImage:   { width: 200, height: 200 },
  qrNote:    { fontSize: 12, color: '#fbbf24', textAlign: 'center', lineHeight: 18 },

  // Organizer
  orgCard:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  orgAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(129,140,248,0.12)', justifyContent: 'center', alignItems: 'center' },
  orgInfo:   { flex: 1 },
  orgName:   { fontSize: 15, fontWeight: '700', color: '#f1f5f9', marginBottom: 6 },
  orgBtns:   { flexDirection: 'row', gap: 8 },
  orgBtn:    { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, backgroundColor: '#0f172a' },
  orgBtnTxt: { fontSize: 12, fontWeight: '600' },

  // Tappable registrations row (organizer)
  regsRow:        { flexDirection: 'row', alignItems: 'center', gap: 10 },
  viewRegsPill:   { backgroundColor: 'rgba(129,140,248,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  viewRegsPillTxt: { fontSize: 12, color: '#818cf8', fontWeight: '700' },

  // Action buttons
  viewRegsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#1e40af', paddingVertical: 14, borderRadius: 14, marginBottom: 12 },
  viewRegsTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
  registerBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#818cf8', paddingVertical: 16, borderRadius: 14 },
  registerBtnOff: { backgroundColor: '#334155' },
  registerBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
