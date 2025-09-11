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
import LoginPage from './components/LoginPage';
import AuthCallback from './components/AuthCallback';
import ProtectedRoute from './components/ProtectedRoute';

const DefaultRoute = () => {
  const { user } = useAuth();
  
  // Redirect client users to their portal, others to dashboard
  if (user?.role === ROLES.CLIENT) {
    return <Navigate to="/portal" replace />;
  }
  
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
            <Route path="clients" element={<Clients />} />
            <Route path="contracts" element={<Contracts />} />
            <Route path="projects" element={<Projects />} />
            <Route path="time-entries" element={<TimeEntries />} />
            <Route path="billing" element={<Billing />} />
            <Route path="reports" element={<Reports />} />
            <Route path="users" element={<Users />} />
            <Route path="portal" element={<ClientPortal />} />
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
