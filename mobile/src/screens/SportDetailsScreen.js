import React, { useState, useContext, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  StatusBar, ScrollView, Alert, Image, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import API from '../api/axios';
import { useThemeStyles } from '../hooks/useThemeStyles'; // <-- Update path as needed

const SPORT_EMOJI = {
  Cricket: '🏏', Football: '⚽', Basketball: '🏀', Volleyball: '🏐',
  Badminton: '🏸', 'Table Tennis': '🏓', Chess: '♟️',
  Athletics: '🏃', Kabaddi: '🤼', Other: '🏆',
};

const fmtFull  = (iso) => new Date(iso).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const fmtShort = (iso) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

// Passed styles and colors as props to access the dynamic theme
const InfoRow = ({ icon, label, value, actionNode, styles, colors }) => (
  <View style={styles.infoRow}>
    <View style={styles.infoIcon}>
      <Ionicons name={icon} size={15} color={colors.primaryAccent} />
    </View>
    <View style={styles.infoTexts}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
    {actionNode && <View style={styles.infoActionBox}>{actionNode}</View>}
  </View>
);

const SportDetailsScreen = ({ navigation, route }) => {
  // 1. Initialize dynamic theme hook
  const { styles, colors } = useThemeStyles(createStyles);

  const { sport: init } = route.params;
  const [sport, setSport] = useState(init);
  const { currentUser, isGuest } = useContext(AuthContext);

  // 1. Declare userId BEFORE the fetch effect so it can be used in the URL
  const userId = currentUser?._id || currentUser?.id;

  // ── Fetch fresh data when screen comes into focus ──
  useFocusEffect(
    useCallback(() => {
      const fetchFreshSportData = async () => {
        try {
          // Send userId in query to bypass public route middleware stripping!
          const res = await API.get(`/sports/${init._id}?userId=${userId || ''}`);
          if (res.data?.data) {
            setSport(res.data.data); 
          }
        } catch (error) {
          console.log("Could not refresh sport details");
        }
      };
      fetchFreshSportData();
    }, [init._id, userId])
  );

  // Bulletproof Organizer Check
  const orgId = sport.organizer?.user?._id || sport.organizer?.user || sport.organizer?._id || sport.organizer;
  const isOrganizer = !isGuest && !!userId && !!orgId && String(orgId) === String(userId);

  const deadlinePassed = new Date(sport.lastRegistrationDate) < new Date();
  const canRegister    = !isGuest && sport.isOpen && !deadlinePassed;
  const isClosed       = !sport.isOpen || deadlinePassed;
  const emoji          = SPORT_EMOJI[sport.sportType] || '🏆';

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

  const goToRegistrations = () =>
    navigation.navigate('SportRegistrations', {
      sportId: sport._id,
      sportTitle: sport.title,
    });

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.header} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{sport.title}</Text>

        {/* Edit + Delete — organizer only */}
        {isOrganizer ? (
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => navigation.navigate('PostSport', { sport })}
              style={styles.iconBtn}
            >
              <Ionicons name="pencil" size={18} color={colors.primaryAccent} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDelete} style={styles.iconBtn}>
              <Ionicons name="trash-outline" size={18} color="#ef4444" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Banner ── */}
        <View style={styles.banner}>
          <Text style={styles.bannerEmoji}>{emoji}</Text>
          <View style={styles.bannerInfo}>
            <View style={styles.typeBadge}>
              <Text style={styles.typeText}>{sport.sportType}</Text>
            </View>
            <Text style={styles.bannerTitle}>{sport.title}</Text>
            <View style={[styles.openBadge, isClosed ? styles.badgeRed : styles.badgeGreen]}>
              <Text style={[styles.openTxt, { color: isClosed ? '#ef4444' : '#34d399' }]}>
                {isClosed ? '● Registration Closed' : '● Registration Open'}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Details ── */}
        <View style={styles.section}>
          <InfoRow styles={styles} colors={colors} icon="calendar-outline" label="Event Date"            value={fmtFull(sport.eventDate)} />
          <InfoRow styles={styles} colors={colors} icon="location-outline" label="Venue"                 value={sport.venue} />
          <InfoRow styles={styles} colors={colors} icon="time-outline"     label="Registration Deadline" value={fmtShort(sport.lastRegistrationDate)} />
          <InfoRow styles={styles} colors={colors}
            icon="people-outline"
            label="Team Size"
            value={sport.teamSize === 1 ? 'Individual' : `${sport.teamSize} players per team`}
          />
          {!!sport.maxTeams && (
            <InfoRow styles={styles} colors={colors} icon="list-outline" label="Max Teams" value={`${sport.maxTeams} teams`} />
          )}
          <InfoRow styles={styles} colors={colors}
            icon="cash-outline"
            label="Registration Fee"
            value={sport.registrationFee > 0 ? `₹${sport.registrationFee}` : 'Free'}
          />
          {(sport.registrationCount !== undefined || isOrganizer) && (
            <InfoRow styles={styles} colors={colors}
              icon="checkmark-circle-outline"
              label="Teams Registered"
              value={`${sport.registrationCount || 0} team${sport.registrationCount !== 1 ? 's' : ''}`}
              actionNode={
                isOrganizer ? (
                  <TouchableOpacity style={styles.viewTeamsBtn} onPress={goToRegistrations}>
                    <Text style={styles.viewTeamsTxt}>View</Text>
                    <Ionicons name="chevron-forward" size={14} color={colors.primaryAccent} />
                  </TouchableOpacity>
                ) : null
              }
            />
          )}
        </View>

        {/* ── Description ── */}
        {!!sport.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.bodyText}>{sport.description}</Text>
          </View>
        )}

        {/* ── Rules ── */}
        {!!sport.rules && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rules & Guidelines</Text>
            <Text style={styles.bodyText}>{sport.rules}</Text>
          </View>
        )}

        {/* ── Payment QR ── */}
        {sport.registrationFee > 0 && !!sport.qrCodeUrl && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment QR Code</Text>
            <Text style={styles.qrSub}>Scan to pay ₹{sport.registrationFee} registration fee</Text>
            <View style={styles.qrWrapper}>
              <Image source={{ uri: sport.qrCodeUrl }} style={styles.qrImage} resizeMode="contain" />
            </View>
            <Text style={styles.qrNote}>
              After payment, attach the screenshot as payment proof when registering.
            </Text>
          </View>
        )}

        {/* ── Organizer ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Organizer</Text>
          <View style={styles.orgCard}>
            <View style={styles.orgAvatar}>
              <Ionicons name="person" size={20} color={colors.primaryAccent} />
            </View>
            <View style={styles.orgInfo}>
              <Text style={styles.orgName}>{sport.organizer?.name}</Text>
              {!!sport.organizer?.phone && (
                <View style={styles.orgBtns}>
                  <TouchableOpacity
                    style={styles.orgBtn}
                    onPress={() => Linking.openURL(`tel:${sport.organizer.phone}`)}
                  >
                    <Ionicons name="call-outline" size={14} color="#34d399" />
                    <Text style={[styles.orgBtnTxt, { color: '#34d399' }]}>Call</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.orgBtn}
                    onPress={() => Linking.openURL(`https://wa.me/${sport.organizer.phone.replace(/\D/g, '')}`)}
                  >
                    <Ionicons name="logo-whatsapp" size={14} color="#25d366" />
                    <Text style={[styles.orgBtnTxt, { color: '#25d366' }]}>WhatsApp</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* ── View All Registrations button (organizer only) ── */}
        {isOrganizer && (
          <TouchableOpacity style={styles.viewRegsBtn} onPress={goToRegistrations}>
            <Ionicons name="people" size={18} color="#ffffff" />
            <Text style={styles.viewRegsTxt}>View All Registrations</Text>
          </TouchableOpacity>
        )}

        {/* ── Register button (non-organizer) ── */}
        {!isOrganizer && (
          <TouchableOpacity
            style={[
              styles.registerBtn, 
              (!canRegister || sport.hasRegistered) && styles.registerBtnOff // Grays out if closed OR already registered
            ]}
            onPress={() => {
              if (isGuest) {
                Alert.alert('Login Required', 'Please log in to register for sports.');
                return;
              }
              if (sport.hasRegistered) return; // Prevent clicking if already registered
              if (!canRegister) return;
              
              navigation.navigate('SportRegistration', { sport });
            }}
            disabled={sport.hasRegistered} // Native lock
          >
            <Ionicons
              name={
                sport.hasRegistered ? 'checkmark-circle' : // Checkmark if registered
                canRegister ? 'trophy-outline' :           // Trophy if open
                'lock-closed-outline'                      // Lock if closed
              }
              size={18}
              color="#ffffff"
            />
            <Text style={styles.registerBtnTxt}>
              {isGuest
                ? 'Login to Register'
                : sport.hasRegistered
                  ? 'Registered'           // <-- Shows "Registered" text!
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

// ─── Theme-Aware Style Generator ─────────────────────────────────────────────
const createStyles = (theme) => StyleSheet.create({
  safe:          { flex: 1, backgroundColor: theme.background },
  header:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.headerDivider, marginTop: 26, backgroundColor: theme.header },
  iconBtn:       { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle:   { flex: 1, color: theme.textMain, fontSize: 16, fontWeight: '700', marginHorizontal: 4 },
  headerActions: { flexDirection: 'row' },
  scroll:        { flex: 1 },
  content:       { padding: 16 },

  // Banner
  banner:      { flexDirection: 'row', gap: 14, backgroundColor: theme.card, borderRadius: 20, padding: 18, marginBottom: 12, alignItems: 'flex-start', borderWidth: 1, borderColor: theme.cardAccent },
  bannerEmoji: { fontSize: 48, lineHeight: 56 },
  bannerInfo:  { flex: 1, gap: 6 },
  typeBadge:   { alignSelf: 'flex-start', borderWidth: 1, borderColor: theme.primaryAction + '40', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  typeText:    { fontSize: 11, color: theme.primaryAccent, fontWeight: '700', textTransform: 'uppercase' },
  bannerTitle: { fontSize: 17, fontWeight: '800', color: theme.textMain, lineHeight: 24 },
  
  // Semantic Open/Closed Badges (Kept semantic red/green)
  openBadge:   { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  badgeGreen:  { borderColor: '#34d39940', backgroundColor: 'rgba(52,211,153,0.08)' },
  badgeRed:    { borderColor: '#ef444440', backgroundColor: 'rgba(239,68,68,0.08)' },
  openTxt:     { fontSize: 11, fontWeight: '700' },

  // Section card
  section:      { backgroundColor: theme.card, borderRadius: 16, padding: 16, marginBottom: 12, gap: 12, borderWidth: 1, borderColor: theme.cardAccent },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: theme.primaryAccent },
  bodyText:     { fontSize: 14, color: theme.textSub, lineHeight: 22 },

  // Info row
  infoRow:       { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoIcon:      { width: 30, height: 30, borderRadius: 8, backgroundColor: theme.primaryAction + '1A', justifyContent: 'center', alignItems: 'center' },
  infoTexts:     { flex: 1 },
  infoLabel:     { fontSize: 10, color: theme.textTertiary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  infoValue:     { fontSize: 14, color: theme.textMain, fontWeight: '600', marginTop: 1 },
  infoActionBox: { justifyContent: 'center' },

  // Inline "View" button on Teams Registered row
  viewTeamsBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.primaryAction + '26', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, gap: 2 },
  viewTeamsTxt: { color: theme.primaryAccent, fontSize: 12, fontWeight: '700' },

  // QR
  qrSub:     { fontSize: 12, color: theme.textSub, marginTop: -6 },
  qrWrapper: { alignItems: 'center', padding: 16, backgroundColor: '#ffffff', borderRadius: 14 }, // QR backgrounds should always be white for scanning reliability
  qrImage:   { width: 200, height: 200 },
  qrNote:    { fontSize: 12, color: '#fbbf24', textAlign: 'center', lineHeight: 18 }, // Semantic warning yellow

  // Organizer
  orgCard:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  orgAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.primaryAction + '1A', justifyContent: 'center', alignItems: 'center' },
  orgInfo:   { flex: 1 },
  orgName:   { fontSize: 15, fontWeight: '700', color: theme.textMain, marginBottom: 6 },
  orgBtns:   { flexDirection: 'row', gap: 8 },
  orgBtn:    { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, backgroundColor: theme.background, borderWidth: 1, borderColor: theme.cardAccent },
  orgBtnTxt: { fontSize: 12, fontWeight: '600' },

  // View all registrations button
  viewRegsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.secondaryAction, paddingVertical: 14, borderRadius: 14, marginBottom: 12 },
  viewRegsTxt: { color: '#ffffff', fontWeight: '700', fontSize: 15 },

  // Register button
  registerBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.primaryAction, paddingVertical: 16, borderRadius: 14 },
  registerBtnOff: { backgroundColor: theme.cardAccent }, // Grey out when closed/registered
  registerBtnTxt: { color: '#ffffff', fontWeight: '800', fontSize: 16 },
});