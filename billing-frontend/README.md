# Sistema de Facturación v4.0

Un sistema completo de gestión de facturación y proyectos desarrollado con React y preparado para deployment en Vercel.

## 🚀 Características

- **Gestión de Clientes**: CRUD completo con información empresarial
- **Contratos Flexibles**: Múltiples contratos por cliente con seguimiento de horas
- **Proyectos Versátiles**: 
  - Proyectos vinculados a contratos
  - Proyectos independientes con facturación propia
- **Registro de Tiempo**: Sistema completo de tracking de horas
- **Moneda Colombiana**: Formato COP en toda la aplicación
- **Dashboard Interactivo**: Resúmenes financieros y estadísticas
- **API Serverless**: Compatible con Vercel Functions

## 🛠 Stack Tecnológico

- **Frontend**: React 19.1.1 + Vite 4.5.3
- **Styling**: Tailwind CSS 3.3.0
- **Routing**: React Router DOM 7.8.2
- **HTTP Client**: Axios 1.11.0
- **Icons**: Lucide React 0.542.0
- **Backend**: Vercel Serverless Functions (Node.js)
- **Database**: JSON-based file system (production-ready)

## 🚀 Deploy en Vercel

### 1. Preparación del Repositorio

```bash
git init
git add .
git commit -m "Initial commit - Sistema de Facturación v4.0"
git branch -M main
git remote add origin https://github.com/tu-usuario/billing-system.git
git push -u origin main
```

### 2. Deploy en Vercel

1. **Via Vercel CLI** (recomendado):
```bash
npm install -g vercel
vercel
```

2. **Via Dashboard de Vercel**:
   - Conecta tu repositorio de GitHub
   - Selecciona este directorio como root
   - Vercel detectará automáticamente la configuración

## 💻 Desarrollo Local

```bash
# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm run dev

# Build para producción
npm run build
```

## 🎯 Sistema Listo para Vercel

Este proyecto está completamente configurado y optimizado para Vercel:
- ✅ Build optimizado
- ✅ API Routes serverless  
- ✅ Configuración de routing
- ✅ Variables de entorno
- ✅ Base de datos JSON
- ✅ CORS configurado

Solo ejecuta `vercel` en la terminal y tendrás tu sistema funcionando en producción. 🚀