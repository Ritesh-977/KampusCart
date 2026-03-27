import React, { useMemo } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';
import ProfileScreen from '../screens/ProfileScreen';
import EditItemScreen from '../screens/EditItemScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import WishlistScreen from '../screens/WishlistScreen';
import LostFoundScreen from '../screens/LostFoundScreen';
import ItemDetailsScreen from '../screens/ItemDetailsScreen';
import AboutAppScreen from '../screens/AboutAppScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';
import TermsOfUseScreen from '../screens/TermsOfUseScreen';
import AppUpdatesScreen from '../screens/AppUpdatesScreen';
import FeedbackScreen from '../screens/FeedbackScreen';
import ContactUsScreen from '../screens/ContactUsScreen';
import NotificationSettingsScreen from '../screens/NotificationSettingsScreen';

const Stack = createNativeStackNavigator();

const ProfileStackNavigator = () => {
  const { theme } = useTheme();
  const navOptions = useMemo(() => ({
    headerStyle: { backgroundColor: theme.header },
    headerTintColor: theme.textMain,
    headerTitleStyle: { fontWeight: '700', color: theme.textMain },
    headerShadowVisible: false,
  }), [theme]);

  return (
    <Stack.Navigator screenOptions={navOptions}>
      <Stack.Screen
        name="ProfileMain"
        component={ProfileScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="EditItem"
        component={EditItemScreen}
        options={{ title: 'Manage Listing', headerBackTitle: 'Back' }}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ title: 'Edit Profile', headerBackTitle: 'Back' }}
      />
      <Stack.Screen
        name="Wishlist"
        component={WishlistScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="LostFound"
        component={LostFoundScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ItemDetails"
        component={ItemDetailsScreen}
        options={{ title: 'Item Details', headerBackTitle: 'Back' }}
      />
      <Stack.Screen
        name="AboutApp"
        component={AboutAppScreen}
        options={{ title: 'About App', headerBackTitle: 'Back' }}
      />
      <Stack.Screen
        name="PrivacyPolicy"
        component={PrivacyPolicyScreen}
        options={{ title: 'Privacy Policy', headerBackTitle: 'Back' }}
      />
      <Stack.Screen
        name="TermsOfUse"
        component={TermsOfUseScreen}
        options={{ title: 'Terms of Use', headerBackTitle: 'Back' }}
      />
      <Stack.Screen
        name="AppUpdates"
        component={AppUpdatesScreen}
        options={{ title: 'App Updates', headerBackTitle: 'Back' }}
      />
      <Stack.Screen
        name="Feedback"
        component={FeedbackScreen}
        options={{ title: 'Feedback', headerBackTitle: 'Back' }}
      />
      <Stack.Screen
        name="ContactUs"
        component={ContactUsScreen}
        options={{ title: 'Contact Us', headerBackTitle: 'Back' }}
      />
      <Stack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

export default ProfileStackNavigator;
