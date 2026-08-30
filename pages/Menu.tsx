import React, { useState, useEffect, useRef } from 'react';
import { Flame } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { ProductCard } from '../components/ProductCard';
import { PratoDoDiaCard } from '../components/PratoDoDiaCard';

const Menu = () => {
  const { menuItems, categories } = useStore();

  // Prato do dia: disponível e marcado como prato do dia
  const pratoDoDia = menuItems.find(item => item.isPratoDoDia && item.available) || null;

  // Filter active categories
  const activeCategories = categories.filter(c => c.active);

  // IDs iniciais: se houver prato do dia, adiciona seção especial no início
  const allSections = pratoDoDia
    ? [{ id: '__prato_do_dia__', name: '⭐ Prato do Dia' }, ...activeCategories]
    : activeCategories;

  const [activeCategory, setActiveCategory] = useState(allSections[0]?.id || '');

  // Atualiza categoria ativa ao rolar
  const sectionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          const id = visible[0].target.getAttribute('data-section-id');
          if (id) setActiveCategory(id);
        }
      },
      { rootMargin: '-30% 0px -60% 0px', threshold: 0 }
    );

    Object.values(sectionRefs.current).forEach(el => { if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [menuItems, categories]);

  // Scroll category into view when clicked
  const handleCategoryClick = (id: string) => {
    setActiveCategory(id);
    const element = document.getElementById(`category-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="pt-4">
      <h2 className="text-2xl font-bold px-4 mb-4" style={{ color: 'var(--color-text)' }}>Cardápio</h2>

      {/* Category Sticky Header */}
      <div className="sticky top-0 z-40 py-2 border-b border-gray-100 shadow-sm" style={{ backgroundColor: 'var(--color-bg)', opacity: 0.97 }}>
        <div className="flex overflow-x-auto no-scrollbar px-4 gap-2 pb-2">
          {allSections.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryClick(cat.id)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5`}
              style={{
                backgroundColor: activeCategory === cat.id
                  ? (cat.id === '__prato_do_dia__' ? '#DC2626' : 'var(--color-primary)')
                  : (cat.id === '__prato_do_dia__' ? '#fee2e2' : '#e5e7eb'),
                color: activeCategory === cat.id
                  ? '#ffffff'
                  : (cat.id === '__prato_do_dia__' ? '#DC2626' : '#374151'),
              }}
            >
              {cat.id === '__prato_do_dia__' && <Flame size={13} />}
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-8 pb-20">
        {/* Prato do Dia Section */}
        {pratoDoDia && (
          <div
            id="category-__prato_do_dia__"
            data-section-id="__prato_do_dia__"
            className="scroll-mt-32"
            ref={el => { sectionRefs.current['__prato_do_dia__'] = el; }}
          >
            {/* Section header */}
            <div className="flex items-center gap-2 mb-3">
              <span className="w-1 h-6 rounded-full" style={{ backgroundColor: '#DC2626' }} />
              <h3 className="text-xl font-black" style={{ color: 'var(--color-text)' }}>
                Prato do Dia
              </h3>
              <span className="ml-1 flex items-center gap-1 bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                <Flame size={9} /> Destaque
              </span>
            </div>

            <PratoDoDiaCard item={pratoDoDia} />
          </div>
        )}

        {/* Regular Categories */}
        {activeCategories.map((category) => {
          const items = menuItems.filter(item =>
            item.categoryId === category.id &&
            item.available &&
            !item.isPratoDoDia   // evita duplicar o prato do dia dentro da categoria
          );
          if (items.length === 0) return null;

          return (
            <div
              key={category.id}
              id={`category-${category.id}`}
              data-section-id={category.id}
              className="scroll-mt-32"
              ref={el => { sectionRefs.current[category.id] = el; }}
            >
              <h3 className="text-xl font-bold mb-4 flex items-center" style={{ color: 'var(--color-text)' }}>
                <span className="w-1 h-6 rounded-full mr-2" style={{ backgroundColor: 'var(--color-primary)' }} />
                {category.name}
              </h3>
              <div className="grid grid-cols-1 gap-6">
                {items.map((item) => (
                  <ProductCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Menu;