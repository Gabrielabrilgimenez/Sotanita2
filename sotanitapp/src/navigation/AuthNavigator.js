import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { getScreenComponent } from '../screens/index';

const Stack = createNativeStackNavigator();

export default function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome" component={getScreenComponent('WelcomeScreen')} />
      <Stack.Screen name="Login" component={getScreenComponent('LoginScreen')} />
      <Stack.Screen name="Register" component={getScreenComponent('RegisterScreen')} />
    </Stack.Navigator>
  );
}
