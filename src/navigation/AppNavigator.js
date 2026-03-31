import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import FeedScreen from '../screens/FeedScreen';
import PerfilScreen from '../screens/PerfilScreen';
import ChatsScreen from '../screens/ChatsScreen';
import ChatScreen from '../screens/ChatScreen';
import MapScreen from '../screens/MapScreen';
import { ui } from '../theme/colors';
import { loginAnonimo } from '../services/auth';
import { escucharMisChats } from '../services/chats';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function Tabs() {
  const [noLeidos, setNoLeidos] = useState(0);

  useEffect(() => {
    loginAnonimo().then(user => {
      if (!user) return;
      escucharMisChats(user.uid, (chats) => {
        const count = chats.filter(c => c.leido?.[user.uid] === false).length;
        setNoLeidos(count);
      });
    });
  }, []);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: ui.card, borderTopColor: ui.border },
        tabBarActiveTintColor: ui.accent,
        tabBarInactiveTintColor: ui.textMuted,
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen}
        options={{ tabBarLabel: 'Sentir', tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>🫀</Text> }} />
      <Tab.Screen name="Feed" component={FeedScreen}
        options={{ tabBarLabel: 'Mundo', tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>🌍</Text> }} />
      <Tab.Screen name="Map" component={MapScreen}
        options={{ tabBarLabel: 'Mapa', tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>🗺️</Text> }} />
      <Tab.Screen name="Chats" component={ChatsScreen}
        options={{
          tabBarLabel: 'Chats',
          tabBarIcon: ({ color }) => (
            <View style={{ position: 'relative' }}>
              <Text style={{ fontSize: 18, color }}>💬</Text>
              {noLeidos > 0 && (
                <View style={{
                  position: 'absolute', top: -4, right: -6,
                  backgroundColor: '#EF5350', borderRadius: 8,
                  minWidth: 16, height: 16, alignItems: 'center',
                  justifyContent: 'center', paddingHorizontal: 3,
                }}>
                  <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>
                    {noLeidos > 9 ? '9+' : noLeidos}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tab.Screen name="Perfil" component={PerfilScreen}
        options={{ tabBarLabel: 'Perfil', tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>👤</Text> }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={Tabs} />
        <Stack.Screen name="Chat" component={ChatScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}