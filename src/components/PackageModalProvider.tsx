'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import PackageDetailModal from './PackageDetailModal';

interface PackageModalContextType {
  openPackageModal: (id: string) => void;
}

const PackageModalContext = createContext<PackageModalContextType>({
  openPackageModal: () => {},
});

export function usePackageModal() {
  return useContext(PackageModalContext);
}

export default function PackageModalProvider({ children }: { children: React.ReactNode }) {
  const [activePackageId, setActivePackageId] = useState<string | null>(null);

  const openPackageModal = useCallback((id: string) => {
    setActivePackageId(id);
  }, []);

  return (
    <PackageModalContext.Provider value={{ openPackageModal }}>
      {children}
      <PackageDetailModal
        packageId={activePackageId}
        onClose={() => setActivePackageId(null)}
        onSwitch={setActivePackageId}
      />
    </PackageModalContext.Provider>
  );
}
