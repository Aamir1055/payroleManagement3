import React, { useEffect, useState } from 'react';
import { MainLayout } from '../components/Layout/MainLayout';
import { Calendar, Plus, Edit, Trash2, AlertCircle, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios'
interface Holiday {
  id: number;
  name: string;
  date: string;
  reason: string;
}

interface WorkingDaysData {
  month: number;
  year: number;
  totalDays: number;
  sundays: number;
  holidays: number;
  workingDays: number;
}

export const Holidays: React.FC = () => {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [workingDaysData, setWorkingDaysData] = useState<WorkingDaysData | null>(null);
  const [upcomingHolidays, setUpcomingHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { hasPermission } = useAuth();

  // Form states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    reason: ''
  });

  // Filter states
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  });

  // Constants
  const ALLOWED_LATE_DAYS = 3;

  // Auth headers
  const getAuthHeaders = (): HeadersInit => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  };

  useEffect(() => {
    const fetchData = async () => {
      await Promise.all([
        fetchHolidays(),
        fetchUpcomingHolidays(),
        selectedMonth && fetchWorkingDays()
      ]);
    };
    
    fetchData();
  }, [selectedMonth]);

  const fetchHolidays = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/holidays', {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch holidays: ${response.status}`);
      }
      
      const data = await response.json();
      setHolidays(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching holidays:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch holidays');
      setHolidays([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUpcomingHolidays = async () => {
    try {
      const response = await fetch('/api/holidays/upcoming', {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch upcoming holidays: ${response.status}`);
      }
      
      const data = await response.json();
      setUpcomingHolidays(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching upcoming holidays:', error);
      setUpcomingHolidays([]);
    }
  };

  const fetchWorkingDays = async () => {
    if (!selectedMonth) return;
    
    try {
      const [year, month] = selectedMonth.split('-');
      const response = await fetch(
        `/api/holidays/working-days?month=${month}&year=${year}`,
        { headers: getAuthHeaders() }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch working days: ${response.status}`);
      }
      
      const data = await response.json();
      setWorkingDaysData(data);
    } catch (error) {
      console.error('Error fetching working days:', error);
      setWorkingDaysData(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.date || !formData.reason) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const url = editingHoliday 
        ? `/api/holidays/${editingHoliday.id}`
        : '/api/holidays';
      
      const method = editingHoliday ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error(`Failed to save holiday: ${response.status}`);
      }

      const result = await response.json();
      alert(result.message || 'Holiday saved successfully!');
      
      resetForm();
      await refreshData();
    } catch (error) {
      console.error('Error saving holiday:', error);
      alert(error instanceof Error ? error.message : 'Failed to save holiday');
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      const response = await fetch(`/api/holidays/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`Failed to delete holiday: ${response.status}`);
      }

      alert('Holiday deleted successfully!');
      await refreshData();
    } catch (error) {
      console.error('Error deleting holiday:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete holiday');
    }
  };

  const refreshData = async () => {
    await Promise.all([
      fetchHolidays(),
      fetchUpcomingHolidays(),
      fetchWorkingDays()
    ]);
  };

  const resetForm = () => {
    setFormData({ name: '', date: '', reason: '' });
    setEditingHoliday(null);
    setShowAddModal(false);
  };

  const handleEdit = (holiday: Holiday) => {
    setEditingHoliday(holiday);
    const localDate = new Date(holiday.date);
    const yyyy = localDate.getFullYear();
    const mm = String(localDate.getMonth() + 1).padStart(2, '0');
    const dd = String(localDate.getDate()).padStart(2, '0');

    setFormData({
      name: holiday.name,
      date: `${yyyy}-${mm}-${dd}`,
      reason: holiday.reason
    });
    setShowAddModal(true);
  };

  // Filter holidays for selected month
  const filteredHolidays = selectedMonth && Array.isArray(holidays)
    ? holidays.filter(holiday => holiday.date.startsWith(selectedMonth))
    : holidays;

  return (
    <MainLayout 
      title="Holiday Management" 
      subtitle="Manage company holidays and calculate working days"
    >
      <div className="space-y-6">
        
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
              <span className="text-red-800">{error}</span>
            </div>
          </div>
        )}

        {/* Working Days Summary */}
        {workingDaysData && (
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
            <h3 className="text-xl font-semibold mb-4">
              Working Days Calculation - {new Date(workingDaysData.year, workingDaysData.month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold">{workingDaysData.totalDays}</div>
                <div className="text-sm opacity-90">Total Days</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-200">{workingDaysData.sundays}</div>
                <div className="text-sm opacity-90">Sundays</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-red-200">{workingDaysData.holidays}</div>
                <div className="text-sm opacity-90">Holidays</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-200">{workingDaysData.workingDays}</div>
                <div className="text-sm opacity-90">Working Days</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-200">{ALLOWED_LATE_DAYS}</div>
                <div className="text-sm opacity-90">Late Days Allowed</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-200">{((workingDaysData.workingDays / workingDaysData.totalDays) * 100).toFixed(1)}%</div>
                <div className="text-sm opacity-90">Work Ratio</div>
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center space-x-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Month</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {hasPermission('manage_holidays') && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Holiday
            </button>
          )}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Holidays List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedMonth ? `Holidays in ${new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}` : 'All Holidays'}
                </h3>
              </div>

              {loading ? (
                <div className="p-6 text-center text-gray-500">Loading holidays...</div>
              ) : filteredHolidays.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No holidays found for this period.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredHolidays.map((holiday) => (
                    <div key={holiday.id} className="p-6 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="text-2xl">🎉</div>
                          <div className="flex-1">
                            <h4 className="text-lg font-medium text-gray-900">{holiday.name}</h4>
                            <p className="text-sm text-gray-500">
                              {new Date(holiday.date).toLocaleDateString('en-US', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                              })}
                            </p>
                            <p className="text-sm text-blue-600 font-medium mt-1">
                              Reason: {holiday.reason}
                            </p>
                          </div>
                        </div>
                        
                        {hasPermission('manage_holidays') && (
                          <div className="flex space-x-1">
                            <button
                              onClick={() => handleEdit(holiday)}
                              className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-full"
                              title="Edit Holiday"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(holiday.id, holiday.name)}
                              className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full"
                              title="Delete Holiday"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Upcoming Holidays Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Clock className="w-5 h-5 mr-2 text-blue-600" />
                Upcoming Holidays
              </h3>
              
              {upcomingHolidays.length === 0 ? (
                <p className="text-gray-500 text-sm">No upcoming holidays</p>
              ) : (
                <div className="space-y-3">
                  {upcomingHolidays.slice(0, 5).map((holiday) => (
                    <div key={holiday.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{holiday.name}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(holiday.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                        <div className="text-xs text-blue-600 mt-1">{holiday.reason}</div>
                      </div>
                      <span className="text-lg">🎉</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Holiday Impact Info */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <AlertCircle className="w-5 h-5 text-amber-600 mr-2" />
                <h4 className="font-semibold text-amber-800">Holiday Impact</h4>
              </div>
              <div className="text-sm text-amber-700 space-y-1">
                <p>• Sundays are automatically excluded from working days</p>
                <p>• Custom holidays affect payroll calculations</p>
                <p>• Working days are updated in real-time</p>
                <p>• Late days allowed: {ALLOWED_LATE_DAYS} (fixed)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Add/Edit Holiday Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingHoliday ? 'Edit Holiday' : 'Add New Holiday'}
                </h2>
                <button
                  onClick={resetForm}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Holiday Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., New Year's Day"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason *
                  </label>
                  <input
                    type="text"
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., National Holiday, Religious Festival, Company Event"
                    required
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg"
                  >
                    {editingHoliday ? 'Update' : 'Add'} Holiday
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};
