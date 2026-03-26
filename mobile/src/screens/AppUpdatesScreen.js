import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking, Platform} from 'react-native';
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
      { icon: 'trophy-outline',            text: 'Sports registrations' },
      { icon: 'moon-outline',              text: 'Dynamic theme support (Dark & Classic)' },
      { icon: 'person-outline',            text: 'Profile management with cover & avatar photos' },
    ],
  },
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
          See what's new in KampusCart and how we are improving your campus experience.
        </Text>
      </View>

      <View style={{ paddingHorizontal: 20 }}>
        {/* Changelog */}
        {UPDATES.map((update) => (
          <View key={update.version} style={{ backgroundColor: theme.card, borderRadius: 16, padding: 18, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3 }}>
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

        {/* NEW: Join the Community Card */}
        <TouchableOpacity 
          style={{ backgroundColor: theme.card, borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}
          onPress={() => Linking.openURL('https://instagram.com/kampuscart')}
        >
          {/* Swapped to Instagram logo with classic IG Pink/Magenta coloring */}
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(225, 48, 108, 0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 14 }}>
            <Ionicons name="logo-instagram" size={22} color="#e1306c" /> 
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: theme.textMain, marginBottom: 2 }}>Join the Community</Text>
            <Text style={{ fontSize: 12, color: theme.textTertiary, lineHeight: 18 }}>Follow us on Instagram for campus drops and updates.</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.textTertiary} />
        </TouchableOpacity>

        {/* NEW: Rate the App Card */}
        <TouchableOpacity 
          style={{ backgroundColor: theme.card, borderRadius: 16, padding: 16, marginBottom: 24, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}
          onPress={() => {
            // 🛑 REMEMBER TO REPLACE THESE WITH YOUR ACTUAL APP IDs!
            const androidPackageName = 'com.kampuscart.app'; 
            const iosAppId = '1234567890'; 

            // Native store links
            const storeUrl = Platform.OS === 'ios' 
              ? `itms-apps://itunes.apple.com/app/viewContentsUserReviews?id=${iosAppId}&action=write-review` 
              : `market://details?id=${androidPackageName}`;

            // Fallback web links (just in case the native app store won't open)
            const webUrl = Platform.OS === 'ios'
              ? `https://apps.apple.com/app/id${iosAppId}?action=write-review`
              : `https://play.google.com/store/apps/details?id=${androidPackageName}`;

            Linking.canOpenURL(storeUrl).then(supported => {
              if (supported) {
                Linking.openURL(storeUrl);
              } else {
                Linking.openURL(webUrl);
              }
            });
          }}
        >
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(251, 191, 36, 0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 14 }}>
            <Ionicons name="star" size={22} color="#fbbf24" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: theme.textMain, marginBottom: 2 }}>Love KampusCart?</Text>
            <Text style={{ fontSize: 12, color: theme.textTertiary, lineHeight: 18 }}>Leave a rating to help us grow on campus.</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.textTertiary} />
        </TouchableOpacity>

        <Text style={{ fontSize: 12, color: theme.textTertiary, textAlign: 'center', marginTop: 4, lineHeight: 18 }}>
          Suggestions or bugs? Write to us at{'\n'}
          <Text style={{ color: theme.primaryAction, fontWeight: '600' }}>feedback@kampuscart.site</Text>
        </Text>
      </View>
    </ScrollView>
  );
};

export default AppUpdatesScreen;