import React, { useMemo } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';
import HomeScreen from '../screens/HomeScreen';
import ItemDetailsScreen from '../screens/ItemDetailsScreen';
import LostFoundScreen from '../screens/LostFoundScreen';
import EventsScreen from '../screens/EventsScreen';
import EventDetailsScreen from '../screens/EventDetailsScreen';
import PostEventScreen from '../screens/PostEventScreen';
import StudyMaterialsScreen from '../screens/StudyMaterialsScreen';
import UploadMaterialScreen from '../screens/UploadMaterialScreen';
import MaterialViewerScreen from '../screens/MaterialViewerScreen';
import SportsScreen from '../screens/SportsScreen';
import SportDetailsScreen from '../screens/SportDetailsScreen';
import PostSportScreen from '../screens/PostSportScreen';
import SportRegistrationScreen from '../screens/SportRegistrationScreen';
import SportRegistrationsListScreen from '../screens/SportRegistrationsListScreen';

const Stack = createNativeStackNavigator();

const HomeStackNavigator = () => {
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
        name="HomeFeed"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ItemDetails"
        component={ItemDetailsScreen}
        options={{ title: 'Item Details', headerBackTitle: 'Back' }}
      />
      <Stack.Screen
        name="LostFound"
        component={LostFoundScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Events"
        component={EventsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="EventDetails"
        component={EventDetailsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PostEvent"
        component={PostEventScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="StudyMaterials"
        component={StudyMaterialsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="UploadMaterial"
        component={UploadMaterialScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="MaterialViewer"
        component={MaterialViewerScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="Sports"             component={SportsScreen}                options={{ headerShown: false }} />
      <Stack.Screen name="SportDetails"       component={SportDetailsScreen}          options={{ headerShown: false }} />
      <Stack.Screen name="PostSport"          component={PostSportScreen}             options={{ headerShown: false }} />
      <Stack.Screen name="SportRegistration"  component={SportRegistrationScreen}     options={{ headerShown: false }} />
      <Stack.Screen name="SportRegistrations" component={SportRegistrationsListScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
};

export default HomeStackNavigator;
