import { Platform } from 'react-native';
import * as Device from 'expo-device';

// Función para determinar si es dispositivo de escritorio
const isDesktopDevice = () => {
  if (Platform.OS !== 'web') {
    return Device.deviceType !== Device.DeviceType.PHONE;
  }

  if (typeof window === 'undefined') {
    return false;
  }

  return window.innerWidth >= 900;
};

// Importar todas las pantallas mobile
import ForoEquipoMobile from './mobile/ForoEquipo';
import HomeScreenMobile from './mobile/HomeScreen';
import LoginScreenMobile from './mobile/LoginScreen';
import MyVideosScreenMobile from './mobile/MyVideosScreen';
import NotificationsScreenMobile from './mobile/NotificationsScreen';
import ProfileScreenMobile from './mobile/ProfileScreen';
import RankingScreenMobile from './mobile/RankingScreen';
import RegisterScreenMobile from './mobile/RegisterScreen';
import SearchScreenMobile from './mobile/SearchScreen';
import SettingsScreenMobile from './mobile/SettingsScreen';
import ShareScreenMobile from './mobile/ShareScreen';
import UploadScreenMobile from './mobile/UploadScreen';
import WelcomeScreenMobile from './mobile/WelcomeScreen';
import MobilePlatformScreenMobile from './mobile/MobilePlatformScreen';

// Importar todas las pantallas desktop
import ForoEquipoDesktop from './desktop/ForoEquipo';
import HomeScreenDesktop from './desktop/HomeScreen';
import LoginScreenDesktop from './desktop/LoginScreen';
import MyVideosScreenDesktop from './desktop/MyVideosScreen';
import NotificationsScreenDesktop from './desktop/NotificationsScreen';
import ProfileScreenDesktop from './desktop/ProfileScreen';
import RankingScreenDesktop from './desktop/RankingScreen';
import RegisterScreenDesktop from './desktop/RegisterScreen';
import SearchScreenDesktop from './desktop/SearchScreen';
import SettingsScreenDesktop from './desktop/SettingsScreen';
import ShareScreenDesktop from './desktop/ShareScreen';
import UploadScreenDesktop from './desktop/UploadScreen';
import WelcomeScreenDesktop from './desktop/WelcomeScreen';

// Función para obtener la pantalla correcta según el dispositivo
const getScreenComponent = (screenName) => {
  const isDesktop = isDesktopDevice();
  
  if (screenName === 'HomeScreen') {
    console.log(`🖥️  Device Type: ${isDesktop ? 'DESKTOP' : 'MOBILE/TABLET'} | Screen: ${screenName}`);
  }

  const screenMap = {
    ForoEquipo: isDesktop ? ForoEquipoDesktop : ForoEquipoMobile,
    HomeScreen: isDesktop ? HomeScreenDesktop : HomeScreenMobile,
    LoginScreen: isDesktop ? LoginScreenDesktop : LoginScreenMobile,
    MyVideosScreen: isDesktop ? MyVideosScreenDesktop : MyVideosScreenMobile,
    NotificationsScreen: isDesktop ? NotificationsScreenDesktop : NotificationsScreenMobile,
    ProfileScreen: isDesktop ? ProfileScreenDesktop : ProfileScreenMobile,
    RankingScreen: isDesktop ? RankingScreenDesktop : RankingScreenMobile,
    RegisterScreen: isDesktop ? RegisterScreenDesktop : RegisterScreenMobile,
    SearchScreen: isDesktop ? SearchScreenDesktop : SearchScreenMobile,
    SettingsScreen: isDesktop ? SettingsScreenDesktop : SettingsScreenMobile,
    ShareScreen: isDesktop ? ShareScreenDesktop : ShareScreenMobile,
    UploadScreen: isDesktop ? UploadScreenDesktop : UploadScreenMobile,
    WelcomeScreen: isDesktop ? WelcomeScreenDesktop : WelcomeScreenMobile,
    MobilePlatformScreen: isDesktop ? WelcomeScreenDesktop : MobilePlatformScreenMobile,
  };

  return screenMap[screenName] || null;
};

// Exportar todas las pantallas
export {
  // Mobile
  ForoEquipoMobile,
  HomeScreenMobile,
  LoginScreenMobile,
  MyVideosScreenMobile,
  NotificationsScreenMobile,
  ProfileScreenMobile,
  RankingScreenMobile,
  RegisterScreenMobile,
  SearchScreenMobile,
  SettingsScreenMobile,
  ShareScreenMobile,
  UploadScreenMobile,
  WelcomeScreenMobile,
  MobilePlatformScreenMobile,
  // Desktop
  ForoEquipoDesktop,
  HomeScreenDesktop,
  LoginScreenDesktop,
  MyVideosScreenDesktop,
  NotificationsScreenDesktop,
  ProfileScreenDesktop,
  RankingScreenDesktop,
  RegisterScreenDesktop,
  SearchScreenDesktop,
  SettingsScreenDesktop,
  ShareScreenDesktop,
  UploadScreenDesktop,
  WelcomeScreenDesktop,
  // Helpers
  getScreenComponent,
  isDesktopDevice,
};
