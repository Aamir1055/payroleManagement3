import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { MainLayout } from '../components/Layout/MainLayout';
import { Save, Clock, Calendar, Users, DollarSign } from 'lucide-react';

export const Settings: React.FC = () => {
  const [settings, setSettings] = useState({
    defaultDutyHours: 8,
    defaultReportingTime: '09:00',
    allowedLateDays: 3,
    allowedLeaves: 2,
    workingDaysPerMonth: 22,
    overtimeRate: 1.5,
    lateToleranceMinutes: 15
  });

  const [holidays, setHolidays] = useState<Date[]>([
    new Date('2025-07-24'),
    new Date('2025-07-09'),
    new Date('2025-09-26')
  ]);
  const [showCalendar, setShowCalendar] = useState(false);

  const handleSave = () => {
    console.log('Saving settings:', settings);
    console.log('Holidays:', holidays);
  };

  const handleInputChange = (field: string, value: string | number) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddHoliday = (date: Date) => {
    setHolidays(prev => [...prev, date]);
    setShowCalendar(false);
  };

  const handleRemoveHoliday = (index: number) => {
    setHolidays(prev => prev.filter((_, i) => i !== index));
  };

  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric' }).format(date);

  return (
    <MainLayout title="Settings" subtitle="Configure payroll system preferences">
      <div className="space-y-6">
        {/* Work Hours Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Clock className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Work Hours Configuration</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputField
              label="Default Duty Hours"
              type="number"
              value={settings.defaultDutyHours}
              onChange={(val) => handleInputChange('defaultDutyHours', parseInt(val))}
              note="Standard working hours per day"
              min={1}
              max={12}
            />
            <InputField
              label="Default Reporting Time"
              type="time"
              value={settings.defaultReportingTime}
              onChange={(val) => handleInputChange('defaultReportingTime', val)}
              note="Default office start time"
            />
            <InputField
              label="Late Tolerance (Minutes)"
              type="number"
              value={settings.lateToleranceMinutes}
              onChange={(val) => handleInputChange('lateToleranceMinutes', parseInt(val))}
              note="Grace period before marking as late"
              min={0}
              max={60}
            />
            <InputField
              label="Overtime Rate Multiplier"
              type="number"
              step="0.1"
              value={settings.overtimeRate}
              onChange={(val) => handleInputChange('overtimeRate', parseFloat(val))}
              note="Multiplier for overtime pay calculation"
              min={1}
              max={3}
            />
          </div>
        </div>

        {/* Attendance Policy */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Users className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">Attendance Policy</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputField
              label="Allowed Late Days per Month"
              type="number"
              value={settings.allowedLateDays}
              onChange={(val) => handleInputChange('allowedLateDays', parseInt(val))}
              note="Maximum late arrivals without penalty"
              min={0}
              max={10}
            />
            <InputField
              label="Allowed Unpaid Leaves per Month"
              type="number"
              value={settings.allowedLeaves}
              onChange={(val) => handleInputChange('allowedLeaves', parseInt(val))}
              note="Leaves allowed without double penalty"
              min={0}
              max={10}
            />
          </div>
        </div>

        {/* Payroll Configuration */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <DollarSign className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">Payroll Configuration</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputField
              label="Working Days per Month"
              type="number"
              value={settings.workingDaysPerMonth}
              onChange={(val) => handleInputChange('workingDaysPerMonth', parseInt(val))}
              note="Standard working days excluding weekends"
              min={20}
              max={31}
            />
          </div>
        </div>

        {/* Holiday Calendar */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Calendar className="w-5 h-5 text-orange-600" />
            <h3 className="text-lg font-semibold text-gray-900">Holiday Calendar</h3>
          </div>

          <div className="space-y-4">
            {holidays.map((holiday, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">Custom Holiday</p>
                  <p className="text-xs text-gray-500">{formatDate(holiday)}</p>
                </div>
                <button
                  onClick={() => handleRemoveHoliday(index)}
                  className="text-red-600 hover:text-red-700 text-sm"
                >
                  Remove
                </button>
              </div>
            ))}

            {/* Add Holiday Button + Calendar Popup */}
            <div className="relative w-full flex justify-center">
              <button
                onClick={() => setShowCalendar(!showCalendar)}
                className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-gray-400 hover:text-gray-600"
              >
                + Add Holiday
              </button>

              {showCalendar && (
                <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-2">
                  <DatePicker
                    inline
                    selected={null}
                    onChange={handleAddHoliday}
                    minDate={new Date()}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            className="flex items-center px-6 py-3 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Settings
          </button>
        </div>
      </div>
    </MainLayout>
  );
};

// Reusable Input Field Component
interface InputFieldProps {
  label: string;
  type: string;
  step?: string;
  min?: number;
  max?: number;
  value: string | number;
  onChange: (value: string) => void;
  note?: string;
}
const InputField: React.FC<InputFieldProps> = ({
  label,
  type,
  step,
  min,
  max,
  value,
  onChange,
  note
}) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
    <input
      type={type}
      step={step}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      min={min}
      max={max}
    />
    {note && <p className="text-xs text-gray-500 mt-1">{note}</p>}
  </div>
);
