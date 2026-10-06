import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { LoginView } from './views/LoginView';

// Client Views
import { ClientAccounts } from './views/client/ClientAccounts';
import { ClientCatalog } from './views/client/ClientCatalog';
import { ClientOrders } from './views/client/ClientOrders';
import { ClientTickets } from './views/client/ClientTickets';
import { ClientProfile } from './views/client/ClientProfile';

// Seller Views
import { SellerPOS } from './views/seller/SellerPOS';
import { SellerInventory } from './views/seller/SellerInventory';
import { SellerSales } from './views/seller/SellerSales';
import { SellerProfile } from './views/seller/SellerProfile';

import { api } from './services/api';
import { Download, Sparkles, X } from 'lucide-react';

const MainShell: React.FC = () => {
  const { user, isClient, isSellerOrAdmin, toastMessage } = useAuth();
  
  // Default tab based on user status
  const [currentTab, setCurrentTab] = useState<string>('catalog');
  const [systemName, setSystemName] = useState<string>('MezaStreaming');

  // PWA Install prompt handling
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState<boolean>(false);

  // Sync default tab when user or role changes
  useEffect(() => {
    if (!user) {
      setCurrentTab('login');
    } else if (isClient) {
      setCurrentTab('accounts');
    } else if (isSellerOrAdmin) {
      setCurrentTab('pos');
    }
  }, [user, isClient, isSellerOrAdmin]);

  // Load system brand name from settings
  useEffect(() => {
    api.settings.get().then((data) => {
      if (data?.nombrePlataforma) {
        setSystemName(data.nombrePlataforma);
      }
    }).catch(() => {});

    // Listen for PWA installation prompt
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBanner(false);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="pwa-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast-msg">
          <Sparkles size={16} color="var(--accent-red)" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* PWA Install Banner */}
      {showInstallBanner && (
        <div style={{
          background: 'var(--accent-gradient)',
          color: 'white',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.8rem',
          fontWeight: 600,
          position: 'sticky',
          top: 0,
          zIndex: 60,
          boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Download size={18} />
            <span>Instalar {systemName} como App Nativa</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={handleInstallClick}
              style={{
                background: 'white',
                color: '#9f1239',
                border: 'none',
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 800,
                fontSize: '0.74rem',
                cursor: 'pointer',
              }}
            >
              Instalar
            </button>
            <button
              onClick={() => setShowInstallBanner(false)}
              style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 4 }}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Native Dynamic Header */}
      <Header systemName={systemName} />

      {/* Main View Area */}
      <main className="pwa-main">
        {/* Guest Views */}
        {!user && (
          <>
            {currentTab === 'login' && <LoginView onSuccess={() => {}} />}
            {currentTab === 'catalog' && <ClientCatalog />}
          </>
        )}

        {/* Client Views */}
        {user && isClient && (
          <>
            {currentTab === 'accounts' && <ClientAccounts />}
            {currentTab === 'catalog' && <ClientCatalog />}
            {currentTab === 'orders' && <ClientOrders />}
            {currentTab === 'tickets' && <ClientTickets />}
            {currentTab === 'profile' && <ClientProfile />}
          </>
        )}

        {/* Seller / Admin Views */}
        {user && isSellerOrAdmin && (
          <>
            {currentTab === 'pos' && <SellerPOS />}
            {currentTab === 'inventory' && <SellerInventory />}
            {currentTab === 'sales' && <SellerSales />}
            {currentTab === 'profile' && <SellerProfile />}
          </>
        )}
      </main>

      {/* Native Bottom Navigation */}
      <BottomNav
        currentTab={currentTab}
        onTabChange={(tab) => setCurrentTab(tab)}
      />
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <MainShell />
    </AuthProvider>
  );
}

export default App;
