import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FIRST_VISIT_KEY = 'sotanita_first_visit_seen_v1';

export function useFirstVisit() {
  const [isFirstVisit, setIsFirstVisit] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFirstVisitState = async () => {
      try {
        const storedValue = await AsyncStorage.getItem(FIRST_VISIT_KEY);
        setIsFirstVisit(storedValue !== '1');
      } catch (error) {
        console.error('Error leyendo la huella de primera visita:', error);
        setIsFirstVisit(false);
      } finally {
        setLoading(false);
      }
    };

    loadFirstVisitState();
  }, []);

  const markFirstVisitSeen = useCallback(async () => {
    try {
      await AsyncStorage.setItem(FIRST_VISIT_KEY, '1');
      setIsFirstVisit(false);
    } catch (error) {
      console.error('Error guardando la huella de primera visita:', error);
    }
  }, []);

  return {
    isFirstVisit,
    loading,
    markFirstVisitSeen,
  };
}