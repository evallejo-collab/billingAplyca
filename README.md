# Sistema de Facturación por Horas

Sistema completo de facturación que permite gestionar contratos con asignación global de horas y seguimiento del consumo de las mismas.

## Características Principales

- ✅ **Gestión de Contratos**: Crear contratos con horas globales asignadas
- ✅ **Seguimiento de Horas**: Registrar y descontar horas del contrato principal
- ✅ **Validación de Disponibilidad**: No permite exceder las horas contratadas
- ✅ **Reportes Detallados**: Informes de facturación y uso de horas
- ✅ **Dashboard Interactivo**: Panel de control con estadísticas en tiempo real
- ✅ **API REST**: Endpoints para integración con otros sistemas

## Estructura del Proyecto

```
billing_system/
├── config/
│   └── database.php          # Configuración de base de datos
├── database/
│   └── schema.sql            # Esquema de base de datos
├── models/
│   ├── Contract.php          # Modelo de contratos
│   └── TimeEntry.php         # Modelo de entradas de tiempo
├── controllers/
│   └── ContractController.php # Controlador principal
├── api/
│   └── contracts.php         # API REST para contratos
├── reports/
│   └── BillingReports.php    # Generador de reportes
├── web/
│   ├── dashboard.html        # Interface web
│   └── dashboard.js          # Lógica frontend
└── README.md
```

## Instalación

### Requisitos
- PHP 7.4 o superior
- MySQL 5.7 o superior
- Servidor web (Apache/Nginx)

### Pasos de Instalación

1. **Clonar el proyecto**
   ```bash
   git clone [repository-url]
   cd billing_system
   ```

2. **Configurar la base de datos**
   ```bash
   mysql -u root -p < database/schema.sql
   ```

3. **Configurar conexión a BD**
   Editar `config/database.php` con tus credenciales:
   ```php
   private $host = 'localhost';
   private $db_name = 'billing_system';
   private $username = 'tu_usuario';
   private $password = 'tu_contraseña';
   ```

4. **Configurar servidor web**
   Apuntar el documento root a la carpeta del proyecto.

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

### Entradas de Tiempo
- `POST /api/contracts.php` - Registrar horas (action: add_time_entry)

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

Acceder a: `http://tu-servidor/web/dashboard.html`

## Tecnologías Utilizadas

- **Backend**: PHP con PDO
- **Base de Datos**: MySQL
- **Frontend**: HTML5, Bootstrap 5, JavaScript
- **API**: REST JSON
- **Validación**: Server-side y client-side

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