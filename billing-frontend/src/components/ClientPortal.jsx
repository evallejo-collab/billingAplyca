import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../utils/roles';
import { 
  Calendar,
  Clock, 
  DollarSign,
  TrendingUp,
  BarChart3,
  Download,
  FileText,
  AlertCircle,
  CheckCircle,
  Target,
  Activity,
  Briefcase,
  Users,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { formatCOP } from '../utils/currency';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const ClientPortal = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [clients, setClients] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [contractsData, setContractsData] = useState([]);
  const [summary, setSummary] = useState({
    totalHours: 0,
    totalPaid: 0,
    averageHoursPerMonth: 0,
    pendingAmount: 0,
    totalAnnualHours: null,
    hoursRemaining: 0,
    supportPayments: [],
    recurrentSupportPayments: [],
    supportAndDevelopmentPayments: []
  });
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const [showMonthlyBreakdown, setShowMonthlyBreakdown] = useState(false);
  const [showSupportRecurrentPayments, setShowSupportRecurrentPayments] = useState(false);
  const [showSupportAndDevelopmentPayments, setShowSupportAndDevelopmentPayments] = useState(false);

  const isAdmin = user?.role === ROLES.ADMIN;
  const isClient = user?.role === ROLES.CLIENT;
  const currentClientId = isClient ? user?.client_id : selectedClientId;

  useEffect(() => {
    const initializeData = async () => {
      if (isAdmin) {
        await loadClients();
      } else if (isClient && currentClientId) {
        await loadClientData();
      } else {
        setLoading(false);
      }
    };
    
    initializeData();
  }, [user?.role, user?.client_id]);

  useEffect(() => {
    if (currentClientId) {
      loadClientData();
    }
  }, [currentClientId, selectedYear]);

  const loadClients = async () => {
    try {
      setLoading(true);
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('id, name')
        .order('name');

      if (clientsError) throw clientsError;

      setClients(clientsData || []);
      
      // Auto-select first client for admin
      if (clientsData && clientsData.length > 0 && !selectedClientId) {
        setSelectedClientId(clientsData[0].id);
      } else {
        setLoading(false);
      }
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const loadClientData = async () => {
    console.log('🔄 PORTAL: Starting to load client data for ID:', currentClientId, 'Year:', selectedYear);
    
    try {
      setLoading(true);
      setError(null);

      // First, let's check if there are ANY payments in the database
      console.log('🔍 DEBUGGING: Checking if payments exist in database');
      const { data: allPaymentsTest, error: allPaymentsTestError } = await supabase
        .from('payments')
        .select('id, payment_date, payment_type, status')
        .limit(5);
      
      console.log('  - Sample payments in DB:', allPaymentsTest);
      console.log('  - Payments test error:', allPaymentsTestError);

      // Get client projects and contracts in parallel
      const [projectsResult, contractsResult] = await Promise.all([
        supabase
          .from('projects')
          .select('id, name, contract_id')
          .eq('client_id', currentClientId),
        supabase
          .from('contracts')
          .select('id, contract_number, description, total_hours, total_amount, status, start_date, end_date')
          .eq('client_id', currentClientId)
      ]);

      if (projectsResult.error) throw projectsResult.error;
      if (contractsResult.error) throw contractsResult.error;

      const projects = projectsResult.data || [];
      const contracts = contractsResult.data || [];

      const projectIds = projects.map(p => p.id);

      if (projectIds.length === 0) {
        setMonthlyData([]);
        setContractsData(contracts || []);
        setSummary({ 
          totalHours: 0, 
          totalPaid: 0, 
          averageHoursPerMonth: 0, 
          pendingAmount: 0,
          totalAnnualHours: null,
          hoursRemaining: 0,
          supportPayments: [],
          recurrentSupportPayments: [],
          supportAndDevelopmentPayments: []
        });
        setLoading(false);
        return;
      }

      // Get time entries by month for the selected year
      const { data: timeEntries, error: timeError } = await supabase
        .from('time_entries')
        .select(`
          id,
          hours_used,
          entry_date,
          project:projects!inner (
            id,
            name,
            hourly_rate
          )
        `)
        .in('project_id', projectIds)
        .gte('entry_date', `${selectedYear}-01-01`)
        .lte('entry_date', `${selectedYear}-12-31`)
        .order('entry_date');

      if (timeError) throw timeError;

      // Get payments by month for the selected year (through projects)
      console.log('🔍 DEBUGGING PAYMENTS QUERY 1:');
      console.log('  - Project IDs:', projectIds);
      console.log('  - Selected year:', selectedYear);
      
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('id, amount, payment_date, status, payment_type')
        .in('project_id', projectIds)
        .gte('payment_date', `${selectedYear}-01-01`)
        .lte('payment_date', `${selectedYear}-12-31`)
        .order('payment_date');
      
      console.log('  - Payments from projects query:', payments);
      console.log('  - Payments error:', paymentsError);

      // Get all payments to find the ones that might be client-related
      console.log('🔍 DEBUGGING PAYMENTS QUERY 2:');
      
      const { data: allClientPayments, error: allClientPaymentsError } = await supabase
        .from('payments')
        .select(`
          *,
          project:projects(
            id,
            name,
            client_id,
            independent_client_id
          ),
          contract:contracts(
            id,
            client_id
          )
        `)
        .gte('payment_date', `${selectedYear}-01-01`)
        .lte('payment_date', `${selectedYear}-12-31`)
        .order('payment_date');
      
      console.log('  - All client payments from broader query:', allClientPayments);
      console.log('  - All client payments error:', allClientPaymentsError);
      
      // Filter payments that belong to the current client
      console.log('🔍 DEBUGGING CLIENT PAYMENTS QUERY:');
      console.log('  - Current client ID:', currentClientId, '(type:', typeof currentClientId, ')');
      console.log('  - All client payments from query:', allClientPayments);
      
      const clientPayments = allClientPayments?.filter(payment => {
        // Convert currentClientId to number for comparison
        const clientIdNum = parseInt(currentClientId);
        
        const belongsToClient = payment.project?.client_id === clientIdNum || 
                                payment.project?.independent_client_id === clientIdNum ||
                                payment.contract?.client_id === clientIdNum;
        
        console.log(`  - Payment ${payment.id}:`, {
          payment_type: payment.payment_type,
          project_client_id: payment.project?.client_id,
          project_independent_client_id: payment.project?.independent_client_id,
          contract_client_id: payment.contract?.client_id,
          clientIdNum,
          belongsToClient
        });
        
        return belongsToClient;
      }) || [];
      
      console.log('  - Filtered client payments:', clientPayments);

      if (paymentsError) throw paymentsError;
      if (allClientPaymentsError) throw allClientPaymentsError;

      // Combine all payments and remove duplicates by ID
      const allPaymentIds = new Set();
      const allPayments = [];
      
      // Add payments from projects query
      (payments || []).forEach(payment => {
        if (!allPaymentIds.has(payment.id)) {
          allPaymentIds.add(payment.id);
          allPayments.push(payment);
        }
      });
      
      // Add additional client payments
      clientPayments.forEach(payment => {
        if (!allPaymentIds.has(payment.id)) {
          allPaymentIds.add(payment.id);
          allPayments.push(payment);
        }
      });

      // Process data by month
      const monthlyMap = {};
      
      // Initialize all months
      for (let month = 1; month <= 12; month++) {
        const key = `${selectedYear}-${month.toString().padStart(2, '0')}`;
        monthlyMap[key] = {
          month,
          year: selectedYear,
          monthName: new Date(selectedYear, month - 1).toLocaleDateString('es-ES', { month: 'long' }),
          hours: 0,
          revenue: 0,
          payments: 0,
          projects: new Set()
        };
      }

      // Add time entries
      timeEntries.forEach(entry => {
        const date = new Date(entry.entry_date);
        const key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        if (monthlyMap[key]) {
          const hours = parseInt(entry.hours_used || 0);
          monthlyMap[key].hours += hours;
          monthlyMap[key].revenue += hours * (entry.project.hourly_rate || 0);
          monthlyMap[key].projects.add(entry.project.name);
        }
      });

      // Add payments
      allPayments.forEach(payment => {
        const date = new Date(payment.payment_date);
        const key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        if (monthlyMap[key] && ['completed', 'pending', 'paid'].includes(payment.status)) {
          monthlyMap[key].payments += payment.amount;
        }
      });

      // Process support payments separately for the new section
      console.log('🔍 DEBUGGING SUPPORT PAYMENTS:');
      console.log('  - All payments count:', allPayments.length);
      console.log('  - All payments:', allPayments);
      
      // Separate payments by type for different sections
      const recurrentSupportPayments = allPayments.filter(payment => 
        payment.payment_type === 'recurring_support' && 
        ['completed', 'pending', 'paid'].includes(payment.status)
      );

      const fixedSupportPayments = allPayments.filter(payment => 
        payment.payment_type === 'fixed' && 
        ['completed', 'pending', 'paid'].includes(payment.status)
      );

      const developmentPayments = allPayments.filter(payment => 
        !['fixed', 'recurring_support'].includes(payment.payment_type) && 
        ['completed', 'pending', 'paid'].includes(payment.status)
      );

      // Combine fixed support and development payments for "Pago de Soporte y Evolutivos"
      const supportAndDevelopmentPayments = [...fixedSupportPayments, ...developmentPayments];
      
      // Keep original supportPayments for backward compatibility
      const supportPayments = [...recurrentSupportPayments, ...fixedSupportPayments];
      
      console.log('  - Support payments found:', supportPayments.length);
      console.log('  - Support payments:', supportPayments);
      
      const paymentTypes = [...new Set(allPayments.map(p => p.payment_type))];
      const paymentStatuses = [...new Set(allPayments.map(p => p.status))];
      
      console.log('  - Payment types found:', paymentTypes);
      console.log('  - Payment statuses found:', paymentStatuses);
      console.log('  - Expected types for support: [\"fixed\", \"recurring_support\"]');
      console.log('  - Expected statuses for support: [\"completed\", \"pending\", \"paid\"]');
      
      // Log individual payment details
      allPayments.forEach((payment, index) => {
        console.log(`  - Payment ${index + 1}: type="${payment.payment_type}", status="${payment.status}", amount=${payment.amount}`);
      });

      // Convert to array and filter out months with no activity, calculate totals
      const monthlyArray = Object.values(monthlyMap)
        .filter(month => month.hours > 0 || month.payments > 0) // Show only months with activity
        .map(month => ({
          ...month,
          projects: Array.from(month.projects),
          balance: month.payments - month.revenue
        }));

      // Calculate total hours from ALL time entries for the year (not just active months)
      const allYearHours = timeEntries.reduce((sum, entry) => sum + parseInt(entry.hours_used || 0), 0);
      
      const totalRevenue = monthlyArray.reduce((sum, month) => sum + month.revenue, 0);
      const totalPaid = monthlyArray.reduce((sum, month) => sum + month.payments, 0);
      const pendingAmount = Math.max(0, totalRevenue - totalPaid);

      // Get client annual hours allocation
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', currentClientId)
        .single();

      if (clientError) {
        console.error('Error fetching client data:', clientError);
      } else {
        console.log('Full client data:', clientData);
      }

      // Temporal: if annual_hours doesn't exist in DB, use a default value for testing
      const totalAnnualHours = clientData?.annual_hours || 1800; // Default 1800 hours per year
      const hoursRemaining = totalAnnualHours ? Math.max(0, totalAnnualHours - allYearHours) : 0;

      console.log('📊 PORTAL HOURS CALCULATION:');
      console.log('  - Client data:', clientData);
      console.log('  - Annual hours from client:', clientData?.annual_hours);
      console.log('  - All year hours used:', allYearHours);
      console.log('  - Monthly array hours:', monthlyArray.reduce((sum, month) => sum + month.hours, 0));
      console.log('  - Using annual hours:', totalAnnualHours);
      console.log('  - Final hours remaining:', hoursRemaining);

      // Process contracts data
      const contractsWithStats = await Promise.all(contracts.map(async (contract) => {
        // Get time entries for this contract's projects
        const contractProjects = projects.filter(p => p.contract_id === contract.id);
        const contractProjectIds = contractProjects.map(p => p.id);
        
        let contractHours = 0;
        let contractRevenue = 0;
        let contractPayments = 0;

        if (contractProjectIds.length > 0) {
          // Get time entries for contract projects
          const contractTimeEntries = timeEntries.filter(entry => 
            contractProjectIds.includes(entry.project.id)
          );
          
          contractHours = contractTimeEntries.reduce((sum, entry) => 
            sum + parseInt(entry.hours_used || 0), 0
          );
          
          contractRevenue = contractTimeEntries.reduce((sum, entry) => 
            sum + (parseInt(entry.hours_used || 0) * (entry.project.hourly_rate || 0)), 0
          );

          // Get payments for contract projects
          const contractPaymentEntries = payments.filter(payment => 
            contractProjectIds.includes(payment.project_id) && payment.status === 'completed'
          );
          
          contractPayments = contractPaymentEntries.reduce((sum, payment) => 
            sum + (payment.amount || 0), 0
          );
        }

        const hoursProgress = contract.total_hours ? (contractHours / contract.total_hours) * 100 : 0;
        const budgetProgress = contract.total_amount ? (contractRevenue / contract.total_amount) * 100 : 0;

        return {
          ...contract,
          usedHours: contractHours,
          hoursProgress: Math.min(hoursProgress, 100),
          budgetUsed: contractRevenue,
          budgetProgress: Math.min(budgetProgress, 100),
          totalPaid: contractPayments,
          pendingAmount: Math.max(0, contractRevenue - contractPayments),
          projects: contractProjects
        };
      }));

      setMonthlyData(monthlyArray);
      setContractsData(contractsWithStats);
      setSummary({
        totalHours: allYearHours,
        totalPaid,
        averageHoursPerMonth: allYearHours / 12,
        pendingAmount,
        totalAnnualHours,
        hoursRemaining,
        supportPayments,
        recurrentSupportPayments,
        supportAndDevelopmentPayments
      });

    } catch (err) {
      setError(err.message);
      console.error('Error loading client data:', err);
    } finally {
      setLoading(false);
    }
  };

  const exportData = () => {
    const csvContent = [
      ['Mes', 'Horas', 'Facturado', 'Pagado', 'Balance', 'Proyectos'],
      ...monthlyData.map(month => [
        month.monthName,
        month.hours,
        month.revenue,
        month.payments,
        month.balance,
        month.projects.join('; ')
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `resumen-${selectedYear}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getBalanceColor = (balance) => {
    if (balance > 0) return 'text-green-600 bg-green-50';
    if (balance < 0) return 'text-red-600 bg-red-50';
    return 'text-gray-600 bg-gray-50';
  };

  const getBalanceIcon = (balance) => {
    if (balance > 0) return <CheckCircle className="w-4 h-4" />;
    if (balance < 0) return <AlertCircle className="w-4 h-4" />;
    return <DollarSign className="w-4 h-4" />;
  };

  const getProgressColor = (percentage) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'on-hold': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'active': return 'Activo';
      case 'completed': return 'Completado';
      case 'on-hold': return 'En Pausa';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  // Chart data preparation
  const chartData = monthlyData.map(month => ({
    mes: month.monthName.slice(0, 3),
    horas: month.hours,
    facturado: month.revenue,
    pagado: month.payments,
    balance: month.balance
  }));


  const COLORS = ['#6b7280', '#9ca3af', '#d1d5db', '#e5e7eb'];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 shadow-lg rounded">
          <p className="font-medium text-gray-900">{`${label}`}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {`${entry.dataKey}: ${entry.dataKey.includes('facturado') || entry.dataKey.includes('pagado') || entry.dataKey.includes('balance') 
                ? formatCOP(entry.value) 
                : entry.value}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
          <span className="text-red-700">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Portal del Cliente</h1>
          <p className="text-sm text-gray-600 mt-1">Resumen ejecutivo de horas y pagos</p>
        </div>
        <div className="flex items-center space-x-4">
          {isAdmin && (
            <select
              value={selectedClientId || ''}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Seleccionar cliente</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
          )}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <button
            onClick={exportData}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Show message if admin hasn't selected a client */}
      {isAdmin && !currentClientId && (
        <div className="text-center py-12">
          <div className="max-w-md mx-auto">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Selecciona un Cliente</h3>
            <p className="text-gray-500">
              Para ver el portal del cliente, selecciona un cliente en el menú desplegable de arriba.
            </p>
          </div>
        </div>
      )}

      {/* Executive Summary */}
      {currentClientId && (
        <div>
          <div className="bg-gray-50 border border-gray-200">
            <div className="px-8 py-6 border-b border-gray-200 bg-white">
              <h2 className="text-lg font-semibold text-gray-900">Resumen Ejecutivo</h2>
              <p className="text-sm text-gray-600 mt-1">Datos consolidados para el año {selectedYear}</p>
            </div>
            <div className="p-8 bg-gray-50">
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-8">
                <div className="text-center">
                  <div className="text-3xl font-light text-gray-900 mb-1">{summary.totalHours.toFixed(1)}</div>
                  <div className="text-sm font-medium text-gray-700 mb-1">HORAS USADAS</div>
                  <div className="text-xs text-gray-500">Año {selectedYear}</div>
                </div>
                <div className="text-center">
                  <div className={`text-3xl font-light mb-1 ${summary.hoursRemaining < 100 ? 'text-red-600' : 'text-gray-900'}`}>
                    {summary.hoursRemaining.toFixed(1)}
                  </div>
                  <div className="text-sm font-medium text-gray-700 mb-1">HORAS RESTANTES</div>
                  <div className="text-xs text-gray-500">
                    {summary.totalAnnualHours ? `de ${summary.totalAnnualHours}` : 'No definido'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-light text-gray-900 mb-1">{formatCOP(summary.totalPaid)}</div>
                  <div className="text-sm font-medium text-gray-700 mb-1">TOTAL PAGADO</div>
                  <div className="text-xs text-gray-500">Completado</div>
                </div>
              </div>
            </div>
          </div>

          {/* Contracts Analysis */}
          {contractsData.length > 0 && (
            <div className="bg-gray-50 border border-gray-200">
              <div className="px-8 py-6 border-b border-gray-200 bg-white">
                <h2 className="text-lg font-semibold text-gray-900">Contratos</h2>
                <p className="text-sm text-gray-600 mt-1">Resumen de contratos y su estado actual</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-800 border-b border-gray-700">
                    <tr>
                      <th className="px-8 py-6 text-left text-xs font-bold text-white uppercase tracking-wider">
                        Contrato
                      </th>
                      <th className="px-8 py-6 text-left text-xs font-bold text-white uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-8 py-6 text-left text-xs font-bold text-white uppercase tracking-wider">
                        Horas
                      </th>
                      <th className="px-8 py-6 text-left text-xs font-bold text-white uppercase tracking-wider">
                        Presupuesto
                      </th>
                      <th className="px-8 py-6 text-left text-xs font-bold text-white uppercase tracking-wider">
                        Total Pagado
                      </th>
                      <th className="px-8 py-6 text-left text-xs font-bold text-white uppercase tracking-wider">
                        Pendiente
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-300">
                    {contractsData.map((contract) => (
                      <tr key={contract.id} className="hover:bg-blue-50 bg-white border-b border-gray-200">
                        <td className="px-8 py-6">
                          <div>
                            <div className="text-sm font-bold text-gray-900">{contract.contract_number}</div>
                            <div className="text-sm text-gray-700 mt-1">{contract.description}</div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className={`inline-flex px-2 py-1 text-xs font-medium rounded ${getStatusColor(contract.status)}`}>
                            {getStatusLabel(contract.status)}
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          {contract.total_hours ? (
                            <div className="text-sm">
                              <div className="text-gray-900 font-bold">{contract.usedHours} / {contract.total_hours}</div>
                              <div className="text-gray-700 text-xs mt-1">{contract.hoursProgress.toFixed(0)}% usado</div>
                            </div>
                          ) : (
                            <div className="text-sm text-gray-400">No definido</div>
                          )}
                        </td>
                        <td className="px-8 py-6">
                          {contract.total_amount ? (
                            <div className="text-sm">
                              <div className="text-gray-900 font-bold">{formatCOP(contract.budgetUsed)}</div>
                              <div className="text-gray-700 text-xs mt-1">de {formatCOP(contract.total_amount)}</div>
                            </div>
                          ) : (
                            <div className="text-sm text-gray-400">No definido</div>
                          )}
                        </td>
                        <td className="px-8 py-6">
                          <div className="text-sm text-gray-900 font-bold">
                            {formatCOP(contract.totalPaid)}
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className={`text-sm font-medium ${contract.pendingAmount > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                            {contract.pendingAmount > 0 ? formatCOP(contract.pendingAmount) : 'Sin pendientes'}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Charts Section */}
          {currentClientId && chartData.length > 0 && (
            <div className="bg-gray-50 border border-gray-200">
              <div className="px-8 py-6 border-b border-gray-200 bg-white">
                <h2 className="text-lg font-semibold text-gray-900">Análisis Visual</h2>
                <p className="text-sm text-gray-600 mt-1">Gráficas y tendencias de {selectedYear}</p>
              </div>
              <div className="p-8 bg-gray-50">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Hours Consumption Chart */}
                  <div className="bg-white border border-gray-200 p-6">
                    <h3 className="text-base font-medium text-gray-900 mb-4">Consumo de Horas Mensual</h3>
                    {summary.totalAnnualHours && (
                      <p className="text-sm text-gray-600 mb-4">
                        Quedan {summary.hoursRemaining.toFixed(1)} horas de {summary.totalAnnualHours} anuales
                      </p>
                    )}
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis 
                            dataKey="mes" 
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 12, fill: '#6b7280' }}
                          />
                          <YAxis 
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 12, fill: '#6b7280' }}
                          />
                          <Tooltip 
                            content={({ active, payload, label }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                const monthlyBudget = summary.totalAnnualHours / 12;
                                return (
                                  <div className="bg-white p-3 border border-gray-200 shadow-lg rounded">
                                    <p className="font-medium text-gray-900">{label}</p>
                                    <p className="text-sm text-gray-600">Horas usadas: {data.horas}</p>
                                    {summary.totalAnnualHours && (
                                      <p className="text-sm text-gray-600">
                                        Presupuesto mensual: {monthlyBudget.toFixed(1)}h
                                      </p>
                                    )}
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Bar 
                            dataKey="horas" 
                            fill="#6b7280" 
                            radius={[2, 2, 0, 0]}
                            name="Horas Consumidas"
                          />
                          {summary.totalAnnualHours && (
                            <Bar 
                              dataKey={() => summary.totalAnnualHours / 12} 
                              fill="#e5e7eb" 
                              radius={[2, 2, 0, 0]}
                              name="Presupuesto Mensual"
                            />
                          )}
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Monthly Payments Bar Chart */}
                  <div className="bg-white border border-gray-200 p-6">
                    <h3 className="text-base font-medium text-gray-900 mb-4">Pagos Mensuales</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis 
                            dataKey="mes" 
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 12, fill: '#6b7280' }}
                          />
                          <YAxis 
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 12, fill: '#6b7280' }}
                            tickFormatter={(value) => formatCOP(value)}
                          />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar 
                            dataKey="pagado" 
                            fill="#6b7280" 
                            radius={[2, 2, 0, 0]}
                            name="Pagado"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}

          {/* Pago de Soporte Recurrente Section */}
          {summary.recurrentSupportPayments && summary.recurrentSupportPayments.length > 0 && (
            <div className="bg-gray-50 border border-gray-200">
              <div className="px-8 py-6 border-b border-gray-200 bg-white">
                <button
                  onClick={() => setShowSupportRecurrentPayments(!showSupportRecurrentPayments)}
                  className="flex items-center justify-between w-full text-left"
                >
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Pago de Soporte Recurrente</h2>
                    <p className="text-sm text-gray-600 mt-1">Historial de pagos de soporte recurrente para {selectedYear}</p>
                  </div>
                  {showSupportRecurrentPayments ? (
                    <ChevronUp className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  )}
                </button>
              </div>
              {showSupportRecurrentPayments && (
                <div className="p-8 bg-gray-50">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Recurrent Support Payments Chart */}
                    <div className="bg-white border border-gray-200 p-6">
                      <h3 className="text-base font-medium text-gray-900 mb-4">Pagos Recurrentes</h3>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={(() => {
                            const supportByMonth = {};
                            const today = new Date();
                            const currentMonth = today.getMonth(); // 0-based
                            const currentDay = today.getDate();
                            
                            // Initialize all months
                            for (let month = 1; month <= 12; month++) {
                              const monthName = new Date(selectedYear, month - 1).toLocaleDateString('es-ES', { month: 'short' });
                              supportByMonth[monthName] = { 
                                mes: monthName, 
                                pagos: 0,
                                esFaltante: false,
                                monthIndex: month - 1
                              };
                            }
                            
                            // Add recurrent support payments
                            summary.recurrentSupportPayments.forEach(payment => {
                              const date = new Date(payment.payment_date);
                              const monthName = date.toLocaleDateString('es-ES', { month: 'short' });
                              if (supportByMonth[monthName]) {
                                supportByMonth[monthName].pagos += payment.amount;
                              }
                            });
                            
                            // Check for missing payments - mark months that should have payments but don't
                            if (selectedYear === today.getFullYear()) {
                              for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
                                const monthName = new Date(selectedYear, monthIndex).toLocaleDateString('es-ES', { month: 'short' });
                                
                                // If it's a past month (before current month) or if it's current month and we're past day 5
                                const shouldHavePayment = monthIndex < currentMonth || 
                                                        (monthIndex === currentMonth && currentDay > 5);
                                
                                if (shouldHavePayment && supportByMonth[monthName].pagos === 0) {
                                  supportByMonth[monthName].esFaltante = true;
                                  // Use average payment amount or a standard amount for the red bar height
                                  const avgPayment = summary.recurrentSupportPayments.length > 0 
                                    ? summary.recurrentSupportPayments.reduce((sum, p) => sum + p.amount, 0) / summary.recurrentSupportPayments.length
                                    : 25000000; // Default 25M if no payments to calculate average
                                  supportByMonth[monthName].pagosFaltante = avgPayment;
                                }
                              }
                            }
                            
                            return Object.values(supportByMonth);
                          })()}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="mes" />
                            <YAxis tickFormatter={(value) => formatCOP(value, true)} />
                            <Tooltip 
                              formatter={(value, name) => [formatCOP(value), name === 'pagosFaltante' ? 'Pago Faltante' : 'Pagos']}
                              labelFormatter={(label) => `Mes: ${label}`}
                            />
                            <Bar dataKey="pagos" fill="#6366f1" radius={[2, 2, 0, 0]} name="Pagos" />
                            <Bar dataKey="pagosFaltante" fill="#ef4444" radius={[2, 2, 0, 0]} name="Pago Faltante" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Recurrent Support Payments Summary */}
                    <div className="bg-white border border-gray-200 p-6">
                      <h3 className="text-base font-medium text-gray-900 mb-6">Resumen de Pagos Recurrentes</h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                          <div className="flex items-center">
                            <DollarSign className="h-6 w-6 text-indigo-600 mr-3" />
                            <div>
                              <div className="text-sm font-medium text-indigo-900">Total Pagado</div>
                              <div className="text-xs text-indigo-700">Año {selectedYear}</div>
                            </div>
                          </div>
                          <div className="text-2xl font-light text-indigo-900">
                            {formatCOP(summary.recurrentSupportPayments.reduce((sum, payment) => sum + payment.amount, 0))}
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg">
                          <div className="flex items-center">
                            <FileText className="h-6 w-6 text-gray-600 mr-3" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">Pagos Realizados</div>
                              <div className="text-xs text-gray-600">Número de pagos</div>
                            </div>
                          </div>
                          <div className="text-2xl font-light text-gray-900">
                            {summary.recurrentSupportPayments.length}
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg">
                          <div className="flex items-center">
                            <TrendingUp className="h-6 w-6 text-gray-600 mr-3" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">Promedio Mensual</div>
                              <div className="text-xs text-gray-600">Calculado</div>
                            </div>
                          </div>
                          <div className="text-2xl font-light text-gray-900">
                            {formatCOP(summary.recurrentSupportPayments.reduce((sum, payment) => sum + payment.amount, 0) / 12)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recurrent Support Payments Table */}
                  <div className="mt-8 bg-white border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <button
                        onClick={() => setShowPaymentDetails(!showPaymentDetails)}
                        className="flex items-center justify-between w-full text-left"
                      >
                        <h4 className="text-base font-medium text-gray-900">Detalle de Pagos Recurrentes</h4>
                        {showPaymentDetails ? (
                          <ChevronUp className="h-5 w-5 text-gray-500" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-500" />
                        )}
                      </button>
                    </div>
                    {showPaymentDetails && (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-100 border-b border-gray-200">
                            <tr>
                              <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider bg-gray-800">
                                Fecha
                              </th>
                              <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider bg-gray-800">
                                Tipo
                              </th>
                              <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider bg-gray-800">
                                Descripción
                              </th>
                              <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider bg-gray-800">
                                Monto
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {summary.recurrentSupportPayments.map((payment, index) => (
                              <tr key={payment.id || index} className="hover:bg-blue-50 bg-white border-b border-gray-200">
                                <td className="px-6 py-4 text-sm text-gray-900 font-semibold">
                                  {new Date(payment.payment_date).toLocaleDateString('es-ES')}
                                </td>
                                <td className="px-6 py-4 text-sm">
                                  <span className="inline-flex px-2 py-1 text-xs font-medium rounded bg-purple-100 text-purple-800">
                                    Soporte Recurrente
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-700">
                                  {payment.description || '-'}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-900 font-bold">
                                  {formatCOP(payment.amount)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Pago de Soporte y Evolutivos Section */}
          {summary.supportAndDevelopmentPayments && summary.supportAndDevelopmentPayments.length > 0 && (
            <div className="bg-gray-50 border border-gray-200">
              <div className="px-8 py-6 border-b border-gray-200 bg-white">
                <button
                  onClick={() => setShowSupportAndDevelopmentPayments(!showSupportAndDevelopmentPayments)}
                  className="flex items-center justify-between w-full text-left"
                >
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Pago de Soporte y Evolutivos</h2>
                    <p className="text-sm text-gray-600 mt-1">Historial de pagos de soporte fijo y desarrollo para {selectedYear}</p>
                  </div>
                  {showSupportAndDevelopmentPayments ? (
                    <ChevronUp className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  )}
                </button>
              </div>
              {showSupportAndDevelopmentPayments && (
                <div className="p-8 bg-gray-50">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Support and Development Payments Chart */}
                    <div className="bg-white border border-gray-200 p-6">
                      <h3 className="text-base font-medium text-gray-900 mb-4">Pago de Soporte y Evolutivos</h3>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={(() => {
                          const supportByMonth = {};
                          const today = new Date();
                          const currentMonth = today.getMonth(); // 0-based
                          const currentDay = today.getDate();
                          
                          // Initialize all months
                          for (let month = 1; month <= 12; month++) {
                            const monthName = new Date(selectedYear, month - 1).toLocaleDateString('es-ES', { month: 'short' });
                            supportByMonth[monthName] = { 
                              mes: monthName, 
                              pagos: 0,
                              esFaltante: false,
                              monthIndex: month - 1
                            };
                          }
                          
                          // Add support and development payments
                          summary.supportAndDevelopmentPayments.forEach(payment => {
                            const date = new Date(payment.payment_date);
                            const monthName = date.toLocaleDateString('es-ES', { month: 'short' });
                            if (supportByMonth[monthName]) {
                              supportByMonth[monthName].pagos += payment.amount;
                            }
                          });
                          
                          // Check for missing payments - mark months that should have payments but don't
                          if (selectedYear === today.getFullYear()) {
                            for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
                              const monthName = new Date(selectedYear, monthIndex).toLocaleDateString('es-ES', { month: 'short' });
                              
                              // If it's a past month (before current month) or if it's current month and we're past day 5
                              const shouldHavePayment = monthIndex < currentMonth || 
                                                      (monthIndex === currentMonth && currentDay > 5);
                              
                              if (shouldHavePayment && 
                                  supportByMonth[monthName] && 
                                  supportByMonth[monthName].pagos === 0) {
                                supportByMonth[monthName].esFaltante = true;
                                // Use average payment amount or a standard amount for the red bar height
                                const avgPayment = summary.supportAndDevelopmentPayments.length > 0 
                                  ? summary.supportAndDevelopmentPayments.reduce((sum, p) => sum + p.amount, 0) / summary.supportAndDevelopmentPayments.length
                                  : 25000000; // Default 25M if no payments to calculate average
                                supportByMonth[monthName].pagosFaltante = avgPayment;
                              }
                            }
                          }
                          
                          return Object.values(supportByMonth).map(month => ({
                            ...month,
                            pagosFaltante: month.esFaltante ? month.pagosFaltante : 0
                          }));
                        })()}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis 
                            dataKey="mes" 
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 12, fill: '#6b7280' }}
                          />
                          <YAxis 
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 12, fill: '#6b7280' }}
                            tickFormatter={(value) => formatCOP(value)}
                          />
                          <Tooltip 
                            content={({ active, payload, label }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="bg-white p-3 border border-gray-200 shadow-lg rounded">
                                    <p className="font-medium text-gray-900">{label}</p>
                                    {payload.map((entry, index) => (
                                      <p key={index} className="text-sm" style={{ color: entry.color }}>
                                        {entry.dataKey === 'pagos' 
                                          ? `Pagos: ${formatCOP(entry.value)}`
                                          : entry.value > 0 
                                          ? 'PAGO FALTANTE - Registrar antes del día 5'
                                          : ''
                                        }
                                      </p>
                                    ))}
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Bar 
                            dataKey="pagos" 
                            fill="#4f46e5" 
                            radius={[2, 2, 0, 0]}
                            name="Pagos de Soporte"
                          />
                          <Bar 
                            dataKey="pagosFaltante" 
                            fill="#dc2626" 
                            radius={[2, 2, 0, 0]}
                            name="Pago Faltante"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-4 flex items-center justify-center space-x-6 text-sm">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-indigo-600 rounded mr-2"></div>
                        <span className="text-gray-600">Pagos Registrados</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-red-600 rounded mr-2"></div>
                        <span className="text-gray-600">Pagos Faltantes</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Support Summary */}
                  <div className="bg-white border border-gray-200 p-6">
                    <h3 className="text-base font-medium text-gray-900 mb-4">Resumen de Soporte y Evolutivos</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-4 bg-indigo-50 rounded-lg">
                        <div>
                          <div className="text-sm font-medium text-indigo-900">Total Pagado</div>
                          <div className="text-2xl font-light text-indigo-900">
                            {formatCOP(summary.supportAndDevelopmentPayments.reduce((sum, payment) => sum + payment.amount, 0))}
                          </div>
                        </div>
                        <div className="text-indigo-600">
                          <DollarSign className="w-8 h-8" />
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                        <div>
                          <div className="text-sm font-medium text-gray-700">Cantidad de Pagos</div>
                          <div className="text-2xl font-light text-gray-900">
                            {summary.supportAndDevelopmentPayments.length}
                          </div>
                        </div>
                        <div className="text-gray-600">
                          <FileText className="w-8 h-8" />
                        </div>
                      </div>

                      <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                        <div>
                          <div className="text-sm font-medium text-gray-700">Promedio Mensual</div>
                          <div className="text-2xl font-light text-gray-900">
                            {formatCOP(summary.supportAndDevelopmentPayments.reduce((sum, payment) => sum + payment.amount, 0) / 12)}
                          </div>
                        </div>
                        <div className="text-gray-600">
                          <TrendingUp className="w-8 h-8" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Monthly Breakdown */}
          <div className="bg-gray-50 border border-gray-200">
            <div className="px-8 py-6 border-b border-gray-200 bg-white">
              <button
                onClick={() => setShowMonthlyBreakdown(!showMonthlyBreakdown)}
                className="flex items-center justify-between w-full text-left"
              >
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Desglose Mensual</h2>
                  <p className="text-sm text-gray-600 mt-1">Actividad detallada por mes para {selectedYear}</p>
                </div>
                {showMonthlyBreakdown ? (
                  <ChevronUp className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                )}
              </button>
            </div>
            {showMonthlyBreakdown && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-800 border-b border-gray-700">
                    <tr>
                      <th className="px-8 py-6 text-left text-xs font-bold text-white uppercase tracking-wider">
                        Mes
                      </th>
                      <th className="px-8 py-6 text-left text-xs font-bold text-white uppercase tracking-wider">
                        Horas
                      </th>
                      <th className="px-8 py-6 text-left text-xs font-bold text-white uppercase tracking-wider">
                        Facturado
                      </th>
                      <th className="px-8 py-6 text-left text-xs font-bold text-white uppercase tracking-wider">
                        Pagado
                      </th>
                      <th className="px-8 py-6 text-left text-xs font-bold text-white uppercase tracking-wider">
                        Balance
                      </th>
                      <th className="px-8 py-6 text-left text-xs font-bold text-white uppercase tracking-wider">
                        Proyectos
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-300">
                    {monthlyData.map((month) => (
                      <tr key={month.month} className="hover:bg-blue-50 bg-white border-b border-gray-200">
                        <td className="px-8 py-6">
                          <div className="text-sm font-bold text-gray-900 capitalize">
                            {month.monthName}
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="text-sm text-gray-900 font-semibold">
                            {month.hours.toFixed(1)} h
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="text-sm text-gray-900 font-semibold">
                            {formatCOP(month.revenue)}
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="text-sm text-gray-900 font-semibold">
                            {formatCOP(month.payments)}
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="text-sm">
                            <div className={`font-bold ${month.balance < 0 ? 'text-red-700' : month.balance > 0 ? 'text-gray-900' : 'text-gray-600'}`}>
                              {formatCOP(Math.abs(month.balance))}
                            </div>
                            {month.balance < 0 && (
                              <div className="text-xs text-red-500 mt-1">Pendiente</div>
                            )}
                            {month.balance > 0 && (
                              <div className="text-xs text-gray-500 mt-1">Pagado de más</div>
                            )}
                            {month.balance === 0 && (
                              <div className="text-xs text-gray-500 mt-1">Balanceado</div>
                            )}
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="text-sm">
                            {month.projects.length > 0 ? (
                              <div className="space-y-1">
                                {month.projects.map((project, index) => (
                                  <div key={index} className="text-gray-700">
                                    {project}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-gray-400 italic">Sin actividad</div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {monthlyData.length === 0 && (
                  <div className="text-center py-16 px-8">
                    <div className="text-gray-400 mb-4">
                      <BarChart3 className="w-12 h-12 mx-auto" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Sin datos disponibles</h3>
                    <p className="text-gray-500">No se encontraron registros para el año {selectedYear}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientPortal;