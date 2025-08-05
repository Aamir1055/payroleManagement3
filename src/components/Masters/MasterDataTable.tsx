import React from 'react';
import { Edit, Trash2, Eye } from 'lucide-react';

interface MasterDataTableProps {
  dataType: 'office' | 'position' | 'visaType' | 'platform';
  data: any[];
  loading: boolean;
  onEdit: (item: any) => void;
  onDelete: (id: number) => void;
  onView: (item: any) => void;
}

const MasterDataTable: React.FC<MasterDataTableProps> = ({
  dataType,
  data,
  loading,
  onEdit,
  onDelete,
  onView
}) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-gray-600">Loading...</span>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg mb-4">
            No {dataType === 'office' ? 'offices' : dataType === 'position' ? 'positions' : dataType === 'visaType' ? 'visa types' : 'platforms'} found.
          </div>
          <p className="text-gray-400">
            Click the "Add New" button to create your first {dataType === 'office' ? 'office' : dataType === 'position' ? 'position' : dataType === 'visaType' ? 'visa type' : 'platform'}.
          </p>
        </div>
      </div>
    );
  }

  const getColumns = () => {
    switch (dataType) {
      case 'office':
        return [
          { key: 'office_id', label: 'Office ID' },
          { key: 'office_name', label: 'Office Name' },
          { key: 'location', label: 'Location' }
        ];
      case 'position':
        return [
          { key: 'position_id', label: 'Position ID' },
          { key: 'position_name', label: 'Position Name' },
          { key: 'office_name', label: 'Office' },
          { key: 'reporting_time', label: 'Reporting Time' },
          { key: 'duty_hours', label: 'Duty Hours' }
        ];
      case 'visaType':
        return [
          { key: 'id', label: 'Visa Type ID' },
          { key: 'typeofvisa', label: 'Visa Type' }
        ];
      case 'platform':
        return [
          { key: 'id', label: 'Platform ID' },
          { key: 'platform_name', label: 'Platform Name' }
        ];
      default:
        return [];
    }
  };

  const columns = getColumns();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {column.label}
                </th>
              ))}
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item, index) => {
              const itemId = dataType === 'office' ? item.office_id || item.id : 
                           dataType === 'position' ? item.position_id || item.id : 
                           dataType === 'platform' ? item.id :
                           item.id;
              return (
                <tr key={itemId || index} className="hover:bg-gray-50">
                  {columns.map((column) => (
                    <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item[column.key] || '-'}
                    </td>
                  ))}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => onView(item)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded-full hover:bg-blue-50"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onEdit(item)}
                        className="text-green-600 hover:text-green-900 p-1 rounded-full hover:bg-green-50"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(itemId)}
                        className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-50"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MasterDataTable;
