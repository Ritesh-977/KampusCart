import React from 'react';
import { View, Text, ScrollView, Image, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const FEATURES = [
  { icon: 'pricetag-outline',        label: 'Buy & Sell',       desc: 'List and discover second-hand items across campus.' },
  { icon: 'heart-outline',           label: 'Wishlist',         desc: 'Save items you love and come back to them anytime.' },
  { icon: 'search-circle-outline',   label: 'Lost & Found',     desc: 'Post lost items or help others recover theirs.' },
  { icon: 'book-outline',            label: 'Study Materials',  desc: 'Share and access notes, papers & resources.' },
  { icon: 'calendar-outline',        label: 'Campus Events',    desc: 'Stay updated with fests, workshops and more.' },
  { icon: 'chatbubble-outline',      label: 'In-App Chat',      desc: 'Message sellers and buyers directly, no number sharing.' },
];

const AboutAppScreen = () => {
  const { theme } = useTheme();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero */}
      <View style={{ alignItems: 'center', paddingTop: 36, paddingBottom: 28, backgroundColor: theme.card, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4 }}>
        <View style={{ width: 80, height: 80, borderRadius: 22, backgroundColor: `${theme.primaryAction}18`, justifyContent: 'center', alignItems: 'center', marginBottom: 14 }}>
          <Ionicons name="storefront-outline" size={40} color={theme.primaryAction} />
        </View>
        <Text style={{ fontSize: 26, fontWeight: '900', color: theme.textMain, letterSpacing: 0.3 }}>KampusCart</Text>
        <Text style={{ fontSize: 13, color: theme.textSub, marginTop: 4, fontWeight: '600' }}>Version 1.0.0</Text>
        <Text style={{ fontSize: 14, color: theme.textTertiary, marginTop: 10, textAlign: 'center', paddingHorizontal: 32, lineHeight: 20 }}>
          The all-in-one campus marketplace built for students, by students.
        </Text>
      </View>

      {/* Features */}
      <View style={{ paddingHorizontal: 20, marginTop: 28 }}>
        <Text style={{ fontSize: 16, fontWeight: '800', color: theme.textMain, marginBottom: 16 }}>What KampusCart offers</Text>

        {FEATURES.map((f) => (
          <View key={f.label} style={{ flexDirection: 'row', alignItems: 'flex-start', backgroundColor: theme.card, borderRadius: 14, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: `${theme.primaryAction}18`, justifyContent: 'center', alignItems: 'center', marginRight: 14, flexShrink: 0 }}>
              <Ionicons name={f.icon} size={20} color={theme.primaryAction} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: theme.textMain, marginBottom: 2 }}>{f.label}</Text>
              <Text style={{ fontSize: 13, color: theme.textTertiary, lineHeight: 18 }}>{f.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Built with love */}
      <View style={{ marginHorizontal: 20, marginTop: 24, backgroundColor: theme.card, borderRadius: 14, padding: 18, alignItems: 'center' }}>
        <Ionicons name="heart" size={22} color="#f87171" style={{ marginBottom: 8 }} />
        <Text style={{ fontSize: 14, color: theme.textTertiary, textAlign: 'center', lineHeight: 20 }}>
          Built with love for students who want a smarter campus experience.
        </Text>
        <Text style={{ fontSize: 12, color: theme.textTertiary, marginTop: 10 }}>© 2025 KampusCart. All rights reserved.</Text>
      </View>
    </ScrollView>
  );
};

export default AboutAppScreen;
