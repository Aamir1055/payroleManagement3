import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface PlatformData {
  platform_id: number;
  platform: string;
  totalEmployees: number;
  totalSalary: number;
}

interface DashboardPlatformChartsProps {
  platformData: PlatformData[];
  totalEmployees: number;
  totalMonthlySalary: number;
}

// Modern color palette inspired by popular design systems
const MODERN_COLORS = {
  primary: '#6366f1',    // Indigo
  secondary: '#06b6d4',  // Cyan
  success: '#10b981',    // Emerald
  warning: '#f59e0b',    // Amber
  error: '#ef4444',      // Red
  purple: '#8b5cf6',     // Violet
  pink: '#ec4899',       // Pink
  teal: '#14b8a6',       // Teal
  orange: '#f97316',     // Orange
  blue: '#3b82f6'        // Blue
};

const CHART_COLORS = [
  MODERN_COLORS.primary,
  MODERN_COLORS.success,
  MODERN_COLORS.warning,
  MODERN_COLORS.secondary,
  MODERN_COLORS.purple,
  MODERN_COLORS.pink,
  MODERN_COLORS.teal,
  MODERN_COLORS.orange
];

export const DashboardPlatformCharts: React.FC<DashboardPlatformChartsProps> = ({
  platformData,
  totalEmployees,
  totalMonthlySalary
}) => {
  // Format currency to Dirhams
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Prepare data for charts
  const platformChartData = platformData.map(platform => ({
    name: platform.platform,
    employees: platform.totalEmployees || 0,
    salary: Number(platform.totalSalary) || 0
  }));

  // Pie chart data for employee distribution
  const pieChartData = platformData.map((platform, index) => ({
    name: platform.platform,
    value: platform.totalEmployees || 0,
    color: CHART_COLORS[index % CHART_COLORS.length]
  }));

  // HR Performance Analytics data
  const getHRAnalyticsData = () => {
    if (platformData.length === 0) return [];
    
    return [
      { metric: 'Retention Rate', value: 92, target: 90, color: MODERN_COLORS.success },
      { metric: 'Employee Satisfaction', value: 4.2, target: 4.0, color: MODERN_COLORS.primary },
      { metric: 'Avg. Time to Hire (days)', value: 18, target: 21, color: MODERN_COLORS.warning },
      { metric: 'Training Completion', value: 87, target: 85, color: MODERN_COLORS.purple },
      { metric: 'Performance Score', value: 8.5, target: 8.0, color: MODERN_COLORS.teal }
    ];
  };

  const hrAnalyticsData = getHRAnalyticsData();

  if (platformData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <p className="text-gray-500">No data available for charts. Add employees and platforms to see visualizations.</p>
      </div>
    );
  }

  // Chart.js configuration for Bar Chart
  const barChartData = {
    labels: platformChartData.map(platform => platform.name),
    datasets: [
      {
        label: 'Employees',
        data: platformChartData.map(platform => platform.employees),
        backgroundColor: MODERN_COLORS.primary,
        borderColor: MODERN_COLORS.primary,
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      },
      {
        label: 'Salary (AED)',
        data: platformChartData.map(platform => platform.salary),
        backgroundColor: MODERN_COLORS.success,
        borderColor: MODERN_COLORS.success,
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
        yAxisID: 'y1',
      }
    ]
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
            weight: '500'
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#1f2937',
        bodyColor: '#374151',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        cornerRadius: 12,
        padding: 12,
        usePointStyle: true,
        callbacks: {
          label: function(context: any) {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            if (label === 'Salary (AED)') {
              return `${label}: AED ${formatCurrency(value)}`;
            }
            return `${label}: ${value}`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: {
            size: 11
          }
        }
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        grid: {
          color: '#f3f4f6'
        },
        ticks: {
          font: {
            size: 11
          }
        }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          font: {
            size: 11
          },
          callback: function(value: any) {
            return 'AED ' + formatCurrency(value);
          }
        }
      }
    }
  };

  // Chart.js configuration for Doughnut Chart
  const doughnutChartData = {
    labels: pieChartData.map(item => item.name),
    datasets: [
      {
        data: pieChartData.map(item => item.value),
        backgroundColor: CHART_COLORS,
        borderColor: '#ffffff',
        borderWidth: 3,
        hoverBorderWidth: 4,
        cutout: '60%',
      }
    ]
  };

  const doughnutChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
            weight: '500'
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#1f2937',
        bodyColor: '#374151',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        cornerRadius: 12,
        padding: 12,
        callbacks: {
          label: function(context: any) {
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((context.parsed / total) * 100).toFixed(1);
            return `${context.label}: ${context.parsed} (${percentage}%)`;
          }
        }
      }
    }
  };


  return (
    <div className="space-y-8">
      {/* Platform-wise Employee and Salary Bar Chart */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-6">Platform-wise Employees & Salary Distribution</h3>
        <div className="h-80">
          <Bar data={barChartData} options={barChartOptions} />
        </div>
      </div>

      {/* Employee Distribution Doughnut Chart - Full Width */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-6 text-center">Employee Distribution by Platform</h3>
        <div className="h-80 flex justify-center">
          <div className="w-full max-w-lg">
            <Doughnut data={doughnutChartData} options={doughnutChartOptions} />
          </div>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl shadow-xl p-8 text-white">
        <h3 className="text-2xl font-bold mb-6 text-center">Quick Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center bg-white bg-opacity-20 rounded-lg p-4 backdrop-blur-sm">
            <div className="text-3xl font-bold mb-1">AED {formatCurrency(totalMonthlySalary / totalEmployees || 0)}</div>
            <div className="text-sm opacity-90">Average Salary per Employee</div>
          </div>
          <div className="text-center bg-white bg-opacity-20 rounded-lg p-4 backdrop-blur-sm">
            <div className="text-3xl font-bold mb-1">{platformData.length}</div>
            <div className="text-sm opacity-90">Active Platforms</div>
          </div>
          <div className="text-center bg-white bg-opacity-20 rounded-lg p-4 backdrop-blur-sm">
            <div className="text-3xl font-bold mb-1">
              {platformData.length > 0 ? Math.round(totalEmployees / platformData.length) : 0}
            </div>
            <div className="text-sm opacity-90">Average Employees per Platform</div>
          </div>
        </div>
      </div>
    </div>
  );
};
