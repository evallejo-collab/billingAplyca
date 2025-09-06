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
  DollarSign,
  Settings,
  LogOut,
  Receipt,
  ChevronDown,
  TrendingUp
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AIChat from './AIChat';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [megaMenuOpen, setMegaMenuOpen] = useState(null);
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();

  const navigation = [
    { name: 'Clientes', href: '/clients', icon: Users },
    { name: 'Contratos', href: '/contracts', icon: FileText },
    { name: 'Proyectos', href: '/projects', icon: Folder },
  ];

  const navigationEnd = [
    ...(isAdmin() ? [{ name: 'Usuarios', href: '/users', icon: Settings }] : []),
  ];

  const megaMenuItems = {
    'trabajo': {
      name: 'Trabajo y Facturación',
      icon: Receipt,
      items: [
        { name: 'Registro de Horas', href: '/time-entries', icon: Clock, description: 'Control de tiempo trabajado' },
        { name: 'Facturación', href: '/billing', icon: Receipt, description: 'Gestión de pagos y facturación' },
      ]
    },
    'analisis': {
      name: 'Análisis',
      icon: TrendingUp,
      items: [
        { name: 'Dashboard', href: '/', icon: Home, description: 'Panel de control principal' },
        { name: 'Reportes', href: '/reports', icon: BarChart3, description: 'Análisis y estadísticas' },
      ]
    }
  };

  const isActiveMegaMenu = (megaMenuKey) => {
    const megaMenu = megaMenuItems[megaMenuKey];
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
    await logout();
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
      {/* Top Header with Navigation */}
      <header style={{backgroundColor: '#382C74'}} className="shadow-sm border-b border-gray-300 fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            {/* Logo/Brand */}
            <div className="flex items-center">
              <img 
                src="/Logo_Aplyca_Violet.svg" 
                alt="Aplyca" 
                className="h-10 w-auto filter brightness-0 invert"
              />
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
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

              {/* End Navigation Items */}
              {navigationEnd.map((item) => {
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
            </nav>

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
                className="flex items-center px-3 py-2 text-sm text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Salir
              </button>
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
            <div className="py-6">
              <div className="grid grid-cols-2 gap-6 max-w-2xl">
                {megaMenuItems[megaMenuOpen].items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.name}
                      to={item.href}
                      className="group flex items-start p-4 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100 hover:border-violet-200"
                      onClick={() => setMegaMenuOpen(null)}
                    >
                      <div className="flex-shrink-0">
                        <Icon className="w-6 h-6 text-violet-600 group-hover:text-violet-700" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 group-hover:text-violet-700">
                          {item.name}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
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
                <DollarSign className="w-6 h-6 text-white" />
                <div className="ml-2">
                  <h1 className="text-lg font-bold text-white">Aplyca</h1>
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
              {/* Mobile Mega Menu Items - Expanded */}
              {Object.entries(megaMenuItems).map(([key, megaMenu]) => (
                <div key={key}>
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {megaMenu.name}
                  </div>
                  {megaMenu.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.name}
                        to={item.href}
                        className={({ isActive }) =>
                          `flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ml-2 ${
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
              
              {/* Regular Navigation Items */}
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

              {/* End Navigation Items */}
              {navigationEnd.map((item) => {
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
              
              <div className="border-t pt-4 mt-4">
                <div className="px-3 py-2 text-xs text-gray-500">
                  <div className="font-medium">{user?.full_name}</div>
                  <div>@{user?.username}</div>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center w-full px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors"
                >
                  <LogOut className="w-5 h-5 mr-3" />
                  Cerrar Sesión
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

      {/* AI Chat Widget */}
      <AIChat />
    </div>
  );
};

export default Layout;