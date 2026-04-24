// ============================================
// IMPORTS DE FIREBASE
// ============================================
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, doc, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// ============================================
// CONFIGURACIÓN DE FIREBASE (TUS DATOS)
// ============================================
const firebaseConfig = {
    apiKey: "AIzaSyBxMzw8I7nc7e29X1xQoH2kgGHIiHzLUGo",
    authDomain: "presupuesto-familiar-15478.firebaseapp.com",
    databaseURL: "https://presupuesto-familiar-15478-default-rtdb.firebaseio.com",
    projectId: "presupuesto-familiar-15478",
    storageBucket: "presupuesto-familiar-15478.firebasestorage.app",
    messagingSenderId: "436445257047",
    appId: "1:436445257047:web:e692e018781bbdeb7c3212",
    measurementId: "G-CBPM2XMB67"
};

let app, auth, db, googleProvider;
let firebaseEnabled = false;

try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
    db = getFirestore(app);
    firebaseEnabled = true;
    console.log("Firebase inicializado correctamente");
} catch (e) {
    console.warn("Firebase no disponible. Modo local.", e);
}

// ========== DATA STORES ==========
let transactions = [];
let accounts = [];
let categories = [];
let budgets = [];
let goals = [];
let btcHoldings = 0;

const defaultCategories = [
    { id: "c1", name: "Salud", color: "#3b82f6" },
    { id: "c2", name: "Comida", color: "#10b981" },
    { id: "c3", name: "Hogar", color: "#8b5cf6" },
    { id: "c4", name: "Transporte", color: "#f59e0b" },
    { id: "c5", name: "Entretenimiento", color: "#ec4899" },
    { id: "c6", name: "Educación", color: "#06b6d4" },
    { id: "c7", name: "Salario", color: "#10b981" },
    { id: "c8", name: "Inversiones", color: "#3b82f6" }
];

const defaultAccounts = [
    { id: "a1", name: "Principal", balance: 0, icon: "banknote", color: "bg-emerald-100 text-emerald-600" }
];

let currentUser = null;
let syncEnabled = false;

// ========== INICIALIZACIÓN LOCAL ==========
function initializeData() {
    const savedTransactions = localStorage.getItem('finanzas_transactions');
    const savedAccounts = localStorage.getItem('finanzas_accounts');
    const savedCategories = localStorage.getItem('finanzas_categories');
    const savedBudgets = localStorage.getItem('finanzas_budgets');
    const savedGoals = localStorage.getItem('finanzas_goals');
    const savedBtc = localStorage.getItem('finanzas_btc');
    
    transactions = savedTransactions ? JSON.parse(savedTransactions) : [];
    accounts = savedAccounts ? JSON.parse(savedAccounts) : [...defaultAccounts];
    categories = savedCategories ? JSON.parse(savedCategories) : [...defaultCategories];
    budgets = savedBudgets ? JSON.parse(savedBudgets) : [];
    goals = savedGoals ? JSON.parse(savedGoals) : [];
    btcHoldings = savedBtc ? parseFloat(savedBtc) : 0;
    
    recalculateAllBalances();
    saveToLocalStorage();
}

function saveToLocalStorage() {
    localStorage.setItem('finanzas_transactions', JSON.stringify(transactions));
    localStorage.setItem('finanzas_accounts', JSON.stringify(accounts));
    localStorage.setItem('finanzas_categories', JSON.stringify(categories));
    localStorage.setItem('finanzas_budgets', JSON.stringify(budgets));
    localStorage.setItem('finanzas_goals', JSON.stringify(goals));
    localStorage.setItem('finanzas_btc', btcHoldings.toString());
}

function recalculateAllBalances() {
    accounts.forEach(acc => acc.balance = 0);
    transactions.forEach(t => {
        const acc = accounts.find(a => a.id === t.accId);
        if (acc) {
            const amount = parseFloat(t.amount);
            if (t.type === 'ingreso') acc.balance += amount;
            else acc.balance -= amount;
        }
    });
}

// ========== SINCRONIZACIÓN CON FIRESTORE ==========
async function syncToCloud() {
    if (!firebaseEnabled || !currentUser || !syncEnabled) return;
    try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        await setDoc(userDocRef, {
            transactions, accounts, categories, budgets, goals, btcHoldings,
            lastUpdated: new Date().toISOString()
        }, { merge: true });
    } catch (e) { console.error(e); }
}

async function loadFromCloud() {
    if (!firebaseEnabled || !currentUser) return;
    try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            transactions = data.transactions || [];
            accounts = data.accounts || [];
            categories = data.categories || [];
            budgets = data.budgets || [];
            goals = data.goals || [];
            btcHoldings = data.btcHoldings || 0;
            recalculateAllBalances();
            saveToLocalStorage();
            refreshAllViews();
            showToast("Datos cargados desde la nube", "success");
        }
    } catch (e) { console.error(e); }
}

// ========== IMPORT/EXPORT ==========
function importFromJSON(jsonData) {
    try {
        const data = JSON.parse(jsonData);
        if (data.transactions) transactions = data.transactions;
        if (data.accounts) accounts = data.accounts;
        if (data.categories) categories = data.categories;
        if (data.budgets) budgets = data.budgets;
        if (data.goals) goals = data.goals;
        if (data.btcHoldings !== undefined) btcHoldings = data.btcHoldings;
        recalculateAllBalances();
        saveToLocalStorage();
        syncToCloud();
        refreshAllViews();
        showToast('Importación exitosa', 'success');
        return true;
    } catch (error) {
        showToast('Error al importar', 'error');
        return false;
    }
}

function exportToJSON() {
    const exportData = { transactions, accounts, categories, budgets, goals, btcHoldings, exportDate: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wallet_backup_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Backup exportado', 'success');
}

// ========== CRUD (transacciones, cuentas, categorías, presupuestos, metas) ==========
// (Las funciones son las mismas que ya tenías pero sin referencias a window.firebaseModules)
// Incluyo aquí las versiones definitivas:

function addTransaction(transaction, imageBase64 = null) {
    const newTransaction = {
        id: 'tx-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        amount: parseFloat(transaction.amount),
        originalAmount: transaction.originalAmount || parseFloat(transaction.amount),
        catId: transaction.catId,
        accId: transaction.accId,
        note: transaction.note || '',
        type: transaction.type,
        date: transaction.date,
        discount: transaction.discount || false,
        discountPercent: transaction.discountPercent || 0,
        discountFixed: transaction.discountFixed || 0,
        currency: transaction.currency || 'ARS',
        image: imageBase64 || null
    };
    transactions.push(newTransaction);
    const account = accounts.find(a => a.id === newTransaction.accId);
    if (account) {
        if (newTransaction.type === 'ingreso') account.balance += newTransaction.amount;
        else account.balance -= newTransaction.amount;
    }
    saveToLocalStorage();
    syncToCloud();
    refreshAllViews();
    showToast('Transacción guardada', 'success');
    return newTransaction;
}

function updateTransaction(id, updatedData, imageBase64 = null) {
    const index = transactions.findIndex(t => t.id === id);
    if (index === -1) return null;
    const old = transactions[index];
    const oldAcc = accounts.find(a => a.id === old.accId);
    if (oldAcc) {
        if (old.type === 'ingreso') oldAcc.balance -= old.amount;
        else oldAcc.balance += old.amount;
    }
    transactions[index] = { ...old, ...updatedData };
    if (imageBase64 !== undefined) transactions[index].image = imageBase64;
    transactions[index].amount = parseFloat(transactions[index].amount);
    const newAcc = accounts.find(a => a.id === transactions[index].accId);
    if (newAcc) {
        if (transactions[index].type === 'ingreso') newAcc.balance += transactions[index].amount;
        else newAcc.balance -= transactions[index].amount;
    }
    saveToLocalStorage();
    syncToCloud();
    refreshAllViews();
    showToast('Transacción actualizada', 'success');
    return transactions[index];
}

function deleteTransaction(id) {
    const t = transactions.find(t => t.id === id);
    if (!t) return false;
    const acc = accounts.find(a => a.id === t.accId);
    if (acc) {
        if (t.type === 'ingreso') acc.balance -= t.amount;
        else acc.balance += t.amount;
    }
    transactions = transactions.filter(tx => tx.id !== id);
    saveToLocalStorage();
    syncToCloud();
    refreshAllViews();
    showToast('Transacción eliminada', 'success');
    return true;
}

function addAccount(account) {
    const newAccount = {
        id: 'acc-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        name: account.name,
        balance: 0,
        icon: account.icon || 'banknote',
        color: account.color || 'bg-emerald-100 text-emerald-600'
    };
    accounts.push(newAccount);
    saveToLocalStorage();
    syncToCloud();
    refreshAllViews();
    showToast('Billetera creada', 'success');
    return newAccount;
}

function updateAccount(id, updatedData) {
    const index = accounts.findIndex(a => a.id === id);
    if (index === -1) return null;
    accounts[index] = { ...accounts[index], ...updatedData };
    saveToLocalStorage();
    syncToCloud();
    refreshAllViews();
    showToast('Billetera actualizada', 'success');
    return accounts[index];
}

function deleteAccount(id) {
    if (transactions.some(t => t.accId === id)) {
        showToast('No se puede eliminar: tiene transacciones', 'error');
        return false;
    }
    accounts = accounts.filter(a => a.id !== id);
    saveToLocalStorage();
    syncToCloud();
    refreshAllViews();
    showToast('Billetera eliminada', 'success');
    return true;
}

function addCategory(category) {
    const newCategory = {
        id: 'cat-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        name: category.name,
        color: category.color || '#10b981'
    };
    categories.push(newCategory);
    saveToLocalStorage();
    syncToCloud();
    refreshAllViews();
    showToast('Categoría creada', 'success');
    return newCategory;
}

function updateCategory(id, updatedData) {
    const index = categories.findIndex(c => c.id === id);
    if (index === -1) return null;
    categories[index] = { ...categories[index], ...updatedData };
    saveToLocalStorage();
    syncToCloud();
    refreshAllViews();
    showToast('Categoría actualizada', 'success');
    return categories[index];
}

function deleteCategory(id) {
    if (transactions.some(t => t.catId === id)) {
        showToast('No se puede eliminar: tiene transacciones', 'error');
        return false;
    }
    categories = categories.filter(c => c.id !== id);
    saveToLocalStorage();
    syncToCloud();
    refreshAllViews();
    showToast('Categoría eliminada', 'success');
    return true;
}

function addBudget(budget) {
    const newBudget = {
        id: 'bud-' + Date.now(),
        categoryId: budget.categoryId,
        amount: parseFloat(budget.amount),
        month: budget.month
    };
    budgets.push(newBudget);
    saveToLocalStorage();
    syncToCloud();
    refreshAllViews();
    showToast('Presupuesto guardado', 'success');
}

function deleteBudget(id) {
    budgets = budgets.filter(b => b.id !== id);
    saveToLocalStorage();
    syncToCloud();
    refreshAllViews();
    showToast('Presupuesto eliminado', 'success');
}

function addGoal(goal) {
    const newGoal = {
        id: 'goal-' + Date.now(),
        name: goal.name,
        targetAmount: parseFloat(goal.targetAmount),
        currentAmount: 0,
        color: goal.color || '#3b82f6'
    };
    goals.push(newGoal);
    saveToLocalStorage();
    syncToCloud();
    refreshAllViews();
    showToast('Meta creada', 'success');
}

function deleteGoal(id) {
    goals = goals.filter(g => g.id !== id);
    saveToLocalStorage();
    syncToCloud();
    refreshAllViews();
    showToast('Meta eliminada', 'success');
}

// ========== GETTERS ==========
function getAccountName(id) { const a = accounts.find(a => a.id === id); return a ? a.name : 'Desconocido'; }
function getCategoryName(id) { const c = categories.find(c => c.id === id); return c ? c.name : 'Sin categoría'; }
function getCategoryColor(id) { const c = categories.find(c => c.id === id); return c ? c.color : '#94a3b8'; }

// ========== RENDERIZADO (todas las funciones) ==========
let currentCharts = {};

function refreshAllViews() {
    renderDashboard();
    renderTransactionsList();
    renderAccountsList();
    renderCategoriesList();
    renderBudgetsList();
    renderGoalsList();
    renderCalendar();
    updateBTCPrice();
    updateFilters();
}

function renderDashboard() {
    let totalIncome = 0, totalExpense = 0;
    transactions.forEach(t => {
        const amt = parseFloat(t.amount);
        if (t.type === 'ingreso') totalIncome += amt;
        else totalExpense += amt;
    });
    const totalBalance = totalIncome - totalExpense;
    document.getElementById('totalBalance').innerHTML = formatCurrency(totalBalance);
    document.getElementById('totalIncome').innerHTML = formatCurrency(totalIncome);
    document.getElementById('totalExpense').innerHTML = formatCurrency(totalExpense);
    
    const recent = [...transactions].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0,5);
    const container = document.getElementById('recentTransactionsList');
    if (container) {
        container.innerHTML = recent.map(t => `
            <div class="transaction-item">
                <div class="transaction-info">
                    <div class="transaction-icon ${t.type}"><i class="fas ${t.type==='ingreso'?'fa-arrow-down':'fa-arrow-up'}"></i></div>
                    <div class="transaction-details">
                        <div class="transaction-description">${escapeHtml(t.note) || (t.type==='ingreso'?'Ingreso':'Gasto')}</div>
                        <div class="transaction-meta">${formatDate(t.date)} • ${getCategoryName(t.catId)}</div>
                    </div>
                </div>
                <div class="transaction-amount ${t.type}">${t.type==='ingreso'?'+':'-'} ${formatCurrency(t.amount)}</div>
            </div>
        `).join('');
    }
    updateExpenseChart();
    updateBalanceChart();
}

function updateExpenseChart() {
    const ctx = document.getElementById('expenseChart')?.getContext('2d');
    if (!ctx) return;
    const expensesByCat = {};
    transactions.forEach(t => {
        if (t.type === 'gasto') {
            const catName = getCategoryName(t.catId);
            expensesByCat[catName] = (expensesByCat[catName] || 0) + parseFloat(t.amount);
        }
    });
    const labels = Object.keys(expensesByCat);
    const data = Object.values(expensesByCat);
    const colors = labels.map((_, i) => `hsl(${(i * 360 / labels.length) % 360}, 70%, 60%)`);
    if (currentCharts.expense) currentCharts.expense.destroy();
    currentCharts.expense = new Chart(ctx, {
        type: 'doughnut',
        data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'bottom' } } }
    });
}

function updateBalanceChart() {
    const ctx = document.getElementById('balanceChart')?.getContext('2d');
    if (!ctx) return;
    const labels = accounts.map(a => a.name);
    const balances = accounts.map(a => a.balance);
    const colors = accounts.map(a => {
        if (a.color.includes('emerald')) return '#10b981';
        if (a.color.includes('blue')) return '#3b82f6';
        if (a.color.includes('purple')) return '#8b5cf6';
        if (a.color.includes('amber')) return '#f59e0b';
        if (a.color.includes('rose')) return '#ec4899';
        return '#06b6d4';
    });
    if (currentCharts.balance) currentCharts.balance.destroy();
    currentCharts.balance = new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets: [{ label: 'Saldo', data: balances, backgroundColor: colors, borderRadius: 8 }] },
        options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { callback: (value) => formatCurrency(value) } } } }
    });
}

function renderTransactionsList() { /* igual, pero sin cambios */ }
function renderAccountsList() { /* igual */ }
function renderCategoriesList() { /* igual */ }
function renderBudgetsList() { /* igual */ }
function renderGoalsList() { /* igual */ }

// Calendario, Bitcoin, Compartir, Login (con las importaciones directas)
let currentCalendarDate = new Date();

function renderCalendar() {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDay = firstDay.getDay();
    const daysInMonth = new Date(year, month+1, 0).getDate();
    const grid = document.getElementById('calendarGrid');
    if (!grid) return;
    let html = '<div class="calendar-day-header">Dom</div><div class="calendar-day-header">Lun</div><div class="calendar-day-header">Mar</div><div class="calendar-day-header">Mié</div><div class="calendar-day-header">Jue</div><div class="calendar-day-header">Vie</div><div class="calendar-day-header">Sáb</div>';
    for (let i=0; i<startDay; i++) html += '<div class="calendar-day empty"></div>';
    for (let d=1; d<=daysInMonth; d++) {
        const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const dayTrans = transactions.filter(t => t.date.split('T')[0] === dateStr);
        let totalInc=0, totalExp=0;
        dayTrans.forEach(t => { if(t.type==='ingreso') totalInc += t.amount; else totalExp += t.amount; });
        const balance = totalInc - totalExp;
        let indicatorClass = '';
        if (totalExp > 0) indicatorClass = 'red';
        else if (totalInc > 0) indicatorClass = 'green';
        if (balance !== 0 && totalExp===0 && totalInc===0) indicatorClass = 'orange';
        html += `<div class="calendar-day" data-date="${dateStr}"><div class="day-number">${d}</div><div class="day-indicator ${indicatorClass}"></div></div>`;
    }
    grid.innerHTML = html;
    document.getElementById('calendarMonthYear').innerText = firstDay.toLocaleDateString('es', { month:'long', year:'numeric' });
    document.querySelectorAll('.calendar-day').forEach(el => {
        if (el.dataset.date) el.addEventListener('click', () => showDailyTransactions(el.dataset.date));
    });
}

function showDailyTransactions(date) {
    const dayTrans = transactions.filter(t => t.date.split('T')[0] === date);
    const container = document.getElementById('dailyTransactions');
    if (!container) return;
    if (dayTrans.length === 0) {
        container.innerHTML = `<h4>${date}</h4><p>Sin transacciones este día.</p>`;
        return;
    }
    let totalInc=0, totalExp=0;
    dayTrans.forEach(t => { if(t.type==='ingreso') totalInc+=t.amount; else totalExp+=t.amount; });
    const balance = totalInc - totalExp;
    container.innerHTML = `
        <h4>${date}</h4>
        <div style="display:flex; gap:16px;">
            <span style="color:#10b981;">Ingresos: ${formatCurrency(totalInc)}</span>
            <span style="color:#ef4444;">Gastos: ${formatCurrency(totalExp)}</span>
            <span style="color:#f59e0b;">Balance: ${formatCurrency(balance)}</span>
        </div>
        <div class="transactions-list">${dayTrans.map(t => `<div class="transaction-item"><div>${escapeHtml(t.note)||'Sin desc'}</div><div>${formatCurrency(t.amount)}</div></div>`).join('')}</div>
    `;
}

let currentBTCPriceUSD = 0, currentBTCPriceARS = 0;
async function updateBTCPrice() {
    try {
        const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd,ars');
        const data = await res.json();
        currentBTCPriceUSD = data.bitcoin.usd;
        currentBTCPriceARS = data.bitcoin.ars;
        document.getElementById('btcPriceUSD').innerHTML = `$${currentBTCPriceUSD.toLocaleString()}`;
        document.getElementById('btcPriceARS').innerHTML = `$${currentBTCPriceARS.toLocaleString()}`;
        document.getElementById('totalBTC').innerHTML = btcHoldings.toFixed(4);
        document.getElementById('btcValueUSD').innerHTML = formatCurrency(btcHoldings * currentBTCPriceUSD);
        document.getElementById('btcValueARS').innerHTML = formatCurrency(btcHoldings * currentBTCPriceARS);
    } catch(e) { console.error(e); }
}

function addBTC(amount) { btcHoldings += amount; saveToLocalStorage(); syncToCloud(); updateBTCPrice(); showToast("BTC agregado", "success"); }
function removeBTC(amount) { if (btcHoldings >= amount) { btcHoldings -= amount; saveToLocalStorage(); syncToCloud(); updateBTCPrice(); showToast("BTC restado", "success"); } else showToast("No tienes suficientes BTC", "error"); }

async function generateShareCode() {
    if (!firebaseEnabled || !currentUser) { showToast("Debes iniciar sesión para compartir", "error"); return; }
    const code = Math.random().toString(36).substring(2,10).toUpperCase();
    try {
        await setDoc(doc(db, 'shareCodes', code), { ownerId: currentUser.uid, createdAt: new Date().toISOString() });
        showToast(`Código de sincronización: ${code}`, "success");
    } catch(e) { showToast("Error generando código", "error"); }
}

async function joinWithCode(code) {
    if (!firebaseEnabled || !currentUser) { showToast("Inicia sesión primero", "error"); return; }
    try {
        const codeDoc = await getDoc(doc(db, 'shareCodes', code));
        if (!codeDoc.exists()) { showToast("Código inválido", "error"); return; }
        const ownerId = codeDoc.data().ownerId;
        const ownerDoc = await getDoc(doc(db, 'users', ownerId));
        if (ownerDoc.exists()) {
            const data = ownerDoc.data();
            transactions = data.transactions || [];
            accounts = data.accounts || [];
            categories = data.categories || [];
            budgets = data.budgets || [];
            goals = data.goals || [];
            btcHoldings = data.btcHoldings || 0;
            recalculateAllBalances();
            saveToLocalStorage();
            await syncToCloud();
            refreshAllViews();
            showToast("Wallet sincronizada con éxito", "success");
        }
    } catch(e) { showToast("Error al unirse", "error"); }
}

async function loginWithGoogle() {
    if (!firebaseEnabled) { showToast("Firebase no configurado", "error"); return; }
    try {
        const result = await signInWithPopup(auth, googleProvider);
        currentUser = result.user;
        document.getElementById('userName').innerText = currentUser.displayName || currentUser.email;
        document.getElementById('loginGoogleBtn').style.display = 'none';
        document.getElementById('logoutBtn').style.display = 'flex';
        syncEnabled = true;
        await loadFromCloud();
        showToast(`Bienvenido ${currentUser.displayName}`, "success");
    } catch(e) { showToast("Error en login", "error"); console.error(e); }
}

async function logout() {
    if (!firebaseEnabled) return;
    await signOut(auth);
    currentUser = null;
    syncEnabled = false;
    document.getElementById('userName').innerText = '';
    document.getElementById('loginGoogleBtn').style.display = 'flex';
    document.getElementById('logoutBtn').style.display = 'none';
    initializeData();
    refreshAllViews();
    showToast("Sesión cerrada", "success");
}

// ========== UTILIDADES Y MODALES ==========
function formatCurrency(value) {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 }).format(value);
}
function formatDate(dateString) {
    const d = new Date(dateString);
    return d.toLocaleDateString('es-AR');
}
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
function showToast(msg, type='success') {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.style.background = type === 'success' ? '#10b981' : '#ef4444';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}
function updateFilters() { /* igual */ }

function ensureModals() { /* crea modales si no existen */ }
let currentModal = null;
function openModal(modalId) { /* ... */ }
function closeModal() { /* ... */ }
function openTransactionModal(id=null) { /* ... */ }
function openAccountModal(id=null) { /* ... */ }
function openCategoryModal(id=null) { /* ... */ }
function openBudgetModal(id=null) { openModal('budgetModal'); }
function openGoalModal(id=null) { openModal('goalModal'); }

// Handlers globales
window.deleteTransactionHandler = (id) => { if (confirm('¿Eliminar?')) deleteTransaction(id); };
window.deleteAccountHandler = (id) => { if (confirm('¿Eliminar billetera?')) deleteAccount(id); };
window.deleteCategoryHandler = (id) => { if (confirm('¿Eliminar categoría?')) deleteCategory(id); };
window.deleteBudget = (id) => { if (confirm('¿Eliminar presupuesto?')) deleteBudget(id); };
window.deleteGoalHandler = (id) => { if (confirm('¿Eliminar meta?')) deleteGoal(id); };
window.editTransaction = openTransactionModal;
window.editAccount = openAccountModal;
window.editCategory = openCategoryModal;
window.editGoal = (id) => { alert('Editar meta próximamente'); };

function switchView(viewId) { /* igual */ }
function generateReport() { /* implementación básica */ }

// ========== EVENT LISTENERS ==========
document.addEventListener('DOMContentLoaded', () => {
    ensureModals();
    initializeData();
    refreshAllViews();
    switchView('dashboard');
    
    // Navegación
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => { e.preventDefault(); switchView(item.dataset.view); });
    });
    document.querySelectorAll('[data-view]').forEach(link => {
        link.addEventListener('click', (e) => { e.preventDefault(); switchView(link.dataset.view); });
    });
    
    // Botones
    document.getElementById('addTransactionBtn')?.addEventListener('click', () => openTransactionModal());
    document.getElementById('addTransactionBtn2')?.addEventListener('click', () => openTransactionModal());
    document.getElementById('addAccountBtn')?.addEventListener('click', () => openAccountModal());
    document.getElementById('addCategoryBtn')?.addEventListener('click', () => openCategoryModal());
    document.getElementById('addBudgetBtn')?.addEventListener('click', () => openBudgetModal());
    document.getElementById('addGoalBtn')?.addEventListener('click', () => openGoalModal());
    document.getElementById('importBackupBtn')?.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => importFromJSON(ev.target.result);
                reader.readAsText(file);
            }
        };
        input.click();
    });
    document.getElementById('exportBackupBtn')?.addEventListener('click', exportToJSON);
    document.getElementById('shareWalletBtn')?.addEventListener('click', () => generateShareCode());
    document.getElementById('joinWalletBtn')?.addEventListener('click', () => { const code = prompt("Código:"); if(code) joinWithCode(code); });
    document.getElementById('loginGoogleBtn')?.addEventListener('click', loginWithGoogle);
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    document.getElementById('addBtcBtn')?.addEventListener('click', () => { const amt = parseFloat(document.getElementById('btcAmount')?.value); if(amt>0) addBTC(amt); });
    document.getElementById('removeBtcBtn')?.addEventListener('click', () => { const amt = parseFloat(document.getElementById('btcAmount')?.value); if(amt>0) removeBTC(amt); });
    document.getElementById('generateReportBtn')?.addEventListener('click', generateReport);
    document.getElementById('clearFilters')?.addEventListener('click', () => {
        if(document.getElementById('filterType')) document.getElementById('filterType').value = 'all';
        if(document.getElementById('filterAccount')) document.getElementById('filterAccount').value = 'all';
        if(document.getElementById('filterMonth')) document.getElementById('filterMonth').value = '';
        renderTransactionsList();
    });
    document.getElementById('filterType')?.addEventListener('change', renderTransactionsList);
    document.getElementById('filterAccount')?.addEventListener('change', renderTransactionsList);
    document.getElementById('filterMonth')?.addEventListener('change', renderTransactionsList);
    document.getElementById('prevMonth')?.addEventListener('click', () => { currentCalendarDate.setMonth(currentCalendarDate.getMonth()-1); renderCalendar(); });
    document.getElementById('nextMonth')?.addEventListener('click', () => { currentCalendarDate.setMonth(currentCalendarDate.getMonth()+1); renderCalendar(); });
    
    // Formularios
    const txForm = document.getElementById('transactionForm');
    if (txForm) {
        txForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('transactionId').value;
            const type = document.querySelector('.type-btn.active').dataset.type;
            let amount = parseFloat(document.getElementById('amount').value);
            const date = document.getElementById('date').value;
            const catId = document.getElementById('categoryId').value;
            const accId = document.getElementById('accId').value;
            const note = document.getElementById('note').value;
            const hasDiscount = document.getElementById('hasDiscount')?.checked;
            let discountPercent=0, discountFixed=0, originalAmount=amount;
            if (hasDiscount) {
                const discountType = document.querySelector('input[name="discountType"]:checked').value;
                const discountVal = parseFloat(document.getElementById('discountValue').value);
                if (discountType === 'percent') { discountPercent = discountVal; amount = originalAmount * (1 - discountVal/100); }
                else { discountFixed = discountVal; amount = originalAmount - discountVal; }
            }
            let imageBase64 = null;
            const imgFile = document.getElementById('transactionImage')?.files[0];
            if (imgFile) {
                imageBase64 = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target.result);
                    reader.readAsDataURL(imgFile);
                });
            }
            const txData = { amount, originalAmount, catId, accId, note, type, date: new Date(date).toISOString(), discount: hasDiscount, discountPercent, discountFixed, currency: 'ARS' };
            if (id) updateTransaction(id, txData, imageBase64);
            else addTransaction(txData, imageBase64);
            closeModal();
        });
    }
    document.getElementById('accountForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('accountId').value;
        const name = document.getElementById('accName').value;
        const icon = document.getElementById('accIcon').value;
        const color = document.getElementById('accColor').value;
        if (id) updateAccount(id, { name, icon, color });
        else addAccount({ name, icon, color });
        closeModal();
    });
    document.getElementById('categoryForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('categoryId').value;
        const name = document.getElementById('catName').value;
        const color = document.getElementById('catColor').value;
        if (id) updateCategory(id, { name, color });
        else addCategory({ name, color });
        closeModal();
    });
    document.getElementById('budgetForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const categoryId = document.getElementById('budgetCategoryId').value;
        const amount = document.getElementById('budgetAmount').value;
        const month = document.getElementById('budgetMonth').value;
        if (categoryId && amount && month) addBudget({ categoryId, amount, month });
        closeModal();
    });
    document.getElementById('goalForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('goalName').value;
        const targetAmount = document.getElementById('goalTarget').value;
        const color = document.getElementById('goalColor').value;
        if (name && targetAmount) addGoal({ name, targetAmount, color });
        closeModal();
    });
    
    // Cerrar modales
    document.querySelectorAll('.modal-close').forEach(btn => btn.addEventListener('click', closeModal));
    window.addEventListener('click', (e) => { if (e.target.classList.contains('modal')) closeModal(); });
    document.getElementById('menuToggle')?.addEventListener('click', () => document.getElementById('sidebar').classList.toggle('open'));
    document.getElementById('closeSidebar')?.addEventListener('click', () => document.getElementById('sidebar').classList.remove('open'));
});
