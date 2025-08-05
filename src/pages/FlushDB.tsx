// pages/FlushDB.tsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { MainLayout } from '../components/Layout/MainLayout';
import { useAuth } from '../context/AuthContext';
import './FlushDB.css';

interface FlushDBProps {}

interface ApiResponse {
  message: string;
   clearedTables?: string[];
}

const FlushDB: React.FC<FlushDBProps> = () => {
  const [tables, setTables] = useState<string[]>([]);
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const { user } = useAuth();

  useEffect(() => {
    const fetchTables = async () => {
      try {
        setError('');
        
        // Get token explicitly
        const token = localStorage.getItem('token');
        
        // DEBUG: Check authentication
        console.log('🔍 User:', user);
        console.log('🔍 Is admin:', user?.role === 'admin');
        console.log('🔍 Token exists:', !!token);
        console.log('🔍 Axios default headers:', axios.defaults.headers.common);
        
        if (!token) {
          setError('No authentication token found. Please log in as admin.');
          return;
        }

        if (user?.role !== 'admin') {
          setError('Admin access required. Please log in as admin.');
          return;
        }

        // Make request with explicit Authorization header
        const response = await axios.get<string[]>('/api/flush/tables', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        setTables(response.data);
        console.log('✅ Tables fetched successfully:', response.data);
      } catch (error: any) {
        console.error('❌ Error fetching tables:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message
        });
        
        if (error.response?.status === 401) {
          setError('Authentication failed. Please log out and log back in as admin.');
        } else if (error.response?.status === 403) {
          setError('Access denied. Admin privileges required.');
        } else {
          setError('Error fetching table names. Please check your connection and try again.');
        }
      }
    };

    // Only fetch if user is loaded and is admin
    if (user && user.role === 'admin') {
      fetchTables();
    } else if (user && user.role !== 'admin') {
      setError('Admin access required. Please log in as admin.');
    }
  }, [user]);

  const flushTable = async (table: string): Promise<void> => {
    const confirmMessage = `⚠️ WARNING: This will permanently delete ALL data from the "${table}" table. This action cannot be undone.\n\nAre you absolutely sure you want to proceed?`;
    
    if (window.confirm(confirmMessage)) {
      setLoading(true);
      setStatus('');
      setError('');
      
      try {
        const token = localStorage.getItem('token');
        
        if (!token) {
          setError('Authentication token not found. Please log in again.');
          setLoading(false);
          return;
        }

        // Make request with explicit Authorization header
        const response = await axios.delete<ApiResponse>(`/api/flush/flush/${table}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        setStatus(response.data.message);
        console.log(`✅ Successfully flushed table: ${table}`);
      } catch (error: any) {
        console.error('❌ Error flushing table:', error.response?.data);
        
        if (error.response?.status === 401) {
          setError('Authentication failed. Please log out and log back in as admin.');
        } else if (error.response?.status === 403) {
          setError('Access denied. Admin privileges required.');
        } else {
          const errorMessage = error.response?.data?.message || `Error flushing ${table}`;
          setError(errorMessage);
        }
      } finally {
        setLoading(false);
      }
    }
  };

  // NEW FUNCTION: Flush all tables
  const flushAllTables = async (): Promise<void> => {
    const confirmMessage = `🚨 EXTREME WARNING: This will permanently delete ALL data from ALL tables in the entire database!\n\nThis action:\n- Cannot be undone\n- Will clear ${tables.length} tables\n- Will remove all your data permanently\n\nType "DELETE ALL" in the next prompt to confirm this destructive action.`;
    
    if (window.confirm(confirmMessage)) {
      const finalConfirm = window.prompt(
        'Type "DELETE ALL" (without quotes) to confirm you want to delete all data from all tables:'
      );
      
      if (finalConfirm === 'DELETE ALL') {
        setLoading(true);
        setStatus('');
        setError('');
        
        try {
          const token = localStorage.getItem('token');
          
          if (!token) {
            setError('Authentication token not found. Please log in again.');
            setLoading(false);
            return;
          }

          // Make request with explicit Authorization header
          const response = await axios.delete<ApiResponse>('/api/flush/all', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          setStatus(response.data.message);
          if (response.data.clearedTables) {
            console.log(`✅ Successfully flushed all tables:`, response.data.clearedTables);
          }
        } catch (error: any) {
          console.error('❌ Error flushing all tables:', error.response?.data);
          
          if (error.response?.status === 401) {
            setError('Authentication failed. Please log out and log back in as admin.');
          } else if (error.response?.status === 403) {
            setError('Access denied. Admin privileges required.');
          } else {
            const errorMessage = error.response?.data?.message || 'Error flushing all tables';
            setError(errorMessage);
          }
        } finally {
          setLoading(false);
        }
      } else {
        alert('Confirmation text did not match. Operation cancelled for safety.');
      }
    }
  };

  // Add a test function to debug authentication
  const testAuthentication = async () => {
    const token = localStorage.getItem('token');
    console.log('🔍 Authentication Test:');
    console.log('- Token exists:', !!token);
    console.log('- Token value:', token?.substring(0, 20) + '...');
    console.log('- User object:', user);
    console.log('- Is admin:', user?.role === 'admin');
    console.log('- Axios defaults:', axios.defaults.headers.common);
    
    if (token) {
      try {
        const response = await axios.get('/api/flush/tables', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log('✅ Direct API test successful:', response.data);
      } catch (error: any) {
        console.error('❌ Direct API test failed:', error.response?.data);
      }
    }
  };

  return (
    <MainLayout 
      title="🗑️ Flush Database" 
      subtitle="Permanently delete all data from database tables - Admin Only"
    >
      <div className="flush-db-container">
        <div className="flush-db-header">
          <p className="warning-text">
            ⚠️ <strong>WARNING:</strong> This will permanently delete all data from the selected table. Use with extreme caution!
          </p>
        </div>

        {/* Debug button - remove in production */}
        <div style={{ marginBottom: '20px' }}>
          <button 
            onClick={testAuthentication}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            🔍 Test Authentication
          </button>
        </div>

        {error && (
          <div className="error-message">
            <p>❌ {error}</p>
          </div>
        )}

        {/* NEW: Flush All Tables Button */}
        {tables.length > 0 && user?.role === 'admin' && (
          <div className="flush-all-section" style={{ marginBottom: '30px' }}>
            <div className="extreme-warning" style={{ 
              background: '#fee2e2', 
              border: '2px solid #dc2626', 
              padding: '15px', 
              borderRadius: '8px',
              marginBottom: '15px'
            }}>
              <h3 style={{ color: '#dc2626', margin: '0 0 10px 0' }}>
                🚨 DANGER ZONE
              </h3>
              <p style={{ margin: 0, color: '#7f1d1d' }}>
                The button below will delete ALL data from ALL {tables.length} tables in your database permanently.
              </p>
            </div>
            <button 
              onClick={flushAllTables}
              disabled={loading}
              className={`flush-all-button ${loading ? 'disabled' : ''}`}
              style={{
                background: '#dc2626',
                color: 'white',
                padding: '12px 24px',
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1
              }}
            >
              🚨 FLUSH ALL TABLES ({tables.length} tables)
            </button>
          </div>
        )}

        <div className="flush-buttons-grid">
          {tables.length > 0 ? (
            tables.map((table: string) => (
              <button 
                key={table} 
                onClick={() => flushTable(table)}
                disabled={loading}
                className={`flush-button ${loading ? 'disabled' : ''}`}
              >
                🗑️ Flush {table}
              </button>
            ))
          ) : (
            <p className="no-tables">
              {user?.role !== 'admin' 
                ? 'Admin access required' 
                : error 
                  ? 'Error loading tables' 
                  : 'No tables available or loading...'
              }
            </p>
          )}
        </div>

        {loading && (
          <div className="loading-message">
            <p>⏳ Processing...</p>
          </div>
        )}

        {status && (
          <div className="success-message">
            <p>✅ {status}</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default FlushDB;
