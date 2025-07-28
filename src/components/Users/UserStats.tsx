import React from 'react';
import { Users, Shield, UserCog, Building2 } from 'lucide-react';
import { User } from '../../pages/RoleManagement';

interface UserStatsProps {
  users: User[];
  loading?: boolean;
}

export const UserStats: React.FC<UserStatsProps> = ({ users, loading }) => {
  const totalUsers = users.length;
  const adminUsers = users.filter(user => user.role === 'admin').length;
  const hrUsers = users.filter(user => user.role === 'hr').length;
  const managerUsers = users.filter(user => user.role === 'floor_manager').length;

  const stats = [
    {
      title: 'Total Users',
      value: loading ? '...' : totalUsers,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Administrators',
      value: loading ? '...' : adminUsers,
      icon: Shield,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      title: 'HR Users',
      value: loading ? '...' : hrUsers,
      icon: UserCog,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Floor Managers',
      value: loading ? '...' : managerUsers,
      icon: Building2,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
              </div>
              <div className={`${stat.bgColor} ${stat.color} p-3 rounded-lg`}>
                <Icon className="h-6 w-6" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
