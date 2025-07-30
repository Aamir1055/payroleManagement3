import React from 'react';
import { Building, Briefcase, FileText, TrendingUp } from 'lucide-react';

interface MasterDataStatsProps {
  dataType: 'office' | 'position' | 'visaType';
  data: any[];
  loading: boolean;
}

const MasterDataStats: React.FC<MasterDataStatsProps> = ({ dataType, data, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const getStats = () => {
    const total = data.length;
    
    switch (dataType) {
      case 'office':
        const withLocation = data.filter(item => item.location && item.location.trim()).length;
        const withoutLocation = total - withLocation;
        return [
          {
            title: 'Total Offices',
            value: total,
            icon: Building,
            color: 'blue'
          },
          {
            title: 'With Location',
            value: withLocation,
            icon: TrendingUp,
            color: 'green'
          },
          {
            title: 'Without Location',
            value: withoutLocation,
            icon: TrendingUp,
            color: 'orange'
          }
        ];
      
      case 'position':
        return [
          {
            title: 'Total Positions',
            value: total,
            icon: Briefcase,
            color: 'blue'
          }
        ];
      
      case 'visaType':
        return [
          {
            title: 'Total Visa Types',
            value: total,
            icon: FileText,
            color: 'blue'
          }
        ];
      
      default:
        return [];
    }
  };

  const stats = getStats();

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'blue':
        return 'bg-blue-50 text-blue-600';
      case 'green':
        return 'bg-green-50 text-green-600';
      case 'orange':
        return 'bg-orange-50 text-orange-600';
      default:
        return 'bg-gray-50 text-gray-600';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className={`p-3 rounded-full ${getColorClasses(stat.color)}`}>
                <Icon className="w-6 h-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MasterDataStats;
