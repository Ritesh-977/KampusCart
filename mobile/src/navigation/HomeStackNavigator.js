import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import ItemDetailsScreen from '../screens/ItemDetailsScreen';

const Stack = createNativeStackNavigator();

const HomeStackNavigator = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="HomeFeed" 
        component={HomeScreen} 
        options={{ headerShown: false }} // We built a custom header in HomeScreen
      />
      <Stack.Screen 
        name="ItemDetails" 
        component={ItemDetailsScreen} 
        options={{ title: 'Details', headerBackTitle: 'Back' }} // Adds a nice back button at the top!
      />
    </Stack.Navigator>
  );
};

export default HomeStackNavigator;