# CAMBIOS REALIZADOS - Diagnóstico Compartir en RRSS

## 📋 Archivos Modificados

### 1. sotanitapp/src/screens/HomeScreen.js

#### A. Función `prepareTempShare()` (línea ~1065)
**Cambio**: Agregado logging detallado para diagnosticar problemas

```javascript
// ANTES:
const prepareTempShare = useCallback(async (videoId) => {
  if (!videoId) throw new Error('videoId es obligatorio');
  const url = `${BACKEND_URL}/api/temp-shares/${encodeURIComponent(String(videoId))}`;
  const res = await fetch(url, { method: 'POST' });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${text}`);
  }
  const data = await res.json();
  return data;
}, []);

// DESPUÉS:
const prepareTempShare = useCallback(async (videoId) => {
  if (!videoId) throw new Error('videoId es obligatorio');
  const url = `${BACKEND_URL}/api/temp-shares/${encodeURIComponent(String(videoId))}`;
  console.log('prepareTempShare URL:', url);  // ← NUEVO
  try {
    const res = await fetch(url, { method: 'POST' });
    console.log('prepareTempShare response status:', res.status);  // ← NUEVO
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('prepareTempShare error:', res.status, text);  // ← NUEVO
      throw new Error(`HTTP ${res.status} ${text}`);
    }
    const data = await res.json();
    console.log('prepareTempShare data:', data);  // ← NUEVO
    return data;
  } catch (err) {
    console.error('prepareTempShare catch error:', err);  // ← NUEVO
    throw err;
  }
}, []);
```

**Beneficio**: Ahora puedes ver exactamente:
- Qué URL se está usando (si es `http://localhost:5000` o la correcta)
- Qué status HTTP devuelve
- Qué error específico ocurre

---

#### B. Función `handleShareToX()` (línea ~1229)
**Cambio**: Mejorado error handling y mensajes

```javascript
// ANTES:
} catch (error) {
  Alert.alert('Error', 'No se pudo preparar el archivo para compartir.');
} finally {
  setIsPreparingShare(false);
}

// DESPUÉS:
} catch (error) {
  console.error('handleShareToX error:', error);  // ← NUEVO
  Alert.alert('Error', `No se pudo preparar el archivo para compartir: ${error.message || error}`);  // ← MEJORADO
} finally {
  setIsPreparingShare(false);
}
```

**Beneficio**: El usuario ahora ve el error específico en lugar de mensaje genérico.

---

#### C. Función `handleShareToWhatsApp()` (línea ~1263)
**Cambio**: Exactamente igual a handleShareToX

```javascript
} catch (error) {
  console.error('handleShareToWhatsApp error:', error);  // ← NUEVO
  Alert.alert('Error', `No se pudo preparar el archivo para compartir: ${error.message || error}`);  // ← MEJORADO
} finally {
  setIsPreparingShare(false);
}
```

---

#### D. Función `handleShareToInstagram()` (línea ~1297)
**Cambio**: Exactamente igual a handleShareToX

```javascript
} catch (error) {
  console.error('handleShareToInstagram error:', error);  // ← NUEVO
  Alert.alert('Error', `No se pudo preparar el archivo para compartir: ${error.message || error}`);  // ← MEJORADO
} finally {
  setIsPreparingShare(false);
}
```

---

## 📝 Archivos Creados

### 1. DEBUGGING_SHARES.md
Guía técnica completa sobre:
- Problema raíz: EXPO_PUBLIC_BACKEND_URL no configurado
- Solución paso a paso
- Cómo verificar
- Flujo de compartir explicado

### 2. INSTRUCCIONES_VERCEL.md (ESTE ES EL IMPORTANTE)
Instrucciones simples para el usuario:
- Qué hacer en Vercel dashboard
- Qué variables agregar y con qué valores
- Cómo verificar que funciona
- Qué hacer si falla

---

## 🧪 Cómo Probar los Cambios

### En Vercel (después de configurar variables):
1. Abre https://sotanita.vercel.app
2. F12 para abrir DevTools
3. Vete a Console
4. Intenta compartir un video
5. Deberías ver logs:
   ```
   prepareTempShare URL: https://tu-backend.onrender.com/api/temp-shares/...
   prepareTempShare response status: 200
   prepareTempShare data: {fileUrl: "...", shareUrl: "..."}
   ```

### Si falla:
1. Los logs mostrarán exactamente qué está mal
2. Podrías ver:
   ```
   prepareTempShare URL: http://localhost:5000/api/temp-shares/...  ← Variables no están configuradas
   prepareTempShare error: Failed to fetch  ← No puede alcanzar localhost
   ```

---

## 🔗 Dependencias de Otros Cambios

Estos cambios NO dependen de:
- Backend
- Funciones de descarga
- Funciones de watermark
- Funciones de deep linking

Son cambios **puramente de diagnóstico** que no alteran la lógica, solo agregan logs.

---

## ⚠️ IMPORTANTE

Si después de configurar las variables en Vercel, los logs aún muestran `http://localhost:5000`:

1. **Variables no se guardaron**: Verifica nuevamente en Vercel Settings
2. **Re-deploy no se completó**: Espera más tiempo
3. **Cache del navegador**: Limpia cache (Ctrl+Shift+Del)
4. **Incógnito**: Prueba en ventana incógnita para evitar cache

El único factor crítico es que EXPO_PUBLIC_BACKEND_URL esté configurado en Vercel.

---

## 📊 Resumen de Cambios

| Archivo | Función | Cambio |
|---------|---------|--------|
| HomeScreen.js | prepareTempShare | Agregado logging |
| HomeScreen.js | handleShareToX | Mejor error message |
| HomeScreen.js | handleShareToWhatsApp | Mejor error message |
| HomeScreen.js | handleShareToInstagram | Mejor error message |
| - | DEBUGGING_SHARES.md | Nuevo (guía técnica) |
| - | INSTRUCCIONES_VERCEL.md | Nuevo (guía usuario) |

**Total**: 4 funciones mejoradas + 2 guías creadas
