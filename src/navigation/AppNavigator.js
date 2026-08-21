import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SplashScreen from '../screens/SplashScreen';
import PermissionsScreen from '../screens/PermissionsScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import HomeScreen from '../screens/HomeScreen';

const Stack = createNativeStackNavigator();

export const AppNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="Splash"
        component={SplashScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="Permissions"
        component={PermissionsScreen}
        options={{ animation: 'fade', animationDuration: 400 }}
      />
      <Stack.Screen
        name="Onboarding"
        component={OnboardingScreen}
        options={{ animation: 'fade', animationDuration: 500 }}
      />
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ animation: 'fade', animationDuration: 400 }}
      />
    </Stack.Navigator>
  );
};

export default AppNavigator;
