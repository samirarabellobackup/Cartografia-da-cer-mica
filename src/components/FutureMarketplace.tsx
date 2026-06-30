import { useState } from 'react';
import { ShoppingBag, Star, HelpCircle, Sparkles, Filter, Check } from 'lucide-react';
import { Product } from '../types';

const INITIAL_MARKETPLACE_PRODUCTS: Product[] = [
  {
    id: 'mp1',
    name: 'Argila Shiro Creme (Alta Plásticidade) - 10kg',
    price: 48.00,
    photo: 'https://images.unsplash.com/photo-1520406580146-05d83ef31675?auto=format&fit=crop&w=500&q=80',
    category: 'argila',
    description: 'Excelente argila nacional creme para queimas de cone 6 a 10 (1200°C a 1300°C). Ideal para torno elétrico.'
  },
  {
    id: 'mp2',
    name: 'Esmalte Azul Profundo (Celadon Alta) - 500ml',
    price: 72.00,
    photo: 'https://images.unsplash.com/photo-1610905045094-ab6c18f50685?auto=format&fit=crop&w=500&q=80',
    category: 'esmalte',
    description: 'Esmalte líquido pronto para pincelada. Cor azul profundo brilhante com textura transparente em alta temperatura.'
  },
  {
    id: 'mp3',
    name: 'Estrelo Refratário Autoportante',
    price: 18.50,
    photo: 'https://images.unsplash.com/photo-1578500494198-246f612d3b3d?auto=format&fit=crop&w=500&q=80',
    category: 'equipamento',
    description: 'Acessório refratário de cordierita de alta resistência para apoiar peças utilitárias no esmalte durante a queima.'
  },
  {
    id: 'mp4',
    name: 'Ferramenta Mireta de Acabamento Cabo Madeira',
    price: 32.00,
    photo: 'https://images.unsplash.com/photo-1565192647048-f997ded879f9?auto=format&fit=crop&w=500&q=80',
    category: 'ferramenta',
    description: 'Lâmina de aço temperado com cabo ergonômico. Excelente para desbaste de bases (pé) no torno.'
  },
  {
    id: 'mp5',
    name: 'Torno de Bancada CeraMAPA Professional v2',
    price: 3450.00,
    photo: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&w=500&q=80',
    category: 'equipamento',
    description: 'Torno elétrico compacto de alto torque com controle por pedal de velocidade variável, motor 1/2 HP silencioso.'
  },
  {
    id: 'mp6',
    name: 'Forno Elétrico CeraKiln 45L Inteligente',
    price: 8900.00,
    photo: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=500&q=80',
    category: 'forno',
    description: 'Forno monofásico para queimas até 1300°C com controlador digital programável de 10 rampas e patamares.'
  }
];

export default function FutureMarketplace() {
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [addedProductId, setAddedProductId] = useState<string | null>(null);

  const filteredProducts = selectedCategory === 'todos'
    ? INITIAL_MARKETPLACE_PRODUCTS
    : INITIAL_MARKETPLACE_PRODUCTS.filter(p => p.category === selectedCategory);

  const handleBuyClick = (id: string) => {
    setAddedProductId(id);
    setTimeout(() => setAddedProductId(null), 2000);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-6 font-sans">
      
      {/* 1. Header with Concept Description */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-sand-card border border-clay-border text-terracotta">
              <ShoppingBag className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-gray-900 tracking-tight">Especialidades e Mercado (Vitrine)</h2>
              <p className="text-xs text-gray-400">Suprimentos, Ferramentas, Argilas, Esmaltes e Equipamentos Autorizados</p>
            </div>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200/65 px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-[11px] text-amber-900 max-w-sm">
          <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
          <span>Fase 4: Integração total com meios de pagamento para insumos e peças de artesãos locais.</span>
        </div>
      </div>

      {/* 2. Categorical filters */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-gray-100 pb-4 text-xs">
        <span className="text-gray-400 font-medium mr-1.5 flex items-center gap-1">
          <Filter className="w-3.5 h-3.5" /> Filtrar Por:
        </span>
        <button
          onClick={() => setSelectedCategory('todos')}
          className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
            selectedCategory === 'todos' ? 'bg-terracotta text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Ver Todos ({INITIAL_MARKETPLACE_PRODUCTS.length})
        </button>
        <button
          onClick={() => setSelectedCategory('argila')}
          className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
            selectedCategory === 'argila' ? 'bg-terracotta text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Argilas / Massas
        </button>
        <button
          onClick={() => setSelectedCategory('esmalte')}
          className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
            selectedCategory === 'esmalte' ? 'bg-terracotta text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Esmaltes / Corantes
        </button>
        <button
          onClick={() => setSelectedCategory('ferramenta')}
          className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
            selectedCategory === 'ferramenta' ? 'bg-terracotta text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Miretas & Ferramentas
        </button>
        <button
          onClick={() => setSelectedCategory('forno')}
          className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
            selectedCategory === 'forno' ? 'bg-terracotta text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Fornos & Resistências
        </button>
      </div>

      {/* 3. Products Catalog Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
        {filteredProducts.map((p) => (
          <div key={p.id} className="border border-gray-100 rounded-2xl overflow-hidden bg-white hover:shadow-lg transition-all flex flex-col justify-between group">
            
            {/* Product Image Panel */}
            <div className="aspect-[4/3] bg-[#FAF9F5] overflow-hidden relative border-b border-gray-50">
              <img 
                src={p.photo} 
                alt={p.name} 
                className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                referrerPolicy="no-referrer"
              />
              <span className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md border border-gray-100 shadow-sm">
                {p.category}
              </span>
              <span className="absolute bottom-3 right-3 bg-gray-900/90 backdrop-blur-sm text-xs font-black text-amber-400 px-3 py-1 rounded-xl shadow-md font-mono">
                R$ {p.price.toFixed(2)}
              </span>
            </div>

            {/* Product Body details */}
            <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-gray-800 line-clamp-1">{p.name}</h4>
                <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{p.description}</p>
              </div>

              <div className="pt-2 border-t border-gray-50 flex items-center justify-between gap-4">
                <div className="flex items-center gap-0.5">
                  {[1,2,3,4,5].map(star => (
                    <Star key={star} className="w-3 h-3 fill-amber-400 text-amber-400" />
                  ))}
                  <span className="text-[10px] text-gray-400 ml-1 font-sans">4.9</span>
                </div>

                <button
                  id={`buy-product-btn-${p.id}`}
                  onClick={() => handleBuyClick(p.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer ${
                    addedProductId === p.id 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-gray-900 hover:bg-black text-white hover:shadow-md'
                  }`}
                >
                  {addedProductId === p.id ? (
                    <span className="inline-flex items-center gap-1 text-[11px]">
                      <Check className="w-3.5 h-3.5" /> Adicionado
                    </span>
                  ) : (
                    'Comprar Item'
                  )}
                </button>
              </div>
            </div>

          </div>
        ))}
      </div>

      {/* 4. Bottom note */}
      <div className="p-4 bg-[#FAF9F5] border border-gray-100 rounded-xl text-xs text-gray-500 leading-relaxed text-center max-w-2xl mx-auto">
        🛒 <strong>Apoio à Indústria e Escolas Nacionais:</strong> Ateliês e lojas oficiais cadastrados como fornecedores no CeraMapa Brasil possuem prioridade e desconto na divulgação de insumos no catálogo de queimas de cerâmica.
      </div>

    </div>
  );
}
