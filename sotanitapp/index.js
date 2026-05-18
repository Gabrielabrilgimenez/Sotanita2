import { registerRootComponent } from 'expo';
import { Dimensions, Platform } from 'react-native';
import * as Device from 'expo-device';

import App from './App';

function getDeviceLabel() {
	const deviceType = Device.deviceType;

	if (Platform.OS === 'web') {
		const { width } = Dimensions.get('window');

		if (width >= 900) {
			return 'ORDENADOR';
		}

		if (width >= 600) {
			return 'TABLET';
		}

		return 'MOVIL';
	}

	switch (deviceType) {
		case Device.DeviceType.TABLET:
			return 'TABLET';
		case Device.DeviceType.PHONE:
			return 'MOVIL';
		case Device.DeviceType.DESKTOP:
			return 'ORDENADOR';
		default:
			return `DISPOSITIVO_${String(deviceType ?? 'DESCONOCIDO')}`;
	}
}

console.log(`DISPOSITIVO INICIAL: ${getDeviceLabel()}`);

// Register service worker as early as possible on web before mounting the app
if (Platform.OS === 'web') {
	try {
		// Use require to ensure synchronous execution during module evaluation
		require('./registerServiceWorker');
	} catch (e) {
		// ignore in native environments
	}
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
