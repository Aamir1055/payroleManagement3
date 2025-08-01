import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

type DataType = 'office' | 'position' | 'visaType' | 'platform';

interface UseMasterDataReturn {
  data: any[];
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  createItem: (itemData: any) => Promise<void>;
  updateItem: (id: number, itemData: any) => Promise<void>;
  deleteItem: (id: number) => Promise<void>;
}

export const useMasterData = (dataType: DataType): UseMasterDataReturn => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  };

  const getApiEndpoint = () => {
    switch (dataType) {
      case 'office':
        return '/api/masters/offices';
      case 'position':
        return '/api/masters/positions';
      case 'visaType':
        return '/api/masters/visa-types';
case 'platform':
        return '/api/masters/platforms';
      default:
        return '';
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(getApiEndpoint(), {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          setError('Authentication failed. Please log in again.');
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error(`Failed to fetch ${dataType} data:`, err);
      setError(`Failed to load ${dataType} data. Please try again later.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dataType]);

  const createItem = async (itemData: any) => {
    try {
      const response = await fetch(getApiEndpoint(), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(itemData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      toast.success(`${dataType.charAt(0).toUpperCase() + dataType.slice(1)} created successfully`);
      await fetchData();
    } catch (err: any) {
      console.error(`Failed to create ${dataType}:`, err);
      toast.error(`Failed to create ${dataType}: ${err.message}`);
      throw err;
    }
  };

  const updateItem = async (id: number, itemData: any) => {
    try {
      const response = await fetch(`${getApiEndpoint()}/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(itemData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      toast.success(`${dataType.charAt(0).toUpperCase() + dataType.slice(1)} updated successfully`);
      await fetchData();
    } catch (err: any) {
      console.error(`Failed to update ${dataType}:`, err);
      toast.error(`Failed to update ${dataType}: ${err.message}`);
      throw err;
    }
  };

  const deleteItem = async (id: number) => {
    try {
      const response = await fetch(`${getApiEndpoint()}/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      toast.success(`${dataType.charAt(0).toUpperCase() + dataType.slice(1)} deleted successfully`);
      await fetchData();
    } catch (err: any) {
      console.error(`Failed to delete ${dataType}:`, err);
      toast.error(`Failed to delete ${dataType}: ${err.message}`);
      throw err;
    }
  };

  return {
    data,
    loading,
    error,
    refreshData: fetchData,
    createItem,
    updateItem,
    deleteItem
  };
};
