# Sistema de gestión - Aplyca

Sistema integral de facturación y gestión de proyectos desarrollado con React y Supabase. Permite gestionar clientes, contratos, proyectos, registro de horas, pagos y reportes de manera eficiente.

## 🚀 Características Principales

- ✅ **Gestión de Clientes**: CRUD completo con campo unificado empresa/cliente
- ✅ **Gestión de Contratos**: Con barras de progreso coloridas y cálculo automático de horas
- ✅ **Gestión de Proyectos**: Independientes o vinculados a contratos
- ✅ **Registro de Horas**: Con validación de disponibilidad y cálculo de montos
- ✅ **Gestión de Pagos**: Múltiples tipos de pago con historial completo
- ✅ **Reportes y Analytics**: Resumen general, reportes mensuales, contratos activos
- ✅ **UI/UX Profesional**: Responsive design con Tailwind CSS
- ✅ **Backend Supabase**: PostgreSQL con autenticación y real-time

## Estructura del Proyecto

```
billing_system/
├── billing-frontend/       # Aplicación React + Vite
├── scripts/               # Scripts de automatización
└── docs/                  # Documentación del proyecto
```

## Tecnologías Utilizadas

### Frontend
- **React 18**: Biblioteca de JavaScript para UI
- **Vite**: Build tool y servidor de desarrollo moderno
- **Tailwind CSS**: Framework de CSS utility-first
- **React Router DOM**: Navegación del lado del cliente
- **Lucide React**: Iconografía moderna

### Backend
- **Supabase**: Backend-as-a-Service completo
- **PostgreSQL**: Base de datos relacional robusta
- **Row Level Security (RLS)**: Seguridad a nivel de fila
- **Real-time subscriptions**: Actualizaciones en tiempo real
- **Autenticación integrada**: Sistema de auth completo

### Herramientas de Desarrollo
- **ESLint**: Linting de código JavaScript
- **PostCSS**: Procesamiento de CSS
- **Autoprefixer**: Auto-prefijos CSS
- **Git**: Control de versiones

## Instalación y Configuración

### Prerrequisitos
- Node.js 18 o superior
- npm o yarn
- Cuenta en Supabase

### Setup del Proyecto

1. **Clonar el repositorio**
```bash
git clone https://github.com/evallejo-collab/billingAplyca.git
cd billingAplyca
```

2. **Configurar Supabase**
   - Crear proyecto en [supabase.com](https://supabase.com)
   - Obtener URL del proyecto y clave anónima
   - Configurar las tablas usando los scripts SQL proporcionados

3. **Configurar Variables de Entorno**
```bash
cd billing-frontend
cp .env.example .env
```

Editar el archivo `.env` con tus credenciales de Supabase:
```env
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_clave_anonima_de_supabase
```

4. **Instalar dependencias**
```bash
npm install
```

5. **Iniciar el servidor de desarrollo**
```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

## Uso del Sistema

### Funcionalidades Principales

1. **Gestión de Clientes**
   - Crear, editar y eliminar clientes
   - Vista unificada empresa/cliente

2. **Gestión de Contratos**
   - Contratos por horas con seguimiento de progreso
   - Barras de progreso con colores dinámicos
   - Cálculo automático de horas utilizadas

3. **Proyectos de Alcance Fijo**
   - Proyectos independientes o vinculados a contratos
   - Gestión de montos fijos

4. **Registro de Horas**
   - Validación de disponibilidad
   - Histórico completo por contrato/proyecto

5. **Sistema de Pagos**
   - Múltiples tipos: anticipo, mensual, soporte recurrente
   - Historial detallado de pagos

6. **Reportes Avanzados**
   - Resumen general del negocio
   - Reportes mensuales
   - Estadísticas por cliente

## Arquitectura de Datos

### Supabase Database Schema

El sistema utiliza PostgreSQL a través de Supabase con las siguientes tablas:

#### Tabla: `clients`
- Información de clientes y empresas
- Campos principales: name, company, email, phone

#### Tabla: `contracts`
- Contratos por horas
- Relación con clientes
- Seguimiento de horas: total_hours, used_hours
- Estados: active, completed, cancelled

#### Tabla: `projects`
- Proyectos de alcance fijo
- Pueden estar vinculados a contratos
- Montos fijos con seguimiento de pagos

#### Tabla: `time_entries`
- Registro de horas trabajadas
- Relación con contratos y proyectos
- Cálculo automático de montos

#### Tabla: `payments`
- Historial de pagos
- Tipos: anticipo, mensual, soporte recurrente
- Relación con contratos y proyectos

## Características Técnicas

### Seguridad
- **Row Level Security (RLS)**: Políticas de seguridad a nivel de base de datos
- **Autenticación**: Sistema completo con Supabase Auth
- **Validaciones**: Frontend y backend con validación de datos

### Performance
- **Vite**: Build tool ultra-rápido
- **Lazy Loading**: Carga perezosa de componentes
- **Optimización de Bundle**: Tree shaking automático
- **Caching**: Cache inteligente de Supabase

### UI/UX
- **Responsive Design**: Adaptable a todos los dispositivos
- **Tailwind CSS**: Diseño consistente y moderno
- **Componentes Reutilizables**: Arquitectura modular
- **Feedback Visual**: Estados de carga y notificaciones

### DevOps
- **Vercel Ready**: Configurado para deployment en Vercel
- **Environment Variables**: Configuración por entornos
- **Hot Reload**: Desarrollo con recarga automática
- **Build Optimization**: Builds optimizados para producción

## Reportes Disponibles

1. **Resumen de Contratos**: Estado actual de todos los contratos
2. **Reporte Mensual**: Facturación por mes
3. **Reporte por Cliente**: Detalle de contratos por cliente
4. **Contratos Activos**: Lista de contratos en progreso
5. **Estadísticas Generales**: Overview del sistema

## Validaciones de Negocio

- ✅ No se pueden registrar más horas de las disponibles en el contrato
- ✅ Los contratos completados no permiten nuevas entradas de tiempo
- ✅ Las horas deben ser valores positivos
- ✅ Las fechas de trabajo no pueden ser futuras
- ✅ Los números de contrato son únicos y auto-generados

## Scripts Disponibles

### Desarrollo
```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build de producción
npm run preview      # Preview del build
npm run lint         # Linting del código
```

### Deployment
Ver [DEPLOYMENT.md](billing-frontend/DEPLOYMENT.md) para instrucciones completas de deployment en Vercel.

## Variables de Entorno

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-anonima
```

## Contribuir

1. Fork el proyecto
2. Crear una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

## Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE.md](LICENSE.md) para detalles.

## Soporte

Para soporte técnico o preguntas, crear un issue en el repositorio del proyecto.
