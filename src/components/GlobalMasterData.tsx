import React from 'react';
import { useMasterData } from '../context/MasterDataContext';
import { OfficeManager } from './Masters/OfficeManager';
import { PositionManager } from './Masters/PositionManager';
import { VisaTypeManager } from './Masters/VisaTypeManager';

export const GlobalMasterData: React.FC = () => {
  const { 
    showOfficeManager, 
    showPositionManager, 
    showVisaTypeManager,
    closeOfficeManager, 
    closePositionManager,
    closeVisaTypeManager 
  } = useMasterData();

  return (
    <>
      <OfficeManager
        isOpen={showOfficeManager}
        onClose={closeOfficeManager}
        onDataChange={() => {
          // You can add any global data refresh logic here
          console.log('Office data updated');
        }}
      />
      
      <PositionManager
        isOpen={showPositionManager}
        onClose={closePositionManager}
        onDataChange={() => {
          // You can add any global data refresh logic here
          console.log('Position data updated');
        }}
      />
      
      <VisaTypeManager
        isOpen={showVisaTypeManager}
        onClose={closeVisaTypeManager}
        onDataChange={() => {
          // You can add any global data refresh logic here
          console.log('Visa type data updated');
        }}
      />
    </>
  );
};
