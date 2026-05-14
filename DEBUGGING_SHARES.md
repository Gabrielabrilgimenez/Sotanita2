# Debugging: Compartir en RRSS + Error Registro en Hosting

## 🔴 PROBLEMA RAÍZ IDENTIFICADO

**`EXPO_PUBLIC_BACKEND_URL` NO ESTÁ CONFIGURADO EN VERCEL**

Esto causa que:
1. La app use `http://localhost:5000` (fallback)
2. Las requests a `/api/temp-shares/:videoId` y `/api/equipo/idPorNombre` fallen
3. Los botones de compartir no hacen nada (prepareTempShare falla silenciosamente)
4. El registro falla con "Usuario no encontrado" (error al buscar el equipo)

---

## ✅ SOLUCIÓN

### Paso 1: Configurar Variables en Vercel

1. **Ve a tu proyecto en Vercel**: https://vercel.com/dashboard
2. **Selecciona tu proyecto** (el de sotanita)
3. **Settings → Environment Variables**
4. **Agrega estas variables**:

| Variable | Valor |
|----------|-------|
| `EXPO_PUBLIC_BACKEND_URL` | `https://tu-backend-render.onrender.com` |
| `EXPO_PUBLIC_FRONTEND_URL` | `https://sotanita.vercel.app` |
| `EXPO_PUBLIC_API_URL` | `https://tu-backend-render.onrender.com` |

**Reemplaza `https://tu-backend-render.onrender.com` con tu URL real del backend en Render**

5. **Save** y espera a que se re-deploy automáticamente

### Paso 2: Verificar que el backend es accesible

En la terminal, verifica que tu URL de Render es accesible:
```bash
curl https://tu-backend-render.onrender.com/api/equipos/nombres
```

Debería devolver un JSON con los equipos.

### Paso 3: Verificar en la app

Abre la app y prueba:
1. ✅ Intenta compartir un video a X/WhatsApp/Instagram
2. ✅ Abre DevTools (F12) → Console
3. ✅ Deberías ver logs como:
   ```
   prepareTempShare URL: https://tu-backend-render.onrender.com/api/temp-shares/...
   prepareTempShare response status: 200
   prepareTempShare data: {fileUrl: "...", shareUrl: "..."}
   ```
4. ✅ Intenta registrarte con un equipo válido

---

## 📋 Cambios en el Código (ya aplicados)

### HomeScreen.js

#### Función `prepareTempShare()` (línea ~1065):
- ✅ Agregado logging detallado
- ✅ Muestra la URL siendo usada
- ✅ Muestra el status de la respuesta
- ✅ Log de errores detallados

#### Funciones `handleShareToX/WhatsApp/Instagram()`:
- ✅ Mejorado error logging
- ✅ Ahora muestra el error específico en Alert
- ✅ Usuario verá: `Error: No se pudo preparar el archivo para compartir: [ERROR_DETAILS]`

---

## 🔧 Flujo de Compartir (Mobile Web en Vercel)

```
Button Press
    ↓
handleShareToX/WhatsApp/Instagram()
    ↓
prepareTempShare() ← POST /api/temp-shares/:videoId
    ↓
[AQUÍ FALLA EN HOSTING] (si BACKEND_URL es incorrecto)
    ↓
    ├─ Si exitoso → share al hacer descarga o deeplink
    ├─ Si falla → Alert con error específico
```

---

## 🐛 Problemas Específicos

### Compartir en RRSS no funciona en móvil
**Causa**: BACKEND_URL = `http://localhost:5000` (no accesible)
**Síntoma**: Botones se pulsan y se difuminan pero no pasa nada  
**Solución**: Configurar EXPO_PUBLIC_BACKEND_URL en Vercel

### Error "Usuario no encontrado" al registrar
**Causa**: `getTeamIdByName()` falla porque no puede alcanzar `/api/equipo/idPorNombre`
**Síntoma**: Cannot register, error appears after submitting  
**Solución**: Configurar EXPO_PUBLIC_BACKEND_URL en Vercel

---

## 📝 Nota sobre Plataformas

- **Escritorio (web)**: Funciona sin instalación nativa
- **Móvil (web desde Vercel)**: Usa deeplinks a apps (X, WhatsApp, Instagram)
- **Móvil (app nativa)**: Usa react-native-share para compartir archivos

---

## 🚀 Después de Configurar

Los problemas deberían resolverse:
- ✅ Compartir a RRSS funciona en móvil
- ✅ Puedes registrarte desde la app
- ✅ Los logs muestran URLs correctas

Si persisten los problemas:
1. Abre DevTools en Vercel
2. Busca logs de `prepareTempShare`
3. Verifica que el BACKEND_URL es correcto
4. Verifica que /api/temp-shares/:videoId devuelve 200

