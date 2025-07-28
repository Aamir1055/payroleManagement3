import React, { useState, useEffect } from 'react';
import { X, Plus, Edit, Trash2, FileText, Save, XCircle } from 'lucide-react';

interface VisaType {
  id: number;
  typeofvisa: string;
}

interface VisaTypeManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onDataChange?: () => void;
}

export const VisaTypeManager: React.FC<VisaTypeManagerProps> = ({
  isOpen,
  onClose,
  onDataChange
}) => {
  const [visaTypes, setVisaTypes] = useState<VisaType[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingVisaType, setEditingVisaType] = useState<VisaType | null>(null);
  const [visaTypeForm, setVisaTypeForm] = useState({
    typeofvisa: ''
  });

  const fetchVisaTypes = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/masters/visa-types', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setVisaTypes(data);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error fetching visa types:', errorData);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchVisaTypes();
    }
  }, [isOpen]);

  const handleCreateOrUpdate = async () => {
    if (!visaTypeForm.typeofvisa.trim()) return alert('⚠️ Visa type name required');

    const url = editingVisaType
      ? `/api/masters/visa-types/${editingVisaType.id}`
      : '/api/masters/visa-types';

    const method = editingVisaType ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          typeofvisa: visaTypeForm.typeofvisa
        })
      });

      if (response.ok) {
        alert(`✅ Visa type ${editingVisaType ? 'updated' : 'created'} successfully!`);
        setVisaTypeForm({ typeofvisa: '' });
        setEditingVisaType(null);
        fetchVisaTypes();
        onDataChange?.();
      } else {
        const errorData = await response.json();
        alert(errorData?.error || '❌ Operation failed');
      }
    } catch (error) {
      alert('❌ Network error.');
    }
  };

  const handleDeleteVisaType = async (id: number) => {
    try {
      const response = await fetch(`/api/masters/visa-types/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        alert('✅ Visa type deleted');
        fetchVisaTypes();
        onDataChange?.();
      } else {
        const errorData = await response.json();
        alert(errorData?.error || '❌ Could not delete visa type');
      }
    } catch (error) {
      alert('❌ Network error.');
    }
  };

  const startEditVisaType = (visaType: VisaType) => {
    setEditingVisaType(visaType);
    setVisaTypeForm({
      typeofvisa: visaType.typeofvisa
    });
  };

  const cancelEdit = () => {
    setEditingVisaType(null);
    setVisaTypeForm({
      typeofvisa: ''
    });
  };

  const openDeleteModal = (id: number, typeofvisa: string) => {
    if (window.confirm(`Delete visa type "${typeofvisa}"? This action cannot be undone.`)) {
      handleDeleteVisaType(id);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-40">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-900">Manage Visa Types</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="space-y-6">
            {/* Form */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-medium mb-4">
                {editingVisaType ? 'Edit Visa Type' : 'Add New Visa Type'}
              </h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Visa Type Name *</label>
                  <input
                    value={visaTypeForm.typeofvisa}
                    onChange={(e) => setVisaTypeForm({ ...visaTypeForm, typeofvisa: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500"
                    placeholder="Enter visa type name"
                  />
                </div>
              </div>
              <div className="flex space-x-3 mt-4">
                <button
                  onClick={handleCreateOrUpdate}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {editingVisaType ? 'Update' : 'Create'} Visa Type
                </button>
                {editingVisaType && (
                  <button
                    onClick={cancelEdit}
                    className="flex items-center px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Cancel
                  </button>
                )}
              </div>
            </div>

            {/* List */}
            <div className="space-y-3">
              {loading ? (
                <div className="text-center py-8">Loading visa types...</div>
              ) : visaTypes.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No visa types found.</div>
              ) : (
                visaTypes.map((visaType) => (
                  <div key={visaType.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{visaType.typeofvisa}</h4>
                      <div className="flex flex-wrap gap-4 mt-2 text-xs">
                        <div className="text-gray-700"><strong>ID:</strong> {visaType.id}</div>
                      </div>
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <button
                        onClick={() => startEditVisaType(visaType)}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-full"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openDeleteModal(visaType.id, visaType.typeofvisa)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-full"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
