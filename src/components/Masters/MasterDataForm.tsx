
import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useForm } from 'react-hook-form';

interface MasterDataFormProps {
  isOpen: boolean;
  mode: 'add' | 'edit' | 'view';
  dataType: 'office' | 'position' | 'visaType' | 'platform';
  data: any;
  onSubmit: (data: any) => void;
  onClose: () => void;
}

const MasterDataForm: React.FC<MasterDataFormProps> = ({ isOpen, mode, dataType, data, onSubmit, onClose }) => {
  const { register, handleSubmit, reset } = useForm();

  useEffect(() => {
    if (data) {
      reset(data);
    } else {
      reset({});
    }
  }, [data, reset]);

  if (!isOpen) return null;

  const titles = {
    office: 'Office',
    position: 'Position',
    visaType: 'Visa Type',
    platform: 'Platform'
  };

  const renderFormFields = () => {
    switch (dataType) {
      case 'office':
        return (
          <>
            <div className="mb-4">
              <label htmlFor="office_name" className="block text-sm font-medium text-gray-700">Office Name</label>
              <input
                type="text"
                id="office_name"
                {...register('office_name', { required: true })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            <div className="mb-4">
              <label htmlFor="location" className="block text-sm font-medium text-gray-700">Location</label>
              <input
                type="text"
                id="location"
                {...register('location')}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </>
        );
      case 'position':
        return (
          <>
            <div className="mb-4">
              <label htmlFor="position_name" className="block text-sm font-medium text-gray-700">Position Name</label>
              <input
                type="text"
                id="position_name"
                {...register('position_name', { required: true })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            <div className="mb-4">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                id="description"
                {...register('description')}
                rows={3}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              ></textarea>
            </div>
          </>
        );
      case 'visaType':
        return (
          <>
            <div className="mb-4">
              <label htmlFor="typeofvisa" className="block text-sm font-medium text-gray-700">Visa Type</label>
              <input
                type="text"
                id="typeofvisa"
                {...register('typeofvisa', { required: true })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            <div className="mb-4">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                id="description"
                {...register('description')}
                rows={3}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              ></textarea>
            </div>
          </>
        );
      case 'platform':
        return (
          <>
            <div className="mb-4">
              <label htmlFor="platform_name" className="block text-sm font-medium text-gray-700">Platform Name</label>
              <input
                type="text"
                id="platform_name"
                {...register('platform_name', { required: true })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {mode === 'add' ? 'Add' : mode === 'edit' ? 'Edit' : 'View'} {titles[dataType]}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6">
          {renderFormFields()}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MasterDataForm;

