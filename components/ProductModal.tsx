import React, { useState } from 'react';
import { X, Minus, Plus, ShoppingBag, ChevronLeft, ChevronRight } from 'lucide-react';
import { MenuItem, ProductOption } from '../types';
import { useStore } from '../context/StoreContext';
import { formatCurrency } from '../utils/formatters';

interface ProductModalProps {
  item: MenuItem;
  onClose: () => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({ item, onClose }) => {
  const { addToCart } = useStore();
  const [quantity, setQuantity] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<{ [groupId: string]: ProductOption[] }>({});

  const handleOptionToggle = (groupId: string, option: ProductOption, max: number, isRadio: boolean) => {
    setSelectedOptions(prev => {
      const current = prev[groupId] || [];
      const isSelected = current.find(o => o.id === option.id);

      if (isSelected) {
        return { ...prev, [groupId]: current.filter(o => o.id !== option.id) };
      } else {
        if (isRadio) {
          return { ...prev, [groupId]: [option] };
        } else {
          if (current.length >= max) return prev;
          return { ...prev, [groupId]: [...current, option] };
        }
      }
    });
  };

  const parsedGroups = typeof (item.optionGroups as any) === 'string' 
    ? JSON.parse(item.optionGroups as any) 
    : (item.optionGroups || []);

  const validateSelection = () => {
    if (!parsedGroups || parsedGroups.length === 0) return true;
    for (const group of parsedGroups) {
      // Filtrar apenas opções que ainda estão disponíveis no grupo
      const availableOptionsInGroup = group.options.filter((o: any) => o.available !== false);
      if (availableOptionsInGroup.length === 0 && group.required) continue; // Skip if no options available

      const selectedCount = (selectedOptions[group.id] || []).length;
      if (group.required && selectedCount < group.min) {
        return false;
      }
    }
    return true;
  };

  const getTotalPrice = () => {
    let hasSizeSelected = false;
    let optionsTotal = 0;

    (Object.entries(selectedOptions) as [string, ProductOption[]][]).forEach(([groupId, options]) => {
      // Usa String() para garantir a comparação correta do ID, independente de ser string ou number no Supabase
      const group = parsedGroups.find((g: any) => String(g.id) === String(groupId));
      const isSize = group && Number(group.max) === 1 && (group.required === true || String(group.required) === 'true');

      options.forEach(opt => {
        if (isSize) {
          hasSizeSelected = true;
        }
        optionsTotal += opt.price;
      });
    });

    // Se selecionou um tamanho (que tem preço absoluto), o preço base do produto é zerado.
    // Caso contrário, usa o preço base do produto.
    const base = hasSizeSelected ? 0 : item.price;
    return (base + optionsTotal) * quantity;
  };

  const handleAddToCart = () => {
    if (validateSelection()) {
      addToCart(item, quantity, selectedOptions);
      onClose();
    }
  };

  const nextImage = () => {
    if (item.images.length > 1) {
      setCurrentImageIndex((prev) => (prev + 1) % item.images.length);
    }
  };

  const prevImage = () => {
    if (item.images.length > 1) {
      setCurrentImageIndex((prev) => (prev - 1 + item.images.length) % item.images.length);
    }
  };

  const isValid = validateSelection();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md max-h-[90vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl relative animate-in zoom-in-95 duration-200">
        
        <button onClick={onClose} className="absolute top-4 right-4 z-20 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors">
          <X size={20} />
        </button>

        <div className="h-64 relative bg-gray-100 shrink-0">
          <img src={item.images[currentImageIndex]} alt={item.name} className="w-full h-full object-cover" />
          {item.images.length > 1 && (
            <>
              <button onClick={prevImage} className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 p-1 rounded-full shadow-sm hover:bg-white text-gray-800"><ChevronLeft size={24} /></button>
              <button onClick={nextImage} className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 p-1 rounded-full shadow-sm hover:bg-white text-gray-800"><ChevronRight size={24} /></button>
              <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
                {item.images.map((_, idx) => (
                  <div key={idx} className={`w-2 h-2 rounded-full transition-colors ${idx === currentImageIndex ? 'bg-white' : 'bg-white/50'}`} />
                ))}
              </div>
            </>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">{item.name}</h2>
            <p className="text-gray-500 text-sm">{item.description}</p>
            <p className="text-primary font-bold text-xl mt-2">
              {(() => {
                // Se há grupo de tamanho, mostrar o preço da variante selecionada ou o menor disponível
                const sizeGroup = parsedGroups.find((g: any) => Number(g.max) === 1 && (g.required === true || String(g.required) === 'true'));
                if (sizeGroup) {
                  const selectedSize = selectedOptions[sizeGroup.id]?.[0];
                  if (selectedSize) return formatCurrency(selectedSize.price);
                  // Mostrar menor preço disponível como referência
                  const prices = sizeGroup.options.filter((o: any) => o.available !== false).map((o: any) => o.price);
                  if (prices.length > 0) return `A partir de ${formatCurrency(Math.min(...prices))}`;
                }
                return formatCurrency(item.price);
              })()}
            </p>
          </div>

          {parsedGroups.map((group: any) => {
            // Só mostrar opções disponíveis
            const availableOptions = group.options.filter(opt => opt.available !== false);
            if (availableOptions.length === 0) return null;

            return (
              <div key={group.id} className="mb-6">
                <div className="flex justify-between items-center mb-3 bg-gray-50 p-2 rounded-lg">
                  <div>
                    <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide">{group.title}</h3>
                    <p className="text-xs text-gray-500">
                      {(group.required === true || String(group.required) === 'true') ? 'Obrigatório' : 'Opcional'} • 
                      {Number(group.max) === 1 ? ' Escolha 1' : ` Max ${group.max}`}
                    </p>
                  </div>
                  {(group.required === true || String(group.required) === 'true') && !(selectedOptions[group.id]?.length >= Number(group.min)) && (
                     <span className="text-[10px] font-bold text-white bg-red-500 px-2 py-0.5 rounded-full">Pendente</span>
                  )}
                </div>
                
                <div className="space-y-2">
                  {availableOptions.map(option => {
                    const isSelected = selectedOptions[group.id]?.some(o => o.id === option.id);
                    return (
                      <label key={option.id} className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${isSelected ? 'border-primary bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-primary' : 'border-gray-300'}`}>
                            {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                          </div>
                          <span className={`text-sm ${isSelected ? 'font-bold text-gray-900' : 'text-gray-700'}`}>{option.name}</span>
                        </div>
                        <span className="text-sm font-medium text-gray-600">
                          {option.price > 0 ? `+${formatCurrency(option.price)}` : 'Grátis'}
                        </span>
                        <input 
                          type="checkbox" 
                          className="hidden"
                          checked={isSelected}
                          onChange={() => handleOptionToggle(group.id, option, group.max, group.max === 1)}
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 border-t border-gray-100 bg-white">
          <div className="flex items-center justify-between gap-4 mb-4">
            <span className="font-bold text-gray-500 text-sm">Quantidade</span>
            <div className="flex items-center gap-4 bg-gray-100 rounded-full p-1">
              <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-8 h-8 flex items-center justify-center bg-white rounded-full shadow-sm text-gray-600 disabled:opacity-50"><Minus size={16} /></button>
              <span className="font-bold w-4 text-center">{quantity}</span>
              <button onClick={() => setQuantity(q => q + 1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-full shadow-sm text-gray-600"><Plus size={16} /></button>
            </div>
          </div>
          
          <button 
            onClick={handleAddToCart}
            disabled={!isValid}
            className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 ${
              isValid ? 'bg-primary text-white hover:bg-red-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <ShoppingBag size={20} />
            <span>Adicionar • {formatCurrency(getTotalPrice())}</span>
          </button>
        </div>
      </div>
    </div>
  );
};