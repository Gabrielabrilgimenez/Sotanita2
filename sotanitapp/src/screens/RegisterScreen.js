import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../hooks/useAppTheme';
import useResetScrollOnFocus from '../hooks/useResetScrollOnFocus';
import { getPositions, getTeamNames } from '../api/backend';
import { emailRegex } from '../utils/format';
import AppButton from '../components/AppButton';
import AppInput from '../components/AppInput';
import ScreenGradient from '../components/ScreenGradient';
import Header from '../components/Header';

const REMOVE_BG_API_KEY = process.env.EXPO_PUBLIC_REMOVE_BG_API_KEY;

function arrayBufferToBase64(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  const chunkSize = 0x8000;
  let binary = '';

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode.apply(null, chunk);
  }

  if (typeof globalThis.btoa === 'function') {
    return globalThis.btoa(binary);
  }

  if (typeof globalThis.Buffer !== 'undefined') {
    return globalThis.Buffer.from(binary, 'binary').toString('base64');
  }

  throw new Error('No se pudo convertir la imagen a base64');
}

function passwordStrength(password) {
  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 8) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^a-zA-Z\d]/.test(password)) score += 1;
  return score;
}

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const { colors, spacing, typography, textScale, darkMode, highContrast } = useAppTheme();

  const [form, setForm] = useState({
    username: '',
    position: '',
    team: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState({});
  const [teamOptions, setTeamOptions] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [positionOptions, setPositionOptions] = useState([]);
  const [loadingPositions, setLoadingPositions] = useState(false);
  const [showPositionPicker, setShowPositionPicker] = useState(false);
  const [showTeamPicker, setShowTeamPicker] = useState(false);
  const [photoUri, setPhotoUri] = useState('');
  const [photoDataUrl, setPhotoDataUrl] = useState('');
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [registering, setRegistering] = useState(false);
  const [serverError, setServerError] = useState('');
  const [positionsError, setPositionsError] = useState('');
  const scrollRef = useRef(null);

  useResetScrollOnFocus(scrollRef);

  const strength = useMemo(() => passwordStrength(form.password), [form.password]);
  const selectFontSize = 26 * textScale;
  const selectItemFontSize = 22 * textScale;
  const selectTeamItemFontSize = 16 * textScale;
  const selectTextColor = highContrast ? colors.primary : darkMode ? colors.white : colors.text;
  const selectBackground = `${colors.surface}99`;
  const teamColumnHighlight = highContrast ? `${colors.primary}22` : darkMode ? `${colors.white}08` : `${colors.black}08`;
  const positionLabel = form.position || 'Selecciona tu posicion';
  const teamLabel = form.team || 'Selecciona tu equipo';

  const pickAndProcessPhoto = async () => {
    if (!REMOVE_BG_API_KEY) {
      throw new Error('Falta configurar EXPO_PUBLIC_REMOVE_BG_API_KEY');
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Permiso de galeria denegado');
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });

    if (result.canceled) {
      return null;
    }

    const asset = result.assets?.[0];
    if (!asset?.uri) {
      throw new Error('No se pudo leer la imagen seleccionada');
    }

    const formData = new FormData();
    formData.append('size', 'auto');
    formData.append('format', 'png');

    const fileName = asset.fileName || `upload-${Date.now()}.jpg`;
    const fileType = asset.mimeType || 'image/jpeg';

    if (Platform.OS === 'web') {
      const fileResponse = await fetch(asset.uri);
      const imageBlob = await fileResponse.blob();
      formData.append('image_file', imageBlob, fileName);
    } else {
      formData.append('image_file', {
        uri: asset.uri,
        name: fileName,
        type: fileType,
      });
    }

    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': REMOVE_BG_API_KEY,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`remove.bg error ${response.status}: ${errorBody}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64Data = arrayBufferToBase64(arrayBuffer);

    return {
      uri: `data:image/png;base64,${base64Data}`,
      dataUrl: `data:image/png;base64,${base64Data}`,
    };
  };

  const handleSelectPhoto = async () => {
    setPhotoError('');
    setServerError('');

    try {
      setPhotoLoading(true);
      const processed = await pickAndProcessPhoto();

      if (!processed) {
        return;
      }

      setPhotoUri(processed.uri);
      setPhotoDataUrl(processed.dataUrl);
    } catch (error) {
      const message = error.message || 'No se pudo procesar la foto';
      setPhotoError(message);
      Alert.alert('Foto', message);
    } finally {
      setPhotoLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadTeams = async () => {
      setLoadingTeams(true);
      setServerError('');

      try {
        const names = await getTeamNames();
        if (isMounted) {
          setTeamOptions(names);
        }
      } catch (error) {
        if (isMounted) {
          setServerError(error.message || 'No se pudieron cargar los equipos');
        }
      } finally {
        if (isMounted) {
          setLoadingTeams(false);
        }
      }
    };

    const loadPositions = async () => {
      setLoadingPositions(true);
      setPositionsError('');

      try {
        const data = await getPositions();
        if (isMounted) {
          setPositionOptions(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        if (isMounted) {
          setPositionsError(error.message || 'No se pudieron cargar las posiciones');
        }
      } finally {
        if (isMounted) {
          setLoadingPositions(false);
        }
      }
    };

    loadTeams();
    loadPositions();

    return () => {
      isMounted = false;
    };
  }, []);

  const submit = async () => {
    const next = {};

    if (!form.username || form.username.length < 3) next.username = 'Minimo 3 caracteres';
    if (!emailRegex.test(form.email)) next.email = 'Email invalido';
    if (!form.position) next.position = 'Selecciona una posicion';
    if (!form.team) next.team = 'Selecciona un equipo';
    if (!form.password || form.password.length < 6) next.password = 'Minimo 6 caracteres';
    if (form.confirmPassword !== form.password) next.confirmPassword = 'Las contrasenas no coinciden';

    setErrors(next);
    if (Object.keys(next).length > 0) {
      return;
    }

    setRegistering(true);
    setServerError('');

    try {
      await register({
        ...form,
        profileImageUrl: photoDataUrl || undefined,
      });
    } catch (error) {
      setServerError(error.message || 'No se pudo completar el registro');
    } finally {
      setRegistering(false);
    }
  };

  return (
    <ScreenGradient>
      <Header
        title="Crear cuenta"
        titleSize="xxl"
        titleScale={1.3}
        titleStyle={{ transform: [{ scaleY: 1.12 }], letterSpacing: -0.8 }}
        onBack={() => navigation.goBack()}
      />
      <ScrollView ref={scrollRef} contentContainerStyle={[styles.scrollContent, { padding: spacing.xl }]}>
        <Text style={{ color: colors.textMuted, fontSize: typography.sizes.md * textScale, marginBottom: spacing.xl }}>
          Unete a la comunidad
        </Text>

        <Text style={[styles.label, { color: colors.text, fontSize: typography.sizes.sm * textScale }]}>Foto de jugador</Text>
        <Pressable
          onPress={handleSelectPhoto}
          disabled={photoLoading}
          style={[
            styles.photoPicker,
            {
              backgroundColor: colors.surface,
              borderColor: photoError ? colors.danger : photoUri ? colors.success : colors.border,
            },
          ]}
        >
          {photoLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="cover" />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={{ color: colors.textMuted, fontWeight: typography.weights.semibold }}>Toca para subir tu foto</Text>
              <Text style={{ color: colors.textMuted, fontSize: typography.sizes.xs * textScale, marginTop: 4 }}>
                Se convierte a PNG sin fondo antes de guardarse
              </Text>
            </View>
          )}
        </Pressable>
        {photoError ? <Text style={[styles.error, { color: colors.danger }]}>{photoError}</Text> : null}

        <AppInput
          label="Nombre de usuario"
          value={form.username}
          onChangeText={(username) => setForm((prev) => ({ ...prev, username }))}
          placeholder="Ronaldo10"
          error={errors.username}
        />

        <Text style={[styles.label, { color: colors.text, fontSize: typography.sizes.sm * textScale }]}>Posicion</Text>
        <View
          style={[
            styles.selectWrap,
            { backgroundColor: selectBackground },
          ]}
        >
          <Pressable style={styles.selectButton} onPress={() => setShowPositionPicker(true)}>
            <Text
              style={{
                color: selectTextColor,
                fontFamily: typography.families.nougat,
                fontSize: selectFontSize,
                textAlign: 'center',
                flex: 1,
              }}
              numberOfLines={1}
            >
              {positionLabel}
            </Text>
            <Ionicons name="chevron-down" size={20} color={selectTextColor} />
          </Pressable>
        </View>
        {errors.position ? <Text style={[styles.error, { color: colors.danger }]}>{errors.position}</Text> : null}
        {loadingPositions ? <Text style={[styles.hint, { color: colors.textMuted }]}>Cargando posiciones...</Text> : null}
        {positionsError ? <Text style={[styles.error, { color: colors.danger }]}>{positionsError}</Text> : null}

        <Text style={[styles.label, { color: colors.text, fontSize: typography.sizes.sm * textScale }]}>Equipo favorito</Text>
        <View
          style={[
            styles.selectWrap,
            { backgroundColor: selectBackground },
          ]}
        >
          <Pressable style={styles.selectButton} onPress={() => setShowTeamPicker(true)}>
            <Text
              style={{
                color: selectTextColor,
                fontFamily: typography.families.nougat,
                fontSize: selectFontSize,
                textAlign: 'center',
                flex: 1,
              }}
              numberOfLines={1}
            >
              {teamLabel}
            </Text>
            <Ionicons name="chevron-down" size={20} color={selectTextColor} />
          </Pressable>
        </View>
        {errors.team ? <Text style={[styles.error, { color: colors.danger }]}>{errors.team}</Text> : null}
        {loadingTeams ? <Text style={[styles.hint, { color: colors.textMuted }]}>Cargando equipos...</Text> : null}
        {serverError ? <Text style={[styles.error, { color: colors.danger }]}>{serverError}</Text> : null}

        <AppInput
          label="Email"
          value={form.email}
          onChangeText={(email) => setForm((prev) => ({ ...prev, email }))}
          keyboardType="email-address"
          placeholder="tu@email.com"
          error={errors.email}
        />

        <AppInput
          label="Contrasena"
          value={form.password}
          onChangeText={(password) => setForm((prev) => ({ ...prev, password }))}
          placeholder="........"
          secureTextEntry={!showPassword}
          rightIcon={showPassword ? 'eye-off' : 'eye'}
          onRightPress={() => setShowPassword((prev) => !prev)}
          error={errors.password}
        />

        {form.password.length > 0 ? (
          <View style={{ marginBottom: spacing.md }}>
            <View style={styles.strengthBar}>
              {[1, 2, 3, 4, 5].map((level) => (
                <View
                  key={level}
                  style={[
                    styles.segment,
                    {
                      backgroundColor:
                        level <= strength
                          ? strength <= 1
                            ? colors.danger
                            : strength <= 3
                            ? colors.primary
                            : colors.success
                          : colors.border,
                    },
                  ]}
                />
              ))}
            </View>
            <Text style={{ color: colors.textMuted, fontSize: typography.sizes.xs * textScale }}>
              Fortaleza: {strength <= 1 ? 'Debil' : strength <= 3 ? 'Media' : 'Fuerte'}
            </Text>
          </View>
        ) : null}

        <AppInput
          label="Repetir contrasena"
          value={form.confirmPassword}
          onChangeText={(confirmPassword) => setForm((prev) => ({ ...prev, confirmPassword }))}
          placeholder="........"
          secureTextEntry={!showConfirm}
          rightIcon={showConfirm ? 'eye-off' : 'eye'}
          onRightPress={() => setShowConfirm((prev) => !prev)}
          error={errors.confirmPassword}
        />

        <AppButton title="Registrarse" onPress={submit} loading={registering} style={{ marginTop: spacing.md }} />

        <View style={styles.footer}>
          <Text style={{ color: colors.textMuted, fontSize: typography.sizes.sm * textScale }}>Ya tienes cuenta?</Text>
          <Pressable onPress={() => navigation.navigate('Login')}>
            <Text style={{ color: colors.primary, fontWeight: typography.weights.semibold, fontSize: typography.sizes.sm * textScale }}>
              Inicia sesion
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <Modal
        visible={showPositionPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPositionPicker(false)}
      >
        <Pressable
          style={[styles.selectOverlay, { backgroundColor: colors.overlay }]}
          onPress={() => setShowPositionPicker(false)}
        >
          <View style={[styles.selectMenu, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
            <Pressable
              onPress={() => {
                setForm((prev) => ({ ...prev, position: '' }));
                setShowPositionPicker(false);
              }}
              style={[styles.selectMenuItem, form.position === '' && { backgroundColor: `${colors.primary}22` }]}
            >
              <Text
                style={{
                  color: selectTextColor,
                  fontFamily: typography.families.nougat,
                  fontSize: selectItemFontSize,
                  textAlign: 'center',
                }}
              >
                Selecciona tu posicion
              </Text>
            </Pressable>
            {positionOptions.map((position) => (
              <Pressable
                key={position}
                onPress={() => {
                  setForm((prev) => ({ ...prev, position }));
                  setShowPositionPicker(false);
                }}
                style={[styles.selectMenuItem, position === form.position && { backgroundColor: `${colors.primary}22` }]}
              >
                <Text
                  style={{
                    color: selectTextColor,
                    fontFamily: typography.families.nougat,
                    fontSize: selectItemFontSize,
                    textAlign: 'center',
                  }}
                >
                  {position}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={showTeamPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTeamPicker(false)}
      >
        <Pressable
          style={[styles.selectOverlay, { backgroundColor: colors.overlay }]}
          onPress={() => setShowTeamPicker(false)}
        >
          <View style={[styles.selectMenu, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
            <Pressable
              onPress={() => {
                setForm((prev) => ({ ...prev, team: '' }));
                setShowTeamPicker(false);
              }}
              style={[styles.selectMenuItem, form.team === '' && { backgroundColor: `${colors.primary}22` }]}
            >
              <Text
                style={{
                  color: selectTextColor,
                  fontFamily: typography.families.nougat,
                  fontSize: selectItemFontSize,
                  textAlign: 'center',
                }}
              >
                Selecciona tu equipo
              </Text>
            </Pressable>
            <View style={styles.selectMenuGrid}>
              {teamOptions.map((team, index) => (
                <Pressable
                  key={team}
                  onPress={() => {
                    setForm((prev) => ({ ...prev, team }));
                    setShowTeamPicker(false);
                  }}
                  style={[
                    styles.selectMenuItem,
                    styles.selectMenuItemHalf,
                    index % 3 === 1 && { backgroundColor: teamColumnHighlight },
                    team === form.team && { backgroundColor: `${colors.primary}22` },
                  ]}
                >
                  <Text
                    style={{
                      color: selectTextColor,
                      fontFamily: typography.families.nougat,
                      fontSize: selectTeamItemFontSize,
                      textAlign: 'center',
                    }}
                  >
                    {team}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </Pressable>
      </Modal>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 32,
  },
  label: {
    marginBottom: 8,
    fontWeight: '600',
  },
  selectWrap: {
    borderWidth: 0,
    borderRadius: 18,
    marginBottom: 8,
    minHeight: 52,
    justifyContent: 'center',
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  selectOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 18,
  },
  selectMenu: {
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  selectMenuItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  selectMenuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  selectMenuItemHalf: {
    width: '33.3333%',
  },
  error: {
    fontSize: 12,
    marginBottom: 12,
  },
  hint: {
    fontSize: 12,
    marginBottom: 12,
  },
  strengthBar: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  segment: {
    flex: 1,
    height: 5,
    borderRadius: 8,
  },
  footer: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  photoPicker: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 18,
    overflow: 'hidden',
    minHeight: 136,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  photoPreview: {
    width: '100%',
    height: 120,
    borderRadius: 12,
  },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
});
