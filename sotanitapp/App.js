import 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Linking, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { AuthProvider } from './src/context/AuthContext';
import { SettingsProvider } from './src/context/SettingsContext';
import AppNavigator from './src/navigation/AppNavigator';
import { useAppTheme } from './src/hooks/useAppTheme';

const webPrefix = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : null;

const linking = {
  prefixes: ['sotanitapp://', ...(webPrefix ? [webPrefix] : [])],
  config: {
    screens: {
      MainTabs: {
        screens: {
          Home: {
            path: 'feed',
            parse: {
              videoId: (videoId) => videoId,
            },
          },
        },
      },
    },
  },
  async getInitialURL() {
    const initialUrl = await Linking.getInitialURL();
    if (initialUrl) {
      return initialUrl;
    }

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return window.location.href;
    }

    return null;
  },
  subscribe(listener) {
    const subscription = Linking.addEventListener('url', ({ url }) => listener(url));
    return () => subscription.remove();
  },
};

function RootNavigator() {
  const { darkMode } = useAppTheme();

  return (
    <>
      <StatusBar style={darkMode ? 'light' : 'dark'} />
      <NavigationContainer linking={linking}>
        <AppNavigator />
      </NavigationContainer>
    </>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Nougat: require('./assets/Nougat-ExtraBlack.ttf'),
    Fontello: require('./assets/fontello-5f7d3d1a/font/fontello.ttf'),
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SettingsProvider>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </SettingsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
