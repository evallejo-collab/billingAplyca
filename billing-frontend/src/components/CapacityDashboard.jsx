import { useState, useEffect } from 'react';
import { 
  Users, 
  Clock, 
  TrendingUp, 
  AlertTriangle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Copy,
  Briefcase,
  Target,
  Activity
} from 'lucide-react';

// CAPACITY DASHBOARD MINIMALISTA - v2.0
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

  // Componente para métricas principales - DISEÑO MINIMALISTA
  const MetricsCards = () => {
    if (!dashboardData) return null;

    const { team_metrics } = dashboardData;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Capacidad Total */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Capacidad Total</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{team_metrics.total_capacity}h</p>
              <p className="text-xs text-gray-500 mt-1">{team_metrics.total_members} miembros activos</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Horas Asignadas */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Horas Asignadas</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{team_metrics.total_assigned}h</p>
              <p className="text-xs text-gray-500 mt-1">{team_metrics.avg_utilization}% utilización</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
              <Target className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Disponibilidad */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Horas Disponibles</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{team_metrics.total_available}h</p>
              <p className="text-xs text-gray-500 mt-1">{((team_metrics.total_available / team_metrics.total_capacity) * 100).toFixed(1)}% disponible</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
              <Activity className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Alertas */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Sobrecargados</p>
              <p className={`text-3xl font-bold mt-2 ${
                team_metrics.overallocated_members > 0 ? 'text-red-600' : 'text-gray-900'
              }`}>{team_metrics.overallocated_members}</p>
              <p className="text-xs text-gray-500 mt-1">{team_metrics.underutilized_members} subutilizados</p>
            </div>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              team_metrics.overallocated_members > 0 ? 'bg-red-50' : 'bg-gray-50'
            }`}>
              <AlertTriangle className={`w-6 h-6 ${
                team_metrics.overallocated_members > 0 ? 'text-red-600' : 'text-gray-400'
              }`} />
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Componente para resumen de proyectos - DISEÑO MINIMALISTA
  const ProjectSummary = () => {
    if (!dashboardData?.project_summaries) return null;

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-xl font-semibold text-gray-900">Proyectos Activos</h3>
          <p className="text-gray-600 text-sm mt-1">{dashboardData.project_summaries.length} proyectos esta semana</p>
        </div>
        <div className="p-6">
          {dashboardData.project_summaries.length === 0 ? (
            <div className="text-center py-12">
              <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">No hay proyectos asignados</h4>
              <p className="text-gray-500">Los proyectos aparecerán aquí cuando tengan asignaciones</p>
            </div>
          ) : (
            <div className="space-y-4">
              {dashboardData.project_summaries.slice(0, 6).map((project) => (
                <div key={project.project_id} className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:shadow-sm transition-shadow">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                      <Briefcase className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{project.project_name}</h4>
                      <p className="text-sm text-gray-600">{project.client_name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{project.total_hours}h</p>
                    <p className="text-sm text-gray-500">{project.assigned_members} miembro(s)</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Componente para alertas recientes - DISEÑO MINIMALISTA
  const RecentAlerts = () => {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-xl font-semibold text-gray-900">Alertas del Sistema</h3>
          <p className="text-gray-600 text-sm mt-1">{alerts.length} alertas activas</p>
        </div>
        <div className="p-6">
          {alerts.length === 0 ? (
            <div className="text-center py-12">
              <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">No hay alertas activas</h4>
              <p className="text-gray-500">El sistema está funcionando correctamente</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.slice(0, 6).map((alert) => (
                <div key={alert.id} className={`p-4 rounded-lg border transition-all ${
                  alert.severity === 'CRITICAL' ? 'bg-red-50 border-red-200' :
                  alert.severity === 'HIGH' ? 'bg-red-50 border-red-200' :
                  alert.severity === 'MEDIUM' ? 'bg-blue-50 border-blue-200' :
                  'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 text-sm">{alert.message}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(alert.created_at).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                    <button
                      onClick={() => resolveAlert(alert.id, 'current_user_id')}
                      className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-white transition-colors"
                    >
                      Resolver
                    </button>
                  </div>
                </div>
              ))}
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
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600 font-medium">Cargando dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 rounded-xl p-6 border border-red-200">
        <div className="flex items-center">
          <AlertTriangle className="w-6 h-6 text-red-600 mr-3" />
          <div>
            <h3 className="text-lg font-semibold text-red-800">Error al cargar datos</h3>
            <p className="text-red-600 mt-1">{error}</p>
            <button
              onClick={refreshData}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header con navegación de semanas - DISEÑO MINIMALISTA */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-6">
          <h1 className="text-3xl font-bold text-gray-900">Coordinación de Capacidad</h1>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigateWeek(-1)}
              className="p-2 text-gray-500 hover:text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center space-x-3 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-semibold text-blue-900">
                {formatWeekRange(currentWeek)}
              </span>
            </div>
            <button
              onClick={() => navigateWeek(1)}
              className="p-2 text-gray-500 hover:text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowCopyModal(true)}
            className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Copy className="w-4 h-4 mr-2" />
            Copiar Semana
          </button>
          <button
            onClick={refreshData}
            className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
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
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('assignments')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'assignments'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Asignaciones
          </button>
          <button
            onClick={() => setActiveTab('team')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'team'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Equipo
          </button>
          <button
            onClick={() => setActiveTab('kanban')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'kanban'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Kanban
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'members'
                ? 'border-blue-500 text-blue-600'
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