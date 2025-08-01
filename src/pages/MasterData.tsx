
import React, { useState } from 'react';
import { MainLayout } from '../components/Layout/MainLayout';
import { Building, Briefcase, FileText, Plus, Search, X, Monitor } from 'lucide-react';
import { useMasterData } from '../hooks/useMasterData';
import MasterDataTable from '../components/Masters/MasterDataTable';
import MasterDataForm from '../components/Masters/MasterDataForm';
import MasterDataStats from '../components/Masters/MasterDataStats';

const MasterData = () => {
  const [activeTab, setActiveTab] = useState<'office' | 'position' | 'visaType' | 'platform'>('office');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [viewingItem, setViewingItem] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const {
    data,
    loading,
    error,
    refreshData,
    createItem,
    updateItem,
    deleteItem
  } = useMasterData(activeTab);

  const handleAddNew = () => {
    setEditingItem(null);
    setViewingItem(null);
    setShowForm(true);
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setViewingItem(null);
    setShowForm(true);
  };

  const handleView = (item: any) => {
    setViewingItem(item);
    setEditingItem(null);
    setShowForm(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      deleteItem(id);
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingItem(null);
    setViewingItem(null);
  };

  const handleSubmit = (formData: any) => {
    if (editingItem) {
      const itemId = activeTab === 'office' ? editingItem.office_id || editingItem.id :
                    activeTab === 'position' ? editingItem.position_id || editingItem.id :
                    activeTab === 'platform' ? editingItem.id :
                    editingItem.id;
      updateItem(itemId, formData);
    } else {
      createItem(formData);
    }
    handleCloseForm();
  };

  const filteredData = data.filter(item => {
    const searchTermLower = searchTerm.toLowerCase();
    switch (activeTab) {
      case 'office':
        return (
          item.office_name?.toLowerCase().includes(searchTermLower) ||
          item.location?.toLowerCase().includes(searchTermLower)
        );
      case 'position':
        return (
          item.position_name?.toLowerCase().includes(searchTermLower) ||
          item.description?.toLowerCase().includes(searchTermLower)
        );
      case 'visaType':
        return (
          item.typeofvisa?.toLowerCase().includes(searchTermLower) ||
          item.description?.toLowerCase().includes(searchTermLower)
        );
      case 'platform':
        return (
          item.platform_name?.toLowerCase().includes(searchTermLower)
        );
      default:
        return false;
    }
  });

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Master Data</h1>
              <p className="mt-2 text-gray-600">
                Manage your organization's core data: offices, positions, visa types, and platforms.
              </p>
            </div>
            <div className="mt-4 sm:mt-0">
              <button
                onClick={handleAddNew}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add New {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('office')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'office'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}>
              <Building className="inline-block w-5 h-5 mr-2" />
              Offices
            </button>
            <button
              onClick={() => setActiveTab('position')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'position'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}>
              <Briefcase className="inline-block w-5 h-5 mr-2" />
              Positions
            </button>
            <button
              onClick={() => setActiveTab('visaType')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'visaType'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}>
              <FileText className="inline-block w-5 h-5 mr-2" />
              Visa Types
            </button>
            <button
              onClick={() => setActiveTab('platform')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'platform'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}>
              <Monitor className="inline-block w-5 h-5 mr-2" />
              Platforms
            </button>
          </nav>
        </div>

        {/* Stats */}
        <MasterDataStats dataType={activeTab} data={data} loading={loading} />

        {/* Filters */}
        <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder={`Search ${activeTab}s...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Content based on active tab */}
        <div>
          <MasterDataTable
            dataType={activeTab}
            data={filteredData}
            loading={loading}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onView={handleView}
          />
        </div>

        {/* Form Modal */}
        {showForm && (
          <MasterDataForm
            isOpen={showForm}
            mode={editingItem ? 'edit' : viewingItem ? 'view' : 'add'}
            dataType={activeTab}
            data={editingItem || viewingItem}
            onSubmit={handleSubmit}
            onClose={handleCloseForm}
          />
        )}

        {error && (
          <div className="fixed bottom-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg">
            {error}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default MasterData;

