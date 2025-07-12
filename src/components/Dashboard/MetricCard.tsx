import React, { ReactNode } from 'react';
//import { LucideIcon } from 'lucide-react';

export interface MetricCardProps {
  title: string;
  value: string | number | ReactNode;
  //icon: LucideIcon;
  color: 'blue' | 'yellow' | 'red' | 'purple' | 'green';
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const colorClasses: Record<MetricCardProps['color'], string> = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-green-50 text-green-600',
  yellow: 'bg-yellow-50 text-yellow-600',
  red: 'bg-red-50 text-red-600',
  purple: 'bg-purple-50 text-purple-600',
};

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  //icon: Icon,
  color,
  trend,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <div className="text-2xl font-bold text-gray-900 mt-2">{value}</div>

          {trend && (
            <p
              className={`text-sm mt-2 ${
                trend.isPositive ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {trend.isPositive ? '↗' : '↘'} {Math.abs(trend.value)}% from last month
            </p>
          )}
        </div>

        <div className={`p-3 rounded-full ${colorClasses[color]}`}>
          
        </div>
      </div>
    </div>
  );
};
