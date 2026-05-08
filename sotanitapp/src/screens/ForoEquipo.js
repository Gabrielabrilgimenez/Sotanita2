import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, Image, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../hooks/useAppTheme';
import { getTeamById, getForumMessages, postForumMessage, uploadCommentAudio } from '../api/backend';
import LoadingOverlay from '../components/LoadingOverlay';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

export default function ForoEquipo({ route, navigation }) {
  const { teamId } = route.params || {};
  const { user, isLoggedIn } = useAuth();
  const { colors, spacing, typography, textScale, darkMode, highContrast } = useAppTheme();

  const [team, setTeam] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const recordingRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const mediaChunksRef = useRef([]);
  const [showLoadingBack, setShowLoadingBack] = useState(false);

  const fetchTeam = useCallback(async () => {
    if (!teamId) return;
    try {
      const t = await getTeamById(teamId);
      // normalize team fields to support different backend shapes
      const normalized = t
        ? {
            ...t,
            escudoUrl: t.teamEscudoUrl || t.escudoUrl || t.teamEscudo || t.crest || t.imageUrl || null,
            name: t.teamName || t.name || t.title || t.nombre || '',
            lastTitle: t.lastTitle || t.last_title || t.lastTitleWon || '',
            year: t.year || t.founded || t.lastYear || '',
            stadium: t.stadium || t.stadio || t.stadiumName || '',
          }
        : null;
      setTeam(normalized);
    } catch (err) {
      console.error('Error cargando equipo foro', err.message);
      setTeam(null);
    }
  }, [teamId]);

  const fetchMessages = useCallback(async () => {
    if (!teamId) return;
    try {
      const msgs = await getForumMessages(teamId);
      setMessages(Array.isArray(msgs) ? msgs : []);
    } catch (err) {
      console.error('Error cargando mensajes foro', err.message);
    }
  }, [teamId]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      await fetchTeam();
      await fetchMessages();
      // on first load, scroll to bottom once
      if (mounted && scrollRef.current) {
        try {
          scrollRef.current.scrollToEnd({ animated: false });
        } catch (e) {}
      }
      initialLoadedRef.current = true;
    })();

    const interval = setInterval(fetchMessages, 2500);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [fetchTeam, fetchMessages]);

  useFocusEffect(
    useCallback(() => {
      if (!isLoggedIn || !user || !teamId) {
        navigation.goBack();
      }
    }, [isLoggedIn, user, teamId])
  );

  const sendText = async () => {
    if (!text || !text.trim()) return;
    if (!isLoggedIn || !user) return;
    const trimmed = String(text).slice(0, 500);
    setSending(true);
    try {
      // indicate that after the update we should scroll to bottom (because current user sent)
      scrollOnNextUpdateRef.current = true;
      await postForumMessage(teamId, { user: user.email || user.id || user?.email, type: 'text', text: trimmed });
      setText('');
      await fetchMessages();
      // If we flagged to scroll (because current user sent), do it now
      try {
        if (scrollOnNextUpdateRef.current && scrollRef.current) {
          scrollRef.current.scrollToEnd({ animated: true });
        }
      } catch (e) {}
      scrollOnNextUpdateRef.current = false;
    } catch (err) {
      console.error('Error enviando mensaje foro', err.message);
    } finally {
      setSending(false);
    }
  };

  const handleStopRecording = useCallback(async () => {
    if (!teamId) return;

    if (Platform.OS === 'web') {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === 'inactive') return;
      setIsUploadingAudio(true);

      const stopPromise = new Promise((resolve) => {
        recorder.onstop = () => resolve();
      });

      recorder.stop();
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      mediaRecorderRef.current = null;
      setIsRecording(false);

      await stopPromise;

        try {
          scrollOnNextUpdateRef.current = true;
          const blob = new Blob(mediaChunksRef.current, { type: 'audio/webm' });
          const file = new File([blob], 'forum-audio.webm', { type: 'audio/webm' });
          const formData = new FormData();
          formData.append('file', file);
          const uploadResult = await uploadCommentAudio(formData);
          await postForumMessage(teamId, { user: user?.email || user?.id || '', type: 'audio', audioUrl: uploadResult.url });
          await fetchMessages();
          try {
            if (scrollOnNextUpdateRef.current && scrollRef.current) {
              scrollRef.current.scrollToEnd({ animated: true });
            }
          } catch (e) {}
          scrollOnNextUpdateRef.current = false;
        } catch (err) {
        Alert.alert('Error', err.message || 'No se pudo subir el audio.');
      } finally {
        setIsUploadingAudio(false);
      }

      return;
    }

      try {
        const recording = recordingRef.current;
        if (!recording) return;
        setIsRecording(false);
        setIsUploadingAudio(true);
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        recordingRef.current = null;

        if (!uri) {
          setIsUploadingAudio(false);
          Alert.alert('Error', 'No se pudo obtener el audio.');
          return;
        }

        const formData = new FormData();
        formData.append('file', {
          uri,
          type: 'audio/m4a',
          name: 'forum-audio.m4a',
        });

        scrollOnNextUpdateRef.current = true;
        const uploadResult = await uploadCommentAudio(formData);
        await postForumMessage(teamId, { user: user?.email || user?.id || '', type: 'audio', audioUrl: uploadResult.url });
        await fetchMessages();
        try {
          if (scrollOnNextUpdateRef.current && scrollRef.current) {
            scrollRef.current.scrollToEnd({ animated: true });
          }
        } catch (e) {}
        scrollOnNextUpdateRef.current = false;
      } catch (err) {
      Alert.alert('Error', err.message || 'No se pudo subir el audio.');
    } finally {
      setIsUploadingAudio(false);
    }
  }, [teamId, user, fetchMessages]);

  const handleToggleRecording = useCallback(async () => {
    if (!teamId) return;
    if (!isLoggedIn || !user) {
      Alert.alert('Inicia sesion', 'Debes iniciar sesion para publicar en el foro.');
      return;
    }

    if (isUploadingAudio || isRecording) return;

    if (Platform.OS === 'web') {
      if (!navigator?.mediaDevices?.getUserMedia || !globalThis.MediaRecorder) {
        Alert.alert('No disponible', 'Tu navegador no soporta grabacion de audio.');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        const recorder = new MediaRecorder(stream);
        mediaChunksRef.current = [];
        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) mediaChunksRef.current.push(event.data);
        };
        recorder.start();
        mediaRecorderRef.current = recorder;
        setText('');
        setIsRecording(true);
      } catch (err) {
        Alert.alert('Permisos', 'Necesitas permisos de microfono.');
      }
      return;
    }

    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permisos requeridos', 'Necesitas permisos de microfono.');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      recordingRef.current = recording;
      setText('');
      setIsRecording(true);
    } catch (err) {
      Alert.alert('Error', 'No se puede iniciar la grabacion.');
    }
  }, [teamId, isLoggedIn, user, isUploadingAudio, isRecording]);

  const renderItem = ({ item }) => {
    const isMine = String(item.user || '').trim().toLowerCase() === String(user?.email || user?.id || '').trim().toLowerCase();
    const containerStyle = isMine ? styles.messageRight : styles.messageLeft;
    const bubbleStyle = isMine ? { backgroundColor: colors.primary, alignSelf: 'flex-end' } : { backgroundColor: colors.surfaceElevated, alignSelf: 'flex-start' };

    return (
      <View style={[containerStyle]}>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>{item.user}</Text>
        <View style={[styles.bubble, bubbleStyle]}>
          <Text style={{ color: isMine ? colors.white : colors.text }}>{item.type === 'text' ? item.text : 'Audio'}</Text>
        </View>
      </View>
    );
  };
  const scrollRef = useRef(null);
  const scrollOnNextUpdateRef = useRef(false);
  const initialLoadedRef = useRef(false);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}> 
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}> 
        {team ? (
          <View style={styles.headerInner}>
            <Image source={team.escudoUrl ? { uri: team.escudoUrl } : require('../../assets/perfil/teamChange_light.png')} style={styles.crest} />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={{ fontFamily: typography.families.nougat, fontSize: 22 * textScale, color: colors.text }}>{team.name}</Text>
              <Text style={{ color: colors.textMuted }}>{team.lastTitle || ''} {team.year ? `• ${team.year}` : ''} {team.stadium ? `• ${team.stadium}` : ''}</Text>
            </View>

            <Pressable
              onPress={async () => {
                // show intentional loading gif + blur for 1s then navigate back to Profile tab
                setShowLoadingBack(true);
                setTimeout(() => {
                  setShowLoadingBack(false);
                  // navigate to nested Tab Navigator's Profile screen
                  navigation.navigate('MainTabs', { screen: 'Profile' });
                }, 1000);
              }}
              style={{ padding: 8 }}
            >
              <Ionicons name="arrow-back" size={22} color={colors.primary} />
            </Pressable>
          </View>
        ) : (
          <Text style={{ color: colors.text }}>Foro de equipo</Text>
        )}
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={{ padding: 12, paddingBottom: 80 }}>
        {messages.map((m) => (
          <View key={m.id || String(m._id)}>{renderItem({ item: m })}</View>
        ))}
      </ScrollView>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={90}>
        <View style={[styles.composer, { borderTopColor: colors.border, backgroundColor: colors.surface }]}> 
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Escribe un mensaje (max 500)"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { color: colors.text }]}
            maxLength={500}
            multiline
          />
          <Pressable onPress={handleToggleRecording} style={[styles.sendBtn, { marginRight: 8 }]}>
            <Ionicons name={isRecording ? 'mic' : 'mic-outline'} size={22} color={isRecording ? colors.danger : colors.primary} />
          </Pressable>
          <Pressable onPress={isRecording ? handleStopRecording : sendText} style={styles.sendBtn} disabled={sending || (!text.trim() && !isRecording)}>
            <Ionicons name="send" size={20} color={colors.primary} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <LoadingOverlay visible={showLoadingBack} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 12, borderBottomWidth: 1 },
  headerInner: { flexDirection: 'row', alignItems: 'center' },
  crest: { width: 64, height: 64, borderRadius: 8 },
  composer: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'flex-end', padding: 8, borderTopWidth: 1 },
  input: { flex: 1, minHeight: 40, maxHeight: 120, padding: 8, borderRadius: 8, backgroundColor: 'transparent' },
  sendBtn: { padding: 8, marginLeft: 8 },
  messageLeft: { alignSelf: 'flex-start', marginVertical: 6, maxWidth: '80%' },
  messageRight: { alignSelf: 'flex-end', marginVertical: 6, maxWidth: '80%' },
  bubble: { padding: 10, borderRadius: 10 },
});
