// ----------------------------------------------
// WALLET FAMILY PRO - SCRIPT COMPLETO
// ----------------------------------------------

// Configuración de Firebase
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
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

let currentUser = null;
let btcPriceARS = 0, btcPriceUSD = 0;
let realtimeListeners = [];

let state = {
    activeTab: 'home',
    timeFilter: 'mes',
    currentDate: new Date(),
    formType: 'gasto',
    discountType: 'percentage',
    pinEnabled: localStorage.getItem('pin_enabled') === 'true',
    pinCode: localStorage.getItem('pin_code') || null,
    darkMode: localStorage.getItem('darkMode') === 'true',
    accounts: [],
    categories: [],
    transactions: [],
    savingsGoals: [],
    budgets: {},
    chart: null,
    filteredTransactions: [],
    lockPinBuffer: '',
    changePinBuffer: '',
    tempCategoryImage: null,
    editingTransactionId: null,
    editingBudgetCatId: null,
    tempNewAccountImage: null,
    tempEditAccountImage: null,
    currentDetailTxId: null
};

// --- Precios Bitcoin ---
async function fetchBTCPrice() {
    try {
        const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=ars,usd');
        const data = await res.json();
        if (data.bitcoin) {
            btcPriceARS = data.bitcoin.ars || 0;
            btcPriceUSD = data.bitcoin.usd || 0;
            updateBTCValueDisplay();
        }
    } catch(e) { console.error(e); }
}
function updateBTCValueDisplay() {
    const totalBTC = getTotalBitcoin();
    if (btcPriceARS) document.getElementById('btc-ars-value').innerHTML = `1 BTC ≈ ${formatCurrency(btcPriceARS, 'ARS')} | Total: ${formatCurrency(totalBTC * btcPriceARS, 'ARS')}`;
    if (btcPriceUSD) document.getElementById('btc-usd-value').innerHTML = `1 BTC ≈ ${formatCurrency(btcPriceUSD, 'USD')} | Total: ${formatCurrency(totalBTC * btcPriceUSD, 'USD')}`;
}
function getTotalBitcoin() {
    return state.transactions.reduce((sum, tx) => {
        if (tx.currency === 'BTC') return tx.type === 'ingreso' ? sum + tx.amount : sum - tx.amount;
        return sum;
    }, 0);
}
function formatCurrency(amount, currency = 'ARS') {
    if (isNaN(amount)) amount = 0;
    const symbols = { ARS: '$', USD: 'US$', BTC: '₿', BNB: 'BNB', SOL: '◎' };
    if (currency === 'BTC') {
        let btcStr = amount.toFixed(8);
        btcStr = btcStr.replace(/\.?0+$/, '');
        if (btcStr === '') btcStr = '0';
        return `₿ ${btcStr}`;
    }
    const decimals = { ARS: 2, USD: 2, BNB: 4, SOL: 4 };
    const value = amount.toFixed(decimals[currency] || 2);
    if (currency === 'ARS' || currency === 'USD') return `${symbols[currency]} ${value.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
    return `${symbols[currency]} ${value.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}
function formatCurrencyShort(amount, currency = 'ARS') {
    if (currency === 'BTC') return formatCurrency(amount, 'BTC');
    if (amount >= 1000) return `${formatCurrency(amount, currency).replace(/\.00$/, '').slice(0, -3)}k`;
    return formatCurrency(amount, currency);
}

// --- Firebase Storage: upload y delete (para imágenes) ---
async function uploadImage(file, path) {
    if (!file) return null;
    const ref = storage.ref(path);
    await ref.put(file);
    return await ref.getDownloadURL();
}
async function deleteImage(url) {
    if (!url) return;
    try { await storage.refFromURL(url).delete(); } catch(e) { console.warn(e); }
}
function dataURLtoFile(dataurl, filename) {
    const arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]), n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new File([u8arr], filename, { type: mime });
}

// --- Firestore sincronización ---
async function loadUserData() {
    if (!currentUser) return;
    const uid = currentUser.uid;
    const userDocRef = db.collection('users').doc(uid);
    const unsubscribeUser = userDocRef.onSnapshot((doc) => {
        if (doc.exists) {
            const data = doc.data();
            state.accounts = data.accounts || [];
            state.categories = data.categories || [];
            state.savingsGoals = data.savingsGoals || [];
            state.budgets = data.budgets || {};
            renderAll();
        } else createDefaultData();
    });
    realtimeListeners.push(unsubscribeUser);
    const transactionsRef = db.collection('users').doc(uid).collection('transactions');
    const unsubscribeTx = transactionsRef.orderBy('date', 'desc').onSnapshot((snap) => {
        state.transactions = [];
        snap.forEach(doc => state.transactions.push({ id: doc.id, ...doc.data() }));
        renderAll();
    });
    realtimeListeners.push(unsubscribeTx);
}
async function createDefaultData() {
    const defaultAccounts = [
        { id: 'a1', name: 'Principal', balance: 0, icon: 'banknote', color: 'bg-emerald-100 text-emerald-600', imageData: null, currency: 'ARS' },
        { id: 'a2', name: 'Crypto', balance: 0, icon: 'bitcoin', color: 'bg-orange-100 text-orange-600', imageData: null, currency: 'ARS' }
    ];
    const defaultCategories = [
        { id: 'c1', name: 'Salud', icon: 'heart', color: 'bg-rose-500', imageData: null },
        { id: 'c2', name: 'Ocio', icon: 'gamepad-2', color: 'bg-green-500', imageData: null },
        { id: 'c3', name: 'Casa', icon: 'home', color: 'bg-blue-500', imageData: null },
        { id: 'c4', name: 'Comida', icon: 'shopping-cart', color: 'bg-orange-500', imageData: null },
        { id: 'c5', name: 'Transporte', icon: 'bus', color: 'bg-cyan-500', imageData: null },
        { id: 'c6', name: 'Educación', icon: 'graduation-cap', color: 'bg-violet-500', imageData: null }
    ];
    const defaultBudgets = {};
    defaultCategories.forEach(c => defaultBudgets[c.id] = 10000);
    await db.collection('users').doc(currentUser.uid).set({
        accounts: defaultAccounts, categories: defaultCategories, savingsGoals: [], budgets: defaultBudgets
    });
    loadUserData();
}
async function saveToFirestore() {
    if (!currentUser) return;
    await db.collection('users').doc(currentUser.uid).update({
        accounts: state.accounts, categories: state.categories, savingsGoals: state.savingsGoals, budgets: state.budgets
    });
}
async function addTransactionToFirestore(tx) {
    if (!currentUser) return;
    await db.collection('users').doc(currentUser.uid).collection('transactions').doc(tx.id).set(tx);
}
async function updateTransactionInFirestore(id, data) {
    if (!currentUser) return;
    await db.collection('users').doc(currentUser.uid).collection('transactions').doc(id).set(data);
}
async function deleteTransactionFromFirestore(id) {
    if (!currentUser) return;
    await db.collection('users').doc(currentUser.uid).collection('transactions').doc(id).delete();
}

// --- Compartir wallet ---
async function shareWallet() {
    const email = document.getElementById('share-email').value.trim();
    if (!email) return notify("Ingresa un email válido");
    await db.collection('shared_wallets').add({
        ownerId: currentUser.uid, ownerEmail: currentUser.email, sharedWith: email, timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    notify(`Wallet compartida con ${email}`);
    closeModal('share');
}
function openShareModal() { document.getElementById('share-email').value = ''; openModal('share'); }

// --- CRUD Transacciones ---
async function saveTransaction() {
    let amount = parseFloat(document.getElementById('input-amount').value);
    const catId = document.getElementById('input-category').value;
    const accId = document.getElementById('input-account').value;
    const note = document.getElementById('input-note').value;
    const dateTime = document.getElementById('input-datetime').value;
    const currency = document.getElementById('input-currency').value;
    let discountPercent = parseFloat(document.getElementById('input-discount-percent')?.value || 0);
    let discountFixed = parseFloat(document.getElementById('input-discount-fixed')?.value || 0);
    if (isNaN(amount) || amount <= 0) return notify("Monto inválido");
    let finalAmount = amount;
    if (state.formType === 'gasto' && (discountPercent > 0 || discountFixed > 0)) {
        let afterPercent = amount * (1 - discountPercent / 100);
        let afterFixed = afterPercent - discountFixed;
        if (afterFixed < 0) afterFixed = 0;
        finalAmount = afterFixed;
    }
    const tx = {
        id: 'tx-' + Date.now(),
        amount: finalAmount,
        originalAmount: amount,
        catId, accId, note: note + (discountPercent || discountFixed ? ` (Desc: ${discountPercent}% + $${discountFixed})` : ''),
        type: state.formType,
        date: dateTime ? new Date(dateTime).toISOString() : new Date().toISOString(),
        discount: (discountPercent > 0 || discountFixed > 0),
        discountPercent, discountFixed,
        currency
    };
    const acc = state.accounts.find(a => a.id === accId);
    if (state.formType === 'gasto') acc.balance -= finalAmount;
    else acc.balance += finalAmount;
    state.transactions.unshift(tx);
    await addTransactionToFirestore(tx);
    await saveToFirestore();
    closeModal('add');
    renderAll();
    notify(`${state.formType === 'gasto' ? 'Gasto' : 'Ingreso'} registrado ✅`);
    document.getElementById('input-amount').value = '';
    document.getElementById('input-note').value = '';
    document.getElementById('input-discount-percent').value = '0';
    document.getElementById('input-discount-fixed').value = '0';
    document.getElementById('input-datetime').value = new Date().toISOString().slice(0,16);
}
async function updateTransaction() {
    const txId = state.editingTransactionId;
    const oldTx = state.transactions.find(t => t.id === txId);
    if (!oldTx) return;
    const newAmount = parseFloat(document.getElementById('edit-amount').value);
    const newCatId = document.getElementById('edit-category').value;
    const newAccId = document.getElementById('edit-account').value;
    const newNote = document.getElementById('edit-note').value;
    const newDate = document.getElementById('edit-datetime').value;
    const newType = document.getElementById('edit-type-gasto').classList.contains('bg-rose-500') ? 'gasto' : 'ingreso';
    const newCurrency = document.getElementById('edit-currency').value;
    if (isNaN(newAmount) || newAmount <= 0) return notify("Monto inválido");
    const oldAccount = state.accounts.find(a => a.id === oldTx.accId);
    if (oldTx.type === 'gasto') oldAccount.balance += oldTx.amount;
    else oldAccount.balance -= oldTx.amount;
    const updatedTx = { ...oldTx, amount: newAmount, catId: newCatId, accId: newAccId, note: newNote, date: newDate ? new Date(newDate).toISOString() : new Date().toISOString(), type: newType, currency: newCurrency };
    const newAccount = state.accounts.find(a => a.id === newAccId);
    if (newType === 'gasto') newAccount.balance -= newAmount;
    else newAccount.balance += newAmount;
    const index = state.transactions.findIndex(t => t.id === txId);
    if (index !== -1) state.transactions[index] = updatedTx;
    await updateTransactionInFirestore(txId, updatedTx);
    await saveToFirestore();
    closeModal('edit');
    renderAll();
    notify("Transacción actualizada ✅");
}
async function deleteTx(id) {
    if (!confirm("¿Eliminar este registro?")) return;
    const tx = state.transactions.find(t => t.id === id);
    if (!tx) return;
    const acc = state.accounts.find(a => a.id === tx.accId);
    if (tx.type === 'gasto') acc.balance += tx.amount;
    else acc.balance -= tx.amount;
    state.transactions = state.transactions.filter(t => t.id !== id);
    await deleteTransactionFromFirestore(id);
    await saveToFirestore();
    renderAll();
    notify("Movimiento eliminado 🗑️");
}
function openEditModal(id) {
    const tx = state.transactions.find(t => t.id === id);
    if (!tx) return;
    state.editingTransactionId = id;
    document.getElementById('edit-amount').value = tx.amount;
    document.getElementById('edit-currency').value = tx.currency || 'ARS';
    document.getElementById('edit-category').innerHTML = state.categories.map(c => `<option value="${c.id}" ${c.id === tx.catId ? 'selected' : ''}>${c.name}</option>`).join('');
    document.getElementById('edit-account').innerHTML = state.accounts.map(a => `<option value="${a.id}" ${a.id === tx.accId ? 'selected' : ''}>${a.name}</option>`).join('');
    document.getElementById('edit-note').value = tx.note || '';
    document.getElementById('edit-datetime').value = new Date(tx.date).toISOString().slice(0,16);
    if (tx.type === 'gasto') setEditFormType('gasto'); else setEditFormType('ingreso');
    openModal('edit');
}
function setEditFormType(t) {
    const btnG = document.getElementById('edit-type-gasto');
    const btnI = document.getElementById('edit-type-ingreso');
    if (t === 'gasto') {
        btnG.className = "flex-1 py-3 text-sm font-bold rounded-xl bg-rose-500 text-white shadow-lg";
        btnI.className = "flex-1 py-3 text-sm font-bold rounded-xl text-zinc-500";
    } else {
        btnG.className = "flex-1 py-3 text-sm font-bold rounded-xl text-zinc-500";
        btnI.className = "flex-1 py-3 text-sm font-bold rounded-xl bg-emerald-600 text-white shadow-lg";
    }
}

// --- CRUD Cuentas ---
async function addAccount() {
    const name = document.getElementById('new-account-name').value;
    const icon = document.getElementById('new-account-icon').value;
    if (!name) return notify("Ingresá un nombre");
    let imageUrl = null;
    if (state.tempNewAccountImage) {
        const file = dataURLtoFile(state.tempNewAccountImage, 'account.jpg');
        imageUrl = await uploadImage(file, `users/${currentUser.uid}/accounts/${Date.now()}.jpg`);
    }
    const colors = { 'banknote': 'bg-emerald-100 text-emerald-600', 'credit-card': 'bg-blue-100 text-blue-600', 'bitcoin': 'bg-orange-100 text-orange-600', 'piggy-bank': 'bg-purple-100 text-purple-600' };
    state.accounts.push({ id: 'acc-' + Date.now(), name, balance: 0, icon, color: colors[icon] || 'bg-emerald-100 text-emerald-600', imageData: imageUrl, currency: 'ARS' });
    await saveToFirestore();
    closeModal('account');
    renderAll();
    notify("Cuenta creada ✅");
}
function openNewAccountModal() {
    document.getElementById('new-account-name').value = '';
    document.getElementById('new-account-icon').value = 'banknote';
    document.getElementById('new-account-image').value = '';
    document.getElementById('new-account-preview').classList.add('hidden');
    state.tempNewAccountImage = null;
    openModal('account');
    document.getElementById('new-account-image').onchange = function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = ev => {
                state.tempNewAccountImage = ev.target.result;
                document.getElementById('new-account-img').src = ev.target.result;
                document.getElementById('new-account-preview').classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        }
    };
}
function clearNewAccountImage() { state.tempNewAccountImage = null; document.getElementById('new-account-image').value = ''; document.getElementById('new-account-preview').classList.add('hidden'); }
function openEditAccountModal(id) {
    const acc = state.accounts.find(a => a.id === id);
    if (!acc) return;
    document.getElementById('edit-account-name').value = acc.name;
    document.getElementById('edit-account-icon').value = acc.icon;
    document.getElementById('edit-account-id').value = acc.id;
    state.tempEditAccountImage = acc.imageData || null;
    if (acc.imageData) {
        document.getElementById('edit-account-img').src = acc.imageData;
        document.getElementById('edit-account-preview').classList.remove('hidden');
    } else document.getElementById('edit-account-preview').classList.add('hidden');
    openModal('edit-account');
    document.getElementById('edit-account-image').onchange = e => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = ev => {
                state.tempEditAccountImage = ev.target.result;
                document.getElementById('edit-account-img').src = ev.target.result;
                document.getElementById('edit-account-preview').classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        }
    };
}
async function updateAccount() {
    const id = document.getElementById('edit-account-id').value;
    const newName = document.getElementById('edit-account-name').value;
    const newIcon = document.getElementById('edit-account-icon').value;
    if (!newName) return notify("El nombre es requerido");
    let imageUrl = state.tempEditAccountImage;
    const fileInput = document.getElementById('edit-account-image');
    if (fileInput.files.length > 0) {
        if (state.tempEditAccountImage && state.tempEditAccountImage.startsWith('http')) await deleteImage(state.tempEditAccountImage);
        const file = fileInput.files[0];
        imageUrl = await uploadImage(file, `users/${currentUser.uid}/accounts/${id}.jpg`);
    }
    const colors = { 'banknote': 'bg-emerald-100 text-emerald-600', 'credit-card': 'bg-blue-100 text-blue-600', 'bitcoin': 'bg-orange-100 text-orange-600', 'piggy-bank': 'bg-purple-100 text-purple-600' };
    const index = state.accounts.findIndex(a => a.id === id);
    if (index !== -1) {
        state.accounts[index].name = newName;
        state.accounts[index].icon = newIcon;
        state.accounts[index].color = colors[newIcon] || 'bg-emerald-100 text-emerald-600';
        state.accounts[index].imageData = imageUrl;
        await saveToFirestore();
        closeModal('edit-account');
        renderAll();
        notify("Cartera actualizada ✅");
    }
}
async function deleteAccount(id) {
    if (!confirm("¿Eliminar esta cartera? Se perderán todas sus transacciones.")) return;
    const acc = state.accounts.find(a => a.id === id);
    if (acc && acc.imageData) await deleteImage(acc.imageData);
    state.transactions = state.transactions.filter(t => t.accId !== id);
    state.accounts = state.accounts.filter(a => a.id !== id);
    await saveToFirestore();
    renderAll();
    notify("Cartera eliminada");
}

// --- CRUD Categorías ---
function openCategoryModal(editId = null) {
    if (editId) {
        const cat = state.categories.find(c => c.id === editId);
        if (cat) {
            document.getElementById('category-modal-title').textContent = 'Editar Categoría';
            document.getElementById('category-name').value = cat.name;
            document.getElementById('category-icon').value = cat.icon;
            document.getElementById('category-color').value = cat.color;
            document.getElementById('category-id').value = cat.id;
            if (cat.imageData) {
                document.getElementById('image-preview').classList.remove('hidden');
                document.getElementById('category-image-preview').src = cat.imageData;
                state.tempCategoryImage = cat.imageData;
            } else { document.getElementById('image-preview').classList.add('hidden'); state.tempCategoryImage = null; }
        }
    } else {
        document.getElementById('category-modal-title').textContent = 'Nueva Categoría';
        document.getElementById('category-name').value = '';
        document.getElementById('category-icon').value = 'heart';
        document.getElementById('category-color').value = 'bg-emerald-500';
        document.getElementById('category-id').value = '';
        document.getElementById('image-preview').classList.add('hidden');
        state.tempCategoryImage = null;
    }
    openModal('category');
    document.getElementById('category-image-input').onchange = function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = ev => {
                state.tempCategoryImage = ev.target.result;
                document.getElementById('category-image-preview').src = ev.target.result;
                document.getElementById('image-preview').classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        }
    };
}
function removeCategoryImage() { state.tempCategoryImage = null; document.getElementById('image-preview').classList.add('hidden'); document.getElementById('category-image-input').value = ''; }
async function saveCategory() {
    const name = document.getElementById('category-name').value;
    const icon = document.getElementById('category-icon').value;
    const color = document.getElementById('category-color').value;
    const editId = document.getElementById('category-id').value;
    if (!name) return notify("Ingresa un nombre");
    let imageUrl = state.tempCategoryImage;
    const fileInput = document.getElementById('category-image-input');
    if (fileInput.files.length > 0) {
        if (editId) {
            const oldCat = state.categories.find(c => c.id === editId);
            if (oldCat && oldCat.imageData) await deleteImage(oldCat.imageData);
        }
        const file = fileInput.files[0];
        imageUrl = await uploadImage(file, `users/${currentUser.uid}/categories/${Date.now()}.jpg`);
    }
    const categoryData = { name, icon, color, imageData: imageUrl };
    if (editId) {
        const index = state.categories.findIndex(c => c.id === editId);
        if (index !== -1) state.categories[index] = { ...state.categories[index], ...categoryData };
    } else {
        const newId = 'cat-' + Date.now();
        state.categories.push({ id: newId, ...categoryData });
        state.budgets[newId] = 10000;
    }
    await saveToFirestore();
    closeModal('category');
    renderAll();
    notify(editId ? "Categoría actualizada" : "Categoría creada");
}
async function deleteCategory(id) {
    if (!confirm("¿Eliminar esta categoría?")) return;
    const cat = state.categories.find(c => c.id === id);
    if (cat && cat.imageData) await deleteImage(cat.imageData);
    state.categories = state.categories.filter(c => c.id !== id);
    delete state.budgets[id];
    await saveToFirestore();
    renderAll();
    notify("Categoría eliminada");
}

// --- Metas de ahorro ---
async function addSavingsGoal() {
    const name = document.getElementById('new-goal-name').value;
    const amount = parseFloat(document.getElementById('new-goal-amount').value);
    const targetDate = document.getElementById('new-goal-date').value;
    if (!name || !amount) return notify("Completá nombre y monto");
    state.savingsGoals.push({ id: 'goal-' + Date.now(), name, amount, targetDate: targetDate || null });
    await saveToFirestore();
    closeModal('goal');
    renderAll();
    notify("Meta creada 🎯");
}
async function deleteGoal(id) {
    if (confirm("¿Eliminar esta meta?")) {
        state.savingsGoals = state.savingsGoals.filter(g => g.id !== id);
        await saveToFirestore();
        renderAll();
        notify("Meta eliminada");
    }
}
function openNewGoalModal() { document.getElementById('new-goal-name').value = ''; document.getElementById('new-goal-amount').value = ''; document.getElementById('new-goal-date').value = ''; openModal('goal'); }

// --- Presupuestos ---
function deleteBudget(catId) {
    if (confirm("¿Eliminar el presupuesto de esta categoría?")) {
        state.budgets[catId] = 0;
        saveToFirestore();
        renderAll();
        notify("Presupuesto eliminado");
    }
}
function editSingleBudget(catId, catName) {
    state.editingBudgetCatId = catId;
    document.getElementById('budget-cat-name').innerText = catName;
    document.getElementById('edit-budget-amount').value = state.budgets[catId] || 0;
    openModal('edit-budget');
}
async function saveSingleBudget() {
    const newAmount = parseFloat(document.getElementById('edit-budget-amount').value);
    if (!isNaN(newAmount) && state.editingBudgetCatId) {
        state.budgets[state.editingBudgetCatId] = newAmount;
        await saveToFirestore();
        closeModal('edit-budget');
        renderAll();
        notify("Presupuesto actualizado");
    } else notify("Ingrese un monto válido");
}
async function saveBudgets() {
    document.querySelectorAll('.budget-input').forEach(inp => {
        const catId = inp.dataset.catId;
        const val = parseFloat(inp.value);
        if (!isNaN(val)) state.budgets[catId] = val;
    });
    await saveToFirestore();
    closeModal('budget');
    renderAll();
    notify("Presupuestos guardados ✅");
}
function openBudgetModal() {
    const editor = document.getElementById('budget-editor');
    editor.innerHTML = state.categories.map(cat => `<div class="flex items-center justify-between gap-2"><span class="text-sm font-bold w-24 truncate">${cat.name}</span><input type="number" class="budget-input flex-1 p-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl" data-cat-id="${cat.id}" value="${state.budgets[cat.id] || 0}" step="1000"></div>`).join('');
    openModal('budget');
}

// --- Renders ---
function getFilteredData() {
    const now = new Date();
    return state.transactions.filter(t => {
        const d = new Date(t.date);
        if (state.timeFilter === 'dia') return d.toDateString() === now.toDateString();
        if (state.timeFilter === 'semana') return (now - d) / (1000*3600*24) <= 7;
        if (state.timeFilter === 'mes') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        if (state.timeFilter === 'año') return d.getFullYear() === now.getFullYear();
        return true;
    });
}
function renderBalance() {
    const filtered = getFilteredData();
    const income = filtered.filter(t => t.type === 'ingreso').reduce((s,t)=> s + t.amount, 0);
    const expense = filtered.filter(t => t.type === 'gasto').reduce((s,t)=> s + t.amount, 0);
    const refunds = filtered.filter(t => t.type === 'gasto' && t.discount).reduce((s,t)=> s + (t.discountPercent ? t.originalAmount * t.discountPercent/100 : 0) + (t.discountFixed||0), 0);
    const total = state.accounts.reduce((s,a)=> s + a.balance, 0);
    document.getElementById('total-balance').innerHTML = formatCurrency(total, 'ARS');
    document.getElementById('total-income').innerHTML = formatCurrency(income, 'ARS');
    document.getElementById('total-expense').innerHTML = formatCurrency(expense, 'ARS');
    document.getElementById('total-refunds').innerHTML = formatCurrency(refunds, 'ARS');
    document.getElementById('total-bitcoin').innerHTML = formatCurrency(getTotalBitcoin(), 'BTC');
    updateBTCValueDisplay();
    const summaryDiv = document.getElementById('accounts-summary');
    if (summaryDiv) summaryDiv.innerHTML = state.accounts.map(acc => `<div class="account-card bg-white/10 rounded-xl p-2 backdrop-blur-sm" onclick="showHistoryByAccount('${acc.id}')"><p class="text-[9px] font-bold uppercase truncate">${acc.name}</p><p class="text-xs font-black ${acc.balance<0?'text-rose-300':'text-emerald-300'}">${formatCurrency(acc.balance, acc.currency||'ARS')}</p></div>`).join('');
}
function renderTransactions() {
    const container = document.getElementById('tx-list');
    const data = state.filteredTransactions.length ? state.filteredTransactions : getFilteredData();
    if (!data.length) { container.innerHTML = '<div class="text-center py-10 opacity-20 italic">Sin movimientos</div>'; return; }
    container.innerHTML = '';
    data.slice(0,20).forEach(tx => {
        const cat = state.categories.find(c => c.id === tx.catId) || { icon: 'info', color: 'bg-zinc-400', name: 'Otro' };
        const account = state.accounts.find(a => a.id === tx.accId);
        const typeColor = tx.type === 'gasto' ? 'text-rose-500' : 'text-emerald-600';
        const typeIcon = tx.type === 'gasto' ? '-' : '+';
        const div = document.createElement('div');
        div.className = "bg-white dark:bg-zinc-900 p-4 rounded-[1.8rem] border border-zinc-100 dark:border-zinc-800 shadow-sm hover:border-emerald-100 transition-colors tx-item";
        div.onclick = () => showTransactionDetail(tx.id);
        div.innerHTML = `<div class="flex items-center gap-4 flex-1 min-w-0">${cat.imageData ? `<img src="${cat.imageData}" class="w-10 h-10 rounded-xl object-cover">` : `<div class="${cat.color} p-3 rounded-2xl text-white shadow-lg"><i data-lucide="${cat.icon}" size="18"></i></div>`}<div class="tx-info"><p class="font-bold text-sm truncate">${escapeHtml(tx.note || cat.name)}</p><p class="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">${new Date(tx.date).toLocaleString()}</p><p class="text-[8px] text-zinc-500">${account?.name || ''}</p>${tx.discount ? `<p class="text-[8px] text-emerald-500">Desc: ${tx.discountPercent}% + $${tx.discountFixed}</p>` : ''}</div></div><div class="flex items-center gap-2"><button onclick="openEditModal('${tx.id}')" class="p-2 text-blue-600 bg-blue-50 dark:bg-blue-900/30 rounded-xl"><i data-lucide="edit-2" size="16"></i></button><button onclick="deleteTx('${tx.id}')" class="p-2 text-rose-600 bg-rose-50 dark:bg-rose-900/30 rounded-xl"><i data-lucide="trash-2" size="16"></i></button><p class="font-black ${typeColor} ml-2">${typeIcon}${formatCurrency(tx.amount, tx.currency||'ARS')}</p></div>`;
        container.appendChild(div);
    });
    lucide.createIcons();
}
function renderAccounts() {
    const container = document.getElementById('acc-list');
    if (!container) return;
    container.innerHTML = state.accounts.map(a => `<div class="account-card bg-white dark:bg-zinc-900 p-6 rounded-[2.2rem] border shadow-sm" onclick="showHistoryByAccount('${a.id}')"><div class="flex items-center gap-4 flex-1">${a.imageData ? `<img src="${a.imageData}" class="w-12 h-12 rounded-xl object-cover">` : `<div class="${a.color} p-4 rounded-2xl"><i data-lucide="${a.icon}" size="22"></i></div>`}<div><p class="font-black text-sm">${a.name}</p><p class="text-[9px] text-zinc-400 font-bold uppercase">Saldo</p></div></div><div class="flex items-center gap-2"><p class="font-black ${a.balance<0?'text-rose-500':'text-emerald-600'} text-lg mr-2">${formatCurrency(a.balance, a.currency||'ARS')}</p><button onclick="event.stopPropagation(); openEditAccountModal('${a.id}')" class="p-2 text-blue-600 bg-blue-50 rounded-xl"><i data-lucide="edit-2" size="16"></i></button><button onclick="event.stopPropagation(); deleteAccount('${a.id}')" class="p-2 text-rose-600 bg-rose-50 rounded-xl"><i data-lucide="trash-2" size="16"></i></button></div></div>`).join('');
    lucide.createIcons();
}
function renderStats() {
    const statBox = document.getElementById('stat-bars');
    const grid = document.getElementById('cat-grid');
    if (!statBox || !grid) return;
    const filtered = (state.filteredTransactions.length ? state.filteredTransactions : getFilteredData()).filter(t => t.type === 'gasto');
    const byCat = {};
    filtered.forEach(t => byCat[t.catId] = (byCat[t.catId] || 0) + t.amount);
    const totalExp = filtered.reduce((s,t)=> s + t.amount, 0) || 1;
    const sorted = Object.entries(byCat).sort((a,b)=> b[1]-a[1]);
    statBox.innerHTML = sorted.slice(0,5).map(([id,val]) => {
        const cat = state.categories.find(c=>c.id===id);
        if (!cat) return '';
        const pct = (val/totalExp)*100;
        return `<div class="space-y-1.5"><div class="flex justify-between text-[10px] font-bold"><span class="text-zinc-600 dark:text-zinc-400 uppercase">${cat.name}</span><span>${formatCurrency(val,'ARS')} (${Math.round(pct)}%)</span></div><div class="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden"><div class="h-full ${cat.color} progress-bar" style="width: ${pct}%"></div></div></div>`;
    }).join('');
    grid.innerHTML = state.categories.map(c => {
        const spent = byCat[c.id] || 0;
        const budget = state.budgets[c.id] || 0;
        const percent = budget ? (spent/budget)*100 : 0;
        const isOver = percent > 100;
        return `<div class="bg-white dark:bg-zinc-900 p-4 rounded-3xl border flex flex-col items-center gap-2 relative">${c.imageData ? `<img src="${c.imageData}" class="w-10 h-10 rounded-xl object-cover">` : `<div class="${c.color} p-3 rounded-2xl text-white shadow-md"><i data-lucide="${c.icon}" size="16"></i></div>`}<p class="text-[9px] font-black uppercase text-zinc-400">${c.name}</p><p class="text-[8px] font-bold ${isOver ? 'text-rose-500' : 'text-emerald-600'}">${formatCurrency(spent,'ARS')} / ${formatCurrency(budget,'ARS')}</p>${isOver ? '<div class="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full animate-pulse"></div>' : ''}<button onclick="deleteBudget('${c.id}')" class="text-[10px] text-rose-500 mt-1">🗑️ Eliminar presupuesto</button></div>`;
    }).join('');
    lucide.createIcons();
}
function renderBudgets() {
    const container = document.getElementById('budgets-list');
    if (!container) return;
    const now = new Date();
    const monthlyExpenses = state.transactions.filter(t => {
        const d = new Date(t.date);
        return t.type === 'gasto' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const byCat = {};
    monthlyExpenses.forEach(t => byCat[t.catId] = (byCat[t.catId] || 0) + t.amount);
    const catsWithBudget = state.categories.filter(c => (state.budgets[c.id] || 0) > 0);
    container.innerHTML = catsWithBudget.map(cat => {
        const spent = byCat[cat.id] || 0;
        const budget = state.budgets[cat.id] || 0;
        const percent = budget ? (spent/budget)*100 : 0;
        const isOver = percent > 100;
        return `<div class="budget-item space-y-1 p-2 rounded-xl" onclick="editSingleBudget('${cat.id}', '${cat.name.replace(/'/g, "\\'")}')"><div class="flex justify-between text-[11px]"><div class="flex items-center gap-2">${cat.imageData ? `<img src="${cat.imageData}" class="w-4 h-4 rounded object-cover">` : `<i data-lucide="${cat.icon}" size="12" class="${cat.color.replace('bg','text').replace('-500','')}"></i>`}<span class="font-bold">${cat.name}</span></div><span class="${isOver ? 'text-rose-500' : 'text-emerald-600'} font-bold">${formatCurrency(spent,'ARS')} / ${formatCurrency(budget,'ARS')}</span></div><div class="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden"><div class="h-full ${isOver ? 'bg-rose-500' : 'bg-emerald-600'} progress-bar" style="width: ${Math.min(percent,100)}%"></div></div></div>`;
    }).join('');
    lucide.createIcons();
}
function renderSavingsGoals() {
    const container = document.getElementById('savings-goals');
    if (!container) return;
    const currentBalance = state.accounts.reduce((s,a)=> s + a.balance, 0);
    if (!state.savingsGoals.length) { container.innerHTML = '<div class="text-center text-zinc-400 text-sm py-4">No hay metas. Crea una nueva.</div>'; return; }
    container.innerHTML = state.savingsGoals.map(goal => {
        const progress = (currentBalance / goal.amount) * 100;
        let daysLeft = null, dailyNeeded = null;
        if (goal.targetDate) {
            const today = new Date(), target = new Date(goal.targetDate);
            const diff = target - today;
            daysLeft = Math.ceil(diff / (1000*3600*24));
            if (daysLeft > 0 && currentBalance < goal.amount) dailyNeeded = (goal.amount - currentBalance) / daysLeft;
        }
        return `<div class="space-y-2 border-b border-zinc-100 dark:border-zinc-800 pb-3 last:border-0"><div class="flex justify-between text-sm"><span class="font-bold">${goal.name}</span><span class="text-emerald-600 font-bold">${formatCurrency(currentBalance,'ARS')} / ${formatCurrency(goal.amount,'ARS')}</span></div><div class="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden"><div class="h-full bg-emerald-600 progress-bar" style="width: ${Math.min(progress,100)}%"></div></div>${goal.targetDate ? `<div class="flex justify-between text-[10px] text-zinc-500"><span>📅 ${new Date(goal.targetDate).toLocaleDateString()}</span>${daysLeft !== null ? `<span>${daysLeft} días restantes</span>` : ''}</div>${dailyNeeded && dailyNeeded>0 ? `<div class="text-[10px] text-emerald-600">Necesitas ahorrar ${formatCurrency(dailyNeeded,'ARS')} por día</div>` : (daysLeft !== null && daysLeft <=0 && currentBalance < goal.amount ? '<div class="text-[10px] text-rose-500">Fecha límite alcanzada</div>' : '')}` : '<div class="text-[10px] text-zinc-400">Sin fecha límite</div>'}<button onclick="deleteGoal('${goal.id}')" class="text-[10px] text-rose-500 mt-1">Eliminar</button></div>`;
    }).join('');
}
function renderCategoriesManager() {
    const container = document.getElementById('cat-manager-list');
    if (!container) return;
    container.innerHTML = state.categories.map(cat => `<div class="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 flex items-center justify-between"><div class="flex items-center gap-3">${cat.imageData ? `<img src="${cat.imageData}" class="w-10 h-10 rounded-xl object-cover">` : `<div class="${cat.color} p-2 rounded-xl text-white"><i data-lucide="${cat.icon}" size="18"></i></div>`}<div><p class="font-bold text-sm">${cat.name}</p><p class="text-[9px] text-zinc-400 uppercase">${cat.color.replace('bg-','').replace('-500','')}</p></div></div><div class="flex gap-2"><button onclick="openCategoryModal('${cat.id}')" class="p-2 text-blue-600 bg-blue-50 rounded-xl"><i data-lucide="edit-2" size="16"></i></button><button onclick="deleteCategory('${cat.id}')" class="p-2 text-rose-600 bg-rose-50 rounded-xl"><i data-lucide="trash-2" size="16"></i></button></div></div>`).join('');
    lucide.createIcons();
}
function renderCalendarWithAmounts() {
    const grid = document.getElementById('cal-grid');
    const label = document.getElementById('cal-month');
    if (!grid) return;
    grid.innerHTML = '';
    const year = state.currentDate.getFullYear();
    const month = state.currentDate.getMonth();
    label.textContent = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(state.currentDate);
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month+1, 0).getDate();
    const today = new Date();
    const dailyTotals = {};
    state.transactions.forEach(tx => {
        const d = new Date(tx.date);
        if (d.getMonth() === month && d.getFullYear() === year) {
            const day = d.getDate();
            if (!dailyTotals[day]) dailyTotals[day] = { gastos: 0, ingresos: 0 };
            if (tx.type === 'gasto') dailyTotals[day].gastos += tx.amount;
            else if (tx.type === 'ingreso') dailyTotals[day].ingresos += tx.amount;
        }
    });
    for (let i=0; i<firstDay; i++) grid.innerHTML += '<div></div>';
    for (let d=1; d<=daysInMonth; d++) {
        const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
        const data = dailyTotals[d];
        const gastos = data?.gastos || 0;
        const ingresos = data?.ingresos || 0;
        let bgClass = '';
        if (gastos > ingresos) bgClass = 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300';
        else if (ingresos > gastos) bgClass = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
        else if (gastos > 0 || ingresos > 0) bgClass = 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
        const dayDiv = document.createElement('div');
        dayDiv.className = `aspect-square flex flex-col items-center justify-center rounded-2xl text-[10px] font-black transition-all p-1 calendar-day ${bgClass} ${isToday ? 'ring-2 ring-emerald-500' : ''}`;
        dayDiv.onclick = () => showTransactionsByDate(year, month, d);
        dayDiv.innerHTML = `<span class="text-sm font-bold">${d}</span>${gastos ? `<span class="text-[8px] text-rose-500 font-bold">-${formatCurrencyShort(gastos,'ARS')}</span>` : ''}${ingresos ? `<span class="text-[8px] text-emerald-600 font-bold">+${formatCurrencyShort(ingresos,'ARS')}</span>` : ''}`;
        grid.appendChild(dayDiv);
    }
}
function updateChart() {
    const ctx = document.getElementById('expenseChart');
    if (!ctx) return;
    const filtered = (state.filteredTransactions.length ? state.filteredTransactions : getFilteredData()).filter(t => t.type === 'gasto');
    const byCat = {};
    filtered.forEach(t => byCat[t.catId] = (byCat[t.catId] || 0) + t.amount);
    const labels = [], data = [];
    Object.entries(byCat).forEach(([id,val]) => { const cat = state.categories.find(c=>c.id===id); if(cat) { labels.push(cat.name); data.push(val); } });
    if (state.chart) state.chart.destroy();
    state.chart = new Chart(ctx, {
        type: 'doughnut',
        data: { labels, datasets: [{ data, backgroundColor: ['#10B981','#3B82F6','#F59E0B','#EF4444','#8B5CF6','#EC4899','#06B6D4','#84CC16','#F97316','#D946EF'], borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: true, plugins: { tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${formatCurrency(ctx.raw, 'ARS')} (${((ctx.raw/ctx.dataset.data.reduce((a,b)=>a+b,0))*100).toFixed(1)}%)` } }, legend: { position: 'bottom', labels: { font: { size: 10 } } } } }
    });
}
function applyFilters() {
    const category = document.getElementById('filter-category')?.value || '';
    const account = document.getElementById('filter-account')?.value || '';
    const type = document.getElementById('filter-type')?.value || '';
    const month = document.getElementById('filter-month')?.value || '';
    state.filteredTransactions = state.transactions.filter(t => {
        if (category && t.catId !== category) return false;
        if (account && t.accId !== account) return false;
        if (type && t.type !== type) return false;
        if (month) { const d = new Date(t.date); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` === month; }
        return true;
    });
    renderAll();
}
function renderAll() {
    renderBalance();
    renderCalendarWithAmounts();
    renderTransactions();
    renderAccounts();
    renderStats();
    renderSavingsGoals();
    renderBudgets();
    renderCategoriesManager();
    updateChart();
    lucide.createIcons();
}

// --- Historial y detalles ---
function showHistoryByType(type) {
    let filtered = [], title = '';
    if (type === 'ingreso') { filtered = state.transactions.filter(t=>t.type==='ingreso'); title = `Ingresos - Total: ${formatCurrency(filtered.reduce((s,t)=>s+t.amount,0),'ARS')}`; }
    else if (type === 'gasto') { filtered = state.transactions.filter(t=>t.type==='gasto'); title = `Gastos - Total: ${formatCurrency(filtered.reduce((s,t)=>s+t.amount,0),'ARS')}`; }
    else if (type === 'reintegro') { filtered = state.transactions.filter(t=>t.type==='gasto' && t.discount); let totalDes = filtered.reduce((s,t)=> s + (t.discountPercent ? t.originalAmount*t.discountPercent/100 : 0) + (t.discountFixed||0),0); title = `Reintegros - Ahorrado: ${formatCurrency(totalDes,'ARS')}`; }
    showHistoryList(filtered, title);
}
function showHistoryByCurrency(currency) {
    const filtered = state.transactions.filter(t => t.currency === currency);
    let total = filtered.reduce((s,t)=> t.type === 'ingreso' ? s + t.amount : s - t.amount, 0);
    showHistoryList(filtered, `Historial en ${currency} - Total: ${formatCurrency(total, currency)}`);
}
function showHistoryByAccount(accountId) {
    const acc = state.accounts.find(a=>a.id===accountId);
    if (!acc) return;
    const filtered = state.transactions.filter(t=>t.accId===accountId);
    let total = filtered.reduce((s,t)=> t.type === 'ingreso' ? s + t.amount : s - t.amount, 0);
    showHistoryList(filtered, `Historial de ${acc.name} - Saldo: ${formatCurrency(total, acc.currency||'ARS')}`);
}
function showFullHistory() {
    showHistoryList([...state.transactions].sort((a,b)=>new Date(b.date)-new Date(a.date)), 'Historial completo');
}
function showHistoryList(transactions, title) {
    const modal = document.getElementById('modal-history');
    const titleEl = document.getElementById('history-title');
    const listEl = document.getElementById('history-list');
    titleEl.textContent = title;
    if (!transactions.length) listEl.innerHTML = '<div class="text-center text-zinc-400 py-8">No hay registros</div>';
    else {
        listEl.innerHTML = transactions.map(tx => {
            const cat = state.categories.find(c=>c.id===tx.catId) || { name: 'Sin categoría' };
            const sign = tx.type === 'gasto' ? '-' : '+';
            const color = tx.type === 'gasto' ? 'text-rose-500' : 'text-emerald-600';
            return `<div class="tx-item bg-white dark:bg-zinc-900 p-3 rounded-xl border hover:bg-zinc-50" onclick="showTransactionDetail('${tx.id}')"><div class="flex-1"><p class="font-bold text-sm">${escapeHtml(tx.note || cat.name)}</p><p class="text-[10px] text-zinc-400">${new Date(tx.date).toLocaleString()}</p>${tx.discount ? `<p class="text-[8px] text-emerald-500">Desc: ${tx.discountPercent}% + $${tx.discountFixed}</p>` : ''}</div><p class="font-black ${color}">${sign} ${formatCurrency(tx.amount, tx.currency||'ARS')}</p></div>`;
        }).join('');
    }
    modal.classList.remove('hidden');
    lucide.createIcons();
}
function showTransactionDetail(txId) {
    const tx = state.transactions.find(t=>t.id===txId);
    if (!tx) return;
    state.currentDetailTxId = txId;
    const cat = state.categories.find(c=>c.id===tx.catId) || { name: 'Sin categoría' };
    const account = state.accounts.find(a=>a.id===tx.accId) || { name: 'Sin cuenta' };
    const sign = tx.type === 'gasto' ? '-' : '+';
    const color = tx.type === 'gasto' ? 'text-rose-500' : 'text-emerald-600';
    const discountHtml = tx.discount ? `<div class="tx-detail-row"><span class="font-bold">Descuento:</span><span>${tx.discountPercent}% + $${tx.discountFixed}</span></div>` : '';
    const html = `<div class="tx-detail-row"><span class="font-bold">Fecha:</span><span>${new Date(tx.date).toLocaleString()}</span></div><div class="tx-detail-row"><span class="font-bold">Nota:</span><span>${escapeHtml(tx.note||'')}</span></div><div class="tx-detail-row"><span class="font-bold">Categoría:</span><span>${cat.name}</span></div><div class="tx-detail-row"><span class="font-bold">Cuenta:</span><span>${account.name}</span></div><div class="tx-detail-row"><span class="font-bold">Monto:</span><span class="${color}">${sign} ${formatCurrency(tx.amount, tx.currency||'ARS')}</span></div>${discountHtml}<div class="tx-detail-row"><span class="font-bold">Moneda:</span><span>${tx.currency||'ARS'}</span></div><div class="tx-detail-row"><span class="font-bold">Tipo:</span><span>${tx.type==='gasto'?'Gasto':(tx.type==='reintegro'?'Reintegro':'Ingreso')}</span></div>`;
    document.getElementById('tx-detail-content').innerHTML = html;
    const editBtn = document.getElementById('tx-detail-edit');
    const deleteBtn = document.getElementById('tx-detail-delete');
    editBtn.onclick = () => { closeModal('tx-detail'); openEditModal(txId); };
    deleteBtn.onclick = () => { closeModal('tx-detail'); deleteTx(txId); };
    openModal('tx-detail');
}
function showTransactionsByDate(year, month, day) {
    const filtered = state.transactions.filter(tx => {
        const d = new Date(tx.date);
        return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });
    showHistoryList(filtered, `Transacciones del ${new Date(year, month, day).toLocaleDateString('es-AR')}`);
}

// --- UI y navegación ---
function setTimeFilter(f) {
    state.timeFilter = f;
    document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('tab-active'));
    document.getElementById(`btn-${f}`).classList.add('tab-active');
    state.filteredTransactions = [];
    renderAll();
}
function switchTab(t) {
    state.activeTab = t;
    document.querySelectorAll('.view-content').forEach(v => v.classList.add('hidden'));
    document.getElementById(`view-${t}`).classList.remove('hidden');
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('tab-active', 'text-emerald-600'));
    const navBtn = document.getElementById(`nav-${t}`);
    if (navBtn) navBtn.classList.add('tab-active', 'text-emerald-600');
    window.scrollTo(0,0);
    if (t === 'stats' || t === 'categories') applyFilters();
}
function openModal(m) { document.getElementById(`modal-${m}`).classList.remove('hidden'); }
function closeModal(m) { document.getElementById(`modal-${m}`).classList.add('hidden'); }
function setFormType(t) {
    state.formType = t;
    const btnG = document.getElementById('form-type-gasto');
    const btnI = document.getElementById('form-type-ingreso');
    const btnSave = document.getElementById('btn-save');
    const discountDiv = document.getElementById('discount-section');
    if (t === 'gasto') {
        btnG.className = "flex-1 py-3 text-sm font-bold rounded-xl bg-rose-500 text-white shadow-lg";
        btnI.className = "flex-1 py-3 text-sm font-bold rounded-xl text-zinc-500";
        btnSave.className = "w-full py-5 bg-rose-500 text-white rounded-[2rem] font-black text-lg shadow-xl active:scale-95 transition-all";
        btnSave.textContent = "Registrar Gasto";
        if (discountDiv) discountDiv.style.display = 'block';
    } else {
        btnG.className = "flex-1 py-3 text-sm font-bold rounded-xl text-zinc-500";
        btnI.className = "flex-1 py-3 text-sm font-bold rounded-xl bg-emerald-600 text-white shadow-lg";
        btnSave.className = "w-full py-5 bg-emerald-600 text-white rounded-[2rem] font-black text-lg shadow-xl active:scale-95 transition-all";
        btnSave.textContent = "Registrar Ingreso";
        if (discountDiv) discountDiv.style.display = 'none';
    }
}
function setDiscountType(type) {
    state.discountType = type;
    const percentBtn = document.getElementById('discount-percent-btn');
    const fixedBtn = document.getElementById('discount-fixed-btn');
    if (type === 'percentage') {
        percentBtn.className = "flex-1 py-2 rounded-xl text-sm font-bold bg-emerald-600 text-white";
        fixedBtn.className = "flex-1 py-2 rounded-xl text-sm font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600";
    } else {
        percentBtn.className = "flex-1 py-2 rounded-xl text-sm font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600";
        fixedBtn.className = "flex-1 py-2 rounded-xl text-sm font-bold bg-emerald-600 text-white";
    }
}
function navMonth(delta) { state.currentDate.setMonth(state.currentDate.getMonth() + delta); renderCalendarWithAmounts(); }
function toggleSearch() { document.getElementById('search-area').classList.toggle('hidden'); }
function handleSearch(val) {
    if (!val.trim()) { state.filteredTransactions = []; renderTransactions(); return; }
    state.filteredTransactions = state.transactions.filter(tx => tx.note?.toLowerCase().includes(val.toLowerCase()) || state.categories.find(c=>c.id===tx.catId)?.name.toLowerCase().includes(val.toLowerCase()));
    renderTransactions();
}
function refreshData() { applyFilters(); renderAll(); notify("Datos actualizados 🔄"); }
function toggleDarkMode() {
    state.darkMode = !state.darkMode;
    if (state.darkMode) { document.documentElement.classList.add('dark'); localStorage.setItem('darkMode','true'); }
    else { document.documentElement.classList.remove('dark'); localStorage.setItem('darkMode','false'); }
    lucide.createIcons();
}
function escapeHtml(str) { if (!str) return ''; return str.replace(/[&<>]/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[m])); }
function notify(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}
function backupData() { exportData('json'); }
function exportData(format) {
    const data = { transactions: state.transactions, accounts: state.accounts, categories: state.categories, savingsGoals: state.savingsGoals, budgets: state.budgets, exportDate: new Date().toISOString() };
    if (format === 'csv') {
        const rows = [['ID','Tipo','Monto','Monto Original','Categoría','Cuenta','Nota','Fecha','Descuento','Moneda']];
        state.transactions.forEach(tx => {
            const cat = state.categories.find(c=>c.id===tx.catId);
            const acc = state.accounts.find(a=>a.id===tx.accId);
            rows.push([tx.id, tx.type, tx.amount, tx.originalAmount||tx.amount, cat?.name||'', acc?.name||'', tx.note||'', new Date(tx.date).toLocaleString(), tx.discount ? `${tx.discountPercent}% + $${tx.discountFixed}` : '', tx.currency||'ARS']);
        });
        const blob = new Blob([rows.map(r=>r.join(',')).join('\n')], {type:'text/csv'});
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `wallet_export_${Date.now()}.csv`; a.click(); URL.revokeObjectURL(a.href);
    } else if (format === 'json') {
        const blob = new Blob([JSON.stringify(data,null,2)], {type:'application/json'});
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `wallet_backup_${Date.now()}.json`; a.click(); URL.revokeObjectURL(a.href);
    }
    notify(`Exportado en ${format.toUpperCase()}`);
}
function restoreData() {
    const input = document.createElement('input'); input.type = 'file'; input.accept = 'application/json';
    input.onchange = e => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = async event => {
            try {
                const imported = JSON.parse(event.target.result);
                if (imported.transactions) state.transactions = imported.transactions;
                if (imported.accounts) state.accounts = imported.accounts;
                if (imported.categories) state.categories = imported.categories;
                if (imported.savingsGoals) state.savingsGoals = imported.savingsGoals;
                if (imported.budgets) state.budgets = imported.budgets;
                // Procesar imágenes base64 y subirlas a Storage
                for (let cat of state.categories) {
                    if (cat.imageData && cat.imageData.startsWith('data:image')) {
                        const fileImg = dataURLtoFile(cat.imageData, `${cat.id}.jpg`);
                        const url = await uploadImage(fileImg, `users/${currentUser?.uid || 'local'}/categories/${Date.now()}.jpg`);
                        cat.imageData = url;
                    }
                }
                for (let acc of state.accounts) {
                    if (acc.imageData && acc.imageData.startsWith('data:image')) {
                        const fileImg = dataURLtoFile(acc.imageData, `${acc.id}.jpg`);
                        const url = await uploadImage(fileImg, `users/${currentUser?.uid || 'local'}/accounts/${Date.now()}.jpg`);
                        acc.imageData = url;
                    }
                }
                if (currentUser) await saveToFirestore();
                else {
                    localStorage.setItem('family_acc', JSON.stringify(state.accounts));
                    localStorage.setItem('family_cats', JSON.stringify(state.categories));
                    localStorage.setItem('family_tx', JSON.stringify(state.transactions));
                    localStorage.setItem('family_goals', JSON.stringify(state.savingsGoals));
                    localStorage.setItem('family_budgets', JSON.stringify(state.budgets));
                }
                renderAll();
                notify("Datos restaurados correctamente ✅");
            } catch(err) { notify("Error al restaurar datos: archivo inválido"); }
        };
        reader.readAsText(file);
    };
    input.click();
}
function resetApp() { if (confirm("¿Borrar todos los datos?")) { localStorage.clear(); location.reload(); } }

// --- PIN ---
function showLockScreen() { document.getElementById('lock-screen').style.display = 'flex'; state.lockPinBuffer = ''; updateLockPinDots(); }
function hideLockScreen() { document.getElementById('lock-screen').style.display = 'none'; }
function updateLockPinDots() { document.querySelectorAll('#lock-pin-dots div').forEach((dot,i)=>{ if(i<state.lockPinBuffer.length) dot.classList.add('bg-emerald-600'); else dot.classList.remove('bg-emerald-600'); }); }
function lockPinIn(num) { if (state.lockPinBuffer.length < 6) { state.lockPinBuffer += num; updateLockPinDots(); } }
function lockPinClear() { state.lockPinBuffer = ''; updateLockPinDots(); }
function lockPinSubmit() { if (state.lockPinBuffer.length===6) { if (state.lockPinBuffer === state.pinCode) { hideLockScreen(); state.lockPinBuffer=''; notify("Acceso concedido ✅"); } else { notify("PIN incorrecto"); state.lockPinBuffer=''; updateLockPinDots(); } } else notify("Ingresa 6 dígitos"); }
function updatePINToggleUI() {
    const toggleBtn = document.getElementById('pin-toggle-btn');
    const changeBtn = document.getElementById('change-pin-btn');
    if (state.pinEnabled) {
        toggleBtn.classList.remove('bg-gray-300'); toggleBtn.classList.add('bg-emerald-600');
        toggleBtn.querySelector('span').classList.remove('translate-x-1'); toggleBtn.querySelector('span').classList.add('translate-x-6');
        if (changeBtn) changeBtn.style.display = 'flex';
    } else {
        toggleBtn.classList.remove('bg-emerald-600'); toggleBtn.classList.add('bg-gray-300');
        toggleBtn.querySelector('span').classList.remove('translate-x-6'); toggleBtn.querySelector('span').classList.add('translate-x-1');
        if (changeBtn) changeBtn.style.display = 'none';
    }
}
function togglePIN() {
    if (!state.pinEnabled) {
        state.pinEnabled = true; state.pinCode = null; localStorage.setItem('pin_enabled','true'); localStorage.removeItem('pin_code');
        updatePINToggleUI(); openChangePINModal(); notify("Configura tu nuevo PIN de 6 dígitos");
    } else { if (confirm("¿Desactivar protección con PIN?")) { state.pinEnabled = false; state.pinCode = null; localStorage.setItem('pin_enabled','false'); localStorage.removeItem('pin_code'); updatePINToggleUI(); notify("PIN desactivado 🔓"); } }
}
function openChangePINModal() { state.changePinBuffer = ''; updateChangePinDots(); openModal('change-pin'); }
function updateChangePinDots() { document.querySelectorAll('#change-pin-dots div').forEach((dot,i)=>{ if(i<state.changePinBuffer.length) dot.classList.add('bg-emerald-600'); else dot.classList.remove('bg-emerald-600'); }); }
function changePinIn(num) { if (state.changePinBuffer.length < 6) { state.changePinBuffer += num; updateChangePinDots(); if (state.changePinBuffer.length === 6) { state.pinCode = state.changePinBuffer; localStorage.setItem('pin_code', state.pinCode); localStorage.setItem('pin_enabled','true'); state.pinEnabled = true; updatePINToggleUI(); closeModal('change-pin'); notify("PIN actualizado correctamente 🔒"); } } }
function changePinClear() { state.changePinBuffer = ''; updateChangePinDots(); }

// --- Google Auth ---
function initGoogleSignIn() {
    const container = document.getElementById('google-signin-button');
    if (!container) return;
    const btn = document.createElement('div');
    btn.className = 'gsi-material-button';
    btn.innerHTML = `<div class="gsi-material-button-state"></div><div class="gsi-material-button-content-wrapper"><div class="gsi-material-button-icon"><svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path></svg></div><span class="gsi-material-button-contents">Iniciar sesión con Google</span><span style="display:none">Iniciar sesión con Google</span></div>`;
    btn.onclick = () => { const provider = new firebase.auth.GoogleAuthProvider(); auth.signInWithPopup(provider).then(result => onLoginSuccess(result.user)).catch(err => notify('Error: ' + err.message)); };
    container.innerHTML = ''; container.appendChild(btn);
}
async function onLoginSuccess(user) {
    currentUser = user;
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('logout-btn').classList.remove('hidden');
    document.getElementById('user-name').textContent = user.displayName || 'Usuario';
    document.getElementById('user-email').textContent = user.email || '';
    const avatarDiv = document.getElementById('user-avatar');
    if (user.photoURL) { avatarDiv.innerHTML = `<img src="${user.photoURL}" class="w-full h-full rounded-2xl object-cover">`; avatarDiv.classList.remove('bg-zinc-900'); avatarDiv.classList.add('p-0','overflow-hidden'); }
    else { avatarDiv.innerHTML = (user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'); avatarDiv.classList.add('bg-zinc-900'); avatarDiv.classList.remove('p-0','overflow-hidden'); }
    document.getElementById('user-status').textContent = `Usuario: ${user.displayName || user.email}`;
    await loadUserData();
    if (state.pinEnabled && state.pinCode) showLockScreen();
    notify(`Bienvenido ${user.displayName || 'usuario'}!`);
}
function skipLogin() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('logout-btn').classList.remove('hidden');
    document.getElementById('user-name').textContent = 'Modo Local';
    document.getElementById('user-email').textContent = 'Sin sesión';
    const savedAcc = localStorage.getItem('family_acc');
    const savedCats = localStorage.getItem('family_cats');
    const savedTx = localStorage.getItem('family_tx');
    const savedGoals = localStorage.getItem('family_goals');
    const savedBudgets = localStorage.getItem('family_budgets');
    if (savedAcc) state.accounts = JSON.parse(savedAcc);
    if (savedCats) state.categories = JSON.parse(savedCats);
    if (savedTx) state.transactions = JSON.parse(savedTx);
    if (savedGoals) state.savingsGoals = JSON.parse(savedGoals);
    if (savedBudgets) state.budgets = JSON.parse(savedBudgets);
    renderAll();
    if (state.pinEnabled && state.pinCode) showLockScreen();
    notify('Modo local activado');
}
function logout() { if (currentUser) auth.signOut().then(() => location.reload()); else location.reload(); }

// --- Calculadora flotante ---
let calculatorVisible = false;
const calcContainer = document.getElementById('floating-calculator');
const calcDisplay = document.getElementById('calc-display');
let calcExpression = '0';
function updateCalcDisplay() { calcDisplay.innerText = calcExpression; }
function handleCalcButton(value) {
    if (value === 'C') calcExpression = '0';
    else if (value === '=') { try { let expr = calcExpression.replace(/×/g,'*').replace(/÷/g,'/'); let result = eval(expr); if (isNaN(result) || !isFinite(result)) throw new Error(); calcExpression = result.toString(); } catch(e) { calcExpression = 'Error'; } }
    else if (value === '⌫') { if (calcExpression.length > 1) calcExpression = calcExpression.slice(0,-1); else calcExpression = '0'; }
    else if (value === 'Insertar') { const amountInput = document.getElementById('input-amount'); let val = parseFloat(calcExpression); if (!isNaN(val)) amountInput.value = val; calcContainer.classList.add('hidden'); calculatorVisible = false; return; }
    else { if (calcExpression === '0' && value !== '.') calcExpression = value; else calcExpression += value; }
    updateCalcDisplay();
}
document.getElementById('calculator-toggle-btn')?.addEventListener('click', () => { calculatorVisible = !calculatorVisible; calcContainer.classList.toggle('hidden'); });
document.getElementById('calc-close-btn')?.addEventListener('click', () => { calculatorVisible = false; calcContainer.classList.add('hidden'); });
document.querySelectorAll('.calc-btn').forEach(btn => btn.addEventListener('click', () => handleCalcButton(btn.getAttribute('data-value') || btn.innerText)));

// --- PWA ---
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; document.getElementById('install-container')?.classList.remove('hidden'); });
document.getElementById('install-btn')?.addEventListener('click', async () => { if (!deferredPrompt) return; deferredPrompt.prompt(); const { outcome } = await deferredPrompt.userChoice; deferredPrompt = null; document.getElementById('install-container')?.classList.add('hidden'); });
if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) document.getElementById('install-container')?.setAttribute('style','display:none');
if (/iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase()) && !window.matchMedia('(display-mode: standalone)').matches) document.getElementById('ios-install-guide')?.classList.remove('hidden');

// --- Inicialización ---
function init() {
    initGoogleSignIn();
    if (state.darkMode) document.documentElement.classList.add('dark');
    updatePINToggleUI();
    lucide.createIcons();
    applyFilters();
    renderAll();
    document.getElementById('input-datetime').value = new Date().toISOString().slice(0,16);
    auth.onAuthStateChanged(user => { if (user && document.getElementById('login-screen').style.display !== 'none') onLoginSuccess(user); });
    fetchBTCPrice();
    setInterval(fetchBTCPrice, 60000);
}
window.onload = init;
