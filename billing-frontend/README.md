# Sistema de Facturación - Frontend

## 📋 Descripción

Sistema integral de facturación y gestión de proyectos desarrollado con React y Supabase. Permite gestionar clientes, contratos, proyectos, registro de tiempo, pagos y reportes de manera eficiente.

## 🚀 Tecnologías Utilizadas

### Frontend
- **React.js 18** - Biblioteca principal para la UI
- **Vite** - Build tool y dev server rápido
- **JavaScript ES6+** - Lenguaje de programación
- **Tailwind CSS** - Framework de CSS utility-first
- **Lucide React** - Iconos SVG para React

### Backend & Base de Datos
- **Supabase** - Backend-as-a-Service (BaaS)
  - PostgreSQL - Base de datos relacional
  - Authentication - Sistema de autenticación
  - Real-time subscriptions - Actualizaciones en tiempo real
  - Row Level Security (RLS) - Seguridad a nivel de fila
  - REST API - API auto-generada

### Herramientas de Desarrollo
- **npm** - Gestor de paquetes
- **ESLint** - Linter para JavaScript
- **Git** - Control de versiones

### Deployment
- **Vercel** - Plataforma de deployment (preparado)

## 🏗️ Arquitectura del Sistema

### Base de Datos (PostgreSQL)
```
├── clients - Información de clientes/empresas
├── contracts - Contratos con clientes
├── projects - Proyectos (independientes o vinculados a contratos)
├── time_entries - Registro de horas trabajadas
├── payments - Pagos recibidos
└── user_profiles - Perfiles de usuarios
```

### Estructura del Frontend
```
src/
├── components/           # Componentes React
│   ├── Billing.jsx      # Gestión de pagos
│   ├── Clients.jsx      # Gestión de clientes
│   ├── Contracts.jsx    # Gestión de contratos
│   ├── Projects.jsx     # Gestión de proyectos
│   ├── TimeEntries.jsx  # Registro de horas
│   ├── Reports.jsx      # Reportes y análisis
│   └── Dashboard.jsx    # Panel principal
├── services/            # Servicios y APIs
│   └── supabaseApi.js  # Comunicación con Supabase
├── config/             # Configuración
│   └── supabase.js     # Config de Supabase
├── utils/              # Utilidades
└── styles/             # Estilos CSS
```

## 🔧 Configuración del Proyecto

### Prerrequisitos
- Node.js 18 o superior
- npm o yarn
- Cuenta de Supabase

### Variables de Entorno
Crear archivo `.env.local`:
```env
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_clave_anonima
```

### Instalación
```bash
# Clonar el repositorio
git clone [URL_DEL_REPO]
cd billing-frontend

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales

# Ejecutar en desarrollo
npm run dev
```

## 📊 Funcionalidades Principales

### 👥 Gestión de Clientes
- ✅ CRUD completo de clientes
- ✅ Campo unificado empresa/cliente
- ✅ Información de contacto completa
- ✅ Contador de contratos y proyectos

### 📋 Gestión de Contratos
- ✅ Contratos con horas y tarifas
- ✅ Cálculo automático de horas restantes
- ✅ Estados de contrato (activo, completado, cancelado)
- ✅ Progreso visual con barras de colores
- ✅ Información financiera detallada

### 📁 Gestión de Proyectos
- ✅ Proyectos independientes o vinculados a contratos
- ✅ Seguimiento de horas estimadas vs utilizadas
- ✅ Cálculo de costos en tiempo real

### ⏱️ Registro de Tiempo
- ✅ Registro por contrato o proyecto independiente
- ✅ Validación de horas disponibles
- ✅ Cálculo automático de montos
- ✅ Agrupación visual por cliente/contrato
- ✅ Filtros por fechas y contratos

### 💰 Gestión de Pagos
- ✅ Múltiples tipos de pago (alcance fijo, soporte recurrente, etc.)
- ✅ Cálculo por porcentaje o monto fijo
- ✅ Historial de pagos por contrato/proyecto
- ✅ Estados de pago (pendiente, pagado, vencido)

### 📈 Reportes y Analytics
- ✅ Resumen general con KPIs
- ✅ Reportes mensuales detallados
- ✅ Lista de contratos activos
- ✅ Lista de proyectos activos
- ✅ Análisis de entradas de tiempo
- ✅ Filtros por fechas y clientes

## 🎨 Características de UI/UX

### Diseño
- **Responsive Design** - Adaptable a móviles y desktop
- **Tailwind CSS** - Diseño moderno y consistente
- **Iconografía** - Lucide icons para mejor UX

### Interactividad
- **Modales** - Para crear/editar registros
- **Filtros en tiempo real** - Búsqueda y filtrado instantáneo
- **Validaciones** - Validaciones de formularios en frontend
- **Feedback visual** - Estados de loading, errores y éxito
- **Animaciones sutiles** - Transiciones suaves

### Navegación
- **Sidebar responsive** - Navegación lateral colapsible
- **Tabs** - Organización por pestañas en reportes
- **Estados vacíos** - Mensajes informativos cuando no hay datos

## 🛡️ Seguridad

### Autenticación
- **Supabase Auth** - Sistema de autenticación robusto
- **Row Level Security** - Políticas de seguridad a nivel de fila
- **JWT Tokens** - Tokens seguros para API calls

### Validaciones
- **Frontend validation** - Validación inmediata en forms
- **Backend validation** - Validación en Supabase
- **Type checking** - Validación de tipos de datos
- **SQL injection protection** - Protección nativa de Supabase

## 📝 Comandos Disponibles

```bash
# Desarrollo
npm run dev          # Servidor de desarrollo
npm run build        # Build para producción
npm run preview      # Preview del build
npm run lint         # Ejecutar linter
```

---

### 🏷️ Versión Actual: 1.0.0
**Última actualización**: Diciembre 2024  
**Estado del proyecto**: ✅ Producción Ready