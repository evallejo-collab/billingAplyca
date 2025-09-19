import { useState, useEffect } from 'react';
import { 
  Users, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Download,
  Copy,
  Settings,
  Briefcase,
  Target,
  Activity
} from 'lucide-react';
import { useWeekUtils, useCapacityAlerts, useBulkOperations } from '../hooks/useCapacityCalculations';
import { capacityApi } from '../services/supabaseApi';
import AssignmentTable from './AssignmentTable';
import TeamCapacityGrid from './TeamCapacityGrid';
import TeamMembersManagement from './TeamMembersManagement';
import CapacityKanban from './CapacityKanban';

const CapacityDashboard = () => {
  const [currentWeek, setCurrentWeek] = useState('');
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('kanban'); // 'dashboard', 'assignments', 'team', 'kanban', 'members'
  const [showCopyModal, setShowCopyModal] = useState(false);

  const { getCurrentWeek, addWeeks, formatWeekRange } = useWeekUtils();
  const { alerts, resolveAlert } = useCapacityAlerts();
  const { copyWeek, loading: copyLoading } = useBulkOperations();

  // Inicializar con semana actual
  useEffect(() => {
    setCurrentWeek(getCurrentWeek());
  }, [getCurrentWeek]);

  // Cargar datos del dashboard
  useEffect(() => {
    const loadDashboardData = async () => {
      if (!currentWeek) return;

      try {
        setLoading(true);
        setError(null);
        
        const response = await capacityApi.getDashboardData(currentWeek);
        if (response.success) {
          setDashboardData(response.data);
        }
      } catch (err) {
        console.error('Error loading dashboard data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [currentWeek]);

  // Navegación de semanas
  const navigateWeek = (direction) => {
    const newWeek = addWeeks(currentWeek, direction);
    setCurrentWeek(newWeek);
  };

  // Refresh datos
  const refreshData = async () => {
    const response = await capacityApi.getDashboardData(currentWeek);
    if (response.success) {
      setDashboardData(response.data);
    }
  };

  // Componente para métricas principales
  const MetricsCards = () => {
    if (!dashboardData) return null;

    const { team_metrics } = dashboardData;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Capacidad Total */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Clock className="w-8 h-8 text-blue-500" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">
                {team_metrics.total_capacity}h
              </div>
              <div className="text-sm text-gray-500">Capacidad Total</div>
              <div className="text-xs text-gray-400 mt-1">
                {team_metrics.total_members} miembros activos
              </div>
            </div>
          </div>
        </div>

        {/* Horas Asignadas */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Target className="w-8 h-8 text-green-500" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">
                {team_metrics.total_assigned}h
              </div>
              <div className="text-sm text-gray-500">Horas Asignadas</div>
              <div className="text-xs text-gray-400 mt-1">
                {team_metrics.avg_utilization}% utilización promedio
              </div>
            </div>
          </div>
        </div>

        {/* Disponibilidad */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Activity className="w-8 h-8 text-purple-500" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">
                {team_metrics.total_available}h
              </div>
              <div className="text-sm text-gray-500">Horas Disponibles</div>
              <div className="text-xs text-gray-400 mt-1">
                {((team_metrics.total_available / team_metrics.total_capacity) * 100).toFixed(1)}% disponible
              </div>
            </div>
          </div>
        </div>

        {/* Alertas */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertTriangle className={`w-8 h-8 ${
                team_metrics.overallocated_members > 0 ? 'text-red-500' : 'text-gray-400'
              }`} />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-red-600">
                {team_metrics.overallocated_members}
              </div>
              <div className="text-sm text-gray-500">Sobrecargados</div>
              <div className="text-xs text-gray-400 mt-1">
                {team_metrics.underutilized_members} subutilizados
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Componente para resumen de proyectos
  const ProjectSummary = () => {
    if (!dashboardData?.project_summaries) return null;

    return (
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Proyectos Activos</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {dashboardData.project_summaries.slice(0, 5).map((project) => (
              <div key={project.project_id} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Briefcase className="w-4 h-4 text-gray-400" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {project.project_name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {project.client_name}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {project.total_hours}h
                  </div>
                  <div className="text-xs text-gray-500">
                    {project.assigned_members} miembro(s)
                  </div>
                </div>
              </div>
            ))}
          </div>
          {dashboardData.project_summaries.length === 0 && (
            <div className="text-center text-gray-500 py-4">
              No hay proyectos asignados esta semana
            </div>
          )}
        </div>
      </div>
    );
  };

  // Componente para alertas recientes
  const RecentAlerts = () => {
    return (
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Alertas Recientes</h3>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            {alerts.slice(0, 5).map((alert) => (
              <div key={alert.id} className={`p-3 rounded-lg border ${
                alert.severity === 'CRITICAL' ? 'bg-red-50 border-red-200' :
                alert.severity === 'HIGH' ? 'bg-orange-50 border-orange-200' :
                alert.severity === 'MEDIUM' ? 'bg-yellow-50 border-yellow-200' :
                'bg-blue-50 border-blue-200'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">
                      {alert.message}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(alert.created_at).toLocaleDateString('es-ES')}
                    </div>
                  </div>
                  <button
                    onClick={() => resolveAlert(alert.id, 'current_user_id')}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Resolver
                  </button>
                </div>
              </div>
            ))}
          </div>
          {alerts.length === 0 && (
            <div className="text-center text-gray-500 py-4">
              No hay alertas activas
            </div>
          )}
        </div>
      </div>
    );
  };

  // Modal para copiar semana
  const CopyWeekModal = () => {
    const [sourceWeek, setSourceWeek] = useState(addWeeks(currentWeek, -1));
    const [targetWeek, setTargetWeek] = useState(currentWeek);

    const handleCopy = async () => {
      const result = await copyWeek(sourceWeek, targetWeek);
      if (result.success) {
        alert(result.message);
        setShowCopyModal(false);
        refreshData();
      } else {
        alert('Error: ' + result.error);
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Copiar Asignaciones</h3>
            <button
              onClick={() => setShowCopyModal(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Desde la semana:
              </label>
              <input
                type="date"
                value={sourceWeek}
                onChange={(e) => setSourceWeek(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hacia la semana:
              </label>
              <input
                type="date"
                value={targetWeek}
                onChange={(e) => setTargetWeek(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={() => setShowCopyModal(false)}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleCopy}
              disabled={copyLoading}
              className="px-4 py-2 bg-violet-600 text-white rounded hover:bg-violet-700 disabled:opacity-50"
            >
              {copyLoading ? 'Copiando...' : 'Copiar'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin text-violet-600" />
        <span className="ml-2 text-gray-600">Cargando dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <AlertTriangle className="w-6 h-6 text-red-500 mr-3" />
          <div>
            <h3 className="text-lg font-semibold text-red-800">Error al cargar datos</h3>
            <p className="text-red-600 mt-1">{error}</p>
            <button
              onClick={refreshData}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con navegación de semanas */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-900">Coordinación de Capacidad</h1>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigateWeek(-1)}
              className="p-2 text-gray-500 hover:text-gray-700 border border-gray-300 rounded"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center space-x-2 px-3 py-2 bg-violet-50 border border-violet-200 rounded">
              <Calendar className="w-4 h-4 text-violet-600" />
              <span className="text-sm font-medium text-violet-900">
                {formatWeekRange(currentWeek)}
              </span>
            </div>
            <button
              onClick={() => navigateWeek(1)}
              className="p-2 text-gray-500 hover:text-gray-700 border border-gray-300 rounded"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowCopyModal(true)}
            className="flex items-center px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
          >
            <Copy className="w-4 h-4 mr-2" />
            Copiar Semana
          </button>
          <button
            onClick={refreshData}
            className="flex items-center px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualizar
          </button>
        </div>
      </div>

      {/* Tabs de navegación */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'dashboard'
                ? 'border-violet-500 text-violet-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('assignments')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'assignments'
                ? 'border-violet-500 text-violet-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Asignaciones
          </button>
          <button
            onClick={() => setActiveTab('team')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'team'
                ? 'border-violet-500 text-violet-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Equipo
          </button>
          <button
            onClick={() => setActiveTab('kanban')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'kanban'
                ? 'border-violet-500 text-violet-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Kanban
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'members'
                ? 'border-violet-500 text-violet-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Gestión
          </button>
        </nav>
      </div>

      {/* Contenido por tab */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <MetricsCards />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ProjectSummary />
            <RecentAlerts />
          </div>
        </div>
      )}

      {activeTab === 'assignments' && (
        <AssignmentTable 
          weekStartDate={currentWeek}
          onWeekChange={setCurrentWeek}
        />
      )}

      {activeTab === 'team' && (
        <TeamCapacityGrid 
          weekStartDate={currentWeek}
          assignments={dashboardData?.assignments || []}
        />
      )}

      {activeTab === 'kanban' && (
        <CapacityKanban />
      )}

      {activeTab === 'members' && (
        <TeamMembersManagement />
      )}

      {/* Modales */}
      {showCopyModal && <CopyWeekModal />}
    </div>
  );
};

export default CapacityDashboard;