import { Platform, useWindowDimensions } from 'react-native';
import * as Device from 'expo-device';

export const isDesktopDevice = () => {
  if (Platform.OS !== 'web') {
    return Device.deviceType !== Device.DeviceType.PHONE;
  }

  if (typeof window === 'undefined') {
    return false;
  }

  return window.innerWidth >= 900;
};

export const isMobileDevice = () => {
  return !isDesktopDevice();
};

export default function useDeviceType() {
  const { width } = useWindowDimensions();

  const isDesktop = Platform.OS !== 'web' 
    ? Device.deviceType !== Device.DeviceType.PHONE
    : width >= 900;

  const isMobile = !isDesktop;
  const isTablet = Platform.OS !== 'web' 
    ? Device.deviceType === Device.DeviceType.TABLET
    : false;

  return {
    isDesktop,
    isMobile,
    isTablet,
    deviceType: isTablet ? 'tablet' : isDesktop ? 'desktop' : 'mobile',
  };
}
