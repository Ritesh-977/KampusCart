import React, { useMemo } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';
import ProfileScreen from '../screens/ProfileScreen';
import EditItemScreen from '../screens/EditItemScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import WishlistScreen from '../screens/WishlistScreen';
import LostFoundScreen from '../screens/LostFoundScreen';
import ItemDetailsScreen from '../screens/ItemDetailsScreen';

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
    </Stack.Navigator>
  );
};

export default ProfileStackNavigator;
