# 🎯 Guía de Vista Kanban - Coordinación de Capacidad

## ✨ **Nueva Vista Drag & Drop con Doble Modalidad**

La vista Kanban hace que asignar el equipo sea tan simple como **arrastrar y soltar**. Ahora puedes elegir entre **vista por Proyectos** o **vista por Clientes**.

## 🚀 **Cómo Usar**

### 1. **Acceder a la Vista Kanban**
- Ve a: **Nexus** → **"Trabajo y Facturación"** → **"Coordinación de Capacidad"**
- La vista **Kanban** se abre por defecto (es la más intuitiva)

### 2. **Selector de Vista** 🔄

En la parte superior derecha encontrarás el **selector de modalidad**:

#### **🔧 Vista por Proyectos** (Por defecto)
- Panel derecho muestra **proyectos individuales**
- Arrastra miembros directamente al proyecto deseado
- Cada tarjeta = 1 proyecto específico

#### **🏢 Vista por Clientes** 
- Panel derecho muestra **clientes con sus proyectos**
- Arrastra miembros al cliente → selecciona proyecto específico
- Cada tarjeta = 1 cliente con múltiples proyectos

### 3. **Interfaz Principal**

#### **Panel Izquierdo: Equipo Disponible** 👥
- Muestra todos los miembros del equipo
- **Códigos de color por utilización**:
  - 🔴 **Rojo**: >100% (Sobrecargado)
  - 🟢 **Verde**: 80-100% (Óptimo) 
  - 🔵 **Azul**: 60-79% (Bueno)
  - ⚪ **Gris**: <60% (Subutilizado)
- **Información visible**:
  - Nombre y rol
  - Horas asignadas / Capacidad total
  - Porcentaje de utilización
  - Barra de progreso visual

#### **Panel Derecho: Zonas de Drop** 📋
**Vista Proyectos:**
- Tarjetas individuales por proyecto
- Información del proyecto y cliente
- Lista de asignaciones actuales

**Vista Clientes:**
- Tarjetas agrupadas por cliente  
- Proyectos del cliente anidados
- Resumen total de asignaciones

### 4. **Crear Asignaciones (Drag & Drop)**

#### **🔧 En Vista por Proyectos:**
1. **Arrastra** un miembro del panel izquierdo
2. **Suelta** sobre el proyecto deseado
3. Se abre el **modal de configuración** automáticamente

#### **🏢 En Vista por Clientes:**
1. **Arrastra** un miembro del panel izquierdo  
2. **Suelta** sobre el cliente deseado
3. Se abre **modal selector de proyecto** 
4. **Selecciona** el proyecto específico del cliente
5. Se abre el **modal de configuración**

#### **⚙️ Modal de Configuración:**
- **Horas asignadas** (requerido)
- **Tipo de asignación**: Compromiso, Reserva, Disponible
- **Prioridad**: Alta, Media, Baja
- **Facturable**: Sí/No
- **Notas**: Información adicional
- Hacer clic en **"Crear Asignación"**

### 4. **Navegación de Semanas**
- **Botones ← →** para cambiar semanas
- **Vista actual** muestra el rango de fechas
- Las asignaciones se cargan automáticamente por semana

## 🎨 **Características Visuales**

### **Miembros Draggables**
- **Hover effect**: Sombra al pasar el mouse
- **Drag effect**: Rotación y sombra mientras se arrastra
- **Información en tiempo real**: Utilización actualizada

### **Zonas de Drop**
- **Highlight**: Borde violeta cuando se arrastra sobre el proyecto
- **Feedback visual**: Cambio de color de fondo
- **Estado vacío**: Mensaje motivacional para arrastrar

### **Estados del Equipo**
- **Sin asignaciones**: "Arrastra miembros aquí"
- **Todo asignado**: "Todo el equipo está asignado"
- **Proyectos vacíos**: "No hay proyectos activos"

## 🔧 **Funcionalidades Técnicas**

### **Validaciones Automáticas**
- ✅ **Capacidad**: No permite exceder horas disponibles
- ✅ **Proyectos activos**: Solo muestra proyectos en estado 'active'
- ✅ **Miembros activos**: Solo muestra miembros activos
- ✅ **Duplicados**: Previene asignaciones duplicadas

### **Actualizaciones en Tiempo Real**
- ✅ **Recarga automática** después de crear asignaciones
- ✅ **Cálculo dinámico** de utilización
- ✅ **Estado visual** actualizado instantáneamente

## 📱 **Responsive Design**

### **Desktop (>1024px)**
- **4 columnas**: 1 para equipo + 3 para proyectos
- **Vista completa** de toda la información

### **Tablet (768px - 1024px)**
- **Adaptación**: 1 columna equipo + 2 columnas proyectos
- **Información condensada** pero completa

### **Mobile (<768px)**
- **Stack vertical**: Equipo arriba, proyectos abajo
- **Touch optimizado** para drag & drop

## 🎯 **Casos de Uso Comunes**

### **Asignación Rápida**
1. Ver qué miembros tienen capacidad disponible
2. Identificar proyectos que necesitan recursos
3. Arrastrar miembro → proyecto → configurar horas

### **Redistribución de Carga**
1. Identificar miembros sobrecargados (rojos)
2. Ver miembros subutilizados (grises)
3. Reasignar horas entre proyectos

### **Planificación Semanal**
1. Navegar semana por semana
2. Asignar recursos para próximos sprints
3. Balancear carga de trabajo del equipo

## 🆚 **Comparación de Vistas Kanban**

| **Vista por Proyectos** | **Vista por Clientes** |
|-------------------------|------------------------|
| 🎯 **Asignación directa** | 🏢 **Visión por cliente** |
| ⚡ **Más rápida** | 🧭 **Más organizada** |
| 📋 **Enfoque proyecto** | 📊 **Enfoque negocio** |
| ✅ **1 paso** | ✅ **2 pasos (+ selector)** |
| 🎨 **Tarjetas individuales** | 🗂️ **Tarjetas agrupadas** |

### **🔧 Cuándo usar Vista por Proyectos:**
- ✅ Asignaciones rápidas y directas
- ✅ Conoces exactamente el proyecto
- ✅ Workflow de desarrollo ágil
- ✅ Equipos pequeños con pocos proyectos

### **🏢 Cuándo usar Vista por Clientes:**
- ✅ Gestión de múltiples proyectos por cliente
- ✅ Planificación estratégica por cuenta
- ✅ Equipos grandes con muchos proyectos
- ✅ Perspectiva comercial/gerencial

## 🆚 **Comparación con Vista Tradicional**

| **Vista Kanban** | **Vista Tabla** |
|------------------|-----------------|
| 🎯 **Intuitiva** | 📊 **Detallada** |
| ✋ **Drag & Drop** | ⌨️ **Formularios** |
| 👁️ **Visual** | 📝 **Textual** |
| ⚡ **Rápida** | 🔧 **Precisa** |
| 🎨 **Moderna** | 📋 **Tradicional** |

## 💡 **Tips de Uso**

### **Mejores Prácticas**
- ✅ **Empieza con miembros subutilizados** (grises)
- ✅ **Distribuye carga uniformemente** (todos en verde)
- ✅ **Usa prioridades** para organizar trabajo
- ✅ **Agrega notas** para contexto adicional

### **Flujo Recomendado**
1. **Planifica** → Revisa proyectos activos
2. **Identifica** → Qué miembros tienen capacidad
3. **Arrastra** → Asigna miembros a proyectos
4. **Configura** → Ajusta horas y prioridades
5. **Revisa** → Verifica distribución balanceada

## 🔄 **Próximas Mejoras**

### **En Desarrollo**
- 🔄 **Reasignación por drag**: Mover asignaciones entre proyectos
- ⏱️ **Estimación automática**: Sugerir horas basado en historial
- 📊 **Métricas inline**: Mostrar KPIs en tiempo real
- 🔔 **Notificaciones**: Alertas de sobrecarga en vivo

---

## 🎉 **¡Disfruta la Nueva Experiencia!**

La vista Kanban hace que coordinar la capacidad del equipo sea **visual, intuitiva y divertida**. 

**¡Ya no más formularios complejos!** 🚫📝

**¡Solo arrastra, suelta y listo!** ✨🎯