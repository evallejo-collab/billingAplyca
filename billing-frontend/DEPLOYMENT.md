# 🚀 Guía de Deployment en Vercel

## 📋 Preparativos

### 1. Verificar el Build Local
```bash
# Desde el directorio billing-frontend
cd billing-frontend
npm run build
```

### 2. Variables de Entorno Necesarias
Tendrás que configurar estas variables en Vercel:
```env
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_clave_anonima_de_supabase
```

## 🌐 Método 1: Deploy desde GitHub (Recomendado)

### Paso 1: Ir a Vercel
1. Ve a [vercel.com](https://vercel.com)
2. Haz login con tu cuenta de GitHub
3. Haz clic en "New Project"

### Paso 2: Importar Repositorio
1. Busca tu repositorio: `evallejo-collab/billingAplyca`
2. Haz clic en "Import"
3. **IMPORTANTE**: Configura el directorio root como `billing-frontend`

### Paso 3: Configurar el Proyecto
```
Framework Preset: Vite
Root Directory: billing-frontend
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

### Paso 4: Variables de Entorno
1. En la sección "Environment Variables"
2. Agrega cada variable:
   - `VITE_SUPABASE_URL` = `https://tu-proyecto.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `tu-clave-anonima`

### Paso 5: Deploy
1. Haz clic en "Deploy"
2. Espera a que termine el build
3. ¡Tu app estará disponible en tu dominio de Vercel!

## 💻 Método 2: Deploy con CLI

### Paso 1: Instalar Vercel CLI
```bash
npm install -g vercel
```

### Paso 2: Login
```bash
vercel login
```

### Paso 3: Configurar Proyecto
```bash
# Desde el directorio billing-frontend
cd billing-frontend
vercel
```

Responde las preguntas:
- Set up and deploy "billing-frontend"? **Y**
- Which scope? **Tu username**
- Link to existing project? **N**
- What's your project's name? **billing-system**
- In which directory is your code located? **./**

### Paso 4: Configurar Variables de Entorno
```bash
vercel env add VITE_SUPABASE_URL
# Introduce tu URL de Supabase

vercel env add VITE_SUPABASE_ANON_KEY
# Introduce tu clave anónima
```

### Paso 5: Deploy a Producción
```bash
vercel --prod
```

## 🔧 Configuración Adicional

### vercel.json (Opcional)
Crear en la raíz de `billing-frontend`:
```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "outputDirectory": "dist",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

## 🌍 Configuración de Dominio Personalizado

### En Vercel Dashboard:
1. Ve a tu proyecto
2. Clic en "Settings" → "Domains"
3. Agrega tu dominio personalizado
4. Configura los DNS según las instrucciones

## 🔄 Actualizaciones Automáticas

Una vez configurado con GitHub:
- Cada push a `main` activará un deploy automático
- Preview deployments para otras ramas
- Rollback fácil desde el dashboard

## 🛠️ Troubleshooting

### Error: "Command failed"
- Verifica que `npm run build` funcione localmente
- Revisa que las variables de entorno estén configuradas

### Error: "Module not found"
- Asegúrate de que el `Root Directory` sea `billing-frontend`
- Verifica que `package.json` esté en el directorio correcto

### Error: "Build succeeded but app doesn't load"
- Verifica las variables de entorno en Vercel
- Revisa la configuración de Supabase (CORS, dominios)

### Error: "Supabase connection failed"
- Verifica que las variables de entorno estén correctas
- Asegúrate de que la URL no tenga trailing slash
- Verifica que la clave anónima tenga los permisos correctos

## 📱 Verificación Post-Deployment

1. **Funcionalidad básica**:
   - Login/logout funciona
   - Navegación entre páginas
   - Carga de datos desde Supabase

2. **Responsive design**:
   - Probar en móvil
   - Probar en tablet
   - Probar en desktop

3. **Performance**:
   - Verificar tiempos de carga
   - Probar en conexiones lentas

## 🔐 Configuración de Supabase para Producción

En tu proyecto de Supabase:
1. Ve a "Settings" → "API"
2. En "Site URL", agregar tu dominio de Vercel
3. En "Redirect URLs", agregar:
   - `https://tu-dominio.vercel.app`
   - `https://tu-dominio.vercel.app/login`

## 🎉 ¡Listo!

Tu sistema de facturación estará disponible en:
`https://tu-proyecto.vercel.app`

### Próximos pasos:
- [ ] Configurar dominio personalizado
- [ ] Configurar analytics
- [ ] Configurar monitoring
- [ ] Backup de base de datos