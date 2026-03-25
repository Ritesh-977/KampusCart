import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const UPDATES = [
  {
    version: 'v1.0.0',
    date: 'March 2025',
    label: 'Latest',
    labelColor: '#34d399',
    labelBg: 'rgba(52,211,153,0.15)',
    changes: [
      { icon: 'storefront-outline',        text: 'Launch of KampusCart marketplace' },
      { icon: 'chatbubble-outline',        text: 'Real-time in-app chat between buyers & sellers' },
      { icon: 'heart-outline',             text: 'Wishlist — save items for later' },
      { icon: 'search-circle-outline',     text: 'Lost & Found board for campus items' },
      { icon: 'book-outline',              text: 'Study Materials — share notes and exam papers' },
      { icon: 'calendar-outline',          text: 'Campus Events discovery and registration' },
      { icon: 'trophy-outline',            text: 'Sports registrations and results tracking' },
      { icon: 'moon-outline',              text: 'Dynamic theme support (Dark & Classic)' },
      { icon: 'person-outline',            text: 'Profile management with cover & avatar photos' },
    ],
  },
];

const COMING_SOON = [
  { icon: 'notifications-outline',    text: 'Push notifications for new messages and price drops' },
  { icon: 'star-outline',             text: 'Ratings and reviews for sellers' },
  { icon: 'card-outline',             text: 'In-app payment integration' },
  { icon: 'people-outline',           text: 'Campus community groups and forums' },
  { icon: 'bicycle-outline',          text: 'Ride-sharing and carpooling board' },
];

const AppUpdatesScreen = () => {
  const { theme } = useTheme();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header card */}
      <View style={{ backgroundColor: theme.card, paddingHorizontal: 20, paddingTop: 28, paddingBottom: 24, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 }}>
        <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(167,139,250,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
          <Ionicons name="cloud-download-outline" size={26} color="#a78bfa" />
        </View>
        <Text style={{ fontSize: 22, fontWeight: '900', color: theme.textMain, marginBottom: 6 }}>App Updates</Text>
        <Text style={{ fontSize: 13, color: theme.textTertiary, lineHeight: 19 }}>
          See what's new in KampusCart and what's coming next.
        </Text>
      </View>

      <View style={{ paddingHorizontal: 20 }}>
        {/* Changelog */}
        {UPDATES.map((update) => (
          <View key={update.version} style={{ backgroundColor: theme.card, borderRadius: 16, padding: 18, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3 }}>
            {/* Version header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 18, fontWeight: '900', color: theme.textMain }}>{update.version}</Text>
                <Text style={{ fontSize: 12, color: theme.textTertiary, marginTop: 2 }}>{update.date}</Text>
              </View>
              <View style={{ backgroundColor: update.labelBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: update.labelColor }}>{update.label}</Text>
              </View>
            </View>

            <View style={{ height: 1, backgroundColor: theme.inputBorder, marginBottom: 14 }} />

            {update.changes.map((c, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 }}>
                <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(167,139,250,0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 12, flexShrink: 0 }}>
                  <Ionicons name={c.icon} size={15} color="#a78bfa" />
                </View>
                <Text style={{ flex: 1, fontSize: 13, color: theme.textBody || theme.textMain, lineHeight: 20, paddingTop: 5 }}>{c.text}</Text>
              </View>
            ))}
          </View>
        ))}

        {/* Coming soon */}
        <View style={{ backgroundColor: theme.card, borderRadius: 16, padding: 18, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: '900', color: theme.textMain }}>Coming Soon</Text>
              <Text style={{ fontSize: 12, color: theme.textTertiary, marginTop: 2 }}>Planned features</Text>
            </View>
            <View style={{ backgroundColor: 'rgba(251,191,36,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#fbbf24' }}>Upcoming</Text>
            </View>
          </View>

          <View style={{ height: 1, backgroundColor: theme.inputBorder, marginBottom: 14 }} />

          {COMING_SOON.map((c, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 }}>
              <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(251,191,36,0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 12, flexShrink: 0 }}>
                <Ionicons name={c.icon} size={15} color="#fbbf24" />
              </View>
              <Text style={{ flex: 1, fontSize: 13, color: theme.textBody || theme.textMain, lineHeight: 20, paddingTop: 5 }}>{c.text}</Text>
            </View>
          ))}
        </View>

        <Text style={{ fontSize: 12, color: theme.textTertiary, textAlign: 'center', marginTop: 4, lineHeight: 18 }}>
          Suggestions? Write to us at{' '}
          <Text style={{ color: theme.primaryAction, fontWeight: '600' }}>feedback@kampuscart.in</Text>
        </Text>
      </View>
    </ScrollView>
  );
};

export default AppUpdatesScreen;
