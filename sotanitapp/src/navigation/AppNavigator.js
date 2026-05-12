import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../hooks/useAppTheme';
import LoadingOverlay from '../components/LoadingOverlay';
import AuthNavigator from './AuthNavigator';
import TabNavigator from './TabNavigator';
import SearchScreen from '../screens/SearchScreen';
import MyVideosScreen from '../screens/MyVideosScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ShareScreen from '../screens/ShareScreen';

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
          <Stack.Screen name="Share" component={ShareScreen} options={{ animationEnabled: false }} />
          <Stack.Screen name="Search" component={SearchScreen} />
          <Stack.Screen name="MyVideos" component={MyVideosScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="ForoEquipo" component={require('../screens/ForoEquipo').default} />
        </>
      ) : (
        <>
          <Stack.Screen name="Auth" component={AuthNavigator} />
          <Stack.Screen name="Share" component={ShareScreen} options={{ animationEnabled: false }} />
        </>
      )}
    </Stack.Navigator>
  );
}
