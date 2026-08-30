import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  setDoc,
  query,
  limit,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { supabase } from '../services/supabase';
import { MenuItem, CartItem, RestaurantInfo, Notification, ProductOption, Category, Order } from '../types';
import { INITIAL_MENU, INITIAL_RESTAURANT_INFO, INITIAL_CATEGORIES } from '../constants';

// Detecta se o erro é de projeto pausado/bloqueado no plano gratuito
function isSupabasePausedError(error: unknown): boolean {
  if (!error) return false;
  const msg = String((error as { message?: string })?.message || error).toLowerCase();
  return (
    msg.includes('unauthorized') ||
    msg.includes('invalid api key') ||
    msg.includes('jwt') ||
    msg.includes('403') ||
    msg.includes('401') ||
    msg.includes('project is paused') ||
    msg.includes('blocked')
  );
}

interface StoreContextType {
  cart: CartItem[];
  addToCart: (item: MenuItem, quantity: number, options: { [groupId: string]: ProductOption[] }) => void;
  removeFromCart: (cartId: string) => void;
  updateQuantity: (cartId: string, delta: number) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
  
  // Dynamic Data
  menuItems: MenuItem[];
  addMenuItem: (item: Omit<MenuItem, 'id'>) => void;
  updateMenuItem: (id: string, updates: Partial<MenuItem>) => void;
  removeMenuItem: (id: string) => void;

  categories: Category[];
  addCategory: (name: string) => void;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  removeCategory: (id: string) => void;
  
  restaurantInfo: RestaurantInfo;
  updateRestaurantInfo: (updates: Partial<RestaurantInfo>) => void;
  
  isAdminMode: boolean;
  toggleAdminMode: () => void;

  // Orders
  orders: Order[];
  addOrder: (order: Omit<Order, 'id' | 'createdAt' | 'status'>) => Promise<string>;
  updateOrderStatus: (id: string, status: Order['status']) => void;

  // Notifications
  notifications: Notification[];
  notify: (message: string, type: 'success' | 'error' | 'info') => void;
  removeNotification: (id: string) => void;
  
  isLoading: boolean;

  // Supabase status
  supabaseError: string | null;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Cart remains Local (Session only)
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('cart');
    return saved ? JSON.parse(saved) : [];
  });

  // State for Database Data
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(INITIAL_MENU);
  const [restaurantInfo, setRestaurantInfo] = useState<RestaurantInfo>(INITIAL_RESTAURANT_INFO);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(!!db || !!supabase);
  const [supabaseError, setSupabaseError] = useState<string | null>(null);

  const [isAdminMode, setIsAdminMode] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Cart Persistence
  useEffect(() => { localStorage.setItem('cart', JSON.stringify(cart)); }, [cart]);

  // Apply Colors
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--color-primary', restaurantInfo.style.primaryColor);
    root.style.setProperty('--color-price', restaurantInfo.style.priceColor);
    root.style.setProperty('--color-bg', restaurantInfo.style.backgroundColor);
    root.style.setProperty('--color-card', restaurantInfo.style.cardColor);
    root.style.setProperty('--color-text', restaurantInfo.style.textColor);
  }, [restaurantInfo.style]);

  // Seed Function (Run only if DB is empty)
  const seedDatabase = async () => {
     if(!db) return;
     try {
         // Set Info
         await setDoc(doc(db, 'settings', 'info'), INITIAL_RESTAURANT_INFO);
         
         // Set Categories
         for(const cat of INITIAL_CATEGORIES) {
             // We use setDoc with specific IDs if we want, or addDoc
             // Here we use the ID from constant to keep links working
             await setDoc(doc(db, 'categories', cat.id), cat);
         }

         // Set Menu Items
         for(const item of INITIAL_MENU) {
             await setDoc(doc(db, 'menuItems', item.id), item);
         }
         console.log("Banco de dados populado com dados iniciais.");
     } catch (e) {
         console.error("Erro ao popular banco:", e);
     }
  };

  // --- DATA LISTENERS (FIREBASE OR SUPABASE) ---
  useEffect(() => {
    if (supabase) {
        // --- SUPABASE LOGIC ---
        let channel: ReturnType<typeof supabase.channel> | null = null;

        const fetchData = async () => {
            try {
                // Test connection with a lightweight query first
                const { error: pingError } = await supabase.from('categorias').select('id').limit(1);

                if (pingError) {
                    // Projeto pausado ou bloqueado no plano gratuito
                    if (isSupabasePausedError(pingError)) {
                        console.warn('⚠️ Supabase pausado/bloqueado. Usando dados locais como fallback.', pingError);
                        setSupabaseError(
                            'Seu banco/API do Supabase foi bloqueado por limite do plano gratuito. ' +
                            'O app está funcionando em modo offline com dados de demonstração. ' +
                            'Para reativar, acesse o painel do Supabase.'
                        );
                        // Keep initial/local data — app still works for customers
                        setIsLoading(false);
                        return;
                    }
                    throw pingError;
                }

                // Connection OK — fetch all data
                const [catsRes, itemsRes, infoRes, ordsRes] = await Promise.all([
                    supabase.from('categorias').select('*'),
                    supabase.from('menuItems').select('*'),
                    supabase.from('settings').select('*').eq('id', 'info').single(),
                    supabase.from('orders').select('*').order('createdAt', { ascending: false }).limit(50),
                ]);

                if (catsRes.data && catsRes.data.length > 0) setCategories(catsRes.data as Category[]);
                if (itemsRes.data && itemsRes.data.length > 0) {
                    // Garantir que optionGroups seja sempre um array de objetos (pode vir como string JSON do Supabase)
                    const parsedItems = itemsRes.data.map((item: any) => ({
                        ...item,
                        optionGroups: (() => {
                            if (!item.optionGroups) return [];
                            if (typeof item.optionGroups === 'string') {
                                try { return JSON.parse(item.optionGroups); } catch { return []; }
                            }
                            return item.optionGroups;
                        })(),
                        images: (() => {
                            if (!item.images) return [];
                            if (typeof item.images === 'string') {
                                try { return JSON.parse(item.images); } catch { return [item.images]; }
                            }
                            return item.images;
                        })(),
                    }));
                    setMenuItems(parsedItems as MenuItem[]);
                }

                if (infoRes.data) {
                    setRestaurantInfo(infoRes.data as RestaurantInfo);
                } else if (!infoRes.error) {
                    // Table exists but no row — seed it
                    await supabase.from('settings').insert({ id: 'info', ...INITIAL_RESTAURANT_INFO });
                }

                if (ordsRes.data) setOrders(ordsRes.data as Order[]);

                // Realtime Subscriptions (only when connection is healthy)
                channel = supabase.channel('db-changes')
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, payload => {
                        if (payload.eventType === 'INSERT') setCategories(prev => [...prev, payload.new as Category]);
                        if (payload.eventType === 'UPDATE') setCategories(prev => prev.map(c => c.id === payload.new.id ? payload.new as Category : c));
                        if (payload.eventType === 'DELETE') setCategories(prev => prev.filter(c => c.id !== payload.old.id));
                    })
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'menuItems' }, payload => {
                        const parseItem = (raw: any): MenuItem => ({
                            ...raw,
                            optionGroups: (() => {
                                if (!raw.optionGroups) return [];
                                if (typeof raw.optionGroups === 'string') { try { return JSON.parse(raw.optionGroups); } catch { return []; } }
                                return raw.optionGroups;
                            })(),
                            images: (() => {
                                if (!raw.images) return [];
                                if (typeof raw.images === 'string') { try { return JSON.parse(raw.images); } catch { return [raw.images]; } }
                                return raw.images;
                            })(),
                        });
                        if (payload.eventType === 'INSERT') setMenuItems(prev => [...prev, parseItem(payload.new)]);
                        if (payload.eventType === 'UPDATE') setMenuItems(prev => prev.map(i => i.id === payload.new.id ? parseItem(payload.new) : i));
                        if (payload.eventType === 'DELETE') setMenuItems(prev => prev.filter(i => i.id !== payload.old.id));
                    })
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, payload => {
                        if (payload.eventType === 'UPDATE' && payload.new.id === 'info') setRestaurantInfo(payload.new as RestaurantInfo);
                    })
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, payload => {
                        if (payload.eventType === 'INSERT') setOrders(prev => [payload.new as Order, ...prev]);
                        if (payload.eventType === 'UPDATE') setOrders(prev => prev.map(o => o.id === payload.new.id ? payload.new as Order : o));
                    })
                    .subscribe();

            } catch (error) {
                console.error('Supabase fetch error:', error);
                if (isSupabasePausedError(error)) {
                    setSupabaseError(
                        'Seu banco/API do Supabase foi bloqueado por limite do plano gratuito. ' +
                        'Acesse supabase.com/dashboard para reativar o projeto.'
                    );
                } else {
                    setSupabaseError('Erro ao conectar com o banco de dados. Usando dados locais.');
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();

        return () => { if (channel) supabase.removeChannel(channel); };

    } else if (db) {
        // --- FIREBASE LOGIC ---
        // 1. Listen to Categories
        const unsubCat = onSnapshot(collection(db, 'categories'), (snapshot) => {
            const cats = snapshot.docs.map(doc => ({ 
                id: doc.id, 
                ...doc.data(),
                active: doc.data().active !== undefined ? doc.data().active : true 
            } as Category));
            setCategories(cats);
        }, (error) => console.error("Erro categorias:", error));

        // 2. Listen to Menu Items
        const unsubMenu = onSnapshot(collection(db, 'menuItems'), (snapshot) => {
            const items = snapshot.docs.map(doc => ({ 
                id: doc.id, 
                ...doc.data(),
                available: doc.data().available !== undefined ? doc.data().available : true
            } as MenuItem));
            setMenuItems(items);
        }, (error) => console.error("Erro menu:", error));

        // 3. Listen to Restaurant Info
        const unsubInfo = onSnapshot(doc(db, 'settings', 'info'), (docSnap) => {
            if (docSnap.exists()) {
                setRestaurantInfo(docSnap.data() as RestaurantInfo);
            } else {
                seedDatabase();
            }
            setIsLoading(false);
        }, (error) => {
            console.error("Erro info:", error);
            setIsLoading(false);
        });

        // 4. Listen to Orders
        const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(50));
        const unsubOrders = onSnapshot(q, (snapshot) => {
            const loadedOrders = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Order));
            setOrders(loadedOrders);
        }, (error) => console.error("Erro orders:", error));

        return () => {
            unsubCat();
            unsubMenu();
            unsubInfo();
            unsubOrders();
        };
    } else {
        // Local Fallback
        return;
    }
  }, []);


  // Notification Helpers
  const notify = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, message, type }]);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // --- ACTIONS (Now with Firebase) ---

  const addToCart = (item: MenuItem, quantity: number, options: { [groupId: string]: ProductOption[] }) => {
    const optionsKey = JSON.stringify(options);
    
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id && JSON.stringify(i.selectedOptions) === optionsKey);
      if (existing) {
        return prev.map(i => i.cartId === existing.cartId ? { ...i, quantity: i.quantity + quantity } : i);
      }
      return [...prev, { ...item, cartId: `${item.id}-${Date.now()}`, quantity, selectedOptions: options }];
    });
    notify('Item adicionado ao carrinho!');
  };

  const removeFromCart = (cartId: string) => setCart(prev => prev.filter(i => i.cartId !== cartId));

  const updateQuantity = (cartId: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.cartId === cartId) {
        return { ...i, quantity: Math.max(0, i.quantity + delta) };
      }
      return i;
    }).filter(i => i.quantity > 0));
  };

  const clearCart = () => setCart([]);

  const cartTotal = cart.reduce((acc, item) => {
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
    return acc + ((base + optionsTotal) * item.quantity);
  }, 0);

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  // --- DATABASE ACTIONS ---

  const addCategory = async (name: string) => {
    const newItem = { name, active: true };
    
    if (supabase && !supabaseError) {
        try {
            const { error } = await supabase.from('categorias').insert(newItem);
            if (error) throw error;
            notify('Categoria criada!');
        } catch { notify('Erro ao criar categoria', 'error'); }
        return;
    }

    if(!db) {
        // Fallback Local
        setCategories(prev => [...prev, { id: Date.now().toString(), ...newItem }]);
        notify('Categoria criada (Modo Offline)!');
        return;
    }
    try {
        await addDoc(collection(db, 'categories'), newItem);
        notify('Categoria criada!');
    } catch { notify('Erro ao criar categoria', 'error'); }
  };

  const updateCategory = async (id: string, updates: Partial<Category>) => {
    // 1. Otimistic Update (Update UI Immediately)
    setCategories(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    
    if (supabase && !supabaseError) {
        try {
            const { error } = await supabase.from('categorias').update(updates).eq('id', id);
            if (error) throw error;
        } catch { notify('Erro ao atualizar', 'error'); }
        return;
    }

    if(!db) return;
    try {
        await updateDoc(doc(db, 'categories', id), updates);
    } catch { 
        notify('Erro ao atualizar', 'error'); 
        // Revert on error could go here
    }
  };

  const removeCategory = async (id: string) => {
    if (menuItems.some(i => i.categoryId === id)) {
      notify('Não é possível excluir categoria com produtos.', 'error');
      return;
    }
    
    // Optimistic Update
    setCategories(prev => prev.filter(c => c.id !== id));

    if (supabase && !supabaseError) {
        try {
            const { error } = await supabase.from('categorias').delete().eq('id', id);
            if (error) throw error;
        } catch { notify('Erro ao excluir', 'error'); }
        return;
    }

    if(!db) return;
    try {
        await deleteDoc(doc(db, 'categories', id));
    } catch { notify('Erro ao excluir', 'error'); }
  };

  const addMenuItem = async (item: Omit<MenuItem, 'id'>) => {
    if (supabase && !supabaseError) {
        try {
            const { error } = await supabase.from('menuItems').insert(item);
            if (error) throw error;
            notify('Produto criado com sucesso!');
        } catch (err: any) { 
            console.error("Erro insert produto:", err);
            notify('Erro ao criar produto', 'error'); 
        }
        return;
    }

    if(!db) {
        setMenuItems(prev => [...prev, { id: Date.now().toString(), ...item }]);
        notify('Produto criado (Modo Offline)!');
        return;
    }
    try {
        await addDoc(collection(db, 'menuItems'), item);
        notify('Produto criado com sucesso!');
    } catch { notify('Erro ao criar produto', 'error'); }
  };

  const updateMenuItem = async (id: string, updates: Partial<MenuItem>) => {
    // Optimistic
    setMenuItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));

    if (supabase && !supabaseError) {
        try {
            const { error } = await supabase.from('menuItems').update(updates).eq('id', id);
            if (error) throw error;
        } catch { notify('Erro ao atualizar produto', 'error'); }
        return;
    }

    if(!db) return;
    try {
        await updateDoc(doc(db, 'menuItems', id), updates);
    } catch { notify('Erro ao atualizar produto', 'error'); }
  };

  const removeMenuItem = async (id: string) => {
    // Optimistic
    setMenuItems(prev => prev.filter(i => i.id !== id));

    if (supabase && !supabaseError) {
        try {
            const { error } = await supabase.from('menuItems').delete().eq('id', id);
            if (error) throw error;
            notify('Produto excluído.', 'info');
        } catch { notify('Erro ao excluir produto', 'error'); }
        return;
    }

    if(!db) return;
    try {
        await deleteDoc(doc(db, 'menuItems', id));
        notify('Produto excluído.', 'info');
    } catch { notify('Erro ao excluir produto', 'error'); }
  };

  const updateRestaurantInfo = async (updates: Partial<RestaurantInfo>) => {
    // Optimistic
    setRestaurantInfo(prev => ({ ...prev, ...updates }));

    if (supabase && !supabaseError) {
        try {
            const { error } = await supabase.from('settings').update(updates).eq('id', 'info');
            if (error) throw error;
            notify('Informações atualizadas!');
        } catch { notify('Erro ao salvar informações', 'error'); }
        return;
    }

    if(!db) return;
    try {
        await updateDoc(doc(db, 'settings', 'info'), updates);
        notify('Informações atualizadas!');
    } catch { notify('Erro ao salvar informações', 'error'); }
  };

  const toggleAdminMode = () => {
    setIsAdminMode(!isAdminMode);
    notify(isAdminMode ? 'Modo Visualização' : 'Modo Admin Ativado', 'info');
  };

  // --- ORDER ACTIONS ---
  const addOrder = async (orderData: Omit<Order, 'id' | 'createdAt' | 'status'>): Promise<string> => {
    if (supabase && !supabaseError) {
        try {
            const { data, error } = await supabase.from('orders').insert({
                ...orderData,
                status: 'pending',
                createdAt: new Date().toISOString()
            }).select().single();
            
            if (error) throw error;
            return data.id;
        } catch (e) {
            console.error("Erro ao criar pedido Supabase:", e);
            notify('Erro ao enviar pedido.', 'error');
            throw e;
        }
    }

    if (!db) {
        notify('Erro: Banco de dados não conectado.', 'error');
        throw new Error("Database not connected");
    }
    
    try {
        const docRef = await addDoc(collection(db, 'orders'), {
            ...orderData,
            status: 'pending',
            createdAt: serverTimestamp()
        });
        return docRef.id;
    } catch (e) {
        console.error("Erro ao criar pedido:", e);
        notify('Erro ao enviar pedido.', 'error');
        throw e;
    }
  };

  const updateOrderStatus = async (id: string, status: Order['status']) => {
    if (supabase && !supabaseError) {
        try {
            const { error } = await supabase.from('orders').update({ status }).eq('id', id);
            if (error) throw error;
            notify(`Status do pedido atualizado para: ${status}`);
        } catch { notify('Erro ao atualizar status.', 'error'); }
        return;
    }

    if (!db) return;
    try {
        await updateDoc(doc(db, 'orders', id), { status });
        notify(`Status do pedido atualizado para: ${status}`);
    } catch {
        notify('Erro ao atualizar status.', 'error');
    }
  };

  return (
    <StoreContext.Provider value={{
      cart,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      cartTotal,
      cartCount,
      menuItems,
      addMenuItem,
      updateMenuItem,
      removeMenuItem,
      categories,
      addCategory,
      updateCategory,
      removeCategory,
      restaurantInfo,
      updateRestaurantInfo,
      isAdminMode,
      toggleAdminMode,
      notifications,
      notify,
      removeNotification,
      isLoading,
      orders,
      addOrder,
      updateOrderStatus,
      supabaseError,
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used within StoreProvider");
  return context;
};