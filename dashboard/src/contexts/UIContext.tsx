import { createContext, useContext, useState, ReactNode } from 'react';

interface UIContextType {
  // Property card state
  isPropertyCardOpen: boolean;
  setIsPropertyCardOpen: (isOpen: boolean) => void;

  // Other UI states can be added here as needed
  isMobileMenuOpen?: boolean;
  setIsMobileMenuOpen?: (isOpen: boolean) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: ReactNode }) {
  const [isPropertyCardOpen, setIsPropertyCardOpen] = useState(false);

  const value: UIContextType = {
    isPropertyCardOpen,
    setIsPropertyCardOpen,
  };

  return (
    <UIContext.Provider value={value}>
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within UIProvider');
  }
  return context;
}
