import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import ItemDetailsScreen from '../screens/ItemDetailsScreen';
import LostFoundScreen from '../screens/LostFoundScreen';
import EventsScreen from '../screens/EventsScreen';
import EventDetailsScreen from '../screens/EventDetailsScreen';
import PostEventScreen from '../screens/PostEventScreen';
import StudyMaterialsScreen from '../screens/StudyMaterialsScreen';
import UploadMaterialScreen from '../screens/UploadMaterialScreen';
import MaterialViewerScreen from '../screens/MaterialViewerScreen';

const Stack = createNativeStackNavigator();

const HomeStackNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#0f172a' },
        headerTintColor: '#f1f5f9',
        headerTitleStyle: { fontWeight: '700', color: '#f1f5f9' },
        headerShadowVisible: false,
      }}
    >
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
    </Stack.Navigator>
  );
};

export default HomeStackNavigator;
