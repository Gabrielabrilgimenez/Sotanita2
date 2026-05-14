import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../hooks/useAppTheme';
import LoadingOverlay from '../components/LoadingOverlay';
import AuthNavigator from './AuthNavigator';
import TabNavigator from './TabNavigator';
import { getScreenComponent } from '../screens/index';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { isLoggedIn, guestMode, authLoading } = useAuth();
  const { colors } = useAppTheme();
  const isAuthenticated = isLoggedIn || guestMode;

  if (authLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <LoadingOverlay visible />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <>
          <Stack.Screen name="MainTabs" component={TabNavigator} />
          <Stack.Screen name="Share" component={getScreenComponent('ShareScreen')} options={{ animationEnabled: false }} />
          <Stack.Screen name="Search" component={getScreenComponent('SearchScreen')} />
          <Stack.Screen name="MyVideos" component={getScreenComponent('MyVideosScreen')} />
          <Stack.Screen name="Settings" component={getScreenComponent('SettingsScreen')} />
          <Stack.Screen name="ForoEquipo" component={getScreenComponent('ForoEquipo')} />
        </>
      ) : (
        <>
          <Stack.Screen name="Auth" component={AuthNavigator} />
          <Stack.Screen name="Share" component={getScreenComponent('ShareScreen')} options={{ animationEnabled: false }} />
        </>
      )}
    </Stack.Navigator>
  );
}
