import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useAppTheme } from '../hooks/useAppTheme';
import useResetScrollOnFocus from '../hooks/useResetScrollOnFocus';
import ScreenGradient from '../components/ScreenGradient';
import Header from '../components/Header';
import AppButton from '../components/AppButton';
import AppInput from '../components/AppInput';
import { getCategories } from '../api/backend';

export default function SearchScreen({ navigation }) {
  const { colors, spacing, typography, textScale, darkMode, highContrast } = useAppTheme();

  const [username, setUsername] = useState('');
  const [category, setCategory] = useState('Todos');
  const [categories, setCategories] = useState([]);
  const [sortBy, setSortBy] = useState('Mas recientes');
  const [focusedPicker, setFocusedPicker] = useState(null);
  const scrollRef = useRef(null);

  useResetScrollOnFocus(scrollRef);

  const selectFontSize = 12 * textScale;
  const selectTextColor = highContrast ? colors.primary : darkMode ? colors.white : colors.text;

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

  const categoryOptions = useMemo(() => {
    const normalized = new Map();
    categories.forEach((item) => {
      const trimmed = String(item ?? '').trim();
      if (!trimmed) return;
      const key = trimmed.toLowerCase();
      if (!normalized.has(key)) {
        normalized.set(key, trimmed);
      }
    });

    return ['Todos', ...Array.from(normalized.values())];
  }, [categories]);

  return (
    <ScreenGradient>
      <Header title="Busqueda" onBack={() => navigation.goBack()} />

      <ScrollView ref={scrollRef} contentContainerStyle={{ padding: spacing.xl }}>
        <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={{ color: colors.text, fontWeight: typography.weights.bold, fontSize: typography.sizes.lg * textScale, marginBottom: spacing.md }}>
            Busqueda Avanzada
          </Text>

          <AppInput
            label="Usuario"
            value={username}
            onChangeText={setUsername}
            placeholder="Buscar usuario..."
          />

          <Text style={[styles.label, { color: colors.text, fontSize: typography.sizes.sm * textScale }]}>Categoria</Text>
          <View
            style={[
              styles.pickerWrap,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: focusedPicker === 'category' ? colors.primary : colors.border,
              },
            ]}
          >
            <Picker
              selectedValue={category}
              style={{ color: selectTextColor, backgroundColor: 'transparent', fontSize: selectFontSize }}
              itemStyle={{ color: selectTextColor, fontSize: selectFontSize }}
              dropdownIconColor={selectTextColor}
              onFocus={() => setFocusedPicker('category')}
              onBlur={() => setFocusedPicker(null)}
              onValueChange={setCategory}
            >
                {categoryOptions.map((item) => (
                <Picker.Item key={item} label={item} value={item} color={selectTextColor} />
              ))}
            </Picker>
          </View>

          <Text style={[styles.label, { color: colors.text, fontSize: typography.sizes.sm * textScale }]}>Ordenar por</Text>
          <View
            style={[
              styles.pickerWrap,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: focusedPicker === 'sort' ? colors.primary : colors.border,
              },
            ]}
          >
            <Picker
              selectedValue={sortBy}
              style={{ color: selectTextColor, backgroundColor: 'transparent', fontSize: selectFontSize }}
              itemStyle={{ color: selectTextColor, fontSize: selectFontSize }}
              dropdownIconColor={selectTextColor}
              onFocus={() => setFocusedPicker('sort')}
              onBlur={() => setFocusedPicker(null)}
              onValueChange={setSortBy}
            >
              <Picker.Item label="Mas recientes" value="Mas recientes" color={selectTextColor} />
              <Picker.Item label="Mas gustados" value="Mas gustados" color={selectTextColor} />
              <Picker.Item label="Mas comentados" value="Mas comentados" color={selectTextColor} />
            </Picker>
          </View>

          <AppButton title="Buscar" onPress={() => navigation.navigate('Home')} style={{ marginTop: spacing.md }} />
        </View>
      </ScrollView>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
  },
  label: {
    marginBottom: 8,
    fontWeight: '600',
  },
  pickerWrap: {
    borderWidth: 1,
    borderRadius: 14,
    marginBottom: 12,
    minHeight: 52,
    justifyContent: 'center',
  },
});
