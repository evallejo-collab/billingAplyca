# Sistema de Facturación por Horas (billingAplyca)

Sistema completo de facturación que permite gestionar contratos con asignación global de horas y seguimiento del consumo de las mismas.

## Características Principales

- ✅ **Gestión de Contratos**: Crear contratos con horas globales asignadas
- ✅ **Seguimiento de Horas**: Registrar y descontar horas del contrato principal
- ✅ **Validación de Disponibilidad**: No permite exceder las horas contratadas
- ✅ **Reportes Detallados**: Informes de facturación y uso de horas
- ✅ **Dashboard Interactivo**: Panel de control con estadísticas en tiempo real
- ✅ **API REST**: Endpoints para integración con otros sistemas
- ✅ **Frontend React**: Interfaz moderna con React y Tailwind CSS

## Estructura del Proyecto

```
billing_system/
├── api/                    # Endpoints de la API REST
├── billing-frontend/       # Aplicación React
├── config/                 # Configuración de la base de datos
├── controllers/            # Controladores PHP
├── database/               # Base de datos SQLite y scripts
├── models/                 # Modelos de datos PHP
├── reports/                # Generador de reportes
└── web/                    # Dashboard HTML básico
```

## Tecnologías Utilizadas

### Backend
- **PHP 7.4+**: Lenguaje principal del backend
- **SQLite**: Base de datos ligera y portable
- **RESTful API**: Arquitectura de servicios web

### Frontend
- **React 18**: Biblioteca de JavaScript para UI
- **Vite**: Build tool y servidor de desarrollo
- **Tailwind CSS**: Framework de CSS utility-first
- **React Router**: Navegación del lado del cliente

## Instalación y Configuración

### Prerrequisitos
- PHP 7.4 o superior
- Node.js 16 o superior
- Servidor web (Apache/Nginx) o PHP built-in server

### Backend Setup

1. **Clonar el repositorio**
```bash
git clone https://github.com/evallejo-collab/billingAplyca.git
cd billingAplyca
```

2. **Configurar la base de datos**
```bash
php database/create_db.php
```

3. **Iniciar el servidor PHP** (opcional, para desarrollo)
```bash
php -S localhost:8000
```

### Frontend Setup

1. **Navegar al directorio frontend**
```bash
cd billing-frontend
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Iniciar el servidor de desarrollo**
```bash
npm run dev
```

4. **Para desarrollo con API mock**
```bash
npm run dev:full
```

El frontend estará disponible en `http://localhost:3000`

## Uso del Sistema

### 1. Crear un Contrato
```php
POST /api/contracts.php
{
    "client_id": 1,
    "description": "Desarrollo de aplicación web",
    "total_hours": 100,
    "hourly_rate": 50.00,
    "start_date": "2024-01-01"
}
```

### 2. Registrar Horas de Trabajo
```php
POST /api/contracts.php
{
    "action": "add_time_entry",
    "contract_id": 1,
    "description": "Desarrollo de módulo de autenticación",
    "hours_used": 8.5,
    "entry_date": "2024-01-15",
    "created_by": "Juan Pérez"
}
```

### 3. Consultar Estado del Contrato
```php
GET /api/contracts.php?id=1
```

## API Endpoints

### Contratos
- `GET /api/contracts.php` - Listar todos los contratos
- `GET /api/contracts.php?id={id}` - Obtener contrato específico
- `GET /api/contracts.php?status=active` - Filtrar por estado
- `POST /api/contracts.php` - Crear nuevo contrato
- `PUT /api/contracts.php?id={id}` - Actualizar estado del contrato

### Proyectos
- `GET /api/projects.php` - Listar proyectos
- `POST /api/projects.php` - Crear proyecto
- `PUT /api/projects.php` - Actualizar proyecto

### Clientes
- `GET /api/clients.php` - Listar clientes
- `POST /api/clients.php` - Crear cliente
- `PUT /api/clients.php` - Actualizar cliente

### Entradas de Tiempo
- `GET /api/time_entries.php` - Listar entradas
- `POST /api/time_entries.php` - Registrar tiempo
- `PUT /api/time_entries.php` - Actualizar entrada

### Reportes
- `GET /api/reports.php` - Generar reportes de facturación

## Modelos de Datos

### Contratos
- **ID**: Identificador único
- **client_id**: ID del cliente
- **contract_number**: Número de contrato (auto-generado)
- **description**: Descripción del trabajo
- **total_hours**: Horas totales contratadas
- **hourly_rate**: Tarifa por hora
- **used_hours**: Horas utilizadas (calculado)
- **remaining_hours**: Horas restantes (calculado)
- **status**: Estado (active, completed, cancelled)

### Entradas de Tiempo
- **ID**: Identificador único
- **contract_id**: Referencia al contrato
- **description**: Descripción del trabajo realizado
- **hours_used**: Horas utilizadas
- **entry_date**: Fecha del trabajo
- **created_by**: Quien registró las horas
- **amount**: Monto facturado (calculado)

## Base de Datos

El sistema utiliza SQLite con las siguientes tablas principales:

- `contracts`: Contratos con horas totales
- `projects`: Proyectos asociados a contratos
- `clients`: Información de clientes
- `time_entries`: Registros de tiempo trabajado
- `hour_categories`: Tipos y tarifas de horas

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

## Dashboard Web

El sistema incluye una interfaz web responsive con:

- **Panel Principal**: Estadísticas generales y contratos activos
- **Gestión de Contratos**: Crear y listar contratos
- **Registro de Horas**: Formulario para registrar tiempo trabajado
- **Reportes**: Generación de informes diversos

Acceder a: `http://localhost:3000` (React) o `http://tu-servidor/web/dashboard.html` (HTML)

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