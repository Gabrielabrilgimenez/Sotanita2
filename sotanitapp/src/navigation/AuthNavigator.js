import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { getScreenComponent, isDesktopDevice } from '../screens/index';

const Stack = createNativeStackNavigator();

export default function AuthNavigator() {
  const isDesktop = isDesktopDevice();

  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={isDesktop ? 'Welcome' : 'MobilePlatform'}
    >
      {!isDesktop ? (
        <Stack.Screen name="MobilePlatform" component={getScreenComponent('MobilePlatformScreen')} />
      ) : null}
      <Stack.Screen name="Welcome" component={getScreenComponent('WelcomeScreen')} />
      <Stack.Screen name="Login" component={getScreenComponent('LoginScreen')} />
      <Stack.Screen name="Register" component={getScreenComponent('RegisterScreen')} />
    </Stack.Navigator>
  );
}
