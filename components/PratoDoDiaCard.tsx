import React, { useState } from 'react';
import { Star, Flame, ChefHat } from 'lucide-react';
import { MenuItem } from '../types';
import { formatCurrency } from '../utils/formatters';
import { ProductModal } from './ProductModal';

interface PratoDoDiaCardProps {
  item: MenuItem;
}

export const PratoDoDiaCard: React.FC<PratoDoDiaCardProps> = ({ item }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const mainImage =
    item.images && item.images.length > 0
      ? item.images[0]
      : 'https://via.placeholder.com/600';

  return (
    <>
      <div
        className="prato-dia-card relative overflow-hidden rounded-2xl cursor-pointer shadow-xl mb-2"
        onClick={() => setIsModalOpen(true)}
        style={{ minHeight: '240px' }}
      >
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-500 prato-dia-img"
          style={{ backgroundImage: `url(${mainImage})` }}
        />

        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />

        {/* Badge topo */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider shadow-lg prato-dia-badge">
          <Flame size={13} className="prato-dia-flame" />
          <span>Prato do Dia</span>
        </div>

        {/* Star decorations */}
        <div className="absolute top-3 right-3 flex gap-1">
          {[0, 1, 2].map((i) => (
            <Star
              key={i}
              size={10}
              className="text-yellow-400 fill-yellow-400 prato-dia-star"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>

        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-5">
          {/* Chef icon */}
          <div className="flex items-center gap-2 mb-2">
            <ChefHat size={14} className="text-yellow-400" />
            <span className="text-yellow-300 text-xs font-bold uppercase tracking-wider">
              Sugestão do Chef
            </span>
          </div>

          <h2 className="text-white text-2xl font-black leading-tight mb-1 drop-shadow-lg">
            {item.name}
          </h2>

          <p className="text-gray-300 text-sm leading-snug mb-4 line-clamp-2">
            {item.description}
          </p>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-gray-400 block">A partir de</span>
              <span className="text-2xl font-black prato-dia-price drop-shadow-lg">
                {formatCurrency(item.price)}
              </span>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsModalOpen(true);
              }}
              className="prato-dia-btn flex items-center gap-2 px-5 py-3 rounded-xl font-black text-sm shadow-lg active:scale-95 transition-transform"
            >
              <Flame size={16} />
              Pedir Agora
            </button>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <ProductModal item={item} onClose={() => setIsModalOpen(false)} />
      )}

      <style>{`
        .prato-dia-card {
          background: #111;
        }
        .prato-dia-card:hover .prato-dia-img {
          transform: scale(1.04);
        }
        .prato-dia-badge {
          background: linear-gradient(135deg, #DC2626, #ef4444);
          color: white;
          animation: pulseBadge 2s ease-in-out infinite;
        }
        .prato-dia-flame {
          animation: flameWiggle 0.6s ease-in-out infinite alternate;
        }
        .prato-dia-star {
          animation: starPulse 1.4s ease-in-out infinite;
        }
        .prato-dia-price {
          background: linear-gradient(90deg, #fbbf24, #f59e0b);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .prato-dia-btn {
          background: linear-gradient(135deg, #DC2626, #ef4444);
          color: white;
          box-shadow: 0 4px 20px rgba(220, 38, 38, 0.45);
        }
        .prato-dia-btn:hover {
          background: linear-gradient(135deg, #b91c1c, #dc2626);
          box-shadow: 0 6px 24px rgba(220, 38, 38, 0.6);
        }
        @keyframes pulseBadge {
          0%, 100% { box-shadow: 0 0 0 0 rgba(220,38,38,0.5); }
          50% { box-shadow: 0 0 0 6px rgba(220,38,38,0); }
        }
        @keyframes flameWiggle {
          from { transform: rotate(-10deg) scale(1); }
          to   { transform: rotate(10deg) scale(1.2); }
        }
        @keyframes starPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.8); }
        }
      `}</style>
    </>
  );
};
