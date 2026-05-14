# INSTRUCCIONES URGENTES: Arreglar Compartir y Registro en Hosting

## 🎯 EL PROBLEMA

Tu app en Vercel no funciona porque le falta configurar las URLs del backend:

1. **Compartir videos a RRSS en móvil**: Los botones no hacen nada
2. **Registrarse desde la app**: Da error "Usuario no encontrado"

**Causa:** La app intenta conectarse a `http://localhost:5000` en lugar de tu backend de Render.

---

## ✅ LA SOLUCIÓN (5 minutos)

### PASO 1: Ir a Vercel Dashboard
```
https://vercel.com/dashboard
```

### PASO 2: Seleccionar tu proyecto
Haz clic en tu proyecto de **sotanita**

### PASO 3: Ir a Settings → Environment Variables
En el menú de la izquierda: **Settings** → **Environment Variables**

### PASO 4: Agregar 3 variables

**Variable 1:**
- Name: `EXPO_PUBLIC_BACKEND_URL`
- Value: `https://TU_BACKEND.onrender.com`
  - (Reemplaza TU_BACKEND con tu URL real de Render, ej: `https://sotanita-backend.onrender.com`)
- Click "Save"

**Variable 2:**
- Name: `EXPO_PUBLIC_FRONTEND_URL`
- Value: `https://sotanita.vercel.app`
- Click "Save"

**Variable 3:**
- Name: `EXPO_PUBLIC_API_URL`
- Value: `https://TU_BACKEND.onrender.com`
  - (Mismo que Variable 1)
- Click "Save"

### PASO 5: Esperar re-deploy automático

Vercel automáticamente va a re-deployar tu app con las nuevas variables (espera 2-3 minutos)

---

## 🧪 VERIFICAR QUE FUNCIONA

### En la app:
1. Abre la app en https://sotanita.vercel.app
2. **Prueba 1**: Intenta compartir un video a X/WhatsApp
   - ✅ Debería funcionar sin errores
   - ❌ Si falla, continúa leyendo
3. **Prueba 2**: Intenta registrarte con un equipo
   - ✅ Debería completarse sin "Usuario no encontrado"
   - ❌ Si falla, continúa leyendo

### En DevTools (si algo falla):
1. Abre la app
2. Presiona F12 (Developer Tools)
3. Vete a **Console**
4. Intenta compartir un video
5. Deberías ver logs como:
   ```
   prepareTempShare URL: https://sotanita-backend.onrender.com/api/temp-shares/...
   prepareTempShare response status: 200
   ```
6. **Si ves `http://localhost:5000`**: Las variables no se guardaron correctamente

---

## 🔍 SI SIGUE SIN FUNCIONAR

### Opción 1: Forzar re-deploy
1. Vercel Dashboard → tu proyecto
2. Click en el deployment más reciente
3. Click "Redeploy"
4. Espera a que termine (déjalo trabajar 2-3 minutos)

### Opción 2: Verificar que el backend funciona
En tu terminal o navegador, prueba:
```
https://TU_BACKEND.onrender.com/api/equipos/nombres
```
Debería devolver JSON con equipos. Si no funciona:
- Tu Render backend podría estar durmido (Render pone apps en sleep después de 15 min inactividad)
- Visita tu backend URL en navegador para "despertar" el servidor
- Luego intenta de nuevo

### Opción 3: Contactar soporte
Si después de 10 minutos sigue sin funcionar, comprueba:
1. Tu URL de Render en Vercel variables está correcta (sin errores de tipeo)
2. El backend en Render está "awake" (visitándolo en navegador)
3. Las 3 variables están en Vercel (puede haberse guardado solo una)

---

## 📝 CAMBIOS HECHOS AL CÓDIGO

He mejorado los logs para que puedas ver exactamente qué está pasando:

- **prepareTempShare()**: Ahora logea la URL y el resultado
- **Botones de compartir**: Ahora muestran errores específicos en lugar de "no pasó nada"

Así que si aún hay problemas después de configurar las variables, los verás claramente en la consola.

---

## 🚀 RESUMEN

```
ANTES (Sin variables):
  Button → prepareTempShare → HTTP to http://localhost:5000 (❌ FALLA)

DESPUÉS (Con variables):
  Button → prepareTempShare → HTTP to https://sotanita-backend.onrender.com (✅ FUNCIONA)
```

Ese es el único cambio requerido. Las variables de entorno se inyectan en el build de la app.

**¡Hazlo ahora y debería funcionar!** ⚡
