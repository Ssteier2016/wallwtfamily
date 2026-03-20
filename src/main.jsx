import React, { useState, useEffect, useMemo } from 'react';
import { 
  Wallet, 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  DollarSign, 
  Users, 
  ChevronRight, 
  X, 
  Share2, 
  Globe,
  Mail,
  Hash,
  Utensils,
  Home,
  Zap,
  Car,
  HeartPulse,
  Gamepad2,
  GraduationCap,
  MoreHorizontal,
  Banknote,
  ShoppingCart,
  Gift,
  Briefcase,
  BarChart3
} from 'lucide-react';

const CATEGORY_MAP = {
  'Sueldo': { icon: Banknote, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  'Ventas': { icon: ShoppingCart, color: 'text-blue-600', bg: 'bg-blue-50' },
  'Inversiones': { icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  'Regalo': { icon: Gift, color: 'text-pink-600', bg: 'bg-pink-50' },
  'Otros_in': { icon: MoreHorizontal, color: 'text-slate-600', bg: 'bg-slate-50' },
  'Comida': { icon: Utensils, color: 'text-orange-600', bg: 'bg-orange-50' },
  'Alquiler': { icon: Home, color: 'text-violet-600', bg: 'bg-violet-50' },
  'Servicios': { icon: Zap, color: 'text-yellow-600', bg: 'bg-yellow-50' },
  'Transporte': { icon: Car, color: 'text-blue-600', bg: 'bg-blue-50' },
  'Salud': { icon: HeartPulse, color: 'text-red-600', bg: 'bg-red-50' },
  'Ocio': { icon: Gamepad2, color: 'text-purple-600', bg: 'bg-purple-50' },
  'Educación': { icon: GraduationCap, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  'Otros': { icon: MoreHorizontal, color: 'text-slate-600', bg: 'bg-slate-50' }
};

const CATEGORIES = {
  income: ['Sueldo', 'Ventas', 'Inversiones', 'Regalo', 'Otros_in'],
  expense: ['Comida', 'Alquiler', 'Servicios', 'Transporte', 'Salud', 'Ocio', 'Educación', 'Otros']
};

const VIEW_TYPES = [
  { id: 'day', label: 'Día' },
  { id: 'week', label: 'Semana' },
  { id: 'month', label: 'Mes' },
  { id: 'year', label: 'Año' }
];

const CURRENCY_MODES = [
  { id: 'ARS', label: 'Pesos (ARS)' },
  { id: 'USD', label: 'Dólares (USD)' },
  { id: 'BOTH', label: 'Ambos' }
];

// --- Componente de Gráfico de Barras REAL ---
const TrendChart = ({ data, currencyMode }) => {
  if (!data || data.length === 0) return null;

  const width = 400;
  const height = 180;
  const padding = 30;

  // Encontrar el valor máximo absoluto para escalar las barras
  const maxVal = Math.max(...data.flatMap(d => [d.income, d.expense]), 1000);
  
  const barWidth = (width - padding * 2) / data.length;

  return (
    <div className="w-full bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm overflow-hidden">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
          <BarChart3 size={14} className="text-indigo-500" /> Comparativa de Flujo Real
        </h3>
        <div className="flex gap-3">
           <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"/> <span className="text-[10px] text-slate-400 font-bold uppercase">In</span></div>
           <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-rose-500"/> <span className="text-[10px] text-slate-400 font-bold uppercase">Out</span></div>
        </div>
      </div>
      
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
        {/* Líneas de cuadrícula horizontales */}
        {[0, 0.5, 1].map((p) => (
          <line 
            key={p} 
            x1={padding} 
            y1={height - padding - (p * (height - padding * 2))} 
            x2={width - padding} 
            y2={height - padding - (p * (height - padding * 2))} 
            stroke="#f1f5f9" 
            strokeWidth="1" 
          />
        ))}

        {data.map((d, i) => {
          const xBase = padding + i * barWidth;
          const innerGap = 4;
          const subBarWidth = (barWidth - innerGap * 3) / 2;
          
          const incomeHeight = (d.income / maxVal) * (height - padding * 2);
          const expenseHeight = (d.expense / maxVal) * (height - padding * 2);

          return (
            <g key={i}>
              {/* Barra de Ingreso */}
              <rect
                x={xBase + innerGap}
                y={height - padding - incomeHeight}
                width={subBarWidth}
                height={incomeHeight}
                fill="#10b981"
                rx="4"
              />
              {/* Barra de Gasto */}
              <rect
                x={xBase + innerGap * 2 + subBarWidth}
                y={height - padding - expenseHeight}
                width={subBarWidth}
                height={expenseHeight}
                fill="#f43f5e"
                rx="4"
              />
              {/* Etiqueta de tiempo (X) */}
              <text 
                x={xBase + barWidth / 2} 
                y={height - 10} 
                textAnchor="middle" 
                className="text-[9px] fill-slate-400 font-bold uppercase"
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

const CategoryIcon = ({ category, className = "w-5 h-5" }) => {
  const cat = CATEGORY_MAP[category] || CATEGORY_MAP['Otros'];
  const IconComp = cat.icon;
  return <IconComp className={`${className} ${cat.color}`} />;
};

export default function App() {
  const [transactions, setTransactions] = useState([
    { id: 1, type: 'income', amount: 850000, category: 'Sueldo', date: '2024-05-01', note: 'Pago mensual' },
    { id: 2, type: 'expense', amount: 45000, category: 'Comida', date: '2024-05-05', note: 'Supermercado' },
    { id: 3, type: 'expense', amount: 12000, category: 'Servicios', date: '2024-05-10', note: 'Internet' },
    { id: 4, type: 'expense', amount: 25000, category: 'Ocio', date: '2024-05-15', note: 'Cine' },
    { id: 5, type: 'income', amount: 150000, category: 'Ventas', date: '2024-05-20', note: 'Venta notebook' },
    { id: 6, type: 'expense', amount: 60000, category: 'Comida', date: '2024-05-25', note: 'Cena' },
  ]);
  
  const [viewType, setViewType] = useState('month');
  const [currencyMode, setCurrencyMode] = useState('ARS');
  const [usdRate, setUsdRate] = useState(1000);
  const [isLoadingUsd, setIsLoadingUsd] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [activeTab, setActiveTab] = useState('income');

  useEffect(() => {
    const fetchUsd = async (retryCount = 0) => {
      try {
        const res = await fetch('https://dolarapi.com/v1/dolares/blue');
        const data = await res.json();
        if (data.venta) {
          setUsdRate(data.venta);
          setIsLoadingUsd(false);
        }
      } catch (err) {
        if (retryCount < 5) {
          const delay = Math.pow(2, retryCount) * 1000;
          setTimeout(() => fetchUsd(retryCount + 1), delay);
        } else {
          setIsLoadingUsd(false);
        }
      }
    };
    fetchUsd();
  }, []);

  // --- Lógica de filtrado ---
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    return transactions.filter(t => {
      const tDate = new Date(t.date);
      if (viewType === 'day') return tDate.toDateString() === now.toDateString();
      if (viewType === 'week') {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(now.getDate() - 7);
        return tDate >= oneWeekAgo;
      }
      if (viewType === 'month') return tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear();
      if (viewType === 'year') return tDate.getFullYear() === now.getFullYear();
      return true;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [transactions, viewType]);

  // --- Lógica de Agrupación para el Gráfico Real ---
  const barData = useMemo(() => {
    const now = new Date();
    const rate = currencyMode === 'USD' ? usdRate : 1;
    let groups = [];

    if (viewType === 'day') {
      // Agrupar por bloques de 4 horas
      groups = [
        { label: '04h', income: 0, expense: 0, start: 0, end: 4 },
        { label: '08h', income: 0, expense: 0, start: 4, end: 8 },
        { label: '12h', income: 0, expense: 0, start: 8, end: 12 },
        { label: '16h', income: 0, expense: 0, start: 12, end: 16 },
        { label: '20h', income: 0, expense: 0, start: 16, end: 20 },
        { label: '24h', income: 0, expense: 0, start: 20, end: 24 },
      ];
      filteredTransactions.forEach(t => {
        const h = new Date(t.date).getHours();
        const g = groups.find(group => h >= group.start && h < group.end);
        if (g) {
          if (t.type === 'income') g.income += t.amount / rate;
          else g.expense += t.amount / rate;
        }
      });
    } else if (viewType === 'week') {
      const days = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
      groups = days.map(d => ({ label: d, income: 0, expense: 0 }));
      filteredTransactions.forEach(t => {
        const d = new Date(t.date).getDay();
        if (t.type === 'income') groups[d].income += t.amount / rate;
        else groups[d].expense += t.amount / rate;
      });
    } else if (viewType === 'month') {
      groups = [
        { label: 'Sem 1', income: 0, expense: 0 },
        { label: 'Sem 2', income: 0, expense: 0 },
        { label: 'Sem 3', income: 0, expense: 0 },
        { label: 'Sem 4', income: 0, expense: 0 },
      ];
      filteredTransactions.forEach(t => {
        const d = new Date(t.date).getDate();
        const idx = Math.min(Math.floor((d - 1) / 7), 3);
        if (t.type === 'income') groups[idx].income += t.amount / rate;
        else groups[idx].expense += t.amount / rate;
      });
    } else {
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      groups = months.map(m => ({ label: m, income: 0, expense: 0 }));
      filteredTransactions.forEach(t => {
        const m = new Date(t.date).getMonth();
        if (t.type === 'income') groups[m].income += t.amount / rate;
        else groups[m].expense += t.amount / rate;
      });
    }

    return groups;
  }, [filteredTransactions, viewType, currencyMode, usdRate]);

  const totals = useMemo(() => {
    return filteredTransactions.reduce((acc, t) => {
      if (t.type === 'income') acc.income += t.amount;
      else acc.expense += t.amount;
      acc.balance = acc.income - acc.expense;
      return acc;
    }, { income: 0, expense: 0, balance: 0 });
  }, [filteredTransactions]);

  const formatCurrency = (val, mode = currencyMode) => {
    const formatARS = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n);
    const formatUSD = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n / usdRate);

    if (mode === 'ARS') return formatARS(val);
    if (mode === 'USD') return formatUSD(val);
    return (
      <div className="flex flex-col items-end leading-tight">
        <span className="text-sm font-bold">{formatARS(val)}</span>
        <span className="text-[10px] text-slate-400">u$s {(val / usdRate).toFixed(2)}</span>
      </div>
    );
  };

  const addTransaction = (newT) => {
    setTransactions([...transactions, { ...newT, id: Date.now() }]);
    setShowAddModal(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-24">
      <header className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-xl text-white">
              <Wallet size={20} />
            </div>
            <h1 className="font-bold text-lg tracking-tight">FamilyWallet</h1>
          </div>
          
          <div className="flex items-center gap-3">
            {isLoadingUsd ? (
              <div className="h-4 w-16 bg-slate-100 animate-pulse rounded" />
            ) : (
              <div className="bg-green-50 text-green-700 px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 border border-green-100 uppercase">
                <Globe size={12} /> Blue: ${usdRate}
              </div>
            )}
            <button onClick={() => setShowShareModal(true)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
              <Users size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-6">
        
        {/* Resumen de Balance */}
        <section className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Balance Actual</p>
                <div className="text-4xl font-black tracking-tighter">
                   {typeof formatCurrency(totals.balance) === 'string' ? formatCurrency(totals.balance) : 
                    <div className="flex flex-col">
                      <span>{new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(totals.balance)}</span>
                      <span className="text-lg opacity-40 font-medium tracking-normal">u$s {(totals.balance / usdRate).toFixed(2)}</span>
                    </div>
                   }
                </div>
              </div>
              <div className="bg-white/10 p-2 rounded-2xl backdrop-blur-md">
                <Calendar size={20} className="text-slate-300" />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-10">
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-3xl">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Ingresos</p>
                </div>
                <p className="text-lg font-bold">{currencyMode === 'BOTH' ? `$${totals.income.toLocaleString()}` : formatCurrency(totals.income)}</p>
              </div>
              <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-3xl">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 bg-rose-500 rounded-full" />
                  <p className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">Gastos</p>
                </div>
                <p className="text-lg font-bold text-rose-100">{currencyMode === 'BOTH' ? `$${totals.expense.toLocaleString()}` : formatCurrency(totals.expense)}</p>
              </div>
            </div>
          </div>
          <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-indigo-600/20 rounded-full blur-[80px]" />
        </section>

        {/* --- GRÁFICO DE BARRAS --- */}
        <TrendChart 
          data={barData} 
          currencyMode={currencyMode} 
          usdRate={usdRate} 
        />

        {/* Controles de Vista */}
        <section className="space-y-4">
          <div className="flex flex-col gap-3">
            <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200">
              {VIEW_TYPES.map(vt => (
                <button
                  key={vt.id}
                  onClick={() => setViewType(vt.id)}
                  className={`flex-1 py-2 px-1 rounded-xl text-xs font-bold transition-all ${viewType === vt.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {vt.label}
                </button>
              ))}
            </div>
            <div className="flex bg-slate-200/50 p-1 rounded-xl">
              {CURRENCY_MODES.map(cm => (
                <button
                  key={cm.id}
                  onClick={() => setCurrencyMode(cm.id)}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${currencyMode === cm.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                >
                  {cm.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Lista de Movimientos */}
        <section className="space-y-4">
          <h2 className="font-black text-slate-800 text-sm uppercase tracking-widest px-1">Actividad Reciente</h2>
          <div className="space-y-3">
            {filteredTransactions.length > 0 ? (
              filteredTransactions.map(t => {
                const catInfo = CATEGORY_MAP[t.category] || CATEGORY_MAP['Otros'];
                return (
                  <div key={t.id} className="bg-white p-4 rounded-[2rem] border border-slate-100 flex items-center justify-between hover:shadow-md transition-all shadow-sm group">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-3xl flex items-center justify-center ${catInfo.bg} transition-transform group-hover:scale-105`}>
                        <CategoryIcon category={t.category} className="w-7 h-7" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-sm leading-tight">{t.note || t.category}</h3>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1 font-medium">
                          <span className="bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100 uppercase tracking-tighter">{t.category}</span>
                          <span>•</span>
                          <span>{new Date(t.date).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-black text-base tracking-tighter ${t.type === 'income' ? 'text-emerald-600' : 'text-slate-900'}`}>
                        {t.type === 'expense' && '-'}{formatCurrency(t.amount)}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-20 text-center space-y-4 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
                <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto text-slate-300">
                  <Calendar size={32} />
                </div>
                <p className="text-slate-400 text-sm font-medium">No hay registros en este periodo</p>
              </div>
            )}
          </div>
        </section>
      </main>

      <button onClick={() => setShowAddModal(true)} className="fixed bottom-8 right-8 w-16 h-16 bg-indigo-600 text-white rounded-full shadow-2xl shadow-indigo-300 flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-40 border-4 border-white">
        <Plus size={32} strokeWidth={3} />
      </button>

      {/* Modales */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-t-[3rem] sm:rounded-[3rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-slate-800">Nuevo Registro</h2>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">Completa los datos</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-3 bg-slate-50 text-slate-400 rounded-full transition-colors"><X size={20}/></button>
            </div>
            <form className="p-8 space-y-6" onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              addTransaction({
                type: activeTab,
                amount: parseFloat(formData.get('amount')),
                category: formData.get('category'),
                date: formData.get('date'),
                note: formData.get('note')
              });
            }}>
              <div className="flex gap-3 p-1.5 bg-slate-100 rounded-2xl">
                <button type="button" onClick={() => setActiveTab('income')} className={`flex-1 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${activeTab === 'income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>Ingreso</button>
                <button type="button" onClick={() => setActiveTab('expense')} className={`flex-1 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${activeTab === 'expense' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400'}`}>Gasto</button>
              </div>
              <div className="space-y-2 text-center">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Monto en ARS</label>
                <input name="amount" type="number" step="0.01" required autoFocus className="w-full text-center py-4 bg-transparent text-5xl font-black text-slate-900 outline-none" placeholder="0" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Categoría</label>
                  <select name="category" className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none text-sm font-bold appearance-none">
                    {CATEGORIES[activeTab].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha</label>
                  <input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none text-sm font-bold" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nota</label>
                <input name="note" type="text" className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none text-sm font-medium" placeholder="Escribe un detalle..." />
              </div>
              <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all mt-4">Guardar Registro</button>
            </form>
          </div>
        </div>
      )}

      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden p-8 space-y-8 animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="bg-orange-100 p-3 rounded-2xl text-orange-600"><Share2 size={28} /></div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight">Compartir</h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Gestión Familiar</p>
                </div>
              </div>
              <button onClick={() => setShowShareModal(false)} className="p-3 bg-slate-50 text-slate-400 rounded-full hover:text-slate-600"><X size={20}/></button>
            </div>
            <div className="space-y-6">
              <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-dashed border-slate-200 text-center uppercase">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Tu Código de Familia</p>
                <div className="text-3xl font-black tracking-[0.2em] text-indigo-600 transition-transform">FA-X89-2024</div>
              </div>
              <div className="space-y-3">
                <button className="w-full flex items-center justify-center gap-3 bg-white border-2 border-slate-100 py-4 rounded-2xl font-black text-xs uppercase tracking-widest">
                  <img src="https://www.google.com/favicon.ico" alt="google" className="w-4 h-4" /> Invitación Google
                </button>
                <div className="flex gap-3">
                  <button className="flex-1 flex flex-col items-center gap-2 bg-indigo-50 text-indigo-600 p-4 rounded-3xl font-black text-[10px] uppercase tracking-widest border border-indigo-100"><Mail size={24} /> Email</button>
                  <button className="flex-1 flex flex-col items-center gap-2 bg-slate-900 text-white p-4 rounded-3xl font-black text-[10px] uppercase tracking-widest"><Hash size={24} /> Código</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
