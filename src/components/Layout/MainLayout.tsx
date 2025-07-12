import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import 'react-datepicker/dist/react-datepicker.css';

interface MainLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  onAddOffice?: () => void;
  onAddPosition?: () => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ 
  children, 
  title, 
  subtitle, 
  onAddOffice, 
  onAddPosition 
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        onAddOffice={onAddOffice}
        onAddPosition={onAddPosition}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        <Header 
          onMenuClick={() => setSidebarOpen(true)}
          title={title}
          subtitle={subtitle}
        />
        
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};