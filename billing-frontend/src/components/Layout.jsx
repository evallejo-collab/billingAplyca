import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { 
  Home, 
  Users,
  FileText,
  Folder,
  Clock, 
  BarChart3, 
  Menu, 
  X, 
  Settings,
  LogOut,
  Receipt,
  ChevronDown,
  TrendingUp,
  UserCheck,
  Briefcase,
  Target
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { hasPermission, PERMISSIONS, ROLES } from '../utils/roles';
import AIChat from './AIChat';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [megaMenuOpen, setMegaMenuOpen] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();

  // For client users, show special client navigation
  const clientNavigation = [
    { name: 'Mi Portal', href: '/portal', icon: UserCheck, permission: PERMISSIONS.VIEW_CLIENT_PORTAL },
  ];

  // Regular navigation for admins and collaborators (empty - everything is in mega menus)
  const allNavigation = [];

  // Choose navigation based on user role
  const isClientUser = user?.role === ROLES.CLIENT;
  const navigationItems = isClientUser ? clientNavigation : allNavigation;
  
  const navigation = navigationItems.filter(item => 
    !item.permission || hasPermission(user?.role, item.permission)
  );

  // Create mega menu items with permission filtering (only for non-client users)
  const createMegaMenuItems = () => {
    // Client users don't get mega menus
    if (isClientUser) return {};
    
    const baseItems = {
      'gestion': {
        name: 'Gestión',
        icon: Briefcase,
        items: [
          { name: 'Clientes', href: '/clients', icon: Users, description: 'Gestión de clientes y contactos', permission: PERMISSIONS.VIEW_CLIENTS },
          { name: 'Contratos', href: '/contracts', icon: FileText, description: 'Gestión de contratos con clientes', permission: PERMISSIONS.VIEW_CONTRACTS },
          { name: 'Proyectos', href: '/projects', icon: Folder, description: 'Administración de proyectos', permission: PERMISSIONS.VIEW_PROJECTS },
        ]
      },
      'trabajo': {
        name: 'Trabajo y Facturación',
        icon: Receipt,
        items: [
          { name: 'Registro de Tiempo', href: '/time-entries', icon: Clock, description: 'Control de tiempo trabajado', permission: PERMISSIONS.VIEW_TIME_ENTRIES },
          { name: 'Facturación', href: '/billing', icon: Receipt, description: 'Gestión de pagos y facturación', permission: PERMISSIONS.VIEW_PAYMENTS },
          { name: 'Coordinación de Capacidad', href: '/capacity', icon: Target, description: 'Gestión de asignaciones y capacidad del equipo', permission: PERMISSIONS.VIEW_PROJECTS },
        ]
      },
      'analisis': {
        name: 'Análisis',
        icon: TrendingUp,
        items: [
          { name: 'Dashboard', href: '/', icon: Home, description: 'Panel de control principal', permission: PERMISSIONS.VIEW_DASHBOARD },
          { name: 'Reportes', href: '/reports', icon: BarChart3, description: 'Análisis y estadísticas', permission: PERMISSIONS.VIEW_REPORTS },
          { name: 'Portal Cliente', href: '/portal', icon: UserCheck, description: 'Vista del portal para clientes', permission: PERMISSIONS.VIEW_CLIENT_PORTAL },
        ]
      },
      'admin': {
        name: 'Administración',
        icon: Settings,
        items: [
          { name: 'Usuarios', href: '/users', icon: Users, description: 'Gestión de usuarios del sistema', permission: PERMISSIONS.MANAGE_USERS },
          { name: 'Asociaciones', href: '/user-client-management', icon: UserCheck, description: 'Asociar usuarios con clientes', permission: PERMISSIONS.MANAGE_USERS },
        ]
      }
    };

    // Filter items based on permissions
    const filteredItems = {};
    Object.keys(baseItems).forEach(key => {
      const filteredSubItems = baseItems[key].items.filter(item => 
        !item.permission || hasPermission(user?.role, item.permission)
      );
      
      // Only include mega menu if it has accessible items
      if (filteredSubItems.length > 0) {
        filteredItems[key] = {
          ...baseItems[key],
          items: filteredSubItems
        };
      }
    });

    return filteredItems;
  };

  const megaMenuItems = createMegaMenuItems();

  const isActiveMegaMenu = (megaMenuKey) => {
    const megaMenu = megaMenuItems[megaMenuKey];
    if (!megaMenu) return false;
    return megaMenu.items.some(item => location.pathname === item.href);
  };

  const handleMegaMenuClick = (key) => {
    if (megaMenuOpen === key) {
      setMegaMenuOpen(null);
    } else {
      setMegaMenuOpen(key);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
      setLoggingOut(false);
    }
  };

  // Close mega menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (megaMenuOpen && !event.target.closest('nav') && !event.target.closest('[data-megamenu]')) {
        setMegaMenuOpen(null);
      }
    };

    if (megaMenuOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [megaMenuOpen]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Simple Header */}
      <header style={{backgroundColor: '#382C74'}} className="shadow-sm border-b border-gray-300 fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            {/* Logo/Brand */}
            <div className="flex items-center">
              <img 
                src="/Logo_Aplyca_Violet.svg" 
                alt="Nexus" 
                className="h-10 w-auto filter brightness-0 invert"
              />
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-1 ml-4">
              {/* Regular Navigation Items */}
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    className={({ isActive }) =>
                      `flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                        isActive
                          ? 'bg-white text-violet-700'
                          : 'text-white hover:bg-white hover:bg-opacity-20'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {item.name}
                  </NavLink>
                );
              })}
              
              {/* Mega Menu Items */}
              {Object.entries(megaMenuItems).map(([key, megaMenu]) => {
                const Icon = megaMenu.icon;
                const isActive = isActiveMegaMenu(key);
                return (
                  <div key={key} className="relative">
                    <button
                      onClick={() => handleMegaMenuClick(key)}
                      className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                        isActive || megaMenuOpen === key
                          ? 'bg-white text-violet-700'
                          : 'text-white hover:bg-white hover:bg-opacity-20'
                      }`}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {megaMenu.name}
                      <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${
                        megaMenuOpen === key ? 'rotate-180' : ''
                      }`} />
                    </button>
                  </div>
                );
              })}
            </nav>

            {/* Right side - Mobile Menu Button and User Menu */}
            <div className="flex items-center space-x-4">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="md:hidden p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg"
              >
                <Menu className="w-6 h-6" />
              </button>

              {/* User Menu */}
              <div className="hidden md:flex items-center space-x-4">
                <div className="flex items-center text-sm text-white">
                  <div className="mr-4">
                    <span className="font-medium">{user?.full_name}</span>
                    <span className="text-xs text-gray-200 block">@{user?.username}</span>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="flex items-center px-3 py-2 text-sm text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors disabled:opacity-50"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {loggingOut ? 'Cerrando...' : 'Salir'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mega Menu Dropdown */}
      {megaMenuOpen && (
        <div 
          className="fixed top-16 left-0 right-0 z-40 bg-white border-b border-gray-200 shadow-lg hidden md:block"
          data-megamenu
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-4">
              <div className="flex flex-wrap gap-4">
                {megaMenuItems[megaMenuOpen].items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.name}
                      to={item.href}
                      className="group flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100 hover:border-violet-200 min-w-[200px]"
                      onClick={() => setMegaMenuOpen(null)}
                    >
                      <div className="flex-shrink-0">
                        <Icon className="w-5 h-5 text-violet-600 group-hover:text-violet-700" />
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900 group-hover:text-violet-700">
                          {item.name}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {item.description}
                        </div>
                      </div>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div 
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed top-0 right-0 h-full w-64 bg-white shadow-xl">
            <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200" style={{backgroundColor: '#382C74'}}>
              <div className="flex items-center">
                <div className="ml-2">
                  <h1 className="text-lg font-bold text-white">Nexus</h1>
                </div>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-white hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="px-4 py-6 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    className={({ isActive }) =>
                      `flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        isActive
                          ? 'bg-violet-100 text-violet-700'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                      }`
                    }
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    {item.name}
                  </NavLink>
                );
              })}
              
              {/* Mega menu items for mobile */}
              {Object.entries(megaMenuItems).map(([key, megaMenu]) => (
                <div key={key} className="space-y-1">
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {megaMenu.name}
                  </div>
                  {megaMenu.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.name}
                        to={item.href}
                        className={({ isActive }) =>
                          `flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ml-4 ${
                            isActive
                              ? 'bg-violet-100 text-violet-700'
                              : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                          }`
                        }
                        onClick={() => setSidebarOpen(false)}
                      >
                        <Icon className="w-5 h-5 mr-3" />
                        {item.name}
                      </NavLink>
                    );
                  })}
                </div>
              ))}
              
              <div className="border-t pt-4 mt-4">
                <div className="px-3 py-2 text-xs text-gray-500">
                  <div className="font-medium">{user?.full_name}</div>
                  <div>@{user?.username}</div>
                </div>
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="flex items-center w-full px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                >
                  <LogOut className="w-5 h-5 mr-3" />
                  {loggingOut ? 'Cerrando Sesión...' : 'Cerrar Sesión'}
                </button>
              </div>
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className={`transition-all duration-200 ${megaMenuOpen ? 'pt-32' : 'pt-16'}`}>
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>

      {/* AI Chat Component */}
      <AIChat />
    </div>
  );
};

export default Layout;