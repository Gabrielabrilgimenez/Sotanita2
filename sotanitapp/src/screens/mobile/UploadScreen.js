import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, Alert, Modal, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAppTheme } from '../../hooks/useAppTheme';
import useResetScrollOnFocus from '../../hooks/useResetScrollOnFocus';
import ScreenGradient from '../../components/ScreenGradient';
import Header from '../../components/Header';
import AppInput from '../../components/AppInput';
import AppButton from '../../components/AppButton';
import LoadingOverlay from '../../components/LoadingOverlay';
import ErrorPopup from '../../components/ErrorPopup';
import { getCategories, uploadVideo } from '../../api/backend';
import { useAuth } from '../../context/AuthContext';

export default function UploadScreen({ navigation }) {
  const { colors, spacing, typography, textScale, darkMode, highContrast } = useAppTheme();
  const { user } = useAuth();

  const [mediaFiles, setMediaFiles] = useState([]);
  const [mediaType, setMediaType] = useState(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [description, setDescription] = useState('');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showInvalidMediaPopup, setShowInvalidMediaPopup] = useState(false);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  const invalidMediaMessage = 'El contenido multimedia seleccionado no es valido. Este formulario espera videos o imagenes verticales (si es video, solo uno).';
  const showInvalidMediaAlert = () => {
    setShowInvalidMediaPopup(true);
  };

  useResetScrollOnFocus(scrollRef);

  const categoryFontSize = 26 * textScale;
  const categoryItemFontSize = 22 * textScale;
  const categoryTextColor = highContrast ? colors.primary : darkMode ? colors.white : colors.text;
  const categoryLabel = category || 'Selecciona una categoría';
  const categoryLabelColor = categoryTextColor;
  const categorySelectBackground = `${colors.surface}99`;

  useEffect(() => {
    let mounted = true;

    const loadCategories = async () => {
      try {
        const data = await getCategories();
        if (mounted) {
          setCategories(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        if (mounted) {
          setCategories([]);
        }
      }
    };

    loadCategories();

    return () => {
      mounted = false;
    };
  }, []);

  const isMobileVideoRatio = (width, height) => {
    if (!width || !height) return false;
    const ratio = width / height;
    return ratio >= 0.45 && ratio <= 0.8;
  };

  const getMediaDimensions = async (asset) => {
    if (asset?.width && asset?.height) {
      return { width: asset.width, height: asset.height };
    }

    if (Platform.OS !== 'web') {
      return { width: null, height: null };
    }

    const uri = asset?.uri;
    if (!uri) return { width: null, height: null };

    return new Promise((resolve) => {
      if (asset?.type === 'image') {
        const img = new globalThis.Image();
        img.onload = () => resolve({ width: img.width || null, height: img.height || null });
        img.onerror = () => resolve({ width: null, height: null });
        img.src = uri;
      } else {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
          resolve({ width: video.videoWidth || null, height: video.videoHeight || null });
        };
        video.onerror = () => resolve({ width: null, height: null });
        video.src = uri;
      }
    });
  };

  const pickVideo = async () => {
    // Pedir permisos si es necesario
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert("Permisos requeridos", "Necesitas permisos para acceder a tus archivos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      selectionLimit: 12,
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const assets = result.assets;
      const types = new Set(assets.map((asset) => asset.type));

      if (types.has('video') && assets.length > 1) {
        showInvalidMediaAlert();
        return;
      }

      if (types.size > 1) {
        showInvalidMediaAlert();
        return;
      }

      const normalizedFiles = [];
      for (const asset of assets) {
        if (asset.type && asset.type !== 'video' && asset.type !== 'image') {
          showInvalidMediaAlert();
          return;
        }

        const { width, height } = await getMediaDimensions(asset);
        if (!isMobileVideoRatio(width, height)) {
          showInvalidMediaAlert();
          return;
        }

        normalizedFiles.push({
          uri: asset.uri,
          type: asset.type === 'image' ? 'image/jpeg' : 'video/mp4',
          name: asset.uri.split('/').pop() || 'archivo_subido',
          file: Platform.OS === 'web' ? asset.file : undefined,
        });
      }

      const nextMediaType = types.has('video')
        ? 'video'
        : assets.length > 1
          ? 'carousel'
          : 'image';

      setMediaFiles(normalizedFiles);
      setMediaType(nextMediaType);
    }
  };

  const checkAndUpload = async () => {
    if (!mediaFiles.length || !title || !category) {
      Alert.alert('Error', 'Debes completar el título, categoría y seleccionar un archivo.');
      return;
    }

    if (!user || !user.email) {
      Alert.alert('Error', 'Necesitas iniciar sesión para subir un video.');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      
      // Adjuntar archivo (diferente en Web vs Móvil Nativo)
      if (mediaFiles.length > 1) {
        mediaFiles.forEach((file) => {
          if (Platform.OS === 'web' && file.file) {
            formData.append('files', file.file);
          } else {
            formData.append('files', {
              uri: file.uri,
              type: file.type,
              name: file.name,
            });
          }
        });
      } else {
        const file = mediaFiles[0];
        if (Platform.OS === 'web' && file.file) {
          formData.append('file', file.file);
        } else {
          formData.append('file', {
            uri: file.uri,
            type: file.type,
            name: file.name,
          });
        }
      }

      // Adjuntar datos adicionales
      formData.append('title', title);
      formData.append('category', category);
      formData.append('description', description);
      formData.append('id_usuario', user.email);

      await uploadVideo(formData);

      Alert.alert('Éxito', 'Video subido con éxito a Cloudinary y base de datos.');
      
      // Limpiar formulario y navigar
      setMediaFiles([]);
      setMediaType(null);
      setTitle('');
      setCategory('');
      setDescription('');
      navigation.navigate('Home');

    } catch (error) {
      console.error(error);
      Alert.alert('Error de Subida', error.message || 'Ocurrió un problema en el proceso');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenGradient>
      <Header
        title="Subir video"
        titleSize="xxl"
        titleScale={1.3}
        titleStyle={{ transform: [{ scaleY: 1.12 }], letterSpacing: -0.8 }}
        onBack={() => navigation.goBack()}
      />

      <ScrollView ref={scrollRef} contentContainerStyle={{ padding: spacing.xl, paddingBottom: 30 }}>
        <View style={{ marginBottom: spacing.lg }}>
          {!mediaFiles.length ? (
            <Pressable
              onPress={pickVideo}
              style={[styles.uploadArea, { backgroundColor: colors.surface, borderColor: colors.border }]}
              disabled={loading}
            >
              <Ionicons name="cloud-upload-outline" size={70} color={colors.textMuted} />
              <Text style={{ color: colors.text, fontWeight: typography.weights.semibold, marginTop: spacing.sm }}>Selecciona un archivo</Text>
              <Text style={{ color: colors.textMuted, fontSize: typography.sizes.xs * textScale }}>Video o carrusel de imagenes verticales</Text>
            </Pressable>
          ) : (
            <View style={[styles.previewArea, { backgroundColor: colors.surface }]}> 
              <View style={[styles.mockVideo, { backgroundColor: `${colors.secondary}22` }]}>
                {mediaType === 'video' ? (
                  <Ionicons name="play" size={68} color={colors.textMuted} />
                ) : (
                  <Ionicons name="image" size={68} color={colors.textMuted} />
                )}
              </View>
              <Pressable onPress={() => { setMediaFiles([]); setMediaType(null); }} style={[styles.removeButton, { backgroundColor: `${colors.black}88` }]} disabled={loading}> 
                <Ionicons name="close" size={20} color={colors.white} />
              </Pressable>
              <View style={[styles.fileTag, { backgroundColor: `${colors.black}88` }]}> 
                <Text style={{ color: colors.white, fontWeight: typography.weights.semibold }} numberOfLines={1}>
                  {mediaType === 'carousel'
                    ? `${mediaFiles.length} imagenes seleccionadas`
                    : mediaFiles[0]?.name}
                </Text>
              </View>
            </View>
          )}
        </View>

        <AppInput
          label="Título"
          value={title}
          onChangeText={setTitle}
          placeholder="Describe tu jugada..."
        />

        <Text style={{ color: colors.text, fontWeight: typography.weights.semibold, marginBottom: spacing.xs }}>Categoría</Text>
        <View style={[styles.categorySelectWrap, { backgroundColor: categorySelectBackground }]}> 
          <Pressable style={styles.categorySelectButton} onPress={() => setShowCategoryPicker(true)}>
            <Text
              style={{
                color: categoryLabelColor,
                fontFamily: typography.families.nougat,
                fontSize: categoryFontSize,
                textAlign: 'center',
                flex: 1,
              }}
              numberOfLines={1}
            >
              {categoryLabel}
            </Text>
            <Ionicons name="chevron-down" size={20} color={categoryTextColor} />
          </Pressable>
        </View>

        <AppInput
          label="Descripción (opcional)"
          value={description}
          onChangeText={setDescription}
          placeholder="Añade más detalles sobre tu video..."
          multiline
          numberOfLines={4}
        />

        <AppButton
          title="Publicar video"
          onPress={checkAndUpload}
          disabled={loading || !mediaFiles.length || !title || !category}
          loading={loading}
          style={{ marginTop: spacing.md }}
        />
      </ScrollView>

      <Modal
        visible={showCategoryPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCategoryPicker(false)}
      >
        <Pressable
          style={[styles.categoryOverlay, { backgroundColor: colors.overlay }]}
          onPress={() => setShowCategoryPicker(false)}
        >
          <View style={[styles.categoryMenu, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
            <Pressable
              onPress={() => {
                setCategory('');
                setShowCategoryPicker(false);
              }}
              style={[styles.categoryMenuItem, category === '' && { backgroundColor: `${colors.primary}15` }]}
            >
              <Text
                style={{
                  color: categoryTextColor,
                  fontFamily: typography.families.nougat,
                  fontSize: categoryItemFontSize,
                  textAlign: 'center',
                }}
              >
                Selecciona una categoría
              </Text>
            </Pressable>
            {categories.map((item) => (
              <Pressable
                key={item}
                onPress={() => {
                  setCategory(item);
                  setShowCategoryPicker(false);
                }}
                style={[styles.categoryMenuItem, item === category && { backgroundColor: `${colors.primary}15` }]}
              >
                <Text
                  style={{
                    color: categoryTextColor,
                    fontFamily: typography.families.nougat,
                    fontSize: categoryItemFontSize,
                    textAlign: 'center',
                  }}
                >
                  {item}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
      <LoadingOverlay visible={loading} />
      <ErrorPopup
        visible={showInvalidMediaPopup}
        title="X Uppss ha ocurrido un error"
        message={invalidMediaMessage}
        onClose={() => setShowInvalidMediaPopup(false)}
      />
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  uploadArea: {
    width: '100%',
    aspectRatio: 9 / 16,
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewArea: {
    width: '100%',
    aspectRatio: 9 / 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  mockVideo: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButton: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileTag: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 14,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  categorySelectWrap: {
    borderWidth: 0,
    borderRadius: 18,
    minHeight: 52,
    justifyContent: 'center',
    marginBottom: 12,
  },
  categorySelectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  categoryOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 18,
  },
  categoryMenu: {
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  categoryMenuItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
});
