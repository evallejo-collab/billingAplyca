import { useState, useEffect, useCallback, useMemo } from 'react';
import { capacityApi } from '../services/supabaseApi';

// Hook para calcular utilización en tiempo real
export const useCapacityCalculations = (weekStartDate) => {
  const [teamUtilization, setTeamUtilization] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Función para obtener datos de utilización
  const fetchUtilization = useCallback(async () => {
    if (!weekStartDate) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await capacityApi.getWeeklyTeamUtilization(weekStartDate);
      if (response.success) {
        setTeamUtilization(response.data);
      }
    } catch (err) {
      console.error('Error fetching utilization:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [weekStartDate]);

  // Cargar datos al cambiar la semana
  useEffect(() => {
    fetchUtilization();
  }, [fetchUtilization]);

  // Calcular métricas agregadas en tiempo real
  const metrics = useMemo(() => {
    if (!teamUtilization.length) {
      return {
        totalCapacity: 0,
        totalAssigned: 0,
        totalAvailable: 0,
        avgUtilization: 0,
        overallocatedCount: 0,
        underutilizedCount: 0,
        optimalCount: 0
      };
    }

    const totalCapacity = teamUtilization.reduce((sum, member) => 
      sum + (member.weekly_capacity || 0), 0);
    const totalAssigned = teamUtilization.reduce((sum, member) => 
      sum + (member.total_assigned || 0), 0);
    const totalAvailable = totalCapacity - totalAssigned;
    const avgUtilization = totalCapacity > 0 ? (totalAssigned / totalCapacity) * 100 : 0;

    const overallocatedCount = teamUtilization.filter(member => 
      (member.utilization_percentage || 0) > 100).length;
    const underutilizedCount = teamUtilization.filter(member => 
      (member.utilization_percentage || 0) < 60).length;
    const optimalCount = teamUtilization.filter(member => {
      const util = member.utilization_percentage || 0;
      return util >= 60 && util <= 100;
    }).length;

    return {
      totalCapacity,
      totalAssigned,
      totalAvailable,
      avgUtilization: Math.round(avgUtilization * 10) / 10,
      overallocatedCount,
      underutilizedCount,
      optimalCount
    };
  }, [teamUtilization]);

  // Función para obtener color de estado basado en utilización
  const getUtilizationColor = useCallback((percentage) => {
    if (percentage > 100) return 'red';
    if (percentage >= 80) return 'green';
    if (percentage >= 60) return 'blue';
    return 'gray';
  }, []);

  // Función para obtener status text
  const getUtilizationStatus = useCallback((percentage) => {
    if (percentage > 100) return 'Sobrecargado';
    if (percentage >= 80) return 'Óptimo';
    if (percentage >= 60) return 'Bueno';
    return 'Subutilizado';
  }, []);

  return {
    teamUtilization,
    metrics,
    loading,
    error,
    refresh: fetchUtilization,
    getUtilizationColor,
    getUtilizationStatus
  };
};

// Hook para gestionar asignaciones de una semana
export const useWeeklyAssignments = (weekStartDate) => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Función para obtener asignaciones
  const fetchAssignments = useCallback(async () => {
    if (!weekStartDate) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await capacityApi.getAssignmentsByWeek(weekStartDate);
      if (response.success) {
        setAssignments(response.data);
      }
    } catch (err) {
      console.error('Error fetching assignments:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [weekStartDate]);

  // Cargar datos al cambiar la semana
  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  // Función para crear nueva asignación
  const createAssignment = useCallback(async (assignment) => {
    try {
      const response = await capacityApi.createAssignment({
        ...assignment,
        week_start_date: weekStartDate
      });
      
      if (response.success) {
        setAssignments(prev => [...prev, response.data]);
        return { success: true, data: response.data };
      }
    } catch (err) {
      console.error('Error creating assignment:', err);
      return { success: false, error: err.message };
    }
  }, [weekStartDate]);

  // Función para actualizar asignación
  const updateAssignment = useCallback(async (id, updates) => {
    try {
      const response = await capacityApi.updateAssignment(id, updates);
      
      if (response.success) {
        setAssignments(prev => 
          prev.map(assignment => 
            assignment.id === id ? response.data : assignment
          )
        );
        return { success: true, data: response.data };
      }
    } catch (err) {
      console.error('Error updating assignment:', err);
      return { success: false, error: err.message };
    }
  }, []);

  // Función para eliminar asignación
  const deleteAssignment = useCallback(async (id) => {
    try {
      const response = await capacityApi.deleteAssignment(id);
      
      if (response.success) {
        setAssignments(prev => prev.filter(assignment => assignment.id !== id));
        return { success: true };
      }
    } catch (err) {
      console.error('Error deleting assignment:', err);
      return { success: false, error: err.message };
    }
  }, []);

  return {
    assignments,
    loading,
    error,
    refresh: fetchAssignments,
    createAssignment,
    updateAssignment,
    deleteAssignment
  };
};

// Hook para verificar disponibilidad de miembros
export const useMemberAvailability = () => {
  const [availabilityCache, setAvailabilityCache] = useState(new Map());
  
  // Función para verificar disponibilidad
  const checkAvailability = useCallback(async (memberId, weekStartDate) => {
    const cacheKey = `${memberId}-${weekStartDate}`;
    
    // Verificar cache primero
    if (availabilityCache.has(cacheKey)) {
      return availabilityCache.get(cacheKey);
    }
    
    try {
      const response = await capacityApi.checkMemberAvailability(memberId, weekStartDate);
      
      if (response.success) {
        // Guardar en cache por 5 minutos
        setAvailabilityCache(prev => {
          const newCache = new Map(prev);
          newCache.set(cacheKey, response.data);
          
          // Limpiar cache después de 5 minutos
          setTimeout(() => {
            setAvailabilityCache(cache => {
              const updatedCache = new Map(cache);
              updatedCache.delete(cacheKey);
              return updatedCache;
            });
          }, 5 * 60 * 1000);
          
          return newCache;
        });
        
        return response.data;
      }
    } catch (err) {
      console.error('Error checking availability:', err);
      return null;
    }
  }, [availabilityCache]);

  // Función para limpiar cache
  const clearCache = useCallback(() => {
    setAvailabilityCache(new Map());
  }, []);

  return {
    checkAvailability,
    clearCache
  };
};

// Hook para gestionar alertas de capacidad
export const useCapacityAlerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Función para obtener alertas activas
  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await capacityApi.getActiveAlerts();
      if (response.success) {
        setAlerts(response.data);
      }
    } catch (err) {
      console.error('Error fetching alerts:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar alertas al montar
  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // Función para resolver alerta
  const resolveAlert = useCallback(async (alertId, resolvedBy) => {
    try {
      const response = await capacityApi.resolveAlert(alertId, resolvedBy);
      
      if (response.success) {
        setAlerts(prev => prev.filter(alert => alert.id !== alertId));
        return { success: true };
      }
    } catch (err) {
      console.error('Error resolving alert:', err);
      return { success: false, error: err.message };
    }
  }, []);

  // Agrupar alertas por severidad
  const alertsBySeverity = useMemo(() => {
    const grouped = {
      CRITICAL: [],
      HIGH: [],
      MEDIUM: [],
      LOW: []
    };
    
    alerts.forEach(alert => {
      grouped[alert.severity]?.push(alert);
    });
    
    return grouped;
  }, [alerts]);

  return {
    alerts,
    alertsBySeverity,
    loading,
    error,
    refresh: fetchAlerts,
    resolveAlert
  };
};

// Hook para operaciones bulk
export const useBulkOperations = () => {
  const [loading, setLoading] = useState(false);
  
  // Función para copiar semana
  const copyWeek = useCallback(async (sourceWeek, targetWeek, projectIds = null) => {
    try {
      setLoading(true);
      const response = await capacityApi.copyWeekAssignments(sourceWeek, targetWeek, projectIds);
      
      if (response.success) {
        return { 
          success: true, 
          copiedCount: response.copiedCount,
          message: `Se copiaron ${response.copiedCount} asignaciones exitosamente`
        };
      }
    } catch (err) {
      console.error('Error copying week:', err);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Función para crear múltiples asignaciones
  const bulkCreateAssignments = useCallback(async (assignments) => {
    try {
      setLoading(true);
      const response = await capacityApi.bulkCreateAssignments(assignments);
      
      if (response.success) {
        return { 
          success: true, 
          data: response.data,
          message: `Se crearon ${response.data.length} asignaciones exitosamente`
        };
      }
    } catch (err) {
      console.error('Error bulk creating assignments:', err);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    copyWeek,
    bulkCreateAssignments
  };
};

// Hook para utilitarios de fecha
export const useWeekUtils = () => {
  // Función para obtener el lunes de una fecha
  const getWeekStart = useCallback((date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Lunes
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString().split('T')[0];
  }, []);

  // Función para navegar semanas
  const addWeeks = useCallback((dateString, weeks) => {
    const date = new Date(dateString);
    date.setDate(date.getDate() + (weeks * 7));
    return getWeekStart(date);
  }, [getWeekStart]);

  // Función para formatear semana
  const formatWeekRange = useCallback((weekStart) => {
    const start = new Date(weekStart);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    
    const options = { day: 'numeric', month: 'short' };
    const startStr = start.toLocaleDateString('es-ES', options);
    const endStr = end.toLocaleDateString('es-ES', options);
    
    return `${startStr} - ${endStr}`;
  }, []);

  // Función para obtener semana actual
  const getCurrentWeek = useCallback(() => {
    return getWeekStart(new Date());
  }, [getWeekStart]);

  return {
    getWeekStart,
    addWeeks,
    formatWeekRange,
    getCurrentWeek
  };
};