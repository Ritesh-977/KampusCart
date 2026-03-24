import React, { useMemo } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';
import ChatListScreen from '../screens/ChatListScreen';
import ChatScreen from '../screens/ChatScreen';

const Stack = createNativeStackNavigator();

const ChatStackNavigator = () => {
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
        name="ChatList"
        component={ChatListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ChatRoom"
        component={ChatScreen}
        options={({ route }) => ({
          title: route.params?.otherUser?.name || 'Chat',
          headerBackTitle: 'Back',
        })}
      />
    </Stack.Navigator>
  );
};

export default ChatStackNavigator;
