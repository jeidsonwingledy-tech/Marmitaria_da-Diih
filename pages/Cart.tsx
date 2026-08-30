import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, ArrowRight, ArrowLeft, Copy, Check, Calculator, QrCode, Utensils, MapPin, AlertTriangle } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatCurrency, generatePixString, findMatchingNeighborhood, filterNeighborhoods } from '../utils/formatters';
import { OrderDetails, ProductOption, NeighborhoodFee } from '../types';
import QRCode from 'react-qr-code';

const Cart = () => {
  const navigate = useNavigate();
  const { cart, removeFromCart, updateQuantity, cartTotal, restaurantInfo, notify, addOrder, clearCart } = useStore();
  const [step, setStep] = useState<'cart' | 'checkout' | 'success'>('cart');
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastOrderData, setLastOrderData] = useState<{id: string, total: number, pixCode: string, paymentMethod: string} | null>(null);
  
  // Neighborhood autocomplete state
  const [showNeighborhoodDropdown, setShowNeighborhoodDropdown] = useState(false);
  const [matchedNeighborhood, setMatchedNeighborhood] = useState<NeighborhoodFee | null>(null);
  const neighborhoodRef = useRef<HTMLDivElement>(null);
  
  const [formData, setFormData] = useState<OrderDetails>({
    customerName: '',
    address: '',
    number: '',
    neighborhood: '',
    paymentMethod: 'Pix',
    needCutlery: '', // Default empty to force selection
    changeFor: '',
    notes: '',
    deliveryFee: 0
  });

  // Calculate delivery fee when neighborhood changes or cart total changes
  useEffect(() => {
    // 1. Check free shipping
    if (restaurantInfo.delivery.freeShippingThreshold > 0 && cartTotal >= restaurantInfo.delivery.freeShippingThreshold) {
      setMatchedNeighborhood(null);
      setFormData(prev => ({ ...prev, deliveryFee: 0 }));
      return;
    }

    // 2. Use intelligent fuzzy matching for neighborhood
    if (formData.neighborhood) {
      const match = findMatchingNeighborhood(
        formData.neighborhood,
        restaurantInfo.delivery.neighborhoods
      );

      setMatchedNeighborhood(match);

      if (match) {
        setFormData(prev => ({ ...prev, deliveryFee: match.price }));
      } else {
        setFormData(prev => ({ ...prev, deliveryFee: restaurantInfo.delivery.standardFee }));
      }
    } else {
      setMatchedNeighborhood(null);
      setFormData(prev => ({ ...prev, deliveryFee: restaurantInfo.delivery.standardFee }));
    }
  }, [formData.neighborhood, cartTotal, restaurantInfo.delivery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (neighborhoodRef.current && !neighborhoodRef.current.contains(event.target as Node)) {
        setShowNeighborhoodDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get filtered suggestions for autocomplete
  const neighborhoodSuggestions = formData.neighborhood
    ? filterNeighborhoods(formData.neighborhood, restaurantInfo.delivery.neighborhoods)
    : restaurantInfo.delivery.neighborhoods;

  const selectNeighborhood = (hood: NeighborhoodFee) => {
    setFormData(prev => ({ ...prev, neighborhood: hood.name }));
    setShowNeighborhoodDropdown(false);
  };

  const finalTotal = cartTotal + formData.deliveryFee;

  // Generate Pix Code Dynamically based on current Total
  const pixCode = (formData.paymentMethod === 'Pix' && restaurantInfo.pixKey) 
    ? generatePixString(restaurantInfo.pixKey, restaurantInfo.pixName, restaurantInfo.pixCity, finalTotal)
    : '';

  // Helper to parse currency string to float safely
  const getChangeAmount = () => {
     if (!formData.changeFor) return 0;
     const cleanStr = formData.changeFor.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
     const amount = parseFloat(cleanStr);
     return isNaN(amount) ? 0 : amount - finalTotal;
  };

  const changeAmount = getChangeAmount();
  const isInsufficient = formData.changeFor && changeAmount < 0;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações
    if (!formData.neighborhood) {
      notify('Por favor, informe o bairro para entrega.', 'error');
      return;
    }

    if (!formData.needCutlery) {
        notify('Por favor, informe se precisa de talher.', 'error');
        return;
    }

    if (formData.paymentMethod === 'Dinheiro' && formData.changeFor) {
       if (isInsufficient) {
           notify('O valor para troco deve ser maior que o total.', 'error');
           return;
       }
    }

    setIsSubmitting(true);

    try {
        // 1. Save to Firebase
        const orderId = await addOrder({
            customerName: formData.customerName,
            items: cart,
            total: finalTotal,
            paymentMethod: formData.paymentMethod,
            address: formData.address,
            neighborhood: formData.neighborhood,
            number: formData.number,
            changeFor: formData.changeFor,
            notes: formData.notes,
            needCutlery: formData.needCutlery,
            deliveryFee: formData.deliveryFee
        });

        setLastOrderData({
            id: orderId,
            total: finalTotal,
            pixCode: pixCode,
            paymentMethod: formData.paymentMethod
        });
        clearCart();
        setStep('success');
        notify('Pedido realizado com sucesso!', 'success');

    } catch {
        notify('Erro ao enviar pedido. Tente novamente.', 'error');
    } finally {
        setIsSubmitting(false);
    }
  };

  const openWhatsApp = () => {
    if (!lastOrderData) return;
    
    const message = `Olá! Acabei de fazer o pedido *#${lastOrderData.id.slice(-4)}* pelo site. Poderia confirmar?`;
    const url = `https://wa.me/${restaurantInfo.whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const copyPix = () => {
    const code = lastOrderData?.pixCode || pixCode;
    if(!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    notify('Código Pix copiado! Cole no seu app do banco.', 'success');
    setTimeout(() => setCopied(false), 3000);
  };

  if (step === 'success' && lastOrderData) {
      return (
          <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center animate-in zoom-in-95 duration-300">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 text-green-600">
                  <Check size={40} strokeWidth={4} />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Pedido Recebido!</h2>
              <p className="text-gray-500 mb-6 max-w-xs mx-auto">
                  Seu pedido <strong>#{lastOrderData.id.slice(-4)}</strong> foi enviado para a cozinha.
              </p>

              {/* Show Pix Code again if payment method was Pix */}
              {lastOrderData.paymentMethod === 'Pix' && lastOrderData.pixCode && (
                  <div className="mb-6 w-full max-w-xs bg-gray-50 p-4 rounded-xl border border-gray-200">
                      <p className="text-sm font-bold text-gray-700 mb-2">Pagamento Pix</p>
                      <div className="bg-white p-2 rounded-lg inline-block mb-3 shadow-sm">
                          <QRCode value={lastOrderData.pixCode} size={120} level="M" />
                      </div>
                      <button 
                          onClick={copyPix} 
                          className={`w-full flex items-center justify-center gap-2 text-xs font-bold py-2 rounded-lg transition-all ${copied ? 'bg-green-600 text-white' : 'bg-green-100 text-green-700'}`}
                      >
                          {copied ? <Check size={14} /> : <Copy size={14} />}
                          {copied ? 'Copiado!' : 'Copiar Código Pix'}
                      </button>
                  </div>
              )}
              
              <div className="space-y-3 w-full max-w-xs">
                  <button onClick={openWhatsApp} className="w-full bg-[#25D366] text-white py-3 rounded-xl font-bold shadow-lg hover:opacity-90 transition-colors flex items-center justify-center gap-2">
                      <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" className="w-5 h-5 filter brightness-0 invert" />
                      Avisar no WhatsApp
                  </button>
                  <button onClick={() => navigate('/')} className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors">
                      Voltar ao Início
                  </button>
              </div>
          </div>
      );
  }

  if (cart.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <div className="bg-gray-100 p-6 rounded-full mb-4"><Trash2 className="w-12 h-12 text-gray-400" /></div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Carrinho Vazio</h2>
        <p className="text-gray-500 mb-6">Que tal escolher uma marmita deliciosa?</p>
        <button onClick={() => navigate('/cardapio')} className="bg-primary text-white px-8 py-3 rounded-full font-bold shadow-lg hover:opacity-90 transition-colors" style={{ backgroundColor: 'var(--color-primary)' }}>Ver Cardápio</button>
      </div>
    );
  }

  if (step === 'checkout') {
    return (
      <div className="p-4 pb-24">
        <button onClick={() => setStep('cart')} className="flex items-center text-gray-500 mb-6 hover:text-primary"><ArrowLeft size={20} className="mr-1" /> Voltar ao carrinho</button>
        <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--color-text)' }}>Finalizar Pedido</h2>
        
        <form onSubmit={handleCheckout} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Seu Nome</label>
            <input required type="text" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none bg-white" placeholder="Ex: João Silva" value={formData.customerName} onChange={e => setFormData({...formData, customerName: e.target.value})} />
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
              <input required type="text" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none bg-white" placeholder="Rua, Bairro" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Número</label>
              <input required type="text" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none bg-white" placeholder="123" value={formData.number} onChange={e => setFormData({...formData, number: e.target.value})} />
            </div>
          </div>

          {/* --- BAIRRO COM AUTOCOMPLETE INTELIGENTE --- */}
          <div ref={neighborhoodRef} className="relative">
             <label className="block text-sm font-medium text-gray-700 mb-1">Bairro (Digite para calcular a taxa)</label>
             <div className="relative">
               <MapPin size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
               <input 
                  required
                  type="text"
                  autoComplete="off"
                  className={`w-full p-3 pl-10 border rounded-lg focus:ring-2 outline-none bg-white transition-colors ${
                    matchedNeighborhood 
                      ? 'border-green-400 focus:ring-green-300' 
                      : formData.neighborhood 
                        ? 'border-yellow-400 focus:ring-yellow-300' 
                        : 'border-gray-300 focus:ring-primary'
                  }`}
                  placeholder="Digite seu bairro..."
                  value={formData.neighborhood}
                  onChange={e => {
                    setFormData({...formData, neighborhood: e.target.value});
                    setShowNeighborhoodDropdown(true);
                  }}
                  onFocus={() => setShowNeighborhoodDropdown(true)}
               />
             </div>

             {/* Dropdown de sugestões */}
             {showNeighborhoodDropdown && restaurantInfo.delivery.neighborhoods.length > 0 && (
               <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                 {neighborhoodSuggestions.length > 0 ? (
                   neighborhoodSuggestions.map((n, idx) => (
                     <button
                       key={idx}
                       type="button"
                       onClick={() => selectNeighborhood(n)}
                       className="w-full flex justify-between items-center px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left border-b border-gray-50 last:border-b-0"
                     >
                       <span className="text-sm font-medium text-gray-800">{n.name}</span>
                       <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{formatCurrency(n.price)}</span>
                     </button>
                   ))
                 ) : (
                   <div className="px-4 py-3 text-sm text-gray-400 text-center">Nenhum bairro encontrado</div>
                 )}
               </div>
             )}

             {/* Feedback visual do match */}
             {formData.neighborhood && (
               <div className={`mt-2 flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg transition-all ${
                 matchedNeighborhood 
                   ? 'bg-green-50 text-green-700 border border-green-200' 
                   : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
               }`}>
                 {matchedNeighborhood ? (
                   <>
                     <Check size={14} className="shrink-0" />
                     <span>Bairro encontrado: <strong>{matchedNeighborhood.name}</strong> — {formatCurrency(matchedNeighborhood.price)}</span>
                   </>
                 ) : (
                   <>
                     <AlertTriangle size={14} className="shrink-0" />
                     <span>Bairro não cadastrado — taxa padrão: {formatCurrency(restaurantInfo.delivery.standardFee)}</span>
                   </>
                 )}
               </div>
             )}
          </div>

          <div className="bg-gray-50 p-4 rounded-xl flex justify-between items-center text-sm border border-gray-200">
             <span className="text-gray-600">Taxa de Entrega:</span>
             <span className={`font-bold ${formData.deliveryFee === 0 ? 'text-green-600' : 'text-gray-800'}`}>{formData.deliveryFee === 0 ? 'GRÁTIS' : formatCurrency(formData.deliveryFee)}</span>
          </div>

          {/* Talheres (Obrigatório) */}
          <div className="bg-white p-3 border border-gray-200 rounded-xl">
             <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <Utensils size={16} className="text-gray-500" />
                Precisa de talher descartável? <span className="text-red-500">*</span>
             </label>
             <div className="flex gap-3">
                 <button 
                    type="button"
                    onClick={() => setFormData({...formData, needCutlery: 'Sim'})}
                    className={`flex-1 py-3 rounded-lg font-bold border-2 transition-all ${
                        formData.needCutlery === 'Sim' 
                        ? 'border-green-500 bg-green-50 text-green-700' 
                        : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                    }`}
                 >
                    SIM
                 </button>
                 <button 
                    type="button"
                    onClick={() => setFormData({...formData, needCutlery: 'Não'})}
                    className={`flex-1 py-3 rounded-lg font-bold border-2 transition-all ${
                        formData.needCutlery === 'Não' 
                        ? 'border-gray-800 bg-gray-100 text-gray-900' 
                        : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                    }`}
                 >
                    NÃO
                 </button>
             </div>
             {formData.needCutlery === '' && <p className="text-[10px] text-red-400 mt-1 pl-1">Seleção obrigatória.</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Forma de Pagamento</label>
            <select className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none bg-white font-medium" value={formData.paymentMethod} onChange={e => setFormData({...formData, paymentMethod: e.target.value as 'Pix' | 'Cartão' | 'Dinheiro'})}>
              <option value="Pix">Pix (Instantâneo)</option>
              <option value="Cartão">Cartão (Maquininha na entrega)</option>
              <option value="Dinheiro">Dinheiro</option>
            </select>
          </div>

          {/* ÁREA PIX AUTOMÁTICA */}
          {formData.paymentMethod === 'Pix' && restaurantInfo.pixKey && (
            <div className="bg-gradient-to-br from-green-50 to-white border-2 border-green-200 rounded-2xl p-6 flex flex-col items-center animate-in zoom-in-95 duration-300 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                 <QrCode className="text-green-600" />
                 <p className="font-bold text-green-800">Pagamento Automático</p>
              </div>
              
              <div className="bg-white p-3 rounded-xl shadow-md mb-4 border border-gray-100">
                 <QRCode value={pixCode} size={160} level="M" />
              </div>
              
              <div className="text-center mb-5 w-full">
                 <p className="text-2xl font-bold text-gray-900 mb-1">{formatCurrency(finalTotal)}</p>
                 <p className="text-xs text-gray-500">Destinatário: <span className="font-bold">{restaurantInfo.pixName}</span></p>
              </div>

              <div className="w-full">
                 <button 
                    type="button" 
                    onClick={copyPix} 
                    className={`w-full flex items-center justify-center gap-2 font-bold py-3 rounded-xl transition-all active:scale-95 shadow-sm ${copied ? 'bg-green-600 text-white' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                 >
                    {copied ? <Check size={20} /> : <Copy size={20} />}
                    {copied ? 'Código Copiado!' : 'Copiar Código Pix'}
                 </button>
                 <p className="text-[10px] text-center text-gray-400 mt-2">
                    Cole este código na opção "Pix Copia e Cola" do seu banco.
                 </p>
              </div>
            </div>
          )}

          {/* Troco Input */}
          {formData.paymentMethod === 'Dinheiro' && (
             <div className="animate-in fade-in slide-in-from-top-2 bg-yellow-50 p-4 rounded-xl border border-yellow-100">
                <label className="block text-sm font-bold text-yellow-800 mb-2 flex items-center gap-2"><Calculator size={16} /> Precisa de troco?</label>
                <input 
                  type="text" 
                  className="w-full p-3 border border-yellow-200 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none text-lg font-bold bg-white" 
                  placeholder="Troco para quanto? (Ex: 50,00)" 
                  value={formData.changeFor} 
                  onChange={e => setFormData({...formData, changeFor: e.target.value})} 
                />
                
                {formData.changeFor && (
                   <div className={`mt-3 p-3 rounded-lg flex justify-between items-center ${isInsufficient ? 'bg-red-100 text-red-800' : 'bg-white text-gray-700 border border-gray-100'}`}>
                      <span className="text-sm font-medium">Troco a receber:</span>
                      <span className={`font-bold text-lg ${isInsufficient ? 'text-red-600' : 'text-gray-800'}`}>
                        {isInsufficient ? 'Valor Insuficiente' : formatCurrency(changeAmount)}
                      </span>
                   </div>
                )}
             </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
            <textarea className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none resize-none h-24 bg-white" placeholder="Ex: Tirar cebola, campainha quebrada..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
          </div>

          <div className="fixed bottom-20 left-0 right-0 p-4 bg-white border-t border-gray-100 z-30 shadow-lg">
             <div className="max-w-md mx-auto">
                <div className="flex justify-between items-center mb-4 px-2">
                  <span className="text-gray-600 font-medium">Total a Pagar</span>
                  <span className="text-2xl font-bold" style={{ color: 'var(--color-price)' }}>{formatCurrency(finalTotal)}</span>
                </div>
                <button type="submit" disabled={isSubmitting} className="w-full text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:opacity-90 flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed" style={{ backgroundColor: 'var(--color-primary)' }}>
                    {isSubmitting ? 'Enviando...' : 'Confirmar Pedido'}
                </button>
             </div>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="p-4 pb-32">
      <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--color-text)' }}>Carrinho</h2>
      <div className="space-y-4">
        {cart.map((item) => {
          let hasSizeSelected = false;
          let optionsTotal = 0;
          
          const parsedGroups = typeof (item.optionGroups as any) === 'string' 
            ? JSON.parse(item.optionGroups as any) 
            : (item.optionGroups || []);

          Object.entries(item.selectedOptions).forEach(([groupId, groupOptions]) => {
            const group = parsedGroups.find((g: any) => String(g.id) === String(groupId));
            const isSize = group && Number(group.max) === 1 && (group.required === true || String(group.required) === 'true');
            (groupOptions as ProductOption[]).forEach(opt => {
              if (isSize) {
                hasSizeSelected = true;
              }
              optionsTotal += opt.price;
            });
          });
          const base = hasSizeSelected ? 0 : item.price;
          const itemTotal = base + optionsTotal;
          const mainImage = item.images && item.images.length > 0 ? item.images[0] : 'https://via.placeholder.com/300';

          return (
            <div key={item.cartId} className="flex gap-4 p-4 rounded-xl shadow-sm border border-gray-100" style={{ backgroundColor: 'var(--color-card)' }}>
              <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden shrink-0"><img src={mainImage} alt={item.name} className="w-full h-full object-cover" /></div>
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-gray-800">{item.name}</h3>
                  <div className="text-xs text-gray-500 my-1 space-y-0.5">{(Object.values(item.selectedOptions) as ProductOption[][]).map(group => group.map(opt => <p key={opt.id}>+ {opt.name}</p>))}</div>
                  <p className="font-bold text-sm" style={{ color: 'var(--color-price)' }}>{formatCurrency(itemTotal)}</p>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-1">
                    <button onClick={() => updateQuantity(item.cartId, -1)} className="w-8 h-8 flex items-center justify-center bg-white rounded shadow-sm text-gray-600 active:scale-95"><Minus size={16} /></button>
                    <span className="font-bold w-4 text-center">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.cartId, 1)} className="w-8 h-8 flex items-center justify-center bg-white rounded shadow-sm text-gray-600 active:scale-95"><Plus size={16} /></button>
                  </div>
                  <button onClick={() => removeFromCart(item.cartId)} className="text-red-400 hover:text-red-600 p-2"><Trash2 size={20} /></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="fixed bottom-20 left-0 right-0 p-4 bg-white border-t border-gray-100 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-30">
        <div className="max-w-md mx-auto">
          <div className="flex justify-between items-center mb-4"><span className="text-gray-500 font-medium">Subtotal</span><span className="text-2xl font-bold text-gray-900">{formatCurrency(cartTotal)}</span></div>
          <button onClick={() => setStep('checkout')} className="w-full text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:opacity-90 flex items-center justify-center gap-2 active:scale-95 transition-transform" style={{ backgroundColor: 'var(--color-primary)' }}>Continuar para Entrega <ArrowRight size={20} /></button>
        </div>
      </div>
    </div>
  );
};

export default Cart;