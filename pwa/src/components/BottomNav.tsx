import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Tv, 
  ShoppingBag, 
  ShieldCheck, 
  User, 
  Zap, 
  Layers, 
  FileText, 
  LogIn 
} from 'lucide-react';

interface BottomNavProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  activeTicketsCount?: number;
  activeAccountsCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onTabChange,
  activeTicketsCount = 0,
  activeAccountsCount = 0,
}) => {
  const { user, isClient, isSellerOrAdmin } = useAuth();

  const handleTabClick = (tab: string) => {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(10);
      } catch {}
    }
    onTabChange(tab);
  };

  if (!user) {
    // Unauthenticated Guest navigation
    return (
      <nav className="bottom-nav">
        <button
          className={`nav-tab ${currentTab === 'catalog' ? 'active' : ''}`}
          onClick={() => handleTabClick('catalog')}
        >
          <div className="tab-icon-wrap">
            <ShoppingBag size={20} />
          </div>
          <span>Catálogo</span>
        </button>

        <button
          className={`nav-tab ${currentTab === 'login' ? 'active' : ''}`}
          onClick={() => handleTabClick('login')}
        >
          <div className="tab-icon-wrap">
            <LogIn size={20} />
          </div>
          <span>Ingresar</span>
        </button>
      </nav>
    );
  }

  if (isClient) {
    // CLIENTE Navigation
    return (
      <nav className="bottom-nav">
        <button
          className={`nav-tab ${currentTab === 'accounts' ? 'active' : ''}`}
          onClick={() => handleTabClick('accounts')}
        >
          <div className="tab-icon-wrap">
            <Tv size={20} />
            {activeAccountsCount > 0 && (
              <span className="nav-tab-badge">{activeAccountsCount}</span>
            )}
          </div>
          <span>Mis Pantallas</span>
        </button>

        <button
          className={`nav-tab ${currentTab === 'catalog' ? 'active' : ''}`}
          onClick={() => handleTabClick('catalog')}
        >
          <div className="tab-icon-wrap">
            <ShoppingBag size={20} />
          </div>
          <span>Comprar</span>
        </button>

        <button
          className={`nav-tab ${currentTab === 'orders' ? 'active' : ''}`}
          onClick={() => handleTabClick('orders')}
        >
          <div className="tab-icon-wrap">
            <FileText size={20} />
          </div>
          <span>Órdenes</span>
        </button>

        <button
          className={`nav-tab ${currentTab === 'tickets' ? 'active' : ''}`}
          onClick={() => handleTabClick('tickets')}
        >
          <div className="tab-icon-wrap">
            <ShieldCheck size={20} />
            {activeTicketsCount > 0 && (
              <span className="nav-tab-badge">{activeTicketsCount}</span>
            )}
          </div>
          <span>Garantías</span>
        </button>

        <button
          className={`nav-tab ${currentTab === 'profile' ? 'active' : ''}`}
          onClick={() => handleTabClick('profile')}
        >
          <div className="tab-icon-wrap">
            <User size={20} />
          </div>
          <span>Mi Perfil</span>
        </button>
      </nav>
    );
  }

  if (isSellerOrAdmin) {
    // VENDEDOR / ADMIN Navigation
    return (
      <nav className="bottom-nav">
        <button
          className={`nav-tab ${currentTab === 'pos' ? 'active' : ''}`}
          onClick={() => handleTabClick('pos')}
        >
          <div className="tab-icon-wrap">
            <Zap size={20} />
          </div>
          <span>POS Móvil</span>
        </button>

        <button
          className={`nav-tab ${currentTab === 'inventory' ? 'active' : ''}`}
          onClick={() => handleTabClick('inventory')}
        >
          <div className="tab-icon-wrap">
            <Layers size={20} />
          </div>
          <span>Inventario</span>
        </button>

        <button
          className={`nav-tab ${currentTab === 'sales' ? 'active' : ''}`}
          onClick={() => handleTabClick('sales')}
        >
          <div className="tab-icon-wrap">
            <FileText size={20} />
          </div>
          <span>Ventas</span>
        </button>

        <button
          className={`nav-tab ${currentTab === 'profile' ? 'active' : ''}`}
          onClick={() => handleTabClick('profile')}
        >
          <div className="tab-icon-wrap">
            <User size={20} />
          </div>
          <span>Mi Panel</span>
        </button>
      </nav>
    );
  }

  return null;
};
