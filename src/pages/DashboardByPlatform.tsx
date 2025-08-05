import React, { useEffect, useState } from 'react';
import { MainLayout } from '../components/Layout/MainLayout';
import { MetricCard } from '../components/Dashboard/MetricCard';
import { DashboardPlatformCharts } from '../components/Dashboard/DashboardPlatformCharts';
import { DirhamIcon } from '../components/Icons/DirhamIcon';
import { User, Building, Layers } from 'lucide-react';

interface PlatformData {
  platform_id: number;
  platform: string;
  totalEmployees: number;
  totalSalary: number;
}

export const DashboardByPlatform: React.FC = () => {
  const [platformData, setPlatformData] = useState<PlatformData[]>([]);
  const [loading, setLoading] = useState(true);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  };

  const fetchPlatformData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/employees/summary-by-platform', {
        headers: getAuthHeaders()
      });
      if (!response.ok) {
        throw new Error('Failed to fetch platform data');
      }
      const data = await response.json();
      setPlatformData(data);
    } catch (error) {
      console.error('Error fetching platform data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlatformData();
  }, []);

  if (loading) {
    return (
      <MainLayout
        title="Dashboard by Platform"
        subtitle="Overview of employees grouped by platform"
      >
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </MainLayout>
    );
  }

  const totalEmployees = platformData.reduce((sum, platform) => sum + platform.totalEmployees, 0);
  const totalSalary = platformData.reduce((sum, platform) => sum + (Number(platform.totalSalary) || 0), 0);
  const totalPlatforms = platformData.length;

  // Helper function to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  return (
    <MainLayout
      title="Dashboard by Platform"
      subtitle="Overview of employees grouped by platform"
    >
      <div className="space-y-6">
        {/* Real-time Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <MetricCard
            title="Total Employees"
            value={totalEmployees !== null ? totalEmployees.toString() : '...'}
            color="blue"
            icon={User}
          />
          <MetricCard
            title="Monthly Payroll"
            value={
              totalSalary !== null
                ? `AED ${formatCurrency(totalSalary)}`
                : '...'
            }
            color="green"
            icon={DirhamIcon as any}
          />
          <MetricCard
            title="Total Platforms"
            value={totalPlatforms.toString()}
            color="purple"
            icon={Layers}
          />
        </div>

        {/* Platform-wise Cards - Enhanced with real-time updates */}
        {platformData.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {platformData.map((platform, index) => (
              <MetricCard
                key={`${platform.platform}-${index}`}
                title={`${platform.platform} Platform`}
                value={
                  <>
                    <div className="text-sm font-semibold text-blue-600">
                      Employees: {platform.totalEmployees || 0}
                    </div>
                    <div className="text-sm font-semibold text-green-600">
                      Salary: AED {formatCurrency(Number(platform.totalSalary) || 0)}
                    </div>
                  </>
                }
                color="purple"
                icon={Layers}
              />
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <p className="text-gray-500">No platform data available. Add platforms to see summaries here.</p>
          </div>
        )}

        {/* Dashboard Platform Charts */}
        <DashboardPlatformCharts 
          platformData={platformData}
          totalEmployees={totalEmployees || 0}
          totalMonthlySalary={totalSalary || 0}
        />
      </div>
    </MainLayout>
  );
};

