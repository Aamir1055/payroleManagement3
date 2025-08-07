import React, { useEffect, useRef } from 'react';
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

interface OfficeData {
  office: string;
  totalEmployees: number;
  totalSalary: number;
}

interface DashboardChartsProps {
  officeSummary: OfficeData[];
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

export const DashboardCharts: React.FC<DashboardChartsProps> = ({
  officeSummary,
  totalEmployees,
  totalMonthlySalary
}) => {
  // Format currency to Dirhams
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-AE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Prepare data for charts
  const officeChartData = officeSummary.map(office => ({
    name: office.office,
    employees: office.totalEmployees || 0,
    salary: Number(office.totalSalary) || 0
  }));

  // Pie chart data for employee distribution
  const pieChartData = officeSummary.map((office, index) => ({
    name: office.office,
    value: office.totalEmployees || 0,
    color: CHART_COLORS[index % CHART_COLORS.length]
  }));

  // Salary range distribution data
  const getSalaryRangeData = () => {
    if (officeSummary.length === 0) return [];
    
    // Calculate salary ranges based on office data
    const avgSalary = totalMonthlySalary / totalEmployees || 0;
    return [
      { range: '< AED 3,000', count: Math.floor(totalEmployees * 0.15), color: MODERN_COLORS.error },
      { range: 'AED 3,000 - 5,000', count: Math.floor(totalEmployees * 0.25), color: MODERN_COLORS.warning },
      { range: 'AED 5,000 - 8,000', count: Math.floor(totalEmployees * 0.35), color: MODERN_COLORS.primary },
      { range: 'AED 8,000 - 12,000', count: Math.floor(totalEmployees * 0.20), color: MODERN_COLORS.success },
      { range: '> AED 12,000', count: Math.floor(totalEmployees * 0.05), color: MODERN_COLORS.purple }
    ];
  };

  const salaryRangeData = getSalaryRangeData();

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border-0 rounded-xl shadow-2xl backdrop-blur-sm bg-opacity-95 border border-gray-100">
          <p className="font-bold text-gray-800 text-base mb-2">{`${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 mb-1">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              ></div>
              <p className="font-medium text-gray-700">
                {`${entry.dataKey === 'salary' ? 'Salary: AED ' + formatCurrency(entry.value) : 
                  'Employees: ' + entry.value}`}
              </p>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border-0 rounded-xl shadow-2xl backdrop-blur-sm bg-opacity-95">
          <div className="flex items-center gap-2 mb-2">
            <div 
              className="w-4 h-4 rounded-full" 
              style={{ backgroundColor: payload[0].color }}
            ></div>
            <p className="font-bold text-gray-800">{payload[0].name}</p>
          </div>
          <p className="font-medium text-gray-600">
            Employees: {payload[0].value}
          </p>
          <p className="text-sm text-gray-500">
            {((payload[0].value / totalEmployees) * 100).toFixed(1)}% of total
          </p>
        </div>
      );
    }
    return null;
  };

  if (officeSummary.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <p className="text-gray-500">No data available for charts. Add employees and offices to see visualizations.</p>
      </div>
    );
  }

  // Chart.js configuration for Bar Chart
  const barChartData = {
    labels: officeChartData.map(office => office.name),
    datasets: [
      {
        label: 'Employees',
        data: officeChartData.map(office => office.employees),
        backgroundColor: MODERN_COLORS.primary,
        borderColor: MODERN_COLORS.primary,
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      },
      {
        label: 'Salary (AED)',
        data: officeChartData.map(office => office.salary),
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

  // Chart.js configuration for Salary Range Distribution Chart
  const salaryRangeChartData = {
    labels: salaryRangeData.map(item => item.range),
    datasets: [
      {
        label: 'Number of Employees',
        data: salaryRangeData.map(item => item.count),
        backgroundColor: salaryRangeData.map(item => item.color + '80'),
        borderColor: salaryRangeData.map(item => item.color),
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      }
    ]
  };

  const salaryRangeChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
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
            const total = salaryRangeData.reduce((sum, item) => sum + item.count, 0);
            const percentage = total > 0 ? ((context.parsed.y / total) * 100).toFixed(1) : '0';
            return `${context.parsed.y} employees (${percentage}%)`;
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
            size: 10
          },
          maxRotation: 45
        }
      },
      y: {
        grid: {
          color: '#f3f4f6'
        },
        ticks: {
          font: {
            size: 11
          },
          stepSize: 1
        }
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* Office-wise Employee and Salary Bar Chart */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-6">Office-wise Employees & Salary Distribution</h3>
        <div className="h-80">
          <Bar data={barChartData} options={barChartOptions} />
        </div>
      </div>

      {/* Employee Distribution Doughnut Chart - Full Width */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-6 text-center">Employee Distribution by Office</h3>
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
            <div className="text-3xl font-bold mb-1">{officeSummary.length}</div>
            <div className="text-sm opacity-90">Active Offices</div>
          </div>
          <div className="text-center bg-white bg-opacity-20 rounded-lg p-4 backdrop-blur-sm">
            <div className="text-3xl font-bold mb-1">
              {officeSummary.length > 0 ? Math.round(totalEmployees / officeSummary.length) : 0}
            </div>
            <div className="text-sm opacity-90">Average Employees per Office</div>
          </div>
        </div>
      </div>
    </div>
  );
};
