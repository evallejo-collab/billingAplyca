# 📋 Documentación Técnica - Sistema de Facturación Aplyca

## 🏗️ Arquitectura General

### Stack Tecnológico Principal

- **Frontend**: React 19.1.1 + Vite 4.5.3
- **Styling**: TailwindCSS 3.3.0 + Tailwind Forms
- **Routing**: React Router DOM 7.8.2
- **Backend**: Supabase (PostgreSQL + Auth + Edge Functions)
- **Hosting**: Vercel
- **Analytics**: Microsoft Clarity
- **Monitoreo**: Vercel Analytics + Speed Insights

### Herramientas de Desarrollo

- **Build Tool**: Vite con HMR
- **Linting**: ESLint 9.33.0
- **Package Manager**: npm
- **Version Control**: Git
- **IDE**: Compatible con VS Code

## 🗂️ Estructura del Proyecto

```
billing_system/
├── billing-frontend/           # Aplicación React principal
│   ├── src/
│   │   ├── components/         # Componentes React
│   │   ├── config/            # Configuración Supabase
│   │   ├── context/           # Context API (Auth)
│   │   ├── hooks/             # Custom hooks
│   │   ├── services/          # API calls y servicios
│   │   ├── utils/             # Utilidades (roles, currency)
│   │   └── main.jsx           # Punto de entrada
│   ├── public/                # Assets estáticos
│   ├── dist/                  # Build de producción
│   └── database-updates/      # Migraciones SQL
├── supabase/                  # Edge Functions
│   └── functions/
│       ├── create-user/       # Creación de usuarios
│       └── invite-user/       # Sistema de invitaciones
└── *.sql                      # Scripts de base de datos
```

## 🎨 Arquitectura Frontend

### Componentes Principales

#### 1. **Layout.jsx** - Navegación Principal
- **Ubicación**: `/src/components/Layout.jsx`
- **Responsabilidades**:
  - Header con navegación responsive
  - Mega menús organizados por funcionalidad
  - Sidebar móvil colapsible
  - Control de permisos por rol
- **Características**:
  - Navegación adaptive según rol del usuario
  - Mega menús: Gestión, Trabajo, Análisis, Admin
  - Sidebar móvil que ahora muestra todos los elementos
  - Integración con sistema de roles

#### 2. **AuthContext.jsx** - Gestión de Autenticación
- **Ubicación**: `/src/context/AuthContext.jsx`
- **Responsabilidades**:
  - Gestión de sesiones con Supabase
  - Control de estado de autenticación
  - Verificación de permisos
  - Limpieza de sesión al logout

#### 3. **Componentes de Gestión**
- **Clients.jsx**: CRUD de clientes
- **Contracts.jsx**: Gestión de contratos
- **Projects.jsx**: Administración de proyectos
- **Users.jsx**: Gestión de usuarios del sistema

#### 4. **Componentes de Trabajo**
- **TimeEntries.jsx**: Registro de tiempo trabajado
- **Billing.jsx**: Facturación y pagos
- **PaymentWizard.jsx**: Flujo de creación de pagos

#### 5. **Componentes de Análisis**
- **Dashboard.jsx**: Panel principal con métricas
- **Reports.jsx**: Reportes y estadísticas
- **ClientPortal.jsx**: Vista específica para clientes

#### 6. **Modales y Formularios**
- **TimeEntryModal.jsx**: Entrada de tiempo
- **PaymentWizard.jsx**: Proceso de pagos
- **ClientModal.jsx**: Gestión de clientes
- **ProjectModal.jsx**: Gestión de proyectos

### Estado y Contexto

#### AuthContext
- Maneja autenticación con Supabase
- Controla roles y permisos
- Gestiona sesiones persistentes
- Limpieza automática de localStorage

### Routing y Navegación

```jsx
// Rutas principales organizadas por permisos
- /dashboard      # Panel principal
- /clients        # Gestión de clientes
- /contracts      # Contratos
- /projects       # Proyectos
- /time-entries   # Registro de tiempo
- /billing        # Facturación
- /reports        # Reportes
- /users          # Admin: Usuarios
- /portal         # Cliente: Portal específico
```

## 🗃️ Base de Datos y Backend

### Supabase - PostgreSQL

#### Tablas Principales
- **user_profiles**: Perfiles de usuario con roles
- **clients**: Información de clientes
- **contracts**: Contratos con clientes
- **projects**: Proyectos asociados a contratos
- **time_entries**: Registro de horas trabajadas
- **payments**: Pagos y facturación
- **user_client_associations**: Relación usuarios-clientes

#### Edge Functions (Deno)

##### 1. create-user/index.ts
- **Propósito**: Creación administrativa de usuarios
- **Autenticación**: Requiere token de admin
- **Funcionalidades**:
  - Validación de permisos de admin
  - Creación de usuario en Supabase Auth
  - Creación automática de perfil
  - Asignación de roles

##### 2. invite-user/index.ts
- **Propósito**: Sistema de invitaciones
- **Funcionalidades**:
  - Envío de invitaciones por email
  - Generación de tokens temporales
  - Validación de invitaciones

### Row Level Security (RLS)
- Políticas de seguridad por tabla
- Acceso basado en roles
- Restricciones por cliente para usuarios tipo 'client'

### Migraciones de Base de Datos

#### database-updates/
- **001_increase_payment_amount_precision.sql**: Aumenta precisión de montos
- **002_add_equivalent_hours_to_payments.sql**: Campo de horas equivalentes

## 🔐 Sistema de Autenticación y Roles

### Arquitectura de Permisos

#### Roles del Sistema
```javascript
ROLES = {
  ADMIN: 'admin',           // Acceso completo
  COLLABORATOR: 'collaborator', // Acceso limitado
  CLIENT: 'client'          // Solo portal cliente
}
```

#### Permisos Granulares
```javascript
PERMISSIONS = {
  // Dashboard
  VIEW_DASHBOARD: 'view_dashboard',
  
  // CRUD por módulo
  VIEW_CLIENTS, CREATE_CLIENTS, EDIT_CLIENTS, DELETE_CLIENTS,
  VIEW_CONTRACTS, CREATE_CONTRACTS, EDIT_CONTRACTS, DELETE_CONTRACTS,
  VIEW_PROJECTS, CREATE_PROJECTS, EDIT_PROJECTS, DELETE_PROJECTS,
  
  // Tiempo y facturación
  VIEW_TIME_ENTRIES, CREATE_TIME_ENTRIES, EDIT_TIME_ENTRIES,
  VIEW_ALL_TIME_ENTRIES, // Para ver entradas de otros
  VIEW_PAYMENTS, CREATE_PAYMENTS, EDIT_PAYMENTS,
  
  // Reportes y análisis
  VIEW_REPORTS, VIEW_MONTHLY_REPORTS, VIEW_PROJECT_REPORTS,
  
  // Administración
  MANAGE_USERS, MANAGE_SYSTEM
}
```

#### Mapeo Rol-Permisos

- **ADMIN**: Todos los permisos
- **COLLABORATOR**: 
  - Dashboard completo
  - Clientes y contratos (solo lectura)
  - Proyectos (CRUD completo)
  - Tiempo (CRUD sus entradas)
  - Pagos (solo lectura)
  - Reportes completos
- **CLIENT**: 
  - Solo acceso a portal cliente

### Implementación de Seguridad

#### Frontend
```javascript
// Verificación de permisos en componentes
const { checkPermission } = useAuth();
if (!checkPermission(PERMISSIONS.VIEW_CLIENTS)) {
  return <AccessDenied />;
}

// Control de navegación
const isActiveMegaMenu = (megaMenuKey) => {
  return hasPermission(user?.role, permission);
};
```

#### Backend (Supabase RLS)
- Políticas de seguridad automáticas
- Filtrado de datos por usuario
- Restricciones a nivel de base de datos

## 🚀 Configuración de Desarrollo

### Variables de Entorno

#### Desarrollo (.env.local)
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_CLARITY_PROJECT_ID=t5jmqu5mb4
```

#### Producción (Vercel)
```env
VITE_SUPABASE_URL=production-url
VITE_SUPABASE_ANON_KEY=production-key
VITE_CLARITY_PROJECT_ID=t5jmqu5mb4
```

### Comandos de Desarrollo

```bash
# Instalar dependencias
npm install

# Desarrollo
npm run dev           # Solo frontend (puerto 3000)
npm run api          # Solo API server (puerto 8000)
npm run dev:full     # Frontend + API concurrentes

# Producción
npm run build        # Build optimizado
npm run preview      # Preview del build
npm run lint         # Linting
```

### Configuración de Vite

```javascript
// vite.config.js
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  },
  resolve: {
    alias: {
      stream: 'stream-browserify',
      path: 'path-browserify', 
      crypto: 'crypto-browserify'
    }
  }
})
```

## 📦 Proceso de Despliegue

### Vercel (Recomendado)

#### Configuración Automática
```json
// vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "devCommand": "npm run dev",
  "framework": "vite",
  "env": {
    "VITE_CLARITY_PROJECT_ID": "t5jmqu5mb4"
  }
}
```

#### Deploy Steps
1. **Conectar repositorio GitHub**
2. **Configurar directorio raíz**: `billing-frontend`
3. **Variables de entorno**: Supabase + Clarity
4. **Deploy automático** en cada push a main

#### Optimizaciones
- Caché de assets (31536000 segundos)
- Compresión automática
- CDN global
- Preview deployments por branch

### Alternativos
- **Netlify**: Drag & drop de carpeta `dist/`
- **Servidor propio**: Upload de `dist/` + HTTPS

## 🎯 Características Técnicas Avanzadas

### Performance

#### Optimizaciones de Build
- **Tree shaking** automático con Vite
- **Code splitting** por rutas
- **Asset optimization** (imágenes, CSS, JS)
- **Lazy loading** de componentes grandes

#### Caching Strategy
- **Static assets**: Cache indefinido
- **API responses**: Cache inteligente
- **Supabase realtime**: Optimización de eventos

### Responsividad

#### Mobile-First Design
- **Breakpoints**: sm, md, lg, xl (TailwindCSS)
- **Navigation**: Sidebar colapsible en móvil
- **Touch-friendly**: Botones y controles adaptados
- **Performance**: Optimizado para dispositivos móviles

### Analytics y Monitoreo

#### Microsoft Clarity
- **Project ID**: t5jmqu5mb4
- **Features**: Heatmaps, session recordings, insights
- **Privacy**: GDPR compliant
- **Implementation**: Dynamic loading

#### Vercel Analytics
- **Performance metrics**: Core Web Vitals
- **User analytics**: Pageviews, unique visitors
- **Speed Insights**: Optimización automática

## 🛠️ Técnicas de Desarrollo

### Patrones de Código

#### Component Composition
```jsx
// Composición de componentes reutilizables
const PaymentWizard = ({ onComplete }) => {
  return (
    <Modal>
      <PaymentForm>
        <AmountInput />
        <DatePicker />
        <SubmitButton />
      </PaymentForm>
    </Modal>
  );
};
```

#### Custom Hooks
```javascript
// hooks/useClientAssociation.js
const useClientAssociation = () => {
  const [associations, setAssociations] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Lógica de asociaciones cliente-usuario
  
  return { associations, loading, refresh };
};
```

#### Service Layer
```javascript
// services/supabaseApi.js
export const clientService = {
  getAll: () => supabase.from('clients').select('*'),
  create: (data) => supabase.from('clients').insert(data),
  update: (id, data) => supabase.from('clients').update(data).eq('id', id)
};
```

### Estado Global

#### Context API
- **AuthContext**: Autenticación y permisos
- **Providers**: Envolvimiento de la aplicación
- **Hooks**: useAuth para acceso fácil

### Error Handling

#### Frontend
```javascript
try {
  const { data, error } = await supabase.from('table').select();
  if (error) throw error;
  // Handle success
} catch (error) {
  console.error('Operation failed:', error);
  // User feedback
}
```

#### Backend (Edge Functions)
```javascript
try {
  // Operation
  return new Response(JSON.stringify({ success: true }));
} catch (error) {
  return new Response(
    JSON.stringify({ error: error.message }), 
    { status: 400 }
  );
}
```

## 🔧 Configuración Específica

### TailwindCSS

```javascript
// tailwind.config.js
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
```

### ESLint

```javascript
// eslint.config.js
export default [
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      'react': reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    }
  }
];
```

## 📊 Métricas y KPIs

### Performance Goals
- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Cumulative Layout Shift**: < 0.1
- **First Input Delay**: < 100ms

### Business Metrics
- **User engagement**: Session duration > 5min
- **Feature adoption**: 80% de usuarios usan ≥3 módulos
- **Error rate**: < 1% de requests fallidos

## 🚨 Solución de Problemas

### Issues Comunes

#### Build Fails
```bash
# Limpiar cache y reinstalar
rm -rf node_modules package-lock.json
npm install
npm run build
```

#### Supabase Connection Issues
1. Verificar variables de entorno
2. Confirmar CORS en Supabase
3. Validar RLS policies
4. Revisar service role key

#### Mobile Menu Not Showing
- **Solved in**: Layout.jsx:325-351
- **Fix**: Agregados megaMenuItems al sidebar móvil

### Debugging

#### Console Logs
```javascript
// Auth debugging
console.log('🔄 Auth state change:', event, session);

// API debugging
console.log('📡 API Request:', method, url, data);
console.log('📡 API Response:', response);
```

#### Network Tab
- Verificar requests a Supabase
- Validar respuestas de Edge Functions
- Confirmar headers de autenticación

## 📈 Roadmap y Futuras Mejoras

### Técnicas
- **PWA**: Service workers para offline
- **Testing**: Jest + Testing Library
- **CI/CD**: GitHub Actions
- **Docker**: Containerización para desarrollo

### Funcionales
- **Notificaciones**: Push notifications
- **Exports**: PDF/Excel generation
- **Multi-tenant**: Soporte para múltiples empresas
- **API REST**: Endpoints públicos

---

## 🎉 Conclusión

Este sistema representa una solución completa y moderna para la gestión de facturación, desarrollado con las mejores prácticas de la industria y tecnologías de vanguardia. La arquitectura modular y el sistema de permisos granular garantizan escalabilidad y seguridad.

**Stack tecnológico sólido + Buenas prácticas + Documentación completa = Sistema robusto y mantenible** 🚀