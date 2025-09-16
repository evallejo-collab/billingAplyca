# Desplegar Edge Function para Creación de Usuarios

## Pasos para desplegar:

### 1. Instalar Supabase CLI (si no está instalado)
```bash
npm install -g supabase
```

### 2. Login a Supabase
```bash
npx supabase login
```

### 3. Vincular proyecto
```bash
cd /Users/edwinvallejo/billing_system
npx supabase link --project-ref [YOUR_PROJECT_ID]
```

### 4. Desplegar la función
```bash
npx supabase functions deploy create-user
```

### 5. Configurar variables de entorno (en Dashboard de Supabase)
- Ve a Settings → Edge Functions
- Agrega estas variables:
  - `SUPABASE_URL`: Tu URL de Supabase
  - `SUPABASE_SERVICE_ROLE_KEY`: Tu service role key (¡mantenerla secreta!)
  - `SUPABASE_ANON_KEY`: Tu anon key

## Alternativa: Deploy manual

Si prefieres, puedo ayudarte a desplegar esto manualmente desde el Dashboard de Supabase:

1. Ve a Edge Functions en tu Dashboard
2. Crea nueva función llamada "create-user"  
3. Copia el código TypeScript
4. Configura las variables de entorno

¿Qué método prefieres usar?