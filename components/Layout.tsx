import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, UtensilsCrossed, ShoppingCart, MapPin, Settings } from 'lucide-react';
import { useStore } from '../context/StoreContext';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { cartCount } = useStore();

  const isActive = (path: string) => location.pathname === path ? "text-primary font-bold" : "text-gray-500";
  
  // Don't show bottom nav on admin page
  const isAdminPage = location.pathname === '/admin';

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <main className="max-w-md mx-auto min-h-screen bg-white shadow-2xl overflow-hidden relative">
        {children}
        
        {/* Mobile Bottom Navigation - Sticky - Hidden on Admin Page */}
        {!isAdminPage && (
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 pb-safe">
             <div className="max-w-md mx-auto flex justify-around items-center h-16 px-2">
                <Link to="/" className={`flex flex-col items-center justify-center w-full h-full ${isActive('/')}`}>
                  <Home size={22} />
                  <span className="text-[10px] mt-1">Início</span>
                </Link>
                
                <Link to="/cardapio" className={`flex flex-col items-center justify-center w-full h-full ${isActive('/cardapio')}`}>
                  <UtensilsCrossed size={22} />
                  <span className="text-[10px] mt-1">Cardápio</span>
                </Link>

                <Link to="/carrinho" className={`flex flex-col items-center justify-center w-full h-full relative ${isActive('/carrinho')}`}>
                  <div className="relative">
                    <ShoppingCart size={22} />
                    {cartCount > 0 && (
                      <span className="absolute -top-2 -right-2 bg-primary text-white text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center animate-bounce">
                        {cartCount}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] mt-1">Carrinho</span>
                </Link>

                <Link to="/localizacao" className={`flex flex-col items-center justify-center w-full h-full ${isActive('/localizacao')}`}>
                  <MapPin size={22} />
                  <span className="text-[10px] mt-1">Local</span>
                </Link>
             </div>
          </div>
        )}

        {/* Admin Access Button (Top Left) */}
        {!isAdminPage && (
          <button 
            onClick={() => navigate('/admin')} 
            className="fixed top-4 left-4 z-50 p-2 rounded-full bg-white/20 hover:bg-white/50 text-white transition-colors"
            aria-label="Admin Panel"
          >
            <Settings size={20} className="drop-shadow-md" />
          </button>
        )}
      </main>
    </div>
  );
};

export default Layout;