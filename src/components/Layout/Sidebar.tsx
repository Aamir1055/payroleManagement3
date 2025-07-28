import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useMasterData } from '../../context/MasterDataContext';
import { 
  LayoutDashboard, 
  Users, 
  DollarSign, 
  FileText, 
  Calendar,
  LogOut,
  Building2,
  Briefcase,
  ChevronDown,
  ChevronRight,
  Plus,
  User,
  Settings,
  Trash2,
  CreditCard
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Employees', href: '/employees', icon: Users },
  { name: 'Payroll', href: '/payroll', icon: DollarSign },
  { name: 'Holidays', href: '/holidays', icon: Calendar },
  { name: 'Profile', href: '/profile', icon: User },
  { name: 'Attendance', href: '/attendance', icon: Calendar },
  { name: 'Flush DB', href: '/flush-db', icon: Trash2, adminOnly: true },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const [masterDataExpanded, setMasterDataExpanded] = useState(false);
  const { user, logout, hasPermission } = useAuth();
  
  // CORRECT: Use the exact function names from your MasterDataContext
  const { openOfficeManager, openPositionManager, openVisaTypeManager } = useMasterData();

  const getRoleDisplay = (role: string) => {
    const roleMap = {
      admin: { label: 'Administrator', color: 'text-purple-600' },
      hr: { label: 'HR', color: 'text-blue-600' },
      floor_manager: { label: 'Floor Manager', color: 'text-green-600' },
      employee: { label: 'Employee', color: 'text-gray-600' }
    };
    return roleMap[role as keyof typeof roleMap] || { label: role, color: 'text-gray-600' };
  };

  const handleLogout = () => {
    logout();
    onClose();
  };

  const filteredNavigation = navigation.filter(item => {
    const adminOnly = (item as any).adminOnly;
    
    if (adminOnly && user?.role !== 'admin') {
      return false;
    }

    switch (item.href) {
      case '/holidays':
        return hasPermission('manage_holidays');
      case '/employees':
        return hasPermission('manage_employees');
      case '/payroll':
        return hasPermission('manage_payroll');
      case '/flush-db':
        return user?.role === 'admin';
      default:
        return true;
    }
  });

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:inset-0
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center h-16 px-4 bg-blue-600 text-white">
            <h1 className="text-xl font-bold">Payroll System</h1>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {filteredNavigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  `flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 ${
                    isActive
                      ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600'
                      : item.href === '/flush-db'
                        ? 'text-red-600 hover:bg-red-50 hover:text-red-600'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-blue-600'
                  }`
                }
                onClick={() => window.innerWidth < 1024 && onClose()}
              >
                <item.icon className={`w-5 h-5 mr-3 ${item.href === '/flush-db' ? 'text-red-500' : ''}`} />
                <span className={item.href === '/flush-db' ? 'text-red-600 font-semibold' : ''}>
                  {item.name}
                </span>
              </NavLink>
            ))}

            {/* Master Data Section - BOTH WORKING */}
            {hasPermission('manage_offices') && (
              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={() => setMasterDataExpanded(!masterDataExpanded)}
                  className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors duration-200"
                >
                  <div className="flex items-center">
                    <Settings className="w-5 h-5 mr-3" />
                    Master Data
                  </div>
                  {masterDataExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
                
                {masterDataExpanded && (
                  <div className="ml-4 mt-2 space-y-1">
                    <button
                      onClick={() => {
                        openOfficeManager();
                        window.innerWidth < 1024 && onClose();
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-600 rounded-md transition-colors duration-200"
                    >
                      <Building2 className="w-4 h-4 mr-3" />
                      Manage Offices
                    </button>
                    <button
                      onClick={() => {
                        openPositionManager();
                        window.innerWidth < 1024 && onClose();
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-600 rounded-md transition-colors duration-200"
                    >
                      <Briefcase className="w-4 h-4 mr-3" />
                      Manage Positions
                    </button>
                    {/* CORRECTED: Use openVisaTypeManager (matches your context) */}
                    <button
                      onClick={() => {
                        openVisaTypeManager();
                        window.innerWidth < 1024 && onClose();
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-600 rounded-md transition-colors duration-200"
                    >
                      <CreditCard className="w-4 h-4 mr-3" />
                      Manage Visas
                    </button>
                  </div>
                )}
              </div>
            )}
          </nav>
          
          {/* User section */}
          <div className="px-4 py-6 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-700">{user?.username || 'Unknown'}</p>
                  <p className={`text-xs ${getRoleDisplay(user?.role || 'employee').color}`}>
                    {getRoleDisplay(user?.role || 'employee').label}
                  </p>
                </div>
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
