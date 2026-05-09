import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createUser, getTeamIdByName, getUserProfile, updateUser as updateUserAPI, loginUser as loginUserAPI } from '../api/backend';

const AuthContext = createContext(undefined);
const AUTH_STORAGE_KEY = 'sotanita_auth_session_v1';

async function persistSession(session) {
  try {
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  } catch (error) {
    console.error('Error guardando sesion:', error);
  }
}

async function clearPersistedSession() {
  try {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
  } catch (error) {
    console.error('Error limpiando sesion:', error);
  }
}

function normalizeUserData(userData) {
  return {
    id: userData.id,
    username: userData.username,
    email: userData.email,
    position: userData.position,
    profileImageUrl: userData.profileImageUrl || null,
    team: userData.teamName || userData.team || 'Sin equipo',
    teamId: userData.teamId,
    frameId: userData.frameId,
    teamImageUrl: userData.teamImageUrl,
    frameImageId: userData.frameImageUrl || userData.frameImageId,
    points: Number(userData.points) || 0,
  };
}

export function AuthProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [guestMode, setGuestMode] = useState(false);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const raw = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
        if (!raw) {
          setAuthLoading(false);
          return;
        }

        const session = JSON.parse(raw);
        if (session?.isLoggedIn && session?.user?.id) {
          setIsLoggedIn(true);
          setGuestMode(false);
          setUser(session.user);
        } else if (session?.guestMode) {
          setGuestMode(true);
          setIsLoggedIn(false);
          setUser(null);
        }
      } catch (error) {
        console.error('Error restaurando sesion:', error);
      } finally {
        setAuthLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = async (email, password) => {
    try {
      const userData = await loginUserAPI(email, password);
      const normalizedUser = normalizeUserData(userData);

      setIsLoggedIn(true);
      setGuestMode(false);
      setUser(normalizedUser);

      await persistSession({
        isLoggedIn: true,
        guestMode: false,
        user: normalizedUser,
      });

      return userData;
    } catch (error) {
      setIsLoggedIn(false);
      setGuestMode(false);
      setUser(null);
      await clearPersistedSession();
      throw error;
    }
  };

  const register = async (data) => {
    const teamId = await getTeamIdByName(data.team);

    const createdUser = await createUser({
      username: data.username,
      email: data.email,
      password: data.password,
      position: data.position,
      teamId,
      teamName: data.team,
      frameId: data.frameId || 'bronce',
      profileImageUrl: data.profileImageUrl,
    });

    const normalizedUser = normalizeUserData({
      ...createdUser,
      profileImageUrl: createdUser.profileImageUrl || data.profileImageUrl || null,
      teamName: createdUser.teamName || data.team,
    });

    setIsLoggedIn(true);
    setGuestMode(false);
    setUser(normalizedUser);

    await persistSession({
      isLoggedIn: true,
      guestMode: false,
      user: normalizedUser,
    });

    return createdUser;
  };

  const logout = () => {
    setIsLoggedIn(false);
    setGuestMode(false);
    setUser(null);
    clearPersistedSession();
  };

  const enterAsGuest = () => {
    setGuestMode(true);
    setIsLoggedIn(false);
    setUser(null);
    persistSession({
      isLoggedIn: false,
      guestMode: true,
      user: null,
    });
  };

  const updateUser = async (data) => {
    if (!user || !user.id) {
      console.warn('No se puede actualizar: usuario sin id');
      return;
    }

    try {
      const payload = {};

      if (data.username && data.username !== user.username) {
        payload.username = data.username;
      }

      if (data.team && data.team !== user.team) {
        payload.teamName = data.team;
      }

      if (data.position && data.position !== user.position) {
        payload.position = data.position;
      }

      if (data.profileImageUrl) {
        payload.profileImageUrl = data.profileImageUrl;
      }

      if (Object.keys(payload).length > 0) {
        const updatedUser = await updateUserAPI(user.id, payload);

        setUser((prev) => {
          if (!prev) return prev;

          const mergedUser = {
            ...prev,
            ...normalizeUserData({
              ...prev,
              ...updatedUser,
              profileImageUrl: updatedUser.profileImageUrl ?? data.profileImageUrl ?? prev.profileImageUrl,
              teamName: updatedUser.teamName ?? data.team ?? prev.team,
            }),
          };

          persistSession({
            isLoggedIn: true,
            guestMode: false,
            user: mergedUser,
          });

          return mergedUser;
        });
        return;
      }

      setUser((prev) => {
        if (!prev) return prev;
        const mergedUser = { ...prev, ...data };

        persistSession({
          isLoggedIn: true,
          guestMode: false,
          user: mergedUser,
        });

        return mergedUser;
      });
    } catch (error) {
      console.error('Error actualizando usuario:', error);
      throw error;
    }
  };

  const refreshUser = useCallback(async () => {
    if (!user?.id) {
      return null;
    }

    const freshUser = await getUserProfile(user.id);
    const normalizedUser = normalizeUserData({
      ...user,
      ...freshUser,
      teamName: freshUser.teamName ?? user.team,
    });

    setUser(normalizedUser);

    await persistSession({
      isLoggedIn: true,
      guestMode: false,
      user: normalizedUser,
    });

    return normalizedUser;
  }, [user?.id, user?.team]);

  const value = useMemo(
    () => ({
      isLoggedIn,
      guestMode,
      user,
      authLoading,
      login,
      register,
      logout,
      enterAsGuest,
      updateUser,
      refreshUser,
    }),
    [isLoggedIn, guestMode, user, authLoading, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
