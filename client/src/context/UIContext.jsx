import React, { createContext, useContext, useState } from 'react';

const UIContext = createContext();

export const UIProvider = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(prev => {
      const nextOpen = !prev;
      if (nextOpen) setIsSearchOpen(false);
      return nextOpen;
    });
  };
  const closeMobileMenu = () => setIsMobileMenuOpen(false);
  const openMobileMenu = () => {
    setIsSearchOpen(false);
    setIsMobileMenuOpen(true);
  };

  const toggleSearch = () => {
    setIsSearchOpen(prev => {
      const nextOpen = !prev;
      if (nextOpen) setIsMobileMenuOpen(false);
      return nextOpen;
    });
  };
  const closeSearch = () => setIsSearchOpen(false);

  return (
    <UIContext.Provider
      value={{
        isMobileMenuOpen,
        toggleMobileMenu,
        closeMobileMenu,
        openMobileMenu,
        isSearchOpen,
        toggleSearch,
        closeSearch
      }}
    >
      {children}
    </UIContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
};
