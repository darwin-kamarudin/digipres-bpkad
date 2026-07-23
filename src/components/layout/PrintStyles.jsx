import React from 'react';

export default function PrintStyles({ isLandscape }) {
  return (
    <style>{`
    @media print {
        @page { size: ${isLandscape ? 'landscape' : 'portrait'}; margin: 10mm; }
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; height: auto !important; overflow: visible !important; }
        #sidebar-container, header, button { display: none !important; }
        #main-content { width: 100% !important; margin: 0 !important; padding: 0 !important; overflow: visible !important; display: block !important; }
    }
    `}</style>
  );
}
