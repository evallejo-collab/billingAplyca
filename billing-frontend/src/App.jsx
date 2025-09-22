import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Analytics } from "@vercel/analytics/react";
import { AuthProvider, useAuth } from './context/AuthContext';
import { ROLES } from './utils/roles';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Clients from './components/Clients';
import Contracts from './components/Contracts';
import Projects from './components/Projects';
import TimeEntries from './components/TimeEntries';
import Billing from './components/Billing';
import Reports from './components/Reports';
import Users from './components/Users';
import ClientPortal from './components/ClientPortal';
import UserClientManagement from './components/UserClientManagement';
import ProjectPaymentHistory from './components/ProjectPaymentHistory';
import CapacityDashboard from './components/CapacityDashboard';
import LoginPage from './components/LoginPage';
import AuthCallback from './components/AuthCallback';
import ProtectedRoute from './components/ProtectedRoute';

const DefaultRoute = () => {
  const { user } = useAuth();
  
  // Redirect users based on their role
  if (user?.role === ROLES.CLIENT) {
    return <Navigate to="/portal" replace />;
  }
  
  if (user?.role === ROLES.COLLABORATOR) {
    return <Navigate to="/projects" replace />;
  }
  
  // Admin and others go to dashboard
  return <Dashboard />;
};

const AppRoutes = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/auth/callback" element={<AuthCallback />} />
      
      {/* Protected routes */}
      {!isAuthenticated() ? (
        <Route path="*" element={<LoginPage />} />
      ) : (
        <>
          <Route path="/" element={<Layout />}>
            <Route index element={<DefaultRoute />} />
            <Route path="clients" element={
              <ProtectedRoute requiredPermission="view_clients">
                <Clients />
              </ProtectedRoute>
            } />
            <Route path="contracts" element={
              <ProtectedRoute requiredPermission="view_contracts">
                <Contracts />
              </ProtectedRoute>
            } />
            <Route path="projects" element={
              <ProtectedRoute requiredPermission="view_projects">
                <Projects />
              </ProtectedRoute>
            } />
            <Route path="time-entries" element={
              <ProtectedRoute requiredPermission="view_time_entries">
                <TimeEntries />
              </ProtectedRoute>
            } />
            <Route path="billing" element={
              <ProtectedRoute requiredPermission="view_payments">
                <Billing />
              </ProtectedRoute>
            } />
            <Route path="billing/:type/:id" element={
              <ProtectedRoute requiredPermission="view_payments">
                <ProjectPaymentHistory />
              </ProtectedRoute>
            } />
            <Route path="capacity" element={
              <ProtectedRoute requiredPermission="view_capacity">
                <CapacityDashboard />
              </ProtectedRoute>
            } />
            <Route path="reports" element={
              <ProtectedRoute requiredPermission="view_reports">
                <Reports />
              </ProtectedRoute>
            } />
            <Route path="users" element={
              <ProtectedRoute requiredPermission="manage_users">
                <Users />
              </ProtectedRoute>
            } />
            <Route path="portal" element={
              <ProtectedRoute requiredPermission="view_client_portal">
                <ClientPortal />
              </ProtectedRoute>
            } />
            <Route path="user-client-management" element={
              <ProtectedRoute requiredPermission="manage_users">
                <UserClientManagement />
              </ProtectedRoute>
            } />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </>
      )}
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
      <SpeedInsights />
      <Analytics />
    </AuthProvider>
  );
}

export default App;
