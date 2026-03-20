import React, { useState, useEffect, useMemo } from 'react';
import { 
  Wallet, 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  DollarSign, 
  Users, 
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
  BarChart3,
  Settings,
  PlusSquare,
  Coffee,
  ShoppingBag,
  Plane,
  Smartphone,
  Trophy,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

// Registro de componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// --- Galería de Iconos ---
const ICON_GALLERY = [
  { id: 'Utensils', icon: Utensils },
  { id: 'Home', icon: Home },
  { id: 'Zap', icon: Zap },
  { id: 'Car', icon: Car },
  { id: 'HeartPulse', icon: HeartPulse },
  { id: 'Gamepad2', icon: Gamepad2 },
  { id: 'GraduationCap', icon: GraduationCap },
  { id: 'Banknote', icon: Banknote },
  { id: 'ShoppingCart', icon: ShoppingCart },
  { id: 'Gift', icon: Gift },
  { id: 'Briefcase', icon: Briefcase },
  { id: 'Coffee', icon: Coffee },
  { id: 'ShoppingBag', icon: ShoppingBag },
  { id: 'Plane', icon: Plane },
  { id: 'Smartphone', icon: Smartphone },
  { id: 'Trophy', icon: Trophy },
  { id: 'MoreHorizontal', icon: MoreHorizontal }
];

export default function App() {
  // --- Estados de Datos ---
  const [transactions, setTransactions] = useState([
    { id: 1, type: 'income', amount: 950000, category: 'Sueldo', date: '2024-05-01', note: 'Mayo' },
    { id: 2, type: 'expense', amount: 50000, category: 'Comida', date: '2024-05-05', note: 'Supermercado' },
    { id: 3, type: 'expense', amount: 15000, category: 'Servicios', date: '2024-05-12', note: 'Luz' },
  ]);

  const [categories, setCategories] = useState({
    income: [
      { id: 'Sueldo', name: 'Sueldo', icon: 'Banknote', color: 'text-emerald-600', bg: 'bg-emerald-50' },
      { id: 'Ventas', name: 'Ventas', icon: 'ShoppingCart', color: 'text-blue-600', bg: 'bg-blue-50' },
      { id: 'Inversiones', name: 'Inversiones', icon: 'TrendingUp', color: 'text-indigo-600', bg: 'bg-indigo-50' },
    ],
    expense: [
      { id: 'Comida', name: 'Comida', icon: 'Utensils', color: 'text-orange-600', bg: 'bg-orange-50' },
      { id: 'Alquiler', name: 'Alquiler', icon: 'Home', color: 'text-violet-600', bg: 'bg-violet-50' },
      { id: 'Servicios', name: 'Servicios', icon: 'Zap', color: 'text-yellow-600', bg: 'bg-yellow-50' },
    ]
  });

  // --- Estados de Interfaz ---
  const [viewType, setViewType] = useState('month');
  const [currencyMode, setCurrencyMode] = useState('ARS');
  const [usdRate, setUsdRate] = useState(1000);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [activeTab, setActiveTab] = useState('income');
  const [newCatIcon, setNewCatIcon] = useState('PlusSquare');

  // --- Fetch API Dólar ---
  useEffect(() => {
    fetch('https://dolarapi.com/v1/dolares/blue')
      .then(res => res.json())
      .then(data => { if (data.venta) setUsdRate(data.venta); })
      .catch(() => console.warn("Usando tasa de cambio manual"));
  }, []);

  // --- Lógica de Gráfico de Barras Real ---
  const chartData = useMemo(() => {
    const now = new Date();
    let labels = [];
    let incomes = [];
    let expenses = [];

    if (viewType === 'month') {
      labels = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'];
      const weeklyData = [0, 0, 0, 0].map(() => ({ in: 0, out: 0 }));
      transactions.forEach(t => {
        const d = new Date(t.date);
        if (d.getMonth() === now.getMonth()) {
          const weekIdx = Math.min(Math.floor((d.getDate() - 1) / 7), 3);
          const val = t.amount / (currencyMode === 'USD' ? usdRate : 1);
          if (t.type === 'income') weeklyData[weekIdx].in += val;
          else weeklyData[weekIdx].out += val;
        }
      });
      incomes = weeklyData.map(d => d.in);
      expenses = weeklyData.map(d => d.out);
    } else {
      labels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const monthlyData = Array(12).fill(0).map(() => ({ in: 0, out: 0 }));
      transactions.forEach(t => {
        const d = new Date(t.date);
        if (d.getFullYear() === now.getFullYear()) {
          const monthIdx = d.getMonth();
          const val = t.amount / (currencyMode === 'USD' ? usdRate : 1);
          if (t.type === 'income') monthlyData[monthIdx].in += val;
          else monthlyData[monthIdx].out += val;
        }
      });
      incomes = monthlyData.map(d => d.in);
      expenses = monthlyData.map(d => d.out);
    }

    return {
      labels,
      datasets: [
        { label: 'Ingresos', data: incomes, backgroundColor: '#10b981', borderRadius: 8 },
        { label: 'Gastos', data: expenses, backgroundColor: '#f43f5e', borderRadius: 8 }
      ]
    };
  }, [transactions, viewType, currencyMode, usdRate]);

  // --- Handlers ---
  const handleSaveTransaction = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = {
      id: editingTransaction ? editingTransaction.id : Date.now(),
      type: activeTab,
      amount: parseFloat(fd.get('amount')),
      category: fd.get('category'),
      date: fd.get('date'),
      note: fd.get('note')
    };

    if (editingTransaction) {
      setTransactions(transactions.map(t => t.id === data.id ? data : t));
    } else {
      setTransactions([data, ...transactions]);
    }
    setShowAddModal(false);
    setEditingTransaction(null);
  };

  const deleteTransaction = (id) => {
    setTransactions(transactions.filter(t => t.id !== id));
  };

  const editTransaction = (t) => {
    setEditingTransaction(t);
    setActiveTab(t.type);
    setShowAddModal(true);
  };

  const totals = useMemo(() => {
    return transactions.reduce((acc, t) => {
      if (t.type === 'income') acc.income += t.amount;
      else acc.expense += t.amount;
      acc.balance = acc.income - acc.expense;
      return acc;
    }, { income: 0, expense: 0, balance: 0 });
  }, [transactions]);

  const formatCurrency = (val) => {
    const ars = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(val);
    const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val / usdRate);
    if (currencyMode === 'ARS') return ars;
    if (currencyMode === 'USD') return usd;
    return (
      <div className="flex flex-col items-end leading-tight">
        <span className="text-sm font-bold">{ars}</span>
        <span className="text-[10px] text-slate-400">u$s {(val / usdRate).toFixed(2)}</span>
      </div>
    );
  };

  const getIcon = (iconName) => {
    const item = ICON_GALLERY.find(i => i.id === iconName) || ICON_GALLERY[ICON_GALLERY.length-1];
    const IconComp = item.icon;
    return <IconComp size={20} />;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24 font-sans selection:bg-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-30 px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-2 rounded-xl text-white"><Wallet size={20} /></div>
          <h1 className="font-black text-lg tracking-tighter">FamilyWallet</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden md:flex bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black border border-emerald-100 uppercase tracking-widest">
            Blue: ${usdRate}
          </div>
          <button onClick={() => setShowCatModal(true)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><Settings size={20} /></button>
          <button onClick={() => setShowShareModal(true)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><Users size={20} /></button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 md:p-8 space-y-8">
        {/* Balance Card */}
        <section className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-slate-400 text-xs font-black uppercase tracking-[0.2em] mb-2 opacity-60">Balance Total</p>
            <div className="text-5xl font-black tracking-tighter mb-8">{formatCurrency(totals.balance)}</div>
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white/5 border border-white/10 p-5 rounded-3xl backdrop-blur-sm">
                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Ingresos</p>
                <p className="text-xl font-bold">{formatCurrency(totals.income)}</p>
              </div>
              <div className="bg-white/5 border border-white/10 p-5 rounded-3xl backdrop-blur-sm">
                <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">Gastos</p>
                <p className="text-xl font-bold">{formatCurrency(totals.expense)}</p>
              </div>
            </div>
          </div>
          <div className="absolute top-[-20%] right-[-10%] w-80 h-80 bg-indigo-600/20 rounded-full blur-[100px]" />
        </section>

        {/* Chart Section */}
        <section className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-black text-xs uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <BarChart3 size={16} className="text-indigo-600" /> Historial Comparativo
            </h3>
            <div className="flex bg-slate-100 p-1 rounded-xl text-[10px]">
               <button onClick={() => setViewType('month')} className={`px-3 py-1 rounded-lg font-bold ${viewType === 'month' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>Mes</button>
               <button onClick={() => setViewType('year')} className={`px-3 py-1 rounded-lg font-bold ${viewType === 'year' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>Año</button>
            </div>
          </div>
          <div className="h-64">
            <Bar 
              data={chartData} 
              options={{ 
                responsive: true, 
                maintainAspectRatio: false, 
                plugins: { legend: { display: false } },
                scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { font: { size: 10 } } } }
              }} 
            />
          </div>
        </section>

        {/* Filtros de Moneda */}
        <div className="flex justify-center">
           <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
              {['ARS', 'USD', 'BOTH'].map(mode => (
                <button 
                  key={mode}
                  onClick={() => setCurrencyMode(mode)}
                  className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${currencyMode === mode ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {mode === 'BOTH' ? 'Doble' : mode}
                </button>
              ))}
           </div>
        </div>

        {/* Transactions List */}
        <section className="space-y-4">
          <h2 className="font-black text-slate-800 text-sm uppercase tracking-[0.3em] px-2">Movimientos</h2>
          <div className="space-y-3">
            {transactions.map(t => {
              const cat = [...categories.income, ...categories.expense].find(c => c.name === t.category);
              return (
                <div key={t.id} className="group bg-white p-5 rounded-[2.5rem] border border-slate-100 flex items-center justify-between shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center gap-5">
                    <div className={`w-14 h-14 rounded-3xl flex items-center justify-center ${cat?.bg || 'bg-slate-100'} ${cat?.color || 'text-slate-600'} transition-transform group-hover:scale-105`}>
                      {getIcon(cat?.icon || 'MoreHorizontal')}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800">{t.note || t.category}</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t.category} • {t.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right font-black text-lg tracking-tighter">
                      {t.type === 'expense' && '-'}{formatCurrency(t.amount)}
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => editTransaction(t)} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-xl transition-colors"><Pencil size={18} /></button>
                      <button onClick={() => deleteTransaction(t.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"><Trash2 size={18} /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* FAB */}
      <button 
        onClick={() => { setEditingTransaction(null); setShowAddModal(true); }}
        className="fixed bottom-8 right-8 w-18 h-18 bg-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-40 border-4 border-white p-5"
      >
        <Plus size={36} strokeWidth={3} />
      </button>

      {/* MODAL: REGISTRO / EDICIÓN */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-t-[3.5rem] sm:rounded-[3.5rem] shadow-2xl p-10 space-y-8 animate-in slide-in-from-bottom duration-500">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black tracking-tight">{editingTransaction ? 'Editar Registro' : 'Nuevo Movimiento'}</h2>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Completa los campos debajo</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-3 bg-slate-50 text-slate-400 rounded-full hover:bg-slate-100 transition-colors"><X size={24}/></button>
            </div>
            
            <form onSubmit={handleSaveTransaction} className="space-y-6">
              <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                <button type="button" onClick={() => setActiveTab('income')} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>Ingreso</button>
                <button type="button" onClick={() => setActiveTab('expense')} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'expense' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400'}`}>Gasto</button>
              </div>

              <div className="text-center py-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Importe (ARS)</label>
                <input name="amount" type="number" step="0.01" required autoFocus defaultValue={editingTransaction?.amount || ''} className="w-full text-center text-6xl font-black bg-transparent outline-none placeholder:text-slate-100" placeholder="0" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Categoría</label>
                  <select name="category" defaultValue={editingTransaction?.category || categories[activeTab][0].name} className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold text-sm appearance-none border-2 border-transparent focus:border-indigo-500 transition-all">
                    {categories[activeTab].map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha</label>
                  <input name="date" type="date" required defaultValue={editingTransaction?.date || new Date().toISOString().split('T')[0]} className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold text-sm border-2 border-transparent focus:border-indigo-500 transition-all" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Concepto o Nota</label>
                <input name="note" type="text" defaultValue={editingTransaction?.note || ''} placeholder="Ej: Pago de luz..." className="w-full p-4 bg-slate-50 rounded-2xl outline-none text-sm font-medium border-2 border-transparent focus:border-indigo-500 transition-all" />
              </div>

              <button type="submit" className="w-full bg-slate-900 text-white py-6 rounded-[2.5rem] font-black uppercase tracking-widest shadow-2xl shadow-slate-200 hover:bg-slate-800 transition-all">
                {editingTransaction ? 'Actualizar Registro' : 'Confirmar Movimiento'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CATEGORÍAS */}
      {showCatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in zoom-in-95 duration-300">
          <div className="bg-white w-full max-w-md rounded-[3.5rem] shadow-2xl p-10 max-h-[85vh] overflow-y-auto no-scrollbar">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-black tracking-tight italic">Categorías Familiares</h2>
              <button onClick={() => setShowCatModal(false)} className="p-2 bg-slate-50 rounded-full text-slate-400"><X size={20} /></button>
            </div>
            
            <div className="space-y-8">
              <form onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.target);
                const type = fd.get('type');
                const name = fd.get('name');
                const newCat = { id: name, name, icon: newCatIcon, color: 'text-indigo-600', bg: 'bg-indigo-50' };
                setCategories({ ...categories, [type]: [...categories[type], newCat] });
                e.target.reset();
              }} className="p-8 bg-slate-50 rounded-[2.5rem] space-y-5 border border-indigo-100">
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Añadir Nueva</p>
                <select name="type" className="w-full p-4 rounded-2xl border-none font-bold text-xs outline-none shadow-sm">
                  <option value="income">Tipo: Ingreso</option>
                  <option value="expense">Tipo: Gasto</option>
                </select>
                <input name="name" required placeholder="Nombre (ej: Gimnasio)" className="w-full p-4 rounded-2xl border-none text-sm outline-none font-medium shadow-sm" />
                <div className="grid grid-cols-6 gap-2 p-3 bg-white rounded-2xl shadow-inner">
                  {ICON_GALLERY.map(item => (
                    <button key={item.id} type="button" onClick={() => setNewCatIcon(item.id)} className={`p-2 rounded-xl flex items-center justify-center transition-all ${newCatIcon === item.id ? 'bg-indigo-600 text-white scale-110 shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>
                      <item.icon size={16} />
                    </button>
                  ))}
                </div>
                <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-indigo-200">
                   <PlusSquare size={18}/> Crear Categoría
                </button>
              </form>

              <div className="space-y-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Listado Actual</p>
                {[...categories.income, ...categories.expense].map(c => (
                  <div key={c.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-[2rem] shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className={`${c.bg} ${c.color} p-3 rounded-2xl`}>{getIcon(c.icon)}</div>
                      <span className="font-bold text-sm text-slate-700 tracking-tight">{c.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: COMPARTIR */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[3.5rem] p-10 space-y-10 shadow-2xl animate-in zoom-in-95 duration-500">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="bg-orange-100 p-3 rounded-2xl text-orange-600 shadow-sm"><Share2 size={28} /></div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight">Vincular</h2>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest opacity-60">Familia Colaborativa</p>
                </div>
              </div>
              <button onClick={() => setShowShareModal(false)} className="p-3 bg-slate-50 text-slate-400 rounded-full hover:bg-slate-100 transition-colors"><X size={20}/></button>
            </div>
            <div className="space-y-8">
              <div className="bg-slate-50 p-8 rounded-[3rem] border-2 border-dashed border-slate-200 text-center group cursor-pointer hover:border-indigo-300 transition-all">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Tu Código Secreto</p>
                <div className="text-4xl font-black text-indigo-600 tracking-widest uppercase transition-transform group-hover:scale-105">FA-X89-2024</div>
              </div>
              <div className="space-y-4">
                <button className="w-full flex items-center justify-center gap-3 bg-white border border-slate-100 py-4 rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-sm hover:shadow-md transition-all">
                  <img src="https://www.google.com/favicon.ico" alt="google" className="w-4 h-4" /> Entrar con Google
                </button>
                <div className="relative py-2 flex items-center">
                  <div className="flex-grow border-t border-slate-100"></div>
                  <span className="flex-shrink mx-4 text-[10px] font-black text-slate-300 tracking-[0.4em]">O</span>
                  <div className="flex-grow border-t border-slate-100"></div>
                </div>
                <div className="flex gap-4">
                  <button className="flex-1 flex flex-col items-center gap-3 bg-indigo-50 text-indigo-600 p-6 rounded-[2.5rem] font-black text-[10px] uppercase tracking-widest border border-indigo-100 hover:bg-indigo-100 transition-all">
                    <Mail size={24} /> Invitación
                  </button>
                  <button className="flex-1 flex flex-col items-center gap-3 bg-slate-900 text-white p-6 rounded-[2.5rem] font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all">
                    <Hash size={24} /> Ingresar Código
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
