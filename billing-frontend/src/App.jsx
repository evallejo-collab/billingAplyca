import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Clients from './components/Clients';
import Contracts from './components/Contracts';
import Projects from './components/Projects';
import TimeEntries from './components/TimeEntries';
import Billing from './components/Billing';
import Reports from './components/Reports';
import UsersPage from './components/UsersPage';
import ProtectedRoute from './components/ProtectedRoute';
import Debug from './components/Debug';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="debug" element={<Debug />} />
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="clients" element={<Clients />} />
            <Route path="contracts" element={<Contracts />} />
            <Route path="projects" element={<Projects />} />
            <Route path="time-entries" element={<TimeEntries />} />
            <Route path="billing" element={<Billing />} />
            <Route path="reports" element={<Reports />} />
            <Route path="users" element={
              <ProtectedRoute requireAdmin={true}>
                <UsersPage />
              </ProtectedRoute>
            } />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
