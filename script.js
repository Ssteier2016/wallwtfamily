// ============================================
// IMPORTS DE FIREBASE (MÓDULO ES6)
// ============================================
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, setPersistence, browserLocalPersistence, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
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
    setPersistence(auth, browserLocalPersistence);

    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            syncEnabled = true;
            const userNameSpan = document.getElementById('userName');
            const loginBtn = document.getElementById('loginGoogleBtn');
            const logoutBtn = document.getElementById('logoutBtn');
            if (userNameSpan) userNameSpan.innerText = user.displayName || user.email;
            if (loginBtn) loginBtn.style.display = 'none';
            if (logoutBtn) logoutBtn.style.display = 'flex';
        } else {
            currentUser = null;
            syncEnabled = false;
            const userNameSpan = document.getElementById('userName');
            const loginBtn = document.getElementById('loginGoogleBtn');
            const logoutBtn = document.getElementById('logoutBtn');
            if (userNameSpan) userNameSpan.innerText = '';
            if (loginBtn) loginBtn.style.display = 'flex';
            if (logoutBtn) logoutBtn.style.display = 'none';
        }
    });

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
let btcHistory = [];
let solHoldings = 0;
let solHistory = [];
let bnbHoldings = 0;
let bnbHistory = [];
let nexoHoldings = 0;
let nexoHistory = [];
let cedearHoldings = {};
let cedearPrices = {};
let cedearCustomImages = {};
let cedearUSDExchange = 1;
let cedearSortBy = 'none'; // 'value', 'percent', 'none'
let expenseChartPeriod = 'monthly'; // 'daily', 'weekly', 'monthly'
const cedearImages = {
    'TSLA': 'https://logo.clearbit.com/tesla.com',
    'MSFT': 'https://logo.clearbit.com/microsoft.com',
    'AAPL': 'https://logo.clearbit.com/apple.com',
    'AMZN': 'https://logo.clearbit.com/amazon.com',
    'NVDA': 'https://logo.clearbit.com/nvidia.com',
    'YPF': 'https://logo.clearbit.com/ypf.com',
    'ALUAR': 'https://logo.clearbit.com/aluar.com.ar',
    'CAT': 'https://logo.clearbit.com/caterpillar.com',
    'BA': 'https://logo.clearbit.com/boeing.com',
    'KO': 'https://logo.clearbit.com/coca-cola.com',
    'MELI': 'https://logo.clearbit.com/mercadolibre.com',
    'META': 'https://logo.clearbit.com/meta.com',
    'GOOGL': 'https://logo.clearbit.com/google.com',
    'SHOP': 'https://logo.clearbit.com/shopify.com',
    'NKE': 'https://logo.clearbit.com/nike.com',
    // Acciones argentinas
    'YPF.BA': 'https://logo.clearbit.com/ypf.com',
    'GGAL.BA': 'https://logo.clearbit.com/ggal.com.ar',
    'PAMP.BA': 'https://logo.clearbit.com/pampaenergia.com',
    'COME.BA': 'https://logo.clearbit.com/sociedad-comercial-del-plata.com',
    'TXAR.BA': 'https://logo.clearbit.com/ternium.com',
    'ALUA.BA': 'https://logo.clearbit.com/aluar.com.ar',
    'BMA.BA': 'https://logo.clearbit.com/banco-macro.com.ar',
    'BBAR.BA': 'https://logo.clearbit.com/bbva.com.ar'
};
let dolarMEP = 1000; // fallback
let dolarBlueCompra = 0;
let dolarBlueVenta = 0;

const ALPHA_VANTAGE_KEY = '1RW4YGC5ZFFQHGA6'; // ← reemplazá con tu key

// Ratios BYMA completos del PDF actualizado 16/4/2026
const BYMA_RATIOS = {
    AABA:3, AAL:2, AAP:14, AAPL:20, ABBV:10, ABEV:0.333, ABT:4, ACN:75,
    ADBE:44, ADP:6, AMD:10, AMGN:30, AMZN:144, ARKK:10, ARM:27, ASML:146,
    AVGO:39, AXP:15, AZN:4, BA:24, BABA:9, BAK:2, BIIB:13, BK:2,
    BKNG:700, BMY:3, BP:5, BRKB:22, BX:30, C:3, CAR:26, CAT:20,
    CCL:3, CEG:45, CIBR:10, CL:3, CLS:20, COIN:27, COPX:14, COST:48,
    CRM:18, CRWV:27, CSCO:5, CVS:15, CVX:16, DAL:8, DD:5, DE:40,
    DECK:25, DEO:6, DHR:54, DIA:20, DISN:12, DOCU:22, DOW:6, EA:14,
    EBAY:2, ECL:56, EEM:5, EFA:18, EFX:16, EQNR:6, ERIC:2, ERJ:1,
    ESGU:30, ETHA:5, ETSY:16, EWJ:14, EWY:50, EWZ:2, F:1, FCX:3,
    FDX:10, FSLR:18, FXI:5, GDX:10, GE:8, GILD:4, GLD:50, GLOB:18,
    GM:6, GOOGL:58, GS:13, GT:2, HAL:2, HD:32, HOG:3, HON:8,
    HOOD:29, HPQ:1, HSBC:2, HSY:21, HWM:1, IBB:27, IBIT:10, IBM:15,
    ICLN:5, IEMG:12, IFF:12, IJH:12, ILF:6, INFY:1, ING:3, INTC:5,
    IP:4, IREN:12, ISRG:90, ITA:50, ITUB:1, IVE:40, IVV:692, IVW:20,
    IWM:10, JCI:2, JD:4, JNJ:15, JPM:15, KB:2, KGC:1, KMB:6,
    KO:5, KOFM:2, LAC:1, LFC:2, LLY:56, LMT:20, LRCX:56, LVS:2,
    MA:33, MCD:24, MDLZ:15, MDT:4, MELI:120, META:24, MMM:10, MO:4,
    MOS:5, MRK:5, MRNA:19, MRVL:14, MSFT:30, MSI:20, MSTR:20, MU:5,
    NEM:3, NFLX:48, NIO:4, NKE:12, NOW:172, NTES:14, NUE:16, NVDA:24,
    NVS:4, OKLO:28, ORCL:3, ORLY:222, OXY:5, PAAS:3, PANW:50, PBR:1,
    PEP:18, PFE:4, PG:15, PINS:7, PLTR:3, PM:18, PYPL:8, QCOM:11,
    QQQ:20, RBLX:2, RIO:8, RIOT:3, RKLB:12, ROKU:13, ROST:4, RSP:30,
    RTX:5, SAP:6, SBUX:12, SCHW:13, SE:32, SHEL:2, SHOP:107, SLB:3,
    SLV:6, SMH:50, SNAP:1, SNOW:30, SONY:8, SPGI:45, SPOT:28, SPXL:25,
    SPY:20, STLA:5, STNE:3, SWKS:21, SYY:8, T:3, TEAM:47, TEM:12,
    TGT:24, TJX:22, TM:15, TMO:22, TMUS:33, TQQQ:25, TSLA:15, TSM:9,
    TTE:3, TWLO:36, TXN:5, UAL:5, UBER:2, UL:3, UNH:33, UNP:20,
    UPST:5, URA:5, USB:5, USO:15, V:18, VALE:2, VEA:10, VIG:39,
    VIST:3, VOD:1, VRTX:101, VST:26, VXX:5, VZ:4, WBA:3, WFC:5,
    WMT:18, XLB:18, XLC:19, XLE:2, XLF:2, XLI:28, XLK:46, XLP:16,
    XLRE:9, XLV:29, XLY:43, XME:30, XOM:10, XP:4, XPEV:4, YPF:1,
    ZM:47, ALUAR:1, BIDU:11, BIOX:1, GFI:1, GRMN:3, GSK:4,
    HDB:2, HMC:1, HMY:1, JMIA:1, JOYY:5, KEP:1, NG:0.25, NGG:2,
    NLM:2, NMR:1, NOKA:1, NSAN:1, RACE:83, RGTI:2, SNA:6, SNP:3,
    SPCE:0.5, STNE:3, SUZ:1, TIIAY:1, TIMB:1, TRIP:2, TRVV:6,
    TTM:1, TV:3, TWTR:2, TXR:4, UGP:1, UN:2, URBN:2, YELP:2, YZCA:2,
    // Acciones argentinas (ratio 1, precios en ARS)
    'YPF.BA':1, 'GGAL.BA':1, 'PAMP.BA':1, 'COME.BA':1, 'TXAR.BA':1, 'ALUA.BA':1, 'BMA.BA':1, 'BBAR.BA':1
};

const defaultCedears = Object.keys(BYMA_RATIOS);

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
    try {
        const savedTransactions = localStorage.getItem('finanzas_transactions');
        const savedAccounts = localStorage.getItem('finanzas_accounts');
        const savedCategories = localStorage.getItem('finanzas_categories');
        const savedBudgets = localStorage.getItem('finanzas_budgets');
        const savedGoals = localStorage.getItem('finanzas_goals');
        const savedBtc = localStorage.getItem('finanzas_btc');
        const savedBtcHistory = localStorage.getItem('finanzas_btc_history');
        const savedSol = localStorage.getItem('finanzas_sol');
        const savedSolHistory = localStorage.getItem('finanzas_sol_history');
        const savedBnb = localStorage.getItem('finanzas_bnb');
        const savedBnbHistory = localStorage.getItem('finanzas_bnb_history');
        const savedNexo = localStorage.getItem('finanzas_nexo');
        const savedNexoHistory = localStorage.getItem('finanzas_nexo_history');
        const savedCedears = localStorage.getItem('finanzas_cedear_holdings');
        const savedCedearPrices = localStorage.getItem('finanzas_cedear_prices');
        const savedCedearImages = localStorage.getItem('finanzas_cedear_custom_images');

        transactions = savedTransactions ? JSON.parse(savedTransactions) : [];
        accounts = savedAccounts ? JSON.parse(savedAccounts) : JSON.parse(JSON.stringify(defaultAccounts));
        categories = savedCategories ? JSON.parse(savedCategories) : JSON.parse(JSON.stringify(defaultCategories));
        budgets = savedBudgets ? JSON.parse(savedBudgets) : [];
        goals = savedGoals ? JSON.parse(savedGoals) : [];
          btcHoldings = savedBtc ? parseFloat(savedBtc) : 0;
          btcHistory = savedBtcHistory ? JSON.parse(savedBtcHistory) : [];
          solHoldings = savedSol ? parseFloat(savedSol) : 0;
          solHistory = savedSolHistory ? JSON.parse(savedSolHistory) : [];
          bnbHoldings = savedBnb ? parseFloat(savedBnb) : 0;
          bnbHistory = savedBnbHistory ? JSON.parse(savedBnbHistory) : [];
          nexoHoldings = savedNexo ? parseFloat(savedNexo) : 0;
          nexoHistory = savedNexoHistory ? JSON.parse(savedNexoHistory) : [];
          cedearHoldings = savedCedears ? JSON.parse(savedCedears) : {};
          cedearPrices = savedCedearPrices ? JSON.parse(savedCedearPrices) : {};
          cedearCustomImages = savedCedearImages ? JSON.parse(savedCedearImages) : {};

        if (!Array.isArray(transactions)) transactions = [];
        if (!Array.isArray(accounts)) accounts = JSON.parse(JSON.stringify(defaultAccounts));
        if (!Array.isArray(categories)) categories = JSON.parse(JSON.stringify(defaultCategories));
        if (!Array.isArray(budgets)) budgets = [];
        if (!Array.isArray(goals)) goals = [];
          if (!Array.isArray(btcHistory)) btcHistory = [];
          if (!Array.isArray(solHistory)) solHistory = [];
          if (!Array.isArray(bnbHistory)) bnbHistory = [];
          if (!Array.isArray(nexoHistory)) nexoHistory = [];
          if (typeof cedearHoldings !== 'object') cedearHoldings = {};
          if (typeof cedearPrices !== 'object') cedearPrices = {};

        recalculateAllBalances();
        saveToLocalStorage();
    } catch(e) {
        console.error("Error inicializando datos:", e);
        transactions = [];
        accounts = JSON.parse(JSON.stringify(defaultAccounts));
        categories = JSON.parse(JSON.stringify(defaultCategories));
        budgets = [];
        goals = [];
        btcHoldings = 0;
        btcHistory = [];
        solHoldings = 0;
        solHistory = [];
        bnbHoldings = 0;
        bnbHistory = [];
        nexoHoldings = 0;
        nexoHistory = [];
        recalculateAllBalances();
        saveToLocalStorage();
    }
}

function saveToLocalStorage() {
    localStorage.setItem('finanzas_transactions', JSON.stringify(transactions));
    localStorage.setItem('finanzas_accounts', JSON.stringify(accounts));
    localStorage.setItem('finanzas_categories', JSON.stringify(categories));
    localStorage.setItem('finanzas_budgets', JSON.stringify(budgets));
    localStorage.setItem('finanzas_goals', JSON.stringify(goals));
    localStorage.setItem('finanzas_btc', btcHoldings.toString());
    localStorage.setItem('finanzas_btc_history', JSON.stringify(btcHistory));
    localStorage.setItem('finanzas_sol', solHoldings.toString());
    localStorage.setItem('finanzas_sol_history', JSON.stringify(solHistory));
    localStorage.setItem('finanzas_bnb', bnbHoldings.toString());
    localStorage.setItem('finanzas_bnb_history', JSON.stringify(bnbHistory));
    localStorage.setItem('finanzas_nexo', nexoHoldings.toString());
    localStorage.setItem('finanzas_nexo_history', JSON.stringify(nexoHistory));
    localStorage.setItem('finanzas_cedear_holdings', JSON.stringify(cedearHoldings));
    localStorage.setItem('finanzas_cedear_prices', JSON.stringify(cedearPrices));
    localStorage.setItem('finanzas_cedear_custom_images', JSON.stringify(cedearCustomImages));
}

function recalculateAllBalances() {
    if (!Array.isArray(accounts)) accounts = [];
    accounts.forEach(acc => acc.balance = 0);
    if (!Array.isArray(transactions)) transactions = [];
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
            solHoldings, solHistory, bnbHoldings, bnbHistory, nexoHoldings, nexoHistory,
            cedearHoldings, cedearPrices,
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
            transactions = Array.isArray(data.transactions) ? data.transactions : [];
            accounts = Array.isArray(data.accounts) ? data.accounts : [];
            categories = Array.isArray(data.categories) ? data.categories : [];
            budgets = Array.isArray(data.budgets) ? data.budgets : [];
            goals = Array.isArray(data.goals) ? data.goals : [];
        btcHoldings = typeof data.btcHoldings === 'number' ? data.btcHoldings : 0;
        btcHistory = Array.isArray(data.btcHistory) ? data.btcHistory : [];
        solHoldings = typeof data.solHoldings === 'number' ? data.solHoldings : 0;
        solHistory = Array.isArray(data.solHistory) ? data.solHistory : [];
        bnbHoldings = typeof data.bnbHoldings === 'number' ? data.bnbHoldings : 0;
        bnbHistory = Array.isArray(data.bnbHistory) ? data.bnbHistory : [];
        nexoHoldings = typeof data.nexoHoldings === 'number' ? data.nexoHoldings : 0;
        nexoHistory = Array.isArray(data.nexoHistory) ? data.nexoHistory : [];
        cedearHoldings = typeof data.cedearHoldings === 'object' ? data.cedearHoldings : {};
        cedearPrices = typeof data.cedearPrices === 'object' ? data.cedearPrices : {};
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
        if (data.transactions && Array.isArray(data.transactions)) transactions = data.transactions;
        if (data.accounts && Array.isArray(data.accounts)) accounts = data.accounts;
        if (data.categories && Array.isArray(data.categories)) categories = data.categories;
        if (data.budgets && Array.isArray(data.budgets)) budgets = data.budgets;
        if (data.goals && Array.isArray(data.goals)) goals = data.goals;
        if (typeof data.btcHoldings === 'number') btcHoldings = data.btcHoldings;
        if (data.btcHistory && Array.isArray(data.btcHistory)) btcHistory = data.btcHistory;
        if (typeof data.solHoldings === 'number') solHoldings = data.solHoldings;
        if (data.solHistory && Array.isArray(data.solHistory)) solHistory = data.solHistory;
        if (typeof data.bnbHoldings === 'number') bnbHoldings = data.bnbHoldings;
        if (data.bnbHistory && Array.isArray(data.bnbHistory)) bnbHistory = data.bnbHistory;
        if (typeof data.nexoHoldings === 'number') nexoHoldings = data.nexoHoldings;
        if (data.nexoHistory && Array.isArray(data.nexoHistory)) nexoHistory = data.nexoHistory;
        if (data.cedearHoldings && typeof data.cedearHoldings === 'object') cedearHoldings = data.cedearHoldings;
        if (data.cedearPrices && typeof data.cedearPrices === 'object') cedearPrices = data.cedearPrices;
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
    const exportData = {
        transactions, accounts, categories, budgets, goals, btcHoldings, btcHistory,
        solHoldings, solHistory, bnbHoldings, bnbHistory, nexoHoldings, nexoHistory,
        cedearHoldings, cedearPrices, exportDate: new Date().toISOString()
    };
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

// ========== CRUD CUENTAS ==========
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

// ========== CRUD CATEGORÍAS ==========
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

// ========== CRUD METAS ==========
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

// ========== BITCOIN con saldo acumulado ==========
let currentBTCPriceUSD = 0, currentBTCPriceARS = 0;
let currentSOLPriceUSD = 0, currentSOLPriceARS = 0;
let currentBNBPriceUSD = 0, currentBNBPriceARS = 0;
let currentNEXOPriceUSD = 0, currentNEXOPriceARS = 0;
let prevBTCPriceUSD = 0, prevSOLPriceUSD = 0, prevBNBPriceUSD = 0, prevNEXOPriceUSD = 0;
let priceLastUpdateDate = '';

async function updateBTCPrice() {
    try {
        const today = new Date().toISOString().split('T')[0];

        // Si es un nuevo día, guarda los precios anteriores
        if (priceLastUpdateDate !== today) {
            prevBTCPriceUSD = currentBTCPriceUSD;
            prevSOLPriceUSD = currentSOLPriceUSD;
            prevBNBPriceUSD = currentBNBPriceUSD;
            prevNEXOPriceUSD = currentNEXOPriceUSD;
            priceLastUpdateDate = today;
        }

        const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,solana,binancecoin,nexo&vs_currencies=usd,ars');
        const data = await res.json();
        currentBTCPriceUSD = data.bitcoin?.usd || 0;
        currentBTCPriceARS = data.bitcoin?.ars || 0;
        currentSOLPriceUSD = data.solana?.usd || 0;
        currentSOLPriceARS = data.solana?.ars || 0;
        currentBNBPriceUSD = data.binancecoin?.usd || 0;
        currentBNBPriceARS = data.binancecoin?.ars || 0;
        currentNEXOPriceUSD = data.nexo?.usd || 0;
        currentNEXOPriceARS = data.nexo?.ars || 0;
        if (currentBTCPriceUSD > 0) cedearUSDExchange = currentBTCPriceARS / currentBTCPriceUSD;

        const btcPriceUSDElem = document.getElementById('btcPriceUSD');
        const btcPriceARSElem = document.getElementById('btcPriceARS');
        const totalBTCelem = document.getElementById('totalBTC');
        const btcValueUSDelem = document.getElementById('btcValueUSD');
        const btcValueARSelem = document.getElementById('btcValueARS');
        if (btcPriceUSDElem) btcPriceUSDElem.innerHTML = `<div>$${currentBTCPriceUSD.toLocaleString()}</div>${formatPriceVariation(currentBTCPriceUSD, prevBTCPriceUSD)}`;
        if (btcPriceARSElem) btcPriceARSElem.innerHTML = `$${currentBTCPriceARS.toLocaleString()}`;
        if (totalBTCelem) totalBTCelem.innerHTML = btcHoldings.toFixed(8);
        if (btcValueUSDelem) btcValueUSDelem.innerHTML = formatCurrencyUSD(btcHoldings * currentBTCPriceUSD);
        if (btcValueARSelem) btcValueARSelem.innerHTML = formatCurrency(btcHoldings * currentBTCPriceARS);

        const solPriceUSDElem = document.getElementById('solPriceUSD');
        const solPriceARSElem = document.getElementById('solPriceARS');
        const totalSOLelem = document.getElementById('totalSOL');
        const solValueUSDelem = document.getElementById('solValueUSD');
        const solValueARSelem = document.getElementById('solValueARS');
        if (solPriceUSDElem) solPriceUSDElem.innerHTML = `<div>$${currentSOLPriceUSD.toLocaleString()}</div>${formatPriceVariation(currentSOLPriceUSD, prevSOLPriceUSD)}`;
        if (solPriceARSElem) solPriceARSElem.innerHTML = `$${currentSOLPriceARS.toLocaleString()}`;
        if (totalSOLelem) totalSOLelem.innerHTML = solHoldings.toFixed(8);
        if (solValueUSDelem) solValueUSDelem.innerHTML = formatCurrencyUSD(solHoldings * currentSOLPriceUSD);
        if (solValueARSelem) solValueARSelem.innerHTML = formatCurrency(solHoldings * currentSOLPriceARS);

        const bnbPriceUSDElem = document.getElementById('bnbPriceUSD');
        const bnbPriceARSElem = document.getElementById('bnbPriceARS');
        const totalBNBelem = document.getElementById('totalBNB');
        const bnbValueUSDelem = document.getElementById('bnbValueUSD');
        const bnbValueARSelem = document.getElementById('bnbValueARS');
        if (bnbPriceUSDElem) bnbPriceUSDElem.innerHTML = `<div>$${currentBNBPriceUSD.toLocaleString()}</div>${formatPriceVariation(currentBNBPriceUSD, prevBNBPriceUSD)}`;
        if (bnbPriceARSElem) bnbPriceARSElem.innerHTML = `$${currentBNBPriceARS.toLocaleString()}`;
        if (totalBNBelem) totalBNBelem.innerHTML = bnbHoldings.toFixed(8);
        if (bnbValueUSDelem) bnbValueUSDelem.innerHTML = formatCurrencyUSD(bnbHoldings * currentBNBPriceUSD);
        if (bnbValueARSelem) bnbValueARSelem.innerHTML = formatCurrency(bnbHoldings * currentBNBPriceARS);

        const nexoPriceUSDElem = document.getElementById('nexoPriceUSD');
        const nexoPriceARSElem = document.getElementById('nexoPriceARS');
        const totalNEXOelem = document.getElementById('totalNEXO');
        const nexoValueUSDelem = document.getElementById('nexoValueUSD');
        const nexoValueARSelem = document.getElementById('nexoValueARS');
        if (nexoPriceUSDElem) nexoPriceUSDElem.innerHTML = `<div>$${currentNEXOPriceUSD.toLocaleString()}</div>${formatPriceVariation(currentNEXOPriceUSD, prevNEXOPriceUSD)}`;
        if (nexoPriceARSElem) nexoPriceARSElem.innerHTML = `$${currentNEXOPriceARS.toLocaleString()}`;
        if (totalNEXOelem) totalNEXOelem.innerHTML = nexoHoldings.toFixed(8);
        if (nexoValueUSDelem) nexoValueUSDelem.innerHTML = formatCurrencyUSD(nexoHoldings * currentNEXOPriceUSD);
        if (nexoValueARSelem) nexoValueARSelem.innerHTML = formatCurrency(nexoHoldings * currentNEXOPriceARS);

        renderCapitalView();
    } catch(e) { console.error('Error actualizando precios crypto:', e); }
}

async function updateCedearPrices() {
    try {
        const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd,ars');
        const data = await res.json();
        cedearUSDExchange = data.bitcoin.ars / data.bitcoin.usd;
    } catch (e) {
        console.error("Error obteniendo tasa USD/ARS:", e);
    }

    const apiKey = '1RW4YGC5ZFFQHGA6';
    const cedearTickers = defaultCedears;

    for (const ticker of cedearTickers) {
        try {
            const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${apiKey}`;
            const response = await fetch(url);
            const result = await response.json();

            if (result['Global Quote'] && result['Global Quote']['05. price']) {
                const priceUSD = parseFloat(result['Global Quote']['05. price']);
                if (!isNaN(priceUSD) && priceUSD > 0) {
                    cedearPrices[ticker] = priceUSD;
                }
            }
        } catch (e) {
            console.error(`Error obteniendo precio de ${ticker}:`, e);
        }
    }

    saveToLocalStorage();
    renderCapitalView();
}

// ========== DOLAR MEP ==========
async function updateDolarMEP() {
    try {
        const res = await fetch('https://api.bluelytics.com.ar/v2/latest');
        const data = await res.json();
        dolarMEP = data.oficial.value_sell;
        dolarBlueCompra = data.blue?.value_buy || 0;
        dolarBlueVenta = data.blue?.value_sell || 0;
        console.log('Dólar MEP:', dolarMEP, 'Blue Compra:', dolarBlueCompra, 'Blue Venta:', dolarBlueVenta);
        renderDashboardDolar();
    } catch(e) {
        console.warn('No se pudo obtener dólar, usando fallback:', dolarMEP);
    }
}

function renderDashboardDolar() {
    const compraElem = document.getElementById('dolarBlueCompra');
    const ventaElem = document.getElementById('dolarBlueVenta');
    if (compraElem) compraElem.innerText = `$${dolarBlueCompra.toFixed(2)}`;
    if (ventaElem) ventaElem.innerText = `$${dolarBlueVenta.toFixed(2)}`;
}

// ========== PRECIO CEDEAR via Alpha Vantage ==========
async function fetchCedearPrice(ticker) {
    try {
        const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${ALPHA_VANTAGE_KEY}`;
        const res = await fetch(url);
        const data = await res.json();
        const price = parseFloat(data['Global Quote']?.['05. price']);
        if (!isNaN(price) && price > 0) {
            cedearPrices[ticker] = price;
            saveToLocalStorage();
            return price;
        }
        return cedearPrices[ticker] || 0;
    } catch(e) {
        console.error(`Error obteniendo precio de ${ticker}:`, e);
        return cedearPrices[ticker] || 0;
    }
}

// Precio CEDEAR en ARS = (precio USD / ratio) * dolarMEP
function getCedearPriceARS(ticker) {
    const priceUSD = cedearPrices[ticker] || 0;
    const ratio = BYMA_RATIOS[ticker] || 1;
    return (priceUSD / ratio) * dolarMEP;
}

function formatCurrencyUSD(value) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(value);
}

function addBTC(amount) {
    if (amount <= 0) { showToast("Cantidad inválida", "error"); return; }
    btcHoldings += amount;
    const newMove = {
        id: 'btc-' + Date.now(),
        amount: amount,
        type: 'compra',
        date: new Date().toISOString(),
        priceUSD: currentBTCPriceUSD,
        priceARS: currentBTCPriceARS,
        note: '',
        imageUrl: ''
    };
    btcHistory.push(newMove);
    saveToLocalStorage();
    syncToCloud();
    updateBTCPrice();
    renderBTCHistory();
    showToast(`${amount} BTC agregado`, "success");
}

function addSOL(amount) {
    if (amount <= 0) { showToast("Cantidad inválida", "error"); return; }
    solHoldings += amount;
    const newMove = {
        id: 'sol-' + Date.now(),
        amount: amount,
        type: 'compra',
        date: new Date().toISOString(),
        priceUSD: currentSOLPriceUSD,
        priceARS: currentSOLPriceARS,
        note: '',
        imageUrl: ''
    };
    solHistory.push(newMove);
    saveToLocalStorage();
    syncToCloud();
    updateBTCPrice();
    renderSOLHistory();
    showToast(`${amount} SOL agregado`, "success");
}

function addBNB(amount) {
    if (amount <= 0) { showToast("Cantidad inválida", "error"); return; }
    bnbHoldings += amount;
    const newMove = {
        id: 'bnb-' + Date.now(),
        amount: amount,
        type: 'compra',
        date: new Date().toISOString(),
        priceUSD: currentBNBPriceUSD,
        priceARS: currentBNBPriceARS,
        note: '',
        imageUrl: ''
    };
    bnbHistory.push(newMove);
    saveToLocalStorage();
    syncToCloud();
    updateBTCPrice();
    renderBNBHistory();
    showToast(`${amount} BNB agregado`, "success");
}

function addNEXO(amount) {
    if (amount <= 0) { showToast("Cantidad inválida", "error"); return; }
    nexoHoldings += amount;
    const newMove = {
        id: 'nexo-' + Date.now(),
        amount: amount,
        type: 'compra',
        date: new Date().toISOString(),
        priceUSD: currentNEXOPriceUSD,
        priceARS: currentNEXOPriceARS,
        note: '',
        imageUrl: ''
    };
    nexoHistory.push(newMove);
    saveToLocalStorage();
    syncToCloud();
    updateBTCPrice();
    renderNEXOHistory();
    showToast(`${amount} NEXO agregado`, "success");
}

function removeBTC(amount) {
    if (amount <= 0) { showToast("Cantidad inválida", "error"); return; }
    if (btcHoldings < amount) { showToast("No tienes suficientes BTC", "error"); return; }
    btcHoldings -= amount;
    const newMove = {
        id: 'btc-' + Date.now(),
        amount: amount,
        type: 'venta',
        date: new Date().toISOString(),
        priceUSD: currentBTCPriceUSD,
        priceARS: currentBTCPriceARS,
        note: '',
        imageUrl: ''
    };
    btcHistory.push(newMove);
    saveToLocalStorage();
    syncToCloud();
    updateBTCPrice();
    renderBTCHistory();
    showToast(`${amount} BTC restado`, "success");
}

function removeSOL(amount) {
    if (amount <= 0) { showToast("Cantidad inválida", "error"); return; }
    if (solHoldings < amount) { showToast("No tienes suficientes SOL", "error"); return; }
    solHoldings -= amount;
    const newMove = {
        id: 'sol-' + Date.now(),
        amount: amount,
        type: 'venta',
        date: new Date().toISOString(),
        priceUSD: currentSOLPriceUSD,
        priceARS: currentSOLPriceARS,
        note: '',
        imageUrl: ''
    };
    solHistory.push(newMove);
    saveToLocalStorage();
    syncToCloud();
    updateBTCPrice();
    renderSOLHistory();
    showToast(`${amount} SOL restado`, "success");
}

function removeBNB(amount) {
    if (amount <= 0) { showToast("Cantidad inválida", "error"); return; }
    if (bnbHoldings < amount) { showToast("No tienes suficientes BNB", "error"); return; }
    bnbHoldings -= amount;
    const newMove = {
        id: 'bnb-' + Date.now(),
        amount: amount,
        type: 'venta',
        date: new Date().toISOString(),
        priceUSD: currentBNBPriceUSD,
        priceARS: currentBNBPriceARS,
        note: '',
        imageUrl: ''
    };
    bnbHistory.push(newMove);
    saveToLocalStorage();
    syncToCloud();
    updateBTCPrice();
    renderBNBHistory();
    showToast(`${amount} BNB restado`, "success");
}

function removeNEXO(amount) {
    if (amount <= 0) { showToast("Cantidad inválida", "error"); return; }
    if (nexoHoldings < amount) { showToast("No tienes suficientes NEXO", "error"); return; }
    nexoHoldings -= amount;
    const newMove = {
        id: 'nexo-' + Date.now(),
        amount: amount,
        type: 'venta',
        date: new Date().toISOString(),
        priceUSD: currentNEXOPriceUSD,
        priceARS: currentNEXOPriceARS,
        note: '',
        imageUrl: ''
    };
    nexoHistory.push(newMove);
    saveToLocalStorage();
    syncToCloud();
    updateBTCPrice();
    renderNEXOHistory();
    showToast(`${amount} NEXO restado`, "success");
}

function updateBtcMovement(id, updatedData) {
    const index = btcHistory.findIndex(m => m.id === id);
    if (index === -1) return;
    const oldMove = btcHistory[index];
    const oldAmount = oldMove.amount;
    const oldType = oldMove.type;
    const newAmount = updatedData.amount;
    const newType = updatedData.type;

    if (oldType === 'compra') btcHoldings -= oldAmount;
    else btcHoldings += oldAmount;

    if (newType === 'compra') btcHoldings += newAmount;
    else btcHoldings -= newAmount;

    btcHistory[index] = { ...oldMove, ...updatedData, amount: parseFloat(newAmount) };
    saveToLocalStorage();
    syncToCloud();
    updateBTCPrice();
    renderBTCHistory();
    refreshAllViews();
    showToast('Movimiento BTC actualizado', 'success');
}

function updateSolMovement(id, updatedData) {
    const index = solHistory.findIndex(m => m.id === id);
    if (index === -1) return;
    const oldMove = solHistory[index];
    const oldAmount = oldMove.amount;
    const oldType = oldMove.type;
    const newAmount = updatedData.amount;
    const newType = updatedData.type;

    if (oldType === 'compra') solHoldings -= oldAmount;
    else solHoldings += oldAmount;

    if (newType === 'compra') solHoldings += newAmount;
    else solHoldings -= newAmount;

    solHistory[index] = { ...oldMove, ...updatedData, amount: parseFloat(newAmount) };
    saveToLocalStorage();
    syncToCloud();
    updateBTCPrice();
    renderSOLHistory();
    refreshAllViews();
    showToast('Movimiento SOL actualizado', 'success');
}

function updateBnbMovement(id, updatedData) {
    const index = bnbHistory.findIndex(m => m.id === id);
    if (index === -1) return;
    const oldMove = bnbHistory[index];
    const oldAmount = oldMove.amount;
    const oldType = oldMove.type;
    const newAmount = updatedData.amount;
    const newType = updatedData.type;

    if (oldType === 'compra') bnbHoldings -= oldAmount;
    else bnbHoldings += oldAmount;

    if (newType === 'compra') bnbHoldings += newAmount;
    else bnbHoldings -= newAmount;

    bnbHistory[index] = { ...oldMove, ...updatedData, amount: parseFloat(newAmount) };
    saveToLocalStorage();
    syncToCloud();
    updateBTCPrice();
    renderBNBHistory();
    refreshAllViews();
    showToast('Movimiento BNB actualizado', 'success');
}

function updateNexoMovement(id, updatedData) {
    const index = nexoHistory.findIndex(m => m.id === id);
    if (index === -1) return;
    const oldMove = nexoHistory[index];
    const oldAmount = oldMove.amount;
    const oldType = oldMove.type;
    const newAmount = updatedData.amount;
    const newType = updatedData.type;

    if (oldType === 'compra') nexoHoldings -= oldAmount;
    else nexoHoldings += oldAmount;

    if (newType === 'compra') nexoHoldings += newAmount;
    else nexoHoldings -= newAmount;

    nexoHistory[index] = { ...oldMove, ...updatedData, amount: parseFloat(newAmount) };
    saveToLocalStorage();
    syncToCloud();
    updateBTCPrice();
    renderNEXOHistory();
    refreshAllViews();
    showToast('Movimiento NEXO actualizado', 'success');
}

function deleteBtcMovement(id) {
    const move = btcHistory.find(m => m.id === id);
    if (!move) return;
    if (move.type === 'compra') btcHoldings -= move.amount;
    else btcHoldings += move.amount;
    btcHistory = btcHistory.filter(m => m.id !== id);
    saveToLocalStorage();
    syncToCloud();
    updateBTCPrice();
    renderBTCHistory();
    refreshAllViews();
    showToast('Movimiento BTC eliminado', 'success');
}

function deleteSolMovement(id) {
    const move = solHistory.find(m => m.id === id);
    if (!move) return;
    if (move.type === 'compra') solHoldings -= move.amount;
    else solHoldings += move.amount;
    solHistory = solHistory.filter(m => m.id !== id);
    saveToLocalStorage();
    syncToCloud();
    updateBTCPrice();
    renderSOLHistory();
    refreshAllViews();
    showToast('Movimiento SOL eliminado', 'success');
}

function deleteBnbMovement(id) {
    const move = bnbHistory.find(m => m.id === id);
    if (!move) return;
    if (move.type === 'compra') bnbHoldings -= move.amount;
    else bnbHoldings += move.amount;
    bnbHistory = bnbHistory.filter(m => m.id !== id);
    saveToLocalStorage();
    syncToCloud();
    updateBTCPrice();
    renderBNBHistory();
    refreshAllViews();
    showToast('Movimiento BNB eliminado', 'success');
}

function deleteNexoMovement(id) {
    const move = nexoHistory.find(m => m.id === id);
    if (!move) return;
    if (move.type === 'compra') nexoHoldings -= move.amount;
    else nexoHoldings += move.amount;
    nexoHistory = nexoHistory.filter(m => m.id !== id);
    saveToLocalStorage();
    syncToCloud();
    updateBTCPrice();
    renderNEXOHistory();
    refreshAllViews();
    showToast('Movimiento NEXO eliminado', 'success');
}

// ========== CRUD CEDEARS ==========
function addOrUpdateCedear(ticker, amount) {
    if (amount < 0) { showToast("Cantidad inválida", "error"); return; }
    if (amount === 0) {
        delete cedearHoldings[ticker];
    } else {
        cedearHoldings[ticker] = parseFloat(amount);
    }
    saveToLocalStorage();
    syncToCloud();
    renderCapitalView();
    showToast(`${ticker} actualizado`, "success");
}

function renderBTCHistory() {
    const container = document.getElementById('btcHistoryList');
    if (!container) return;
    if (!Array.isArray(btcHistory) || btcHistory.length === 0) {
        container.innerHTML = '<div class="empty-state">Sin movimientos de BTC</div>';
        return;
    }
    const sorted = [...btcHistory].sort((a,b) => new Date(a.date) - new Date(b.date));
    let runningBalance = 0;
    const items = [];
    for (const move of sorted) {
        if (move.type === 'compra') runningBalance += move.amount;
        else runningBalance -= move.amount;
        items.push({ ...move, runningBalance });
    }
    items.reverse();
    container.innerHTML = items.map(m => `
        <div class="transaction-item">
            <div class="transaction-info">
                <div class="transaction-icon ${m.type === 'compra' ? 'ingreso' : 'gasto'}">
                    ${m.imageUrl ? `<img src="${m.imageUrl}" style="width:40px;height:40px;object-fit:cover;border-radius:12px;">` : `<i class="fas ${m.type === 'compra' ? 'fa-arrow-down' : 'fa-arrow-up'}"></i>`}
                </div>
                <div class="transaction-details">
                    <div class="transaction-description">${m.type === 'compra' ? 'Compra de BTC' : 'Venta de BTC'}${m.note ? `: ${escapeHtml(m.note)}` : ''}</div>
                    <div class="transaction-meta">${formatDate(m.date)} • Precio: ${formatCurrencyUSD(m.priceUSD)} / ${formatCurrency(m.priceARS)} • Saldo después: ${m.runningBalance.toFixed(8)} BTC</div>
                </div>
            </div>
            <div class="transaction-amount ${m.type === 'compra' ? 'ingreso' : 'gasto'}">
                ${m.type === 'compra' ? '+' : '-'} ${m.amount.toFixed(8)} BTC
            </div>
            <div class="transaction-actions">
                <button class="btn-edit" onclick="editBtcMovement('${m.id}')"><i class="fas fa-pencil-alt"></i></button>
                <button class="btn-delete" onclick="deleteBtcMovementHandler('${m.id}')"><i class="fas fa-trash-alt"></i></button>
            </div>
        </div>
    `).join('');
}

function renderSOLHistory() {
    const container = document.getElementById('solHistoryList');
    if (!container) return;
    if (!Array.isArray(solHistory) || solHistory.length === 0) {
        container.innerHTML = '<div class="empty-state">Sin movimientos de SOL</div>';
        return;
    }
    const sorted = [...solHistory].sort((a,b) => new Date(a.date) - new Date(b.date));
    let runningBalance = 0;
    const items = [];
    for (const move of sorted) {
        if (move.type === 'compra') runningBalance += move.amount;
        else runningBalance -= move.amount;
        items.push({ ...move, runningBalance });
    }
    items.reverse();
    container.innerHTML = items.map(m => `
        <div class="transaction-item">
            <div class="transaction-info">
                <div class="transaction-icon ${m.type === 'compra' ? 'ingreso' : 'gasto'}">
                    ${m.imageUrl ? `<img src="${m.imageUrl}" style="width:40px;height:40px;object-fit:cover;border-radius:12px;">` : `<i class="fas ${m.type === 'compra' ? 'fa-arrow-down' : 'fa-arrow-up'}"></i>`}
                </div>
                <div class="transaction-details">
                    <div class="transaction-description">${m.type === 'compra' ? 'Compra de SOL' : 'Venta de SOL'}${m.note ? `: ${escapeHtml(m.note)}` : ''}</div>
                    <div class="transaction-meta">${formatDate(m.date)} • Precio: ${formatCurrencyUSD(m.priceUSD)} / ${formatCurrency(m.priceARS)} • Saldo después: ${m.runningBalance.toFixed(8)} SOL</div>
                </div>
            </div>
            <div class="transaction-amount ${m.type === 'compra' ? 'ingreso' : 'gasto'}">
                ${m.type === 'compra' ? '+' : '-'} ${m.amount.toFixed(8)} SOL
            </div>
            <div class="transaction-actions">
                <button class="btn-edit" onclick="editSolMovement('${m.id}')"><i class="fas fa-pencil-alt"></i></button>
                <button class="btn-delete" onclick="deleteSolMovementHandler('${m.id}')"><i class="fas fa-trash-alt"></i></button>
            </div>
        </div>
    `).join('');
}

function renderBNBHistory() {
    const container = document.getElementById('bnbHistoryList');
    if (!container) return;
    if (!Array.isArray(bnbHistory) || bnbHistory.length === 0) {
        container.innerHTML = '<div class="empty-state">Sin movimientos de BNB</div>';
        return;
    }
    const sorted = [...bnbHistory].sort((a,b) => new Date(a.date) - new Date(b.date));
    let runningBalance = 0;
    const items = [];
    for (const move of sorted) {
        if (move.type === 'compra') runningBalance += move.amount;
        else runningBalance -= move.amount;
        items.push({ ...move, runningBalance });
    }
    items.reverse();
    container.innerHTML = items.map(m => `
        <div class="transaction-item">
            <div class="transaction-info">
                <div class="transaction-icon ${m.type === 'compra' ? 'ingreso' : 'gasto'}">
                    ${m.imageUrl ? `<img src="${m.imageUrl}" style="width:40px;height:40px;object-fit:cover;border-radius:12px;">` : `<i class="fas ${m.type === 'compra' ? 'fa-arrow-down' : 'fa-arrow-up'}"></i>`}
                </div>
                <div class="transaction-details">
                    <div class="transaction-description">${m.type === 'compra' ? 'Compra de BNB' : 'Venta de BNB'}${m.note ? `: ${escapeHtml(m.note)}` : ''}</div>
                    <div class="transaction-meta">${formatDate(m.date)} • Precio: ${formatCurrencyUSD(m.priceUSD)} / ${formatCurrency(m.priceARS)} • Saldo después: ${m.runningBalance.toFixed(8)} BNB</div>
                </div>
            </div>
            <div class="transaction-amount ${m.type === 'compra' ? 'ingreso' : 'gasto'}">
                ${m.type === 'compra' ? '+' : '-'} ${m.amount.toFixed(8)} BNB
            </div>
            <div class="transaction-actions">
                <button class="btn-edit" onclick="editBnbMovement('${m.id}')"><i class="fas fa-pencil-alt"></i></button>
                <button class="btn-delete" onclick="deleteBnbMovementHandler('${m.id}')"><i class="fas fa-trash-alt"></i></button>
            </div>
        </div>
    `).join('');
}

function renderNEXOHistory() {
    const container = document.getElementById('nexoHistoryList');
    if (!container) return;
    if (!Array.isArray(nexoHistory) || nexoHistory.length === 0) {
        container.innerHTML = '<div class="empty-state">Sin movimientos de NEXO</div>';
        return;
    }
    const sorted = [...nexoHistory].sort((a,b) => new Date(a.date) - new Date(b.date));
    let runningBalance = 0;
    const items = [];
    for (const move of sorted) {
        if (move.type === 'compra') runningBalance += move.amount;
        else runningBalance -= move.amount;
        items.push({ ...move, runningBalance });
    }
    items.reverse();
    container.innerHTML = items.map(m => `
        <div class="transaction-item">
            <div class="transaction-info">
                <div class="transaction-icon ${m.type === 'compra' ? 'ingreso' : 'gasto'}">
                    ${m.imageUrl ? `<img src="${m.imageUrl}" style="width:40px;height:40px;object-fit:cover;border-radius:12px;">` : `<i class="fas ${m.type === 'compra' ? 'fa-arrow-down' : 'fa-arrow-up'}"></i>`}
                </div>
                <div class="transaction-details">
                    <div class="transaction-description">${m.type === 'compra' ? 'Compra de NEXO' : 'Venta de NEXO'}${m.note ? `: ${escapeHtml(m.note)}` : ''}</div>
                    <div class="transaction-meta">${formatDate(m.date)} • Precio: ${formatCurrencyUSD(m.priceUSD)} / ${formatCurrency(m.priceARS)} • Saldo después: ${m.runningBalance.toFixed(8)} NEXO</div>
                </div>
            </div>
            <div class="transaction-amount ${m.type === 'compra' ? 'ingreso' : 'gasto'}">
                ${m.type === 'compra' ? '+' : '-'} ${m.amount.toFixed(8)} NEXO
            </div>
            <div class="transaction-actions">
                <button class="btn-edit" onclick="editNexoMovement('${m.id}')"><i class="fas fa-pencil-alt"></i></button>
                <button class="btn-delete" onclick="deleteNexoMovementHandler('${m.id}')"><i class="fas fa-trash-alt"></i></button>
            </div>
        </div>
    `).join('');
}

window.editBtcMovement = (id) => {
    const move = btcHistory.find(m => m.id === id);
    if (!move) return;
    document.getElementById('editBtcId').value = move.id;
    document.getElementById('editBtcAmount').value = move.amount;
    document.getElementById('editBtcType').value = move.type;
    document.getElementById('editBtcNote').value = move.note || '';
    document.getElementById('editBtcImageUrl').value = move.imageUrl || '';
    openModal('editBtcModal');
};

window.deleteBtcMovementHandler = (id) => {
    if (confirm('¿Eliminar este movimiento BTC?')) deleteBtcMovement(id);
};

window.editSolMovement = (id) => {
    const move = solHistory.find(m => m.id === id);
    if (!move) return;
    document.getElementById('editSolId').value = move.id;
    document.getElementById('editSolAmount').value = move.amount;
    document.getElementById('editSolType').value = move.type;
    document.getElementById('editSolNote').value = move.note || '';
    document.getElementById('editSolImageUrl').value = move.imageUrl || '';
    openModal('editSolModal');
};

window.deleteSolMovementHandler = (id) => {
    if (confirm('¿Eliminar este movimiento SOL?')) deleteSolMovement(id);
};

window.editBnbMovement = (id) => {
    const move = bnbHistory.find(m => m.id === id);
    if (!move) return;
    document.getElementById('editBnbId').value = move.id;
    document.getElementById('editBnbAmount').value = move.amount;
    document.getElementById('editBnbType').value = move.type;
    document.getElementById('editBnbNote').value = move.note || '';
    document.getElementById('editBnbImageUrl').value = move.imageUrl || '';
    openModal('editBnbModal');
};

window.deleteBnbMovementHandler = (id) => {
    if (confirm('¿Eliminar este movimiento BNB?')) deleteBnbMovement(id);
};

window.editNexoMovement = (id) => {
    const move = nexoHistory.find(m => m.id === id);
    if (!move) return;
    document.getElementById('editNexoId').value = move.id;
    document.getElementById('editNexoAmount').value = move.amount;
    document.getElementById('editNexoType').value = move.type;
    document.getElementById('editNexoNote').value = move.note || '';
    document.getElementById('editNexoImageUrl').value = move.imageUrl || '';
    openModal('editNexoModal');
};

window.deleteNexoMovementHandler = (id) => {
    if (confirm('¿Eliminar este movimiento NEXO?')) deleteNexoMovement(id);
};

// ========== GETTERS ==========
function getAccountName(id) { const a = accounts.find(a => a.id === id); return a ? a.name : 'Desconocido'; }
function getCategoryName(id) { const c = categories.find(c => c.id === id); return c ? c.name : 'Sin categoría'; }
function getCategoryColor(id) { const c = categories.find(c => c.id === id); return c ? c.color : '#94a3b8'; }
function getCategoryImage(id) { const c = categories.find(c => c.id === id); return c ? (c.imageUrl || '') : ''; }

// ========== RENDERIZADO PRINCIPAL ==========
let currentCharts = {};

function refreshAllViews() {
    updateDolarMEP();
    updateBTCPrice();
    updateCedearPrices();
    const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
    goals.forEach(g => g.currentAmount = totalBalance);
    saveToLocalStorage();
    syncToCloud();
    renderDashboard();
    renderTransactionsList();
    renderAccountsList();
    renderCategoriesList();
    renderBudgetsList();
    renderGoalsList();
    renderCalendar();
    renderBTCHistory();
    renderSOLHistory();
    renderBNBHistory();
    renderNEXOHistory();
    renderCapitalView();
    updateFilters();
    updateBudgetMonthSelector();
    renderExpenseReport();
    renderBudgetPieChart();
    updateExpenseAccountFilter();
}

function renderCapitalView() {
    const capitalBTC = btcHoldings;
    const capitalBTCUSD = capitalBTC * currentBTCPriceUSD;
    const capitalBTCARS = capitalBTC * currentBTCPriceARS;
    document.getElementById('capitalBTC').innerHTML = `${capitalBTC.toFixed(8)} BTC`;
    document.getElementById('capitalBTCUSD').innerHTML = formatCurrencyUSD(capitalBTCUSD);
    document.getElementById('capitalBTCARS').innerHTML = formatCurrency(capitalBTCARS);

    const capitalSOL = solHoldings;
    const capitalSOLUSD = capitalSOL * (currentSOLPriceUSD || 0);
    const capitalSOLARS = capitalSOL * (currentSOLPriceARS || 0);
    document.getElementById('capitalSOL').innerHTML = `${capitalSOL.toFixed(8)} SOL`;
    document.getElementById('capitalSOLUSD').innerHTML = formatCurrencyUSD(capitalSOLUSD);
    document.getElementById('capitalSOLARS').innerHTML = formatCurrency(capitalSOLARS);

    const capitalBNB = bnbHoldings;
    const capitalBNBUSD = capitalBNB * (currentBNBPriceUSD || 0);
    const capitalBNBARS = capitalBNB * (currentBNBPriceARS || 0);
    document.getElementById('capitalBNB').innerHTML = `${capitalBNB.toFixed(8)} BNB`;
    document.getElementById('capitalBNBUSD').innerHTML = formatCurrencyUSD(capitalBNBUSD);
    document.getElementById('capitalBNBARS').innerHTML = formatCurrency(capitalBNBARS);

    const capitalNEXO = nexoHoldings;
    const capitalNEXOUSD = capitalNEXO * (currentNEXOPriceUSD || 0);
    const capitalNEXOARS = capitalNEXO * (currentNEXOPriceARS || 0);
    document.getElementById('capitalNEXO').innerHTML = `${capitalNEXO.toFixed(8)} NEXO`;
    document.getElementById('capitalNEXOUSD').innerHTML = formatCurrencyUSD(capitalNEXOUSD);
    document.getElementById('capitalNEXOARS').innerHTML = formatCurrency(capitalNEXOARS);

    // Billeteras
    const activeFilter = document.getElementById('capitalFilter')?.value || 'all';
    let totalBilleterasARS = 0;
    const accountsHtml = accounts.map(acc => {
        totalBilleterasARS += acc.balance;
        return `<div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #f1f5f9;">
            <strong>${escapeHtml(acc.name)}</strong>
            <span>${formatCurrency(acc.balance)} | ${formatCurrencyUSD(acc.balance / dolarMEP)}</span>
        </div>`;
    }).join('');
    document.getElementById('accountsCapitalList').innerHTML = accountsHtml;
    document.getElementById('totalARSBalance').innerHTML = `${formatCurrency(totalBilleterasARS)} | ${formatCurrencyUSD(totalBilleterasARS / dolarMEP)}`;

    // CEDEARs
    let totalCedearUSD = 0;
    let totalCedearARS = 0;
    const cedearData = [];
    Object.keys(cedearHoldings).filter(t => cedearHoldings[t] > 0).forEach(ticker => {
        const amount = cedearHoldings[ticker] || 0;
        const priceUSD = cedearPrices[ticker] || 0;
        const ratio = BYMA_RATIOS[ticker] || 1;
        const cedearPriceUSD = priceUSD / ratio;
        const cedearPriceARS = cedearPriceUSD * dolarMEP;
        const valueUSD = amount * cedearPriceUSD;
        const valueARS = amount * cedearPriceARS;
        totalCedearUSD += valueUSD;
        totalCedearARS += valueARS;
        cedearData.push({ ticker, amount, valueUSD, valueARS, percent: totalCedearARS > 0 ? (valueARS / totalCedearARS) * 100 : 0 });
    });

    // Ordenar
    if (cedearSortBy === 'value') {
        cedearData.sort((a, b) => b.valueARS - a.valueARS);
    } else if (cedearSortBy === 'percent') {
        cedearData.sort((a, b) => b.percent - a.percent);
    }

    const cedearCards = cedearData.map(item => {
        const { ticker, amount, valueUSD, valueARS } = item;
        const imageUrl = cedearCustomImages[ticker] || cedearImages[ticker] || '';
        return `
            <div class="cedear-card" style="padding:10px; background:#f1f5f9; border-radius:8px; display:flex; justify-content:space-between; align-items:center; gap:10px;">
                <div style="display:flex; align-items:center; gap:10px; flex:1;">
                    ${imageUrl ? `<img src="${imageUrl}" style="width:40px;height:40px;object-fit:cover;border-radius:8px;">` : '<div style="width:40px;height:40px;background:#ccc;border-radius:8px;"></div>'}
                    <div style="flex:1;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span><strong>${ticker}</strong></span>
                            <span>${amount.toFixed(2)} unidades</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-size: 0.85rem; color: #64748b; margin-top:4px;">
                            <span>${formatCurrencyUSD(valueUSD)}</span>
                            <span>${formatCurrency(valueARS)}</span>
                        </div>
                    </div>
                </div>
                <button class="btn-edit" onclick="editCedear('${ticker}')"><i class="fas fa-pencil-alt"></i></button>
            </div>
        `;
    }).join('');

    document.getElementById('cedearsList').innerHTML = cedearCards || '<div style="padding:10px; color:#94a3b8;">Sin CEDEARs.</div>';
    document.getElementById('totalCedearUSD').innerHTML = formatCurrencyUSD(totalCedearUSD);
    document.getElementById('totalCedearARS').innerHTML = formatCurrency(totalCedearARS);

    // Totales generales
    const totalUSD = capitalBTCUSD + capitalSOLUSD + capitalBNBUSD + capitalNEXOUSD + (totalBilleterasARS / dolarMEP) + totalCedearUSD;
    const totalARS = capitalBTCARS + capitalSOLARS + capitalBNBARS + capitalNEXOARS + totalBilleterasARS + totalCedearARS;
    document.getElementById('totalWealth').innerHTML = formatCurrency(totalARS);
    document.getElementById('totalWealthUSD').innerHTML = formatCurrencyUSD(totalUSD);

    // Filtros de visibilidad
    const btcSection = document.getElementById('capitalBTCSection');
    const solSection = document.getElementById('capitalSOLSection');
    const bnbSection = document.getElementById('capitalBNBSection');
    const nexoSection = document.getElementById('capitalNEXOSection');
    const billeterasSection = document.getElementById('capitalBilleterasSection');
    const cedearSection = document.getElementById('capitalCedearSection');

    if (btcSection) btcSection.style.display = (activeFilter === 'all' || activeFilter === 'btc') ? '' : 'none';
    if (solSection) solSection.style.display = (activeFilter === 'all' || activeFilter === 'sol') ? '' : 'none';
    if (bnbSection) bnbSection.style.display = (activeFilter === 'all' || activeFilter === 'bnb') ? '' : 'none';
    if (nexoSection) nexoSection.style.display = (activeFilter === 'all' || activeFilter === 'nexo') ? '' : 'none';
    if (billeterasSection) billeterasSection.style.display = (activeFilter === 'all' || activeFilter === 'billeteras') ? '' : 'none';
    if (cedearSection) cedearSection.style.display = (activeFilter === 'all' || activeFilter === 'cedears') ? '' : 'none';
}

function updateExpenseAccountFilter() {
    const select = document.getElementById('expenseAccountFilter');
    if (select) {
        const currentVal = select.value;
        select.innerHTML = '<option value="all">Todas las billeteras</option>' +
            accounts.map(a => `<option value="${a.id}" ${currentVal === a.id ? 'selected' : ''}>${escapeHtml(a.name)}</option>`).join('');
        select.addEventListener('change', () => renderExpenseReport());
    }
}

// ========== DASHBOARD ==========
function renderDashboard() {
    let totalIncome = 0, totalExpense = 0;
    if (Array.isArray(transactions)) {
        transactions.forEach(t => {
            const amt = parseFloat(t.amount);
            if (t.type === 'ingreso') totalIncome += amt;
            else totalExpense += amt;
        });
    }
    const totalBalance = totalIncome - totalExpense;
    const totalBalanceElem = document.getElementById('totalBalance');
    const totalIncomeElem = document.getElementById('totalIncome');
    const totalExpenseElem = document.getElementById('totalExpense');
    if (totalBalanceElem) totalBalanceElem.innerHTML = formatCurrency(totalBalance);
    if (totalIncomeElem) totalIncomeElem.innerHTML = formatCurrency(totalIncome);
    if (totalExpenseElem) totalExpenseElem.innerHTML = formatCurrency(totalExpense);
    
    const recent = [...(Array.isArray(transactions) ? transactions : [])].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0,5);
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
    updateIncomeChart();
    updateBalanceChart();
}

function updateExpenseChart() {
    const ctx = document.getElementById('expenseChart')?.getContext('2d');
    if (!ctx) return;
    const expensesByCat = {};
    if (Array.isArray(transactions)) {
        transactions.forEach(t => {
            if (t.type === 'gasto') {
                const catName = getCategoryName(t.catId);
                expensesByCat[catName] = (expensesByCat[catName] || 0) + parseFloat(t.amount);
            }
        });
    }
    const labels = Object.keys(expensesByCat);
    const data = Object.values(expensesByCat);
    const colors = labels.map((_, i) => `hsl(${(i * 360 / Math.max(labels.length,1)) % 360}, 70%, 60%)`);
    if (currentCharts.expense) currentCharts.expense.destroy();
    currentCharts.expense = new Chart(ctx, {
        type: 'doughnut',
        data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0 }] },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { position: 'bottom' },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw;
                            const total = context.dataset.data.reduce((a,b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${formatCurrency(value)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function updateIncomeChart() {
    const ctx = document.getElementById('incomeChart')?.getContext('2d');
    if (!ctx) return;
    const incomesByCat = {};
    if (Array.isArray(transactions)) {
        transactions.forEach(t => {
            if (t.type === 'ingreso') {
                const catName = getCategoryName(t.catId);
                incomesByCat[catName] = (incomesByCat[catName] || 0) + parseFloat(t.amount);
            }
        });
    }
    const labels = Object.keys(incomesByCat);
    const data = Object.values(incomesByCat);
    const colors = labels.map((_, i) => `hsl(${(i * 360 / Math.max(labels.length,1)) % 360}, 70%, 60%)`);
    if (currentCharts.income) currentCharts.income.destroy();
    currentCharts.income = new Chart(ctx, {
        type: 'doughnut',
        data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0 }] },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { position: 'bottom' },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw;
                            const total = context.dataset.data.reduce((a,b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${formatCurrency(value)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
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
    updateWalletDetails();
}

function updateWalletDetails() {
    const tbody = document.getElementById('walletDetailsBody');
    if (!tbody) return;
    const totalBalance = accounts.reduce((sum, a) => sum + (a.balance || 0), 0);
    if (totalBalance === 0 || accounts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">No hay billeteras</td></tr>';
        return;
    }
    tbody.innerHTML = accounts.map(acc => {
        const percentage = ((acc.balance / totalBalance) * 100).toFixed(1);
        return `
            <tr>
                <td>${escapeHtml(acc.name)}</td>
                <td>${formatCurrency(acc.balance)}</td>
                <td>${percentage}%</td>
            </tr>
        `;
    }).join('');
}

// ========== RENDERIZADO DE LISTAS ==========
function renderTransactionsList() {
    const tbody = document.getElementById('transactionsList');
    if (!tbody) return;
    let filtered = Array.isArray(transactions) ? [...transactions] : [];
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
    if (!Array.isArray(accounts) || accounts.length === 0) { container.innerHTML = '<div class="empty-state">No hay billeteras. Crea una nueva.</div>'; return; }
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
    if (!Array.isArray(categories) || categories.length === 0) { container.innerHTML = '<div class="empty-state">No hay categorías. Crea una nueva.</div>'; return; }
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
    if (!Array.isArray(budgets)) budgets = [];
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
        const spent = Array.isArray(transactions) ? transactions.filter(t => t.catId === b.categoryId && t.type === 'gasto' && t.date.slice(0,7) === selectedMonth).reduce((sum, t) => sum + parseFloat(t.amount), 0) : 0;
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
                <div class="account-actions">
                    <button class="btn-edit" onclick="editBudget('${b.id}')"><i class="fas fa-pencil-alt"></i></button>
                    <button class="btn-delete" onclick="deleteBudget('${b.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    }).join('');
    const totalBudget = monthly.reduce((sum, b) => sum + b.amount, 0);
    const totalBudgetElem = document.getElementById('budgetTotalAmount');
    if (totalBudgetElem) totalBudgetElem.innerHTML = `Total Presupuestado: ${formatCurrency(totalBudget)}`;
    renderBudgetPieChart();
}

function renderBudgetPieChart() {
    const canvas = document.getElementById('budgetPieChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const selectedMonth = document.getElementById('budgetMonthSelect')?.value || new Date().toISOString().slice(0,7);
    const monthly = budgets.filter(b => b.month === selectedMonth);
    if (window.budgetPieChart && typeof window.budgetPieChart.destroy === 'function') window.budgetPieChart.destroy();
    if (monthly.length === 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
    }
    const labels = monthly.map(b => {
        const cat = categories.find(c => c.id === b.categoryId);
        return cat ? cat.name : 'Sin categoría';
    });
    const data = monthly.map(b => b.amount);
    const colors = labels.map((_, i) => `hsl(${(i * 360 / Math.max(labels.length,1)) % 360}, 70%, 60%)`);
    window.budgetPieChart = new Chart(ctx, {
        type: 'doughnut',
        data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0 }] },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom' },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw;
                            const total = context.dataset.data.reduce((a,b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${formatCurrency(value)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function renderGoalsList() {
    const container = document.getElementById('goalsList');
    if (!container) return;
    if (!Array.isArray(goals) || goals.length === 0) {
        container.innerHTML = '<div class="empty-state">Sin metas. Crea una meta de ahorro.</div>';
        return;
    }

    // Capital total automático
    const capitalBTCARS = btcHoldings * currentBTCPriceARS;
    const capitalBilleteras = accounts.reduce((sum, acc) => sum + acc.balance, 0);
    const capitalCedears = Object.keys(cedearHoldings).reduce((sum, ticker) => {
        const amount = cedearHoldings[ticker] || 0;
        const priceUSD = cedearPrices[ticker] || 0;
        const ratio = BYMA_RATIOS[ticker] || 1;
        const cedearPriceARS = (priceUSD / ratio) * dolarMEP;
        return sum + (amount * cedearPriceARS);
    }, 0);
    const capitalTotal = capitalBTCARS + capitalBilleteras + capitalCedears;

    container.innerHTML = goals.map(g => {
        // El progreso es el capital total, no el currentAmount manual
        const progress = capitalTotal;
        const percent = Math.min((progress / g.targetAmount) * 100, 100);
        const achieved = progress >= g.targetAmount;
        return `
            <div class="goal-card">
                <div class="goal-info">
                    <div style="display:flex; align-items:center; gap:10px;">
                        ${g.imageUrl ? `<img src="${g.imageUrl}" style="width:40px;height:40px;object-fit:cover;border-radius:12px;">` : `<div style="width:40px;height:40px;background:${g.color};border-radius:12px;"></div>`}
                        <div>
                            <strong>${escapeHtml(g.name)}</strong><br>
                            <span style="font-size:0.75rem;">
                                Capital actual: ${formatCurrency(progress)} de ${formatCurrency(g.targetAmount)}
                            </span><br>
                            <span style="font-size:0.72rem; color:#64748b;">
                                BTC: ${formatCurrency(capitalBTCARS)} | 
                                Billeteras: ${formatCurrency(capitalBilleteras)} | 
                                CEDEARs: ${formatCurrency(capitalCedears)}
                            </span>
                        </div>
                    </div>
                    <div class="budget-progress" style="margin-top:8px;">
                        <div class="budget-progress-bar" style="width: ${percent}%; background:${g.color};"></div>
                    </div>
                    <div style="font-size:0.75rem; margin-top:4px; color:${achieved ? '#10b981' : '#64748b'};">
                        ${achieved ? '🎯 ¡Meta alcanzada!' : `${percent.toFixed(1)}% completado`}
                    </div>
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
        const dayTrans = Array.isArray(transactions) ? transactions.filter(t => t.date.split('T')[0] === dateStr) : [];
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
    const dayTrans = Array.isArray(transactions) ? transactions.filter(t => t.date.split('T')[0] === date) : [];
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

// ========== REPORTE DE GASTOS con filtro y presupuesto ==========
let currentExpensePercentData = [];

function getWeekNumber(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

function renderExpenseReport() {
    const reportType = document.getElementById('expenseReportType')?.value || 'category';
    const month = document.getElementById('expenseReportMonth')?.value;
    const day = document.getElementById('expenseReportDay')?.value;
    const accountFilter = document.getElementById('expenseAccountFilter')?.value || 'all';

    let filtered = Array.isArray(transactions) ? [...transactions] : [];
    if (month) filtered = filtered.filter(t => t.date.slice(0,7) === month);
    if (day) filtered = filtered.filter(t => t.date === day);
    if (accountFilter && accountFilter !== 'all') filtered = filtered.filter(t => t.accId === accountFilter);
    const gastos = filtered.filter(t => t.type === 'gasto');

    // Manejar vistas por período (daily, weekly, monthly)
    if (expenseChartPeriod === 'daily') {
        const dailyData = {};
        gastos.forEach(t => {
            const dateKey = t.date;
            dailyData[dateKey] = (dailyData[dateKey] || 0) + parseFloat(t.amount);
        });
        const labels = Object.keys(dailyData).sort();
        const data = labels.map(d => dailyData[d]);
        const ctx = document.getElementById('expenseReportChart')?.getContext('2d');
        if (ctx) {
            if (window.expenseChartInstance) window.expenseChartInstance.destroy();
            window.expenseChartInstance = new Chart(ctx, {
                type: 'bar',
                data: { labels: labels.map(d => new Date(d).toLocaleDateString('es-AR')), datasets: [{ label: 'Gastos Diarios', data, backgroundColor: '#ef4444', borderRadius: 4 }] },
                options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { callback: (v) => formatCurrency(v) } } } }
            });
        }
        let html = '<table class="transactions-table"><thead><tr><th>Fecha</th><th>Total Gastos</th></tr></thead><tbody>';
        labels.forEach(label => {
            html += `<tr><td>${formatDate(label)}</td><td>${formatCurrency(dailyData[label])}</td></tr>`;
        });
        html += '</tbody></table>';
        document.getElementById('expenseReportDetails').innerHTML = html;
        const percentBody = document.getElementById('expensePercentBody');
        if (percentBody) percentBody.innerHTML = '<tr><td colspan="5">Vista Diaria - no aplica análisis por categoría</td></tr>';
    } else if (expenseChartPeriod === 'weekly') {
        const weeklyData = {};
        gastos.forEach(t => {
            const weekNum = getWeekNumber(t.date);
            const year = new Date(t.date).getFullYear();
            const weekKey = `${year}-W${weekNum}`;
            weeklyData[weekKey] = (weeklyData[weekKey] || 0) + parseFloat(t.amount);
        });
        const labels = Object.keys(weeklyData).sort();
        const data = labels.map(w => weeklyData[w]);
        const ctx = document.getElementById('expenseReportChart')?.getContext('2d');
        if (ctx) {
            if (window.expenseChartInstance) window.expenseChartInstance.destroy();
            window.expenseChartInstance = new Chart(ctx, {
                type: 'bar',
                data: { labels, datasets: [{ label: 'Gastos Semanales', data, backgroundColor: '#f59e0b', borderRadius: 4 }] },
                options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { callback: (v) => formatCurrency(v) } } } }
            });
        }
        let html = '<table class="transactions-table"><thead><tr><th>Semana</th><th>Total Gastos</th></tr></thead><tbody>';
        labels.forEach(label => {
            html += `<tr><td>${label}</td><td>${formatCurrency(weeklyData[label])}</td></tr>`;
        });
        html += '</tbody></table>';
        document.getElementById('expenseReportDetails').innerHTML = html;
        const percentBody = document.getElementById('expensePercentBody');
        if (percentBody) percentBody.innerHTML = '<tr><td colspan="5">Vista Semanal - no aplica análisis por categoría</td></tr>';
    } else if (reportType === 'category') {
        const byCat = {};
        gastos.forEach(t => {
            const catName = getCategoryName(t.catId);
            byCat[catName] = (byCat[catName] || 0) + parseFloat(t.amount);
        });
        const labels = Object.keys(byCat);
        const data = Object.values(byCat);
        const total = data.reduce((a,b)=>a+b,0);
        const currentMonth = month || new Date().toISOString().slice(0,7);
        const monthlyBudgets = budgets.filter(b => b.month === currentMonth);

        // Obtener saldo de la billetera seleccionada para calcular porcentaje
        let walletBalance = 0;
        if (accountFilter && accountFilter !== 'all') {
            const selectedAccount = accounts.find(a => a.id === accountFilter);
            walletBalance = selectedAccount ? selectedAccount.balance : 0;
        } else {
            walletBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
        }

        currentExpensePercentData = labels.map((label, idx) => {
            const cat = categories.find(c => c.name === label);
            const budget = monthlyBudgets.find(b => b.categoryId === cat?.id);
            const budgetAmount = budget ? budget.amount : 0;
            const spent = data[idx];
            const within = spent <= budgetAmount;
            return {
                category: label,
                amount: spent,
                percentage: walletBalance > 0 ? (spent / walletBalance) * 100 : 0,
                budget: budgetAmount,
                withinBudget: within
            };
        });
        
        const ctx = document.getElementById('expenseReportChart')?.getContext('2d');
        if (ctx) {
            if (window.expenseChartInstance) window.expenseChartInstance.destroy();
            const colors = labels.map((_, i) => `hsl(${(i * 360 / Math.max(labels.length,1)) % 360}, 70%, 60%)`);
            window.expenseChartInstance = new Chart(ctx, {
                type: 'doughnut',
                data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0 }] },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { position: 'bottom' },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const label = context.label || '';
                                    const value = context.raw;
                                    const total = context.dataset.data.reduce((a,b) => a + b, 0);
                                    const percentage = ((value / total) * 100).toFixed(1);
                                    return `${label}: ${formatCurrency(value)} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
        }
        
        let html = '<table class="transactions-table"><thead><tr><th>Categoría</th><th>Monto</th><th>Porcentaje</th><th>Presupuesto</th><th>Estado</th></tr></thead><tbody>';
        for (const item of currentExpensePercentData) {
            const cat = categories.find(c => c.name === item.category);
            const catImg = cat ? (cat.imageUrl || '') : '';
            const statusIcon = item.withinBudget ? '✅' : '❌';
            const statusColor = item.withinBudget ? 'green' : 'red';
            html += `<tr>
                        <td style="display:flex; align-items:center; gap:8px;">${catImg ? `<img src="${catImg}" style="width:24px;height:24px;border-radius:6px;">` : ''} ${escapeHtml(item.category)}</td>
                        <td>${formatCurrency(item.amount)}</td>
                        <td>${item.percentage.toFixed(1)}%</td>
                        <td>${item.budget > 0 ? formatCurrency(item.budget) : 'Sin presupuesto'}</td>
                        <td style="color:${statusColor}; font-weight:bold;">${statusIcon} ${item.withinBudget ? 'Dentro' : 'Excedido'}</td>
                     </tr>`;
        }
        html += `<tr style="font-weight:bold;"><td>Total</td><td colspan="1">${formatCurrency(total)}</td><td>100%</td><td></td><td></td></tr></tbody></table>`;
        document.getElementById('expenseReportDetails').innerHTML = html;
        renderExpensePercentTable(currentExpensePercentData);
    } else {
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
        let html = '<table class="transactions-table"><thead><tr><th>Mes</th><th>Total Gastos</th></tr></thead><tbody>';
        for (let i=0; i<labels.length; i++) {
            html += `<tr><td>${labels[i]}</td><td>${formatCurrency(data[i])}</td></tr>`;
        }
        html += '</tbody></table>';
        document.getElementById('expenseReportDetails').innerHTML = html;
        const percentBody = document.getElementById('expensePercentBody');
        if (percentBody) percentBody.innerHTML = '<tr><td colspan="5">Selecciona "Por Categoría" para ver porcentajes y presupuesto</td></tr>';
    }
    
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

function renderExpensePercentTable(data) {
    const tbody = document.getElementById('expensePercentBody');
    if (!tbody) return;
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">No hay datos</td></tr>';
        return;
    }
    tbody.innerHTML = data.map(item => `
        <tr>
            <td>${escapeHtml(item.category)}</td>
            <td>${formatCurrency(item.amount)}</td>
            <td>${item.percentage.toFixed(1)}%</td>
            <td>${item.budget > 0 ? formatCurrency(item.budget) : 'Sin presupuesto'}</td>
            <td style="color:${item.withinBudget ? 'green' : 'red'}; font-weight:bold;">${item.withinBudget ? '✅ Dentro' : '❌ Excedido'}</td>
        </tr>
    `).join('');
}

function sortExpensePercent(order) {
    if (!currentExpensePercentData.length) return;
    const sorted = [...currentExpensePercentData];
    if (order === 'asc') sorted.sort((a,b) => a.percentage - b.percentage);
    else sorted.sort((a,b) => b.percentage - a.percentage);
    renderExpensePercentTable(sorted);
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
            transactions = Array.isArray(data.transactions) ? data.transactions : [];
            accounts = Array.isArray(data.accounts) ? data.accounts : [];
            categories = Array.isArray(data.categories) ? data.categories : [];
            budgets = Array.isArray(data.budgets) ? data.budgets : [];
            goals = Array.isArray(data.goals) ? data.goals : [];
            btcHoldings = typeof data.btcHoldings === 'number' ? data.btcHoldings : 0;
            btcHistory = Array.isArray(data.btcHistory) ? data.btcHistory : [];
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
        const userNameSpan = document.getElementById('userName');
        const loginBtn = document.getElementById('loginGoogleBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        if (userNameSpan) userNameSpan.innerText = currentUser.displayName || currentUser.email;
        if (loginBtn) loginBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'flex';
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
    const userNameSpan = document.getElementById('userName');
    const loginBtn = document.getElementById('loginGoogleBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    if (userNameSpan) userNameSpan.innerText = '';
    if (loginBtn) loginBtn.style.display = 'flex';
    if (logoutBtn) logoutBtn.style.display = 'none';
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
function formatPriceVariation(currentPrice, prevPrice) {
    if (!prevPrice || prevPrice === 0) return '';
    const change = currentPrice - prevPrice;
    const percent = (change / prevPrice * 100).toFixed(2);
    const icon = change >= 0 ? '📈' : '📉';
    const color = change >= 0 ? '#10b981' : '#ef4444';
    return `<div style="font-size:0.75rem; color:${color}; margin-top:4px;">${icon} ${change >= 0 ? '+' : ''}${percent}%</div>`;
}
function showToast(msg, type='success') { const toast = document.getElementById('toast'); if (toast) { toast.textContent = msg; toast.style.background = type === 'success' ? '#10b981' : '#ef4444'; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 3000); } }

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
        selector.addEventListener('change', () => { renderBudgetsList(); renderBudgetPieChart(); });
    }
}

// ========== FUNCIONES GLOBALES PARA ONCLICK ==========
window.deleteTransactionHandler = (id) => { if (confirm('¿Eliminar esta transacción?')) deleteTransaction(id); };
window.deleteAccountHandler = (id) => { if (confirm('¿Eliminar esta billetera?')) deleteAccount(id); };
window.deleteCategoryHandler = (id) => { if (confirm('¿Eliminar esta categoría?')) deleteCategory(id); };
window.deleteBudget = (id) => { if (confirm('¿Eliminar este presupuesto?')) deleteBudget(id); };
window.deleteGoalHandler = (id) => { if (confirm('¿Eliminar esta meta?')) deleteGoal(id); };
window.editBudget = (id) => {
    const budget = budgets.find(b => b.id === id);
    if (!budget) return;
    document.getElementById('budgetId').value = budget.id;
    document.getElementById('budgetCategoryId').value = budget.categoryId;
    document.getElementById('budgetAmount').value = budget.amount;
    document.getElementById('budgetMonth').value = budget.month;
    openModal('budgetModal');
};

window.editTransaction = (id) => {
    const modal = document.getElementById('transactionModal');
    if (!modal) return;
    document.getElementById('modalTitle').innerText = id ? 'Editar transacción' : 'Nueva transacción';
    document.getElementById('transactionId').value = id || '';
    document.getElementById('date').value = new Date().toISOString().split('T')[0];
    document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
    const gastoBtn = document.querySelector('.type-btn[data-type="gasto"]');
    if (gastoBtn) gastoBtn.classList.add('active');
    updateFilters();
    if (id) {
        const t = transactions.find(tx => tx.id === id);
        if (t) {
            document.getElementById('amount').value = t.amount;
            document.getElementById('date').value = t.date.split('T')[0];
            document.getElementById('categoryId').value = t.catId;
            document.getElementById('accId').value = t.accId;
            document.getElementById('note').value = t.note || '';
            const typeBtn = document.querySelector(`.type-btn[data-type="${t.type}"]`);
            if (typeBtn) typeBtn.classList.add('active');
            const hasDiscountCheck = document.getElementById('hasDiscount');
            const discountFields = document.getElementById('discountFields');
            if (t.discount) {
                if (hasDiscountCheck) hasDiscountCheck.checked = true;
                if (discountFields) discountFields.style.display = 'block';
                if (t.discountPercent) {
                    const percentRadio = document.querySelector('input[name="discountType"][value="percent"]');
                    if (percentRadio) percentRadio.checked = true;
                    document.getElementById('discountValue').value = t.discountPercent;
                } else {
                    const fixedRadio = document.querySelector('input[name="discountType"][value="fixed"]');
                    if (fixedRadio) fixedRadio.checked = true;
                    document.getElementById('discountValue').value = t.discountFixed;
                }
            } else {
                if (hasDiscountCheck) hasDiscountCheck.checked = false;
                if (discountFields) discountFields.style.display = 'none';
            }
        }
    } else {
        document.getElementById('amount').value = '';
        document.getElementById('note').value = '';
        document.getElementById('hasDiscount').checked = false;
        document.getElementById('discountFields').style.display = 'none';
    }
    openModal('transactionModal');
};

window.editAccount = (id) => {
    const modal = document.getElementById('accountModal');
    if (!modal) return;
    document.getElementById('accountModalTitle').innerText = id ? 'Editar billetera' : 'Nueva billetera';
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
};

window.editCategory = (id) => {
    const modal = document.getElementById('categoryModal');
    if (!modal) return;
    document.getElementById('categoryModalTitle').innerText = id ? 'Editar categoría' : 'Nueva categoría';
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
};

window.editGoal = (id) => {
    const goal = goals.find(g => g.id === id);
    if (!goal) return;
    const newAmount = prompt(`Editar progreso de "${goal.name}"\nMonto actual: ${formatCurrency(goal.currentAmount)}\nMonto objetivo: ${formatCurrency(goal.targetAmount)}\nIngrese el nuevo monto ahorrado:`, goal.currentAmount);
    if (newAmount !== null) {
        const parsed = parseFloat(newAmount);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= goal.targetAmount) {
            updateGoal(id, { currentAmount: parsed });
        } else { showToast('Monto inválido', 'error'); }
    }
};

window.editCedear = (ticker) => {
    document.getElementById('cedearTicker').value = ticker;
    document.getElementById('cedearAmount').value = cedearHoldings[ticker] || 0;
    document.getElementById('cedearPrice').value = cedearPrices[ticker] || '';
    document.getElementById('cedearImageUrl').value = cedearCustomImages[ticker] || '';
    document.getElementById('cedearType').value = 'cedear'; // nuevo campo
    updateCedearSelectOptions();
    openModal('cedearModal');
};

window.deleteCedearHandler = (ticker) => {
    if (confirm(`¿Eliminar ${ticker} de tu cartera?`)) {
        delete cedearHoldings[ticker];
        saveToLocalStorage();
        syncToCloud();
        renderCapitalView();
        showToast(`${ticker} eliminado`, 'success');
    }
};

function updateCedearSelectOptions() {
    const select = document.getElementById('cedearSelect');
    const currentTicker = document.getElementById('cedearTicker').value;
    const allTickers = Object.keys(BYMA_RATIOS).sort();
    select.innerHTML = '<option value="">-- Seleccionar CEDEAR --</option>' +
        allTickers.map(ticker =>
            `<option value="${ticker}" ${ticker === currentTicker ? 'selected' : ''}>${ticker} (ratio ${BYMA_RATIOS[ticker]}:1)</option>`
        ).join('');
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        window.currentModal = modal;
    }
}

function closeModal() {
    if (window.currentModal) {
        window.currentModal.classList.remove('active');
        window.currentModal = null;
    }
}

function switchView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const targetView = document.getElementById(`${viewId}View`);
    if (targetView) targetView.classList.add('active');
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.view === viewId) item.classList.add('active');
    });
    const titles = {
        dashboard: 'Dashboard',
        transactions: 'Transacciones',
        accounts: 'Billeteras',
        categories: 'Categorías',
        budgets: 'Presupuestos',
        goals: 'Metas',
        calendar: 'Calendario',
        bitcoin: 'Bitcoin',
        capital: 'Capital',
        expenses: 'Gastos'
    };
    const titleElem = document.getElementById('currentViewTitle');
    if (titleElem) titleElem.innerText = titles[viewId] || 'Dashboard';
    if (viewId === 'expenses') renderExpenseReport();
    if (viewId === 'capital') renderCapitalView();
}

// ========== EVENT LISTENERS ==========
document.addEventListener('DOMContentLoaded', () => {
    initializeData();
    refreshAllViews();
    switchView('dashboard');
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => { e.preventDefault(); switchView(item.dataset.view); });
    });
    document.querySelectorAll('[data-view]').forEach(link => {
        link.addEventListener('click', (e) => { e.preventDefault(); switchView(link.dataset.view); });
    });
    
    document.getElementById('addTransactionBtn')?.addEventListener('click', () => window.editTransaction(null));
    document.getElementById('addTransactionBtn2')?.addEventListener('click', () => window.editTransaction(null));
    document.getElementById('addAccountBtn')?.addEventListener('click', () => window.editAccount(null));
    document.getElementById('addCategoryBtn')?.addEventListener('click', () => window.editCategory(null));
    document.getElementById('addBudgetBtn')?.addEventListener('click', () => {
        document.getElementById('budgetId').value = '';
        document.getElementById('budgetCategoryId').value = '';
        document.getElementById('budgetAmount').value = '';
        document.getElementById('budgetMonth').value = new Date().toISOString().slice(0,7);
        openModal('budgetModal');
    });
    document.getElementById('addGoalBtn')?.addEventListener('click', () => {
        document.getElementById('goalId').value = '';
        document.getElementById('goalName').value = '';
        document.getElementById('goalTarget').value = '';
        document.getElementById('goalColor').value = '#3b82f6';
        document.getElementById('goalImageUrl').value = '';
        openModal('goalModal');
    });
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
    document.getElementById('addSolBtn')?.addEventListener('click', () => { const amt = parseFloat(document.getElementById('solAmount')?.value); if(amt>0) addSOL(amt); });
    document.getElementById('removeSolBtn')?.addEventListener('click', () => { const amt = parseFloat(document.getElementById('solAmount')?.value); if(amt>0) removeSOL(amt); });
    document.getElementById('addBnbBtn')?.addEventListener('click', () => { const amt = parseFloat(document.getElementById('bnbAmount')?.value); if(amt>0) addBNB(amt); });
    document.getElementById('removeBnbBtn')?.addEventListener('click', () => { const amt = parseFloat(document.getElementById('bnbAmount')?.value); if(amt>0) removeBNB(amt); });
    document.getElementById('addNexoBtn')?.addEventListener('click', () => { const amt = parseFloat(document.getElementById('nexoAmount')?.value); if(amt>0) addNEXO(amt); });
    document.getElementById('removeNexoBtn')?.addEventListener('click', () => { const amt = parseFloat(document.getElementById('nexoAmount')?.value); if(amt>0) removeNEXO(amt); });
    document.getElementById('addCedearBtn')?.addEventListener('click', () => {
        document.getElementById('cedearTicker').value = '';
        document.getElementById('cedearAmount').value = '';
        document.getElementById('cedearPrice').value = '';
        updateCedearSelectOptions();
        openModal('cedearModal');
    });
    document.getElementById('generateExpenseReportBtn')?.addEventListener('click', () => renderExpenseReport());
    document.getElementById('expenseBtnDaily')?.addEventListener('click', () => { expenseChartPeriod = 'daily'; renderExpenseReport(); });
    document.getElementById('expenseBtnWeekly')?.addEventListener('click', () => { expenseChartPeriod = 'weekly'; renderExpenseReport(); });
    document.getElementById('expenseBtnMonthly')?.addEventListener('click', () => { expenseChartPeriod = 'monthly'; renderExpenseReport(); });
    document.getElementById('sortPercentAsc')?.addEventListener('click', () => sortExpensePercent('asc'));
    document.getElementById('sortPercentDesc')?.addEventListener('click', () => sortExpensePercent('desc'));
    document.getElementById('sortCedearsValue')?.addEventListener('click', () => { cedearSortBy = 'value'; renderCapitalView(); });
    document.getElementById('sortCedearsPercent')?.addEventListener('click', () => { cedearSortBy = 'percent'; renderCapitalView(); });
    document.getElementById('clearFilters')?.addEventListener('click', () => {
        const filterType = document.getElementById('filterType');
        const filterAccount = document.getElementById('filterAccount');
        const filterCategory = document.getElementById('filterCategory');
        const filterMonth = document.getElementById('filterMonth');
        if (filterType) filterType.value = 'all';
        if (filterAccount) filterAccount.value = 'all';
        if (filterCategory) filterCategory.value = 'all';
        if (filterMonth) filterMonth.value = '';
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
        if (!categoryId || !amount || !month) { showToast("Completa todos los campos", "error"); return; }
        if (id) updateBudget(id, { categoryId, amount: parseFloat(amount), month });
        else addBudget({ categoryId, amount: parseFloat(amount), month });
        closeModal();
    });
    document.getElementById('goalForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('goalId').value;
        const name = document.getElementById('goalName').value;
        const targetAmount = document.getElementById('goalTarget').value;
        const color = document.getElementById('goalColor').value;
        const imageUrl = document.getElementById('goalImageUrl').value;
        if (!name || !targetAmount) { showToast("Completa los campos obligatorios", "error"); return; }
        if (id) updateGoal(id, { name, targetAmount: parseFloat(targetAmount), color, imageUrl });
        else addGoal({ name, targetAmount: parseFloat(targetAmount), color, imageUrl });
        closeModal();
    });
    document.getElementById('editBtcForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('editBtcId').value;
        const amount = parseFloat(document.getElementById('editBtcAmount').value);
        const type = document.getElementById('editBtcType').value;
        const note = document.getElementById('editBtcNote').value;
        const imageUrl = document.getElementById('editBtcImageUrl').value;
        if (isNaN(amount) || amount <= 0) { showToast("Cantidad inválida", "error"); return; }
        updateBtcMovement(id, { amount, type, note, imageUrl });
        closeModal();
    });
    document.getElementById('cedearForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const ticker = document.getElementById('cedearSelect').value;
    const amount = parseFloat(document.getElementById('cedearAmount').value);
    const manualPrice = parseFloat(document.getElementById('cedearPrice').value);
    const imageUrl = document.getElementById('cedearImageUrl').value;
    const cedearType = document.getElementById('cedearType').value;

    if (!ticker) { showToast("Selecciona un CEDEAR", "error"); return; }
    if (isNaN(amount) || amount < 0) { showToast("Cantidad inválida", "error"); return; }

    showToast(`Obteniendo precio de ${ticker}...`, 'success');

    // Si tiene precio manual lo usamos, si no buscamos en Alpha Vantage
    if (!isNaN(manualPrice) && manualPrice > 0) {
        cedearPrices[ticker] = manualPrice;
    } else {
        await fetchCedearPrice(ticker);
    }

    if (imageUrl) cedearCustomImages[ticker] = imageUrl;
    addOrUpdateCedear(ticker, amount);
    closeModal();
});

    document.querySelectorAll('.modal-close').forEach(btn => btn.addEventListener('click', closeModal));
    window.addEventListener('click', (e) => { if (e.target.classList.contains('modal')) closeModal(); });
    document.getElementById('menuToggle')?.addEventListener('click', () => document.getElementById('sidebar').classList.toggle('open'));
    document.getElementById('closeSidebar')?.addEventListener('click', () => document.getElementById('sidebar').classList.remove('open'));
    
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
