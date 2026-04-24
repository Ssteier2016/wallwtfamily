// ============================================
// IMPORTS DE FIREBASE (MÓDULO ES6)
// ============================================
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, doc, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// ============================================
// CONFIGURACIÓN DE FIREBASE (TUS DATOS REALES)
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
let btcHistory = []; // { id, amount, type, date, priceUSD, priceARS }

// Categorías por defecto con imagen
const defaultCategories = [
    { id: "c1", name: "Salud", color: "#3b82f6", imageUrl: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png" },
    { id: "c2", name: "Comida", color: "#10b981", imageUrl: "https://cdn-icons-png.flaticon.com/512/1046/1046784.png" },
    { id: "c3", name: "Hogar", color: "#8b5cf6", imageUrl: "https://cdn-icons-png.flaticon.com/512/3075/3075977.png" },
    { id: "c4", name: "Transporte", color: "#f59e0b", imageUrl: "https://cdn-icons-png.flaticon.com/512/3096/3096962.png" },
    { id: "c5", name: "Entretenimiento", color: "#ec4899", imageUrl: "https://cdn-icons-png.flaticon.com/512/1047/1047567.png" },
    { id: "c6", name: "Educación", color: "#06b6d4", imageUrl: "https://cdn-icons-png.flaticon.com/512/2906/2906224.png" },
    { id: "c7", name: "Salario", color: "#10b981", imageUrl: "https://cdn-icons-png.flaticon.com/512/3135/3135761.png" },
    { id: "c8", name: "Inversiones", color: "#3b82f6", imageUrl: "https://cdn-icons-png.flaticon.com/512/784/784696.png" }
];

const defaultAccounts = [
    { id: "a1", name: "Principal", balance: 0, icon: "fa-wallet", color: "bg-emerald-100 text-emerald-600", imageUrl: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png" }
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
    const savedBtcHistory = localStorage.getItem('finanzas_btc_history');
    
    transactions = savedTransactions ? JSON.parse(savedTransactions) : [];
    accounts = savedAccounts ? JSON.parse(savedAccounts) : JSON.parse(JSON.stringify(defaultAccounts));
    categories = savedCategories ? JSON.parse(savedCategories) : JSON.parse(JSON.stringify(defaultCategories));
    budgets = savedBudgets ? JSON.parse(savedBudgets) : [];
    goals = savedGoals ? JSON.parse(savedGoals) : [];
    btcHoldings = savedBtc ? parseFloat(savedBtc) : 0;
    btcHistory = savedBtcHistory ? JSON.parse(savedBtcHistory) : [];
    
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
    localStorage.setItem('finanzas_btc_history', JSON.stringify(btcHistory));
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
            transactions, accounts, categories, budgets, goals, btcHoldings, btcHistory,
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
            btcHistory = data.btcHistory || [];
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
        if (data.btcHistory) btcHistory = data.btcHistory;
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
    const exportData = { transactions, accounts, categories, budgets, goals, btcHoldings, btcHistory, exportDate: new Date().toISOString() };
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

// ========== CRUD TRANSACCIONES ==========
function addTransaction(transaction) {
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
        currency: transaction.currency || 'ARS'
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

function updateTransaction(id, updatedData) {
    const index = transactions.findIndex(t => t.id === id);
    if (index === -1) return null;
    const old = transactions[index];
    const oldAcc = accounts.find(a => a.id === old.accId);
    if (oldAcc) {
        if (old.type === 'ingreso') oldAcc.balance -= old.amount;
        else oldAcc.balance += old.amount;
    }
    transactions[index] = { ...old, ...updatedData, amount: parseFloat(updatedData.amount) };
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

// ========== CRUD CUENTAS (con imagen URL) ==========
function addAccount(account) {
    const newAccount = {
        id: 'acc-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        name: account.name,
        balance: 0,
        icon: account.icon || 'fa-wallet',
        color: account.color || 'bg-emerald-100 text-emerald-600',
        imageUrl: account.imageUrl || ''
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

// ========== CRUD CATEGORÍAS (con imagen URL) ==========
function addCategory(category) {
    const newCategory = {
        id: 'cat-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        name: category.name,
        color: category.color || '#10b981',
        imageUrl: category.imageUrl || ''
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

// ========== CRUD PRESUPUESTOS ==========
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

function updateBudget(id, updatedData) {
    const index = budgets.findIndex(b => b.id === id);
    if (index === -1) return null;
    budgets[index] = { ...budgets[index], ...updatedData };
    saveToLocalStorage();
    syncToCloud();
    refreshAllViews();
    showToast('Presupuesto actualizado', 'success');
    return budgets[index];
}

function deleteBudget(id) {
    budgets = budgets.filter(b => b.id !== id);
    saveToLocalStorage();
    syncToCloud();
    refreshAllViews();
    showToast('Presupuesto eliminado', 'success');
}

// ========== CRUD METAS (con imagen URL) ==========
function addGoal(goal) {
    const newGoal = {
        id: 'goal-' + Date.now(),
        name: goal.name,
        targetAmount: parseFloat(goal.targetAmount),
        currentAmount: 0,
        color: goal.color || '#3b82f6',
        imageUrl: goal.imageUrl || ''
    };
    goals.push(newGoal);
    saveToLocalStorage();
    syncToCloud();
    refreshAllViews();
    showToast('Meta creada', 'success');
}

function updateGoal(id, updatedData) {
    const index = goals.findIndex(g => g.id === id);
    if (index === -1) return null;
    goals[index] = { ...goals[index], ...updatedData };
    saveToLocalStorage();
    syncToCloud();
    refreshAllViews();
    showToast('Meta actualizada', 'success');
    return goals[index];
}

function deleteGoal(id) {
    goals = goals.filter(g => g.id !== id);
    saveToLocalStorage();
    syncToCloud();
    refreshAllViews();
    showToast('Meta eliminada', 'success');
}

// ========== BITCOIN con historial ==========
let currentBTCPriceUSD = 0, currentBTCPriceARS = 0;

async function updateBTCPrice() {
    try {
        const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd,ars');
        const data = await res.json();
        currentBTCPriceUSD = data.bitcoin.usd;
        currentBTCPriceARS = data.bitcoin.ars;
        document.getElementById('btcPriceUSD').innerHTML = `$${currentBTCPriceUSD.toLocaleString()}`;
        document.getElementById('btcPriceARS').innerHTML = `$${currentBTCPriceARS.toLocaleString()}`;
        document.getElementById('totalBTC').innerHTML = btcHoldings.toFixed(8);
        document.getElementById('btcValueUSD').innerHTML = formatCurrencyUSD(btcHoldings * currentBTCPriceUSD);
        document.getElementById('btcValueARS').innerHTML = formatCurrency(btcHoldings * currentBTCPriceARS);
    } catch(e) { console.error(e); }
}

function formatCurrencyUSD(value) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(value);
}

function addBTC(amount) {
    if (amount <= 0) { showToast("Cantidad inválida", "error"); return; }
    btcHoldings += amount;
    btcHistory.push({
        id: 'btc-' + Date.now(),
        amount: amount,
        type: 'compra',
        date: new Date().toISOString(),
        priceUSD: currentBTCPriceUSD,
        priceARS: currentBTCPriceARS
    });
    saveToLocalStorage();
    syncToCloud();
    updateBTCPrice();
    renderBTCHistory();
    showToast(`${amount} BTC agregado`, "success");
}

function removeBTC(amount) {
    if (amount <= 0) { showToast("Cantidad inválida", "error"); return; }
    if (btcHoldings < amount) { showToast("No tienes suficientes BTC", "error"); return; }
    btcHoldings -= amount;
    btcHistory.push({
        id: 'btc-' + Date.now(),
        amount: amount,
        type: 'venta',
        date: new Date().toISOString(),
        priceUSD: currentBTCPriceUSD,
        priceARS: currentBTCPriceARS
    });
    saveToLocalStorage();
    syncToCloud();
    updateBTCPrice();
    renderBTCHistory();
    showToast(`${amount} BTC restado`, "success");
}

function renderBTCHistory() {
    const container = document.getElementById('btcHistoryList');
    if (!container) return;
    if (btcHistory.length === 0) {
        container.innerHTML = '<div class="empty-state">Sin movimientos de BTC</div>';
        return;
    }
    const sorted = [...btcHistory].sort((a,b) => new Date(b.date) - new Date(a.date));
    container.innerHTML = sorted.map(h => `
        <div class="transaction-item">
            <div class="transaction-info">
                <div class="transaction-icon ${h.type === 'compra' ? 'ingreso' : 'gasto'}">
                    <i class="fas ${h.type === 'compra' ? 'fa-arrow-down' : 'fa-arrow-up'}"></i>
                </div>
                <div class="transaction-details">
                    <div class="transaction-description">${h.type === 'compra' ? 'Compra de BTC' : 'Venta de BTC'}</div>
                    <div class="transaction-meta">${formatDate(h.date)} • Precio: ${formatCurrencyUSD(h.priceUSD)} / ${formatCurrency(h.priceARS)}</div>
                </div>
            </div>
            <div class="transaction-amount ${h.type === 'compra' ? 'ingreso' : 'gasto'}">
                ${h.type === 'compra' ? '+' : '-'} ${h.amount.toFixed(8)} BTC
            </div>
        </div>
    `).join('');
}

// ========== GETTERS ==========
function getAccountName(id) { const a = accounts.find(a => a.id === id); return a ? a.name : 'Desconocido'; }
function getCategoryName(id) { const c = categories.find(c => c.id === id); return c ? c.name : 'Sin categoría'; }
function getCategoryColor(id) { const c = categories.find(c => c.id === id); return c ? c.color : '#94a3b8'; }
function getCategoryImage(id) { const c = categories.find(c => c.id === id); return c ? (c.imageUrl || '') : ''; }

// ========== RENDERIZADO PRINCIPAL ==========
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
    renderBTCHistory();
    updateFilters();
    updateBudgetMonthSelector();
    renderExpenseReport();
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
    const colors = labels.map((_, i) => `hsl(${(i * 360 / Math.max(labels.length,1)) % 360}, 70%, 60%)`);
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

function renderTransactionsList() {
    const tbody = document.getElementById('transactionsList');
    if (!tbody) return;
    let filtered = [...transactions];
    const typeFilter = document.getElementById('filterType')?.value;
    const accountFilter = document.getElementById('filterAccount')?.value;
    const categoryFilter = document.getElementById('filterCategory')?.value;
    const monthFilter = document.getElementById('filterMonth')?.value;
    if (typeFilter && typeFilter !== 'all') filtered = filtered.filter(t => t.type === typeFilter);
    if (accountFilter && accountFilter !== 'all') filtered = filtered.filter(t => t.accId === accountFilter);
    if (categoryFilter && categoryFilter !== 'all') filtered = filtered.filter(t => t.catId === categoryFilter);
    if (monthFilter) filtered = filtered.filter(t => t.date.slice(0,7) === monthFilter);
    filtered.sort((a,b) => new Date(b.date) - new Date(a.date));
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No hay transacciones</td></tr>';
        return;
    }
    tbody.innerHTML = filtered.map(t => {
        const catImg = getCategoryImage(t.catId);
        return `
            <tr>
                <td>${formatDate(t.date)}</td>
                <td>${catImg ? `<img src="${catImg}" class="transaction-img" style="width:40px;height:40px;object-fit:cover;border-radius:8px;">` : '—'}</td>
                <td>${escapeHtml(t.note) || (t.type==='ingreso'?'Ingreso':'Gasto')}</td>
                <td><span style="background:${getCategoryColor(t.catId)}20; color:${getCategoryColor(t.catId)}; padding:4px 8px; border-radius:8px;">${getCategoryName(t.catId)}</span></td>
                <td>${getAccountName(t.accId)}</td>
                <td style="color:${t.type==='ingreso'?'#10b981':'#ef4444'}">${t.type==='ingreso'?'+':'-'} ${formatCurrency(t.amount)}</td>
                <td><button class="btn-edit" onclick="editTransaction('${t.id}')"><i class="fas fa-pencil-alt"></i></button><button class="btn-delete" onclick="deleteTransactionHandler('${t.id}')"><i class="fas fa-trash-alt"></i></button></td>
            </tr>
        `;
    }).join('');
}

function renderAccountsList() {
    const container = document.getElementById('accountsList');
    if (!container) return;
    if (accounts.length === 0) { container.innerHTML = '<div class="empty-state">No hay billeteras. Crea una nueva.</div>'; return; }
    container.innerHTML = accounts.map(acc => `
        <div class="account-card">
            <div class="account-info">
                <div class="account-icon ${acc.color}">
                    ${acc.imageUrl ? `<img src="${acc.imageUrl}" style="width:40px;height:40px;object-fit:cover;border-radius:12px;">` : `<i class="fas ${acc.icon}"></i>`}
                </div>
                <div class="account-details"><h4>${escapeHtml(acc.name)}</h4><span class="account-balance">${formatCurrency(acc.balance)}</span></div>
            </div>
            <div class="account-actions">
                <button class="btn-edit" onclick="editAccount('${acc.id}')"><i class="fas fa-pencil-alt"></i></button>
                <button class="btn-delete" onclick="deleteAccountHandler('${acc.id}')"><i class="fas fa-trash-alt"></i></button>
            </div>
        </div>
    `).join('');
}

function renderCategoriesList() {
    const container = document.getElementById('categoriesList');
    if (!container) return;
    if (categories.length === 0) { container.innerHTML = '<div class="empty-state">No hay categorías. Crea una nueva.</div>'; return; }
    container.innerHTML = categories.map(cat => `
        <div class="category-card">
            <div class="category-info" style="display:flex; align-items:center; gap:12px;">
                ${cat.imageUrl ? `<img src="${cat.imageUrl}" class="category-img" style="width:48px;height:48px;object-fit:cover;border-radius:12px;">` : `<div class="category-color" style="background: ${cat.color}; width:48px;height:48px;border-radius:12px;"></div>`}
                <div><strong>${escapeHtml(cat.name)}</strong><br><span style="font-size:0.75rem; color:#64748b;">${cat.color}</span></div>
            </div>
            <div class="account-actions">
                <button class="btn-edit" onclick="editCategory('${cat.id}')"><i class="fas fa-pencil-alt"></i></button>
                <button class="btn-delete" onclick="deleteCategoryHandler('${cat.id}')"><i class="fas fa-trash-alt"></i></button>
            </div>
        </div>
    `).join('');
}

function renderBudgetsList() {
    const container = document.getElementById('budgetsList');
    if (!container) return;
    const selectedMonth = document.getElementById('budgetMonthSelect')?.value || new Date().toISOString().slice(0,7);
    const monthly = budgets.filter(b => b.month === selectedMonth);
    if (monthly.length === 0) {
        container.innerHTML = '<div class="empty-state">Sin presupuestos para este mes. Crea uno.</div>';
        return;
    }
    container.innerHTML = monthly.map(b => {
        const cat = categories.find(c => c.id === b.categoryId);
        const catName = cat ? cat.name : 'Categoría';
        const catImg = cat ? (cat.imageUrl || '') : '';
        const spent = transactions.filter(t => t.catId === b.categoryId && t.type === 'gasto' && t.date.slice(0,7) === selectedMonth).reduce((sum, t) => sum + parseFloat(t.amount), 0);
        const percent = (spent / b.amount) * 100;
        const exceeded = spent > b.amount;
        return `
            <div class="budget-card">
                <div class="budget-info">
                    <div style="display:flex; align-items:center; gap:10px;">
                        ${catImg ? `<img src="${catImg}" style="width:32px;height:32px;object-fit:cover;border-radius:8px;">` : `<div style="width:32px;height:32px;background:${cat?.color || '#ccc'};border-radius:8px;"></div>`}
                        <strong>${escapeHtml(catName)}</strong>
                    </div>
                    <div class="budget-amount">Presupuestado: ${formatCurrency(b.amount)} | Gastado: ${formatCurrency(spent)}</div>
                    <div class="budget-progress"><div class="budget-progress-bar ${exceeded ? 'exceeded' : ''}" style="width: ${Math.min(percent,100)}%"></div></div>
                    ${exceeded ? '<span style="color:#ef4444; font-size:0.75rem;">¡Superaste el presupuesto!</span>' : ''}
                </div>
                <div><button class="btn-delete" onclick="deleteBudget('${b.id}')"><i class="fas fa-trash"></i></button></div>
            </div>
        `;
    }).join('');
}

function renderGoalsList() {
    const container = document.getElementById('goalsList');
    if (!container) return;
    if (goals.length === 0) { container.innerHTML = '<div class="empty-state">Sin metas. Crea una meta de ahorro.</div>'; return; }
    container.innerHTML = goals.map(g => {
        const percent = (g.currentAmount / g.targetAmount) * 100;
        return `
            <div class="goal-card">
                <div class="goal-info">
                    <div style="display:flex; align-items:center; gap:10px;">
                        ${g.imageUrl ? `<img src="${g.imageUrl}" style="width:40px;height:40px;object-fit:cover;border-radius:12px;">` : `<div style="width:40px;height:40px;background:${g.color};border-radius:12px;"></div>`}
                        <div><strong>${escapeHtml(g.name)}</strong><br><span style="font-size:0.75rem;">${formatCurrency(g.currentAmount)} de ${formatCurrency(g.targetAmount)}</span></div>
                    </div>
                    <div class="budget-progress"><div class="budget-progress-bar" style="width: ${Math.min(percent,100)}%; background:${g.color};"></div></div>
                </div>
                <div>
                    <button class="btn-edit" onclick="editGoal('${g.id}')"><i class="fas fa-pencil-alt"></i></button>
                    <button class="btn-delete" onclick="deleteGoalHandler('${g.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    }).join('');
}

// ========== CALENDARIO ==========
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

// ========== REPORTE DE GASTOS ==========
function renderExpenseReport() {
    const reportType = document.getElementById('expenseReportType')?.value || 'category';
    const month = document.getElementById('expenseReportMonth')?.value;
    let filtered = [...transactions];
    if (month) filtered = filtered.filter(t => t.date.slice(0,7) === month);
    const gastos = filtered.filter(t => t.type === 'gasto');
    
    if (reportType === 'category') {
        const byCat = {};
        gastos.forEach(t => {
            const catName = getCategoryName(t.catId);
            const catImg = getCategoryImage(t.catId);
            byCat[catName] = (byCat[catName] || 0) + parseFloat(t.amount);
        });
        const labels = Object.keys(byCat);
        const data = Object.values(byCat);
        const ctx = document.getElementById('expenseReportChart')?.getContext('2d');
        if (ctx) {
            if (window.expenseChartInstance) window.expenseChartInstance.destroy();
            const colors = labels.map((_, i) => `hsl(${(i * 360 / Math.max(labels.length,1)) % 360}, 70%, 60%)`);
            window.expenseChartInstance = new Chart(ctx, {
                type: 'doughnut',
                data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0 }] },
                options: { responsive: true, plugins: { legend: { position: 'bottom' }, title: { display: true, text: 'Gastos por Categoría' } } }
            });
        }
        const total = data.reduce((a,b)=>a+b,0);
        let html = '<table><thead><tr><th>Categoría</th><th>Monto</th><th>Porcentaje</th></tr></thead><tbody>';
        for (let i=0; i<labels.length; i++) {
            const pct = total > 0 ? ((data[i]/total)*100).toFixed(1) : 0;
            const cat = categories.find(c => c.name === labels[i]);
            const catImg = cat ? (cat.imageUrl || '') : '';
            html += `<tr><td style="display:flex; align-items:center; gap:8px;">${catImg ? `<img src="${catImg}" style="width:24px;height:24px;border-radius:6px;">` : ''} ${escapeHtml(labels[i])}</td><td>${formatCurrency(data[i])}</td><td>${pct}%</td></tr>`;
        }
        html += `<tr style="font-weight:bold; border-top:2px solid #ccc;"><td>Total</td><td>${formatCurrency(total)}</td><td>100%</td></tr></tbody>`;
        document.getElementById('expenseReportDetails').innerHTML = html;
    } else {
        // por mes (acumulativo)
        const monthlyData = {};
        gastos.forEach(t => {
            const monthKey = new Date(t.date).toLocaleDateString('es-AR', { month: 'short', year: 'numeric' });
            monthlyData[monthKey] = (monthlyData[monthKey] || 0) + parseFloat(t.amount);
        });
        const labels = Object.keys(monthlyData);
        const data = Object.values(monthlyData);
        const ctx = document.getElementById('expenseReportChart')?.getContext('2d');
        if (ctx) {
            if (window.expenseChartInstance) window.expenseChartInstance.destroy();
            window.expenseChartInstance = new Chart(ctx, {
                type: 'line',
                data: { labels, datasets: [{ label: 'Gastos', data, backgroundColor: '#ef4444', borderColor: '#ef4444', fill: false, tension: 0.3 }] },
                options: { responsive: true, plugins: { tooltip: { callbacks: { label: (ctx) => formatCurrency(ctx.raw) } } } }
            });
        }
        let html = '<table><thead><tr><th>Mes</th><th>Total Gastos</th></tr></thead><tbody>';
        for (let i=0; i<labels.length; i++) {
            html += `<tr><td>${labels[i]}</td><td>${formatCurrency(data[i])}</td></tr>`;
        }
        html += `</tbody>`;
        document.getElementById('expenseReportDetails').innerHTML = html;
    }
    
    // Historial de gastos (lista)
    const historyContainer = document.getElementById('expenseHistoryList');
    if (historyContainer) {
        const sortedGastos = [...gastos].sort((a,b) => new Date(b.date) - new Date(a.date));
        if (sortedGastos.length === 0) {
            historyContainer.innerHTML = '<div class="empty-state">No hay gastos registrados</div>';
        } else {
            historyContainer.innerHTML = sortedGastos.map(t => `
                <div class="transaction-item">
                    <div class="transaction-info">
                        <div class="transaction-icon gasto"><i class="fas fa-arrow-up"></i></div>
                        <div class="transaction-details">
                            <div class="transaction-description">${escapeHtml(t.note) || 'Gasto'}</div>
                            <div class="transaction-meta">${formatDate(t.date)} • ${getCategoryName(t.catId)} • ${getAccountName(t.accId)}</div>
                        </div>
                    </div>
                    <div class="transaction-amount gasto">- ${formatCurrency(t.amount)}</div>
                </div>
            `).join('');
        }
    }
}

// ========== COMPARTIR WALLET ==========
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
            btcHistory = data.btcHistory || [];
            recalculateAllBalances();
            saveToLocalStorage();
            await syncToCloud();
            refreshAllViews();
            showToast("Wallet sincronizada con éxito", "success");
        }
    } catch(e) { showToast("Error al unirse", "error"); }
}

// ========== LOGIN GOOGLE ==========
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

// ========== UTILIDADES ==========
function formatCurrency(value) {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 }).format(value);
}
function formatDate(dateString) { const d = new Date(dateString); return d.toLocaleDateString('es-AR'); }
function escapeHtml(text) { if (!text) return ''; const div = document.createElement('div'); div.textContent = text; return div.innerHTML; }
function showToast(msg, type='success') { const toast = document.getElementById('toast'); toast.textContent = msg; toast.style.background = type === 'success' ? '#10b981' : '#ef4444'; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 3000); }

function updateFilters() {
    const accSelect = document.getElementById('filterAccount');
    if (accSelect) { const val = accSelect.value; accSelect.innerHTML = '<option value="all">Todas las billeteras</option>' + accounts.map(a => `<option value="${a.id}" ${val===a.id ? 'selected' : ''}>${escapeHtml(a.name)}</option>`).join(''); }
    const catSelect = document.getElementById('filterCategory');
    if (catSelect) { const val = catSelect.value; catSelect.innerHTML = '<option value="all">Todas las categorías</option>' + categories.map(c => `<option value="${c.id}" ${val===c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join(''); }
    const catFormSelect = document.getElementById('categoryId');
    if (catFormSelect) { const val = catFormSelect.value; catFormSelect.innerHTML = categories.map(c => `<option value="${c.id}" ${val===c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join(''); }
    const accFormSelect = document.getElementById('accId');
    if (accFormSelect) { const val = accFormSelect.value; accFormSelect.innerHTML = accounts.map(a => `<option value="${a.id}" ${val===a.id ? 'selected' : ''}>${escapeHtml(a.name)}</option>`).join(''); }
    const budgetCatSelect = document.getElementById('budgetCategoryId');
    if (budgetCatSelect) { budgetCatSelect.innerHTML = categories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join(''); }
}

function updateBudgetMonthSelector() {
    const selector = document.getElementById('budgetMonthSelect');
    if (selector) {
        const current = selector.value || new Date().toISOString().slice(0,7);
        selector.innerHTML = '';
        const today = new Date();
        for (let i = -6; i <= 6; i++) {
            const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
            const val = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
            selector.innerHTML += `<option value="${val}" ${current===val ? 'selected' : ''}>${d.toLocaleDateString('es', { month:'long', year:'numeric' })}</option>`;
        }
        selector.addEventListener('change', () => renderBudgetsList());
    }
}

// ========== MODALES (creación dinámica) ==========
function ensureModals() {
    const modals = [
        { id: 'transactionModal', title: 'Nueva transacción', formId: 'transactionForm' },
        { id: 'accountModal', title: 'Nueva billetera', formId: 'accountForm' },
        { id: 'categoryModal', title: 'Nueva categoría', formId: 'categoryForm' },
        { id: 'budgetModal', title: 'Presupuesto', formId: 'budgetForm' },
        { id: 'goalModal', title: 'Meta de ahorro', formId: 'goalForm' }
    ];
    for (const m of modals) {
        if (!document.getElementById(m.id)) {
            const div = document.createElement('div');
            div.id = m.id;
            div.className = 'modal';
            div.innerHTML = `<div class="modal-content"><div class="modal-header"><h3>${m.title}</h3><button class="modal-close">&times;</button></div><form id="${m.formId}"><div class="form-actions"><button type="button" class="btn-secondary modal-close">Cancelar</button><button type="submit" class="btn-primary">Guardar</button></div></form></div>`;
            document.body.appendChild(div);
        }
    }
    // Transaction form completo
    const txForm = document.getElementById('transactionForm');
    if (txForm && txForm.children.length === 1) {
        txForm.innerHTML = `
            <input type="hidden" id="transactionId">
            <div class="form-group"><label>Tipo</label><div class="type-toggle"><button type="button" class="type-btn active" data-type="gasto">Gasto</button><button type="button" class="type-btn" data-type="ingreso">Ingreso</button></div></div>
            <div class="form-group"><label>Monto</label><input type="number" id="amount" step="0.01" required placeholder="0.00"></div>
            <div class="form-group"><label>Fecha</label><input type="date" id="date" required></div>
            <div class="form-group"><label>Categoría</label><select id="categoryId" required></select></div>
            <div class="form-group"><label>Billetera</label><select id="accId" required></select></div>
            <div class="form-group"><label>Nota / Comentario</label><textarea id="note" rows="2" placeholder="Opcional"></textarea></div>
            <div class="form-group discount-group"><label><input type="checkbox" id="hasDiscount"> Aplicar descuento</label><div id="discountFields" style="display:none;"><div class="discount-type"><label><input type="radio" name="discountType" value="percent" checked> Porcentaje (%)</label><label><input type="radio" name="discountType" value="fixed"> Monto fijo</label></div><input type="number" id="discountValue" step="0.01" placeholder="Valor del descuento"></div></div>
            <div class="form-actions"><button type="button" class="btn-secondary modal-close">Cancelar</button><button type="submit" class="btn-primary">Guardar</button></div>
        `;
    }
    // Account form
    const accForm = document.getElementById('accountForm');
    if (accForm && accForm.children.length === 1) {
        accForm.innerHTML = `
            <input type="hidden" id="accountId">
            <div class="form-group"><label>Nombre</label><input type="text" id="accName" required placeholder="Ej: Principal, Ahorros"></div>
            <div class="form-group"><label>Ícono (clase Font Awesome)</label><input type="text" id="accIcon" value="fa-wallet" placeholder="fa-wallet, fa-bank, etc."></div>
            <div class="form-group"><label>Color</label><select id="accColor"><option value="bg-emerald-100 text-emerald-600">Verde</option><option value="bg-blue-100 text-blue-600">Azul</option><option value="bg-purple-100 text-purple-600">Morado</option><option value="bg-amber-100 text-amber-600">Ámbar</option><option value="bg-rose-100 text-rose-600">Rosa</option></select></div>
            <div class="form-group"><label>Imagen URL (opcional)</label><input type="url" id="accImageUrl" placeholder="https://ejemplo.com/imagen.png"></div>
            <div class="form-actions"><button type="button" class="btn-secondary modal-close">Cancelar</button><button type="submit" class="btn-primary">Guardar</button></div>
        `;
    }
    // Category form
    const catForm = document.getElementById('categoryForm');
    if (catForm && catForm.children.length === 1) {
        catForm.innerHTML = `
            <input type="hidden" id="categoryId">
            <div class="form-group"><label>Nombre</label><input type="text" id="catName" required></div>
            <div class="form-group"><label>Color</label><input type="color" id="catColor" value="#10b981"></div>
            <div class="form-group"><label>Imagen URL (opcional)</label><input type="url" id="catImageUrl" placeholder="https://ejemplo.com/imagen.png"></div>
            <div class="form-actions"><button type="button" class="btn-secondary modal-close">Cancelar</button><button type="submit" class="btn-primary">Guardar</button></div>
        `;
    }
    // Budget form
    const budForm = document.getElementById('budgetForm');
    if (budForm && budForm.children.length === 1) {
        budForm.innerHTML = `
            <input type="hidden" id="budgetId">
            <div class="form-group"><label>Categoría</label><select id="budgetCategoryId" required></select></div>
            <div class="form-group"><label>Monto presupuestado (ARS)</label><input type="number" id="budgetAmount" step="0.01" required></div>
            <div class="form-group"><label>Mes</label><input type="month" id="budgetMonth" required></div>
            <div class="form-actions"><button type="button" class="btn-secondary modal-close">Cancelar</button><button type="submit" class="btn-primary">Guardar</button></div>
        `;
    }
    // Goal form
    const goalForm = document.getElementById('goalForm');
    if (goalForm && goalForm.children.length === 1) {
        goalForm.innerHTML = `
            <input type="hidden" id="goalId">
            <div class="form-group"><label>Nombre de la meta</label><input type="text" id="goalName" required></div>
            <div class="form-group"><label>Monto objetivo (ARS)</label><input type="number" id="goalTarget" step="0.01" required></div>
            <div class="form-group"><label>Color</label><input type="color" id="goalColor" value="#3b82f6"></div>
            <div class="form-group"><label>Imagen URL (opcional)</label><input type="url" id="goalImageUrl" placeholder="https://ejemplo.com/imagen.png"></div>
            <div class="form-actions"><button type="button" class="btn-secondary modal-close">Cancelar</button><button type="submit" class="btn-primary">Guardar</button></div>
        `;
    }
}

let currentModal = null;
function openModal(id) { const m = document.getElementById(id); if (m) { m.classList.add('active'); currentModal = m; } }
function closeModal() { if (currentModal) { currentModal.classList.remove('active'); currentModal = null; } }

function openTransactionModal(id = null) {
    ensureModals(); updateFilters();
    document.getElementById('transactionId').value = id || '';
    document.getElementById('date').value = new Date().toISOString().split('T')[0];
    document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.type-btn[data-type="gasto"]').classList.add('active');
    if (id) {
        const t = transactions.find(tx => tx.id === id);
        if (t) {
            document.getElementById('amount').value = t.amount;
            document.getElementById('date').value = t.date.split('T')[0];
            document.getElementById('categoryId').value = t.catId;
            document.getElementById('accId').value = t.accId;
            document.getElementById('note').value = t.note || '';
            document.querySelector(`.type-btn[data-type="${t.type}"]`).classList.add('active');
            if (t.discount) {
                document.getElementById('hasDiscount').checked = true;
                document.getElementById('discountFields').style.display = 'block';
                if (t.discountPercent) {
                    document.querySelector('input[name="discountType"][value="percent"]').checked = true;
                    document.getElementById('discountValue').value = t.discountPercent;
                } else {
                    document.querySelector('input[name="discountType"][value="fixed"]').checked = true;
                    document.getElementById('discountValue').value = t.discountFixed;
                }
            } else {
                document.getElementById('hasDiscount').checked = false;
                document.getElementById('discountFields').style.display = 'none';
            }
        }
    } else {
        document.getElementById('hasDiscount').checked = false;
        document.getElementById('discountFields').style.display = 'none';
    }
    openModal('transactionModal');
}

function openAccountModal(id = null) {
    ensureModals();
    document.getElementById('accountId').value = id || '';
    if (id) {
        const acc = accounts.find(a => a.id === id);
        if (acc) {
            document.getElementById('accName').value = acc.name;
            document.getElementById('accIcon').value = acc.icon || 'fa-wallet';
            document.getElementById('accColor').value = acc.color;
            document.getElementById('accImageUrl').value = acc.imageUrl || '';
        }
    } else {
        document.getElementById('accName').value = '';
        document.getElementById('accIcon').value = 'fa-wallet';
        document.getElementById('accColor').value = 'bg-emerald-100 text-emerald-600';
        document.getElementById('accImageUrl').value = '';
    }
    openModal('accountModal');
}

function openCategoryModal(id = null) {
    ensureModals();
    document.getElementById('categoryId').value = id || '';
    if (id) {
        const cat = categories.find(c => c.id === id);
        if (cat) {
            document.getElementById('catName').value = cat.name;
            document.getElementById('catColor').value = cat.color;
            document.getElementById('catImageUrl').value = cat.imageUrl || '';
        }
    } else {
        document.getElementById('catName').value = '';
        document.getElementById('catColor').value = '#10b981';
        document.getElementById('catImageUrl').value = '';
    }
    openModal('categoryModal');
}

function openBudgetModal(id = null) {
    ensureModals(); updateFilters();
    document.getElementById('budgetId').value = id || '';
    if (id) {
        const b = budgets.find(b => b.id === id);
        if (b) {
            document.getElementById('budgetCategoryId').value = b.categoryId;
            document.getElementById('budgetAmount').value = b.amount;
            document.getElementById('budgetMonth').value = b.month;
        }
    } else {
        document.getElementById('budgetCategoryId').value = '';
        document.getElementById('budgetAmount').value = '';
        document.getElementById('budgetMonth').value = new Date().toISOString().slice(0,7);
    }
    openModal('budgetModal');
}

function openGoalModal(id = null) {
    ensureModals();
    document.getElementById('goalId').value = id || '';
    if (id) {
        const g = goals.find(g => g.id === id);
        if (g) {
            document.getElementById('goalName').value = g.name;
            document.getElementById('goalTarget').value = g.targetAmount;
            document.getElementById('goalColor').value = g.color;
            document.getElementById('goalImageUrl').value = g.imageUrl || '';
        }
    } else {
        document.getElementById('goalName').value = '';
        document.getElementById('goalTarget').value = '';
        document.getElementById('goalColor').value = '#3b82f6';
        document.getElementById('goalImageUrl').value = '';
    }
    openModal('goalModal');
}

function editGoal(id) {
    const goal = goals.find(g => g.id === id);
    if (!goal) return;
    const newAmount = prompt(`Editar progreso de "${goal.name}"\nMonto actual: ${formatCurrency(goal.currentAmount)}\nMonto objetivo: ${formatCurrency(goal.targetAmount)}\nIngrese el nuevo monto ahorrado:`, goal.currentAmount);
    if (newAmount !== null) {
        const parsed = parseFloat(newAmount);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= goal.targetAmount) {
            updateGoal(id, { currentAmount: parsed });
        } else { showToast('Monto inválido', 'error'); }
    }
}

// Handlers globales
window.deleteTransactionHandler = (id) => { if (confirm('¿Eliminar esta transacción?')) deleteTransaction(id); };
window.deleteAccountHandler = (id) => { if (confirm('¿Eliminar esta billetera?')) deleteAccount(id); };
window.deleteCategoryHandler = (id) => { if (confirm('¿Eliminar esta categoría?')) deleteCategory(id); };
window.deleteBudget = (id) => { if (confirm('¿Eliminar este presupuesto?')) deleteBudget(id); };
window.deleteGoalHandler = (id) => { if (confirm('¿Eliminar esta meta?')) deleteGoal(id); };
window.editTransaction = openTransactionModal;
window.editAccount = openAccountModal;
window.editCategory = openCategoryModal;
window.editGoal = editGoal;

function switchView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById(`${viewId}View`);
    if (target) target.classList.add('active');
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.view === viewId) item.classList.add('active');
    });
    const titles = { dashboard:'Dashboard', transactions:'Transacciones', accounts:'Billeteras', categories:'Categorías', budgets:'Presupuestos', goals:'Metas', calendar:'Calendario', bitcoin:'Bitcoin', expenses:'Gastos' };
    document.getElementById('currentViewTitle').innerText = titles[viewId] || 'Dashboard';
    if (viewId === 'expenses') renderExpenseReport();
}

// ========== EVENT LISTENERS ==========
document.addEventListener('DOMContentLoaded', () => {
    ensureModals();
    initializeData();
    refreshAllViews();
    switchView('dashboard');
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => { e.preventDefault(); switchView(item.dataset.view); });
    });
    document.querySelectorAll('[data-view]').forEach(link => {
        link.addEventListener('click', (e) => { e.preventDefault(); switchView(link.dataset.view); });
    });
    
    document.getElementById('addTransactionBtn')?.addEventListener('click', () => openTransactionModal());
    document.getElementById('addTransactionBtn2')?.addEventListener('click', () => openTransactionModal());
    document.getElementById('addAccountBtn')?.addEventListener('click', () => openAccountModal());
    document.getElementById('addCategoryBtn')?.addEventListener('click', () => openCategoryModal());
    document.getElementById('addBudgetBtn')?.addEventListener('click', () => openBudgetModal());
    document.getElementById('addGoalBtn')?.addEventListener('click', () => openGoalModal());
    document.getElementById('importBackupBtn')?.addEventListener('click', () => {
        const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json';
        inp.onchange = (e) => { const file = e.target.files[0]; if (file) { const r = new FileReader(); r.onload = (ev) => importFromJSON(ev.target.result); r.readAsText(file); } };
        inp.click();
    });
    document.getElementById('exportBackupBtn')?.addEventListener('click', exportToJSON);
    document.getElementById('shareWalletBtn')?.addEventListener('click', () => generateShareCode());
    document.getElementById('joinWalletBtn')?.addEventListener('click', () => { const code = prompt("Código:"); if(code) joinWithCode(code); });
    document.getElementById('loginGoogleBtn')?.addEventListener('click', loginWithGoogle);
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    document.getElementById('addBtcBtn')?.addEventListener('click', () => { const amt = parseFloat(document.getElementById('btcAmount')?.value); if(amt>0) addBTC(amt); });
    document.getElementById('removeBtcBtn')?.addEventListener('click', () => { const amt = parseFloat(document.getElementById('btcAmount')?.value); if(amt>0) removeBTC(amt); });
    document.getElementById('generateExpenseReportBtn')?.addEventListener('click', () => renderExpenseReport());
    document.getElementById('clearFilters')?.addEventListener('click', () => {
        if(document.getElementById('filterType')) document.getElementById('filterType').value = 'all';
        if(document.getElementById('filterAccount')) document.getElementById('filterAccount').value = 'all';
        if(document.getElementById('filterCategory')) document.getElementById('filterCategory').value = 'all';
        if(document.getElementById('filterMonth')) document.getElementById('filterMonth').value = '';
        renderTransactionsList();
    });
    document.getElementById('filterType')?.addEventListener('change', renderTransactionsList);
    document.getElementById('filterAccount')?.addEventListener('change', renderTransactionsList);
    document.getElementById('filterCategory')?.addEventListener('change', renderTransactionsList);
    document.getElementById('filterMonth')?.addEventListener('change', renderTransactionsList);
    document.getElementById('prevMonth')?.addEventListener('click', () => { currentCalendarDate.setMonth(currentCalendarDate.getMonth()-1); renderCalendar(); });
    document.getElementById('nextMonth')?.addEventListener('click', () => { currentCalendarDate.setMonth(currentCalendarDate.getMonth()+1); renderCalendar(); });
    document.getElementById('expenseReportType')?.addEventListener('change', () => renderExpenseReport());
    document.getElementById('expenseReportMonth')?.addEventListener('change', () => renderExpenseReport());
    
    // Formularios
    document.getElementById('transactionForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('transactionId').value;
        const type = document.querySelector('.type-btn.active')?.dataset.type;
        if (!type) return;
        let amount = parseFloat(document.getElementById('amount').value);
        const date = document.getElementById('date').value;
        const catId = document.getElementById('categoryId').value;
        const accId = document.getElementById('accId').value;
        const note = document.getElementById('note').value;
        const hasDiscount = document.getElementById('hasDiscount')?.checked;
        let discountPercent=0, discountFixed=0, originalAmount=amount;
        if (hasDiscount) {
            const discountType = document.querySelector('input[name="discountType"]:checked')?.value;
            const discountVal = parseFloat(document.getElementById('discountValue').value);
            if (discountType === 'percent') { discountPercent = discountVal; amount = originalAmount * (1 - discountVal/100); }
            else if (discountType === 'fixed') { discountFixed = discountVal; amount = originalAmount - discountVal; }
        }
        const txData = { amount, originalAmount, catId, accId, note, type, date: new Date(date).toISOString(), discount: hasDiscount, discountPercent, discountFixed, currency: 'ARS' };
        if (id) updateTransaction(id, txData);
        else addTransaction(txData);
        closeModal();
    });
    document.getElementById('accountForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('accountId').value;
        const name = document.getElementById('accName').value;
        const icon = document.getElementById('accIcon').value;
        const color = document.getElementById('accColor').value;
        const imageUrl = document.getElementById('accImageUrl').value;
        if (id) updateAccount(id, { name, icon, color, imageUrl });
        else addAccount({ name, icon, color, imageUrl });
        closeModal();
    });
    document.getElementById('categoryForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('categoryId').value;
        const name = document.getElementById('catName').value;
        const color = document.getElementById('catColor').value;
        const imageUrl = document.getElementById('catImageUrl').value;
        if (id) updateCategory(id, { name, color, imageUrl });
        else addCategory({ name, color, imageUrl });
        closeModal();
    });
    document.getElementById('budgetForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('budgetId').value;
        const categoryId = document.getElementById('budgetCategoryId').value;
        const amount = document.getElementById('budgetAmount').value;
        const month = document.getElementById('budgetMonth').value;
        if (id) updateBudget(id, { categoryId, amount, month });
        else addBudget({ categoryId, amount, month });
        closeModal();
    });
    document.getElementById('goalForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('goalId').value;
        const name = document.getElementById('goalName').value;
        const targetAmount = document.getElementById('goalTarget').value;
        const color = document.getElementById('goalColor').value;
        const imageUrl = document.getElementById('goalImageUrl').value;
        if (id) updateGoal(id, { name, targetAmount, color, imageUrl });
        else addGoal({ name, targetAmount, color, imageUrl });
        closeModal();
    });
    
    document.querySelectorAll('.modal-close').forEach(btn => btn.addEventListener('click', closeModal));
    window.addEventListener('click', (e) => { if (e.target.classList.contains('modal')) closeModal(); });
    document.getElementById('menuToggle')?.addEventListener('click', () => document.getElementById('sidebar').classList.toggle('open'));
    document.getElementById('closeSidebar')?.addEventListener('click', () => document.getElementById('sidebar').classList.remove('open'));
    
    // Type toggle (dinámico)
    document.body.addEventListener('click', (e) => {
        if (e.target.classList.contains('type-btn')) {
            document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
        }
    });
    document.body.addEventListener('change', (e) => {
        if (e.target.id === 'hasDiscount') {
            const df = document.getElementById('discountFields');
            if (df) df.style.display = e.target.checked ? 'block' : 'none';
        }
    });
});
