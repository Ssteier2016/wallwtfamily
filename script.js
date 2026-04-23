// ============================================
//  FINANZAS PERSONALES - APLICACIÓN COMPLETA
// ============================================

// ========== DATA STORES ==========
let transactions = [];
let accounts = [];
let categories = [];

// Default categories (predefined)
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

// Default accounts
const defaultAccounts = [
    { id: "a1", name: "Principal", balance: 0, icon: "banknote", color: "bg-emerald-100 text-emerald-600" }
];

// ========== INITIALIZATION ==========
function initializeData() {
    // Load from localStorage
    const savedTransactions = localStorage.getItem('finanzas_transactions');
    const savedAccounts = localStorage.getItem('finanzas_accounts');
    const savedCategories = localStorage.getItem('finanzas_categories');
    
    if (savedTransactions) {
        transactions = JSON.parse(savedTransactions);
    } else {
        transactions = [];
    }
    
    if (savedAccounts) {
        accounts = JSON.parse(savedAccounts);
    } else {
        accounts = [...defaultAccounts];
    }
    
    if (savedCategories) {
        categories = JSON.parse(savedCategories);
    } else {
        categories = [...defaultCategories];
    }
    
    // Recalculate balances
    recalculateAllBalances();
    saveToLocalStorage();
}

function saveToLocalStorage() {
    localStorage.setItem('finanzas_transactions', JSON.stringify(transactions));
    localStorage.setItem('finanzas_accounts', JSON.stringify(accounts));
    localStorage.setItem('finanzas_categories', JSON.stringify(categories));
}

function recalculateAllBalances() {
    // Reset all account balances to 0
    accounts.forEach(acc => acc.balance = 0);
    
    // Calculate balances from transactions
    transactions.forEach(transaction => {
        const account = accounts.find(a => a.id === transaction.accId);
        if (account) {
            const amount = parseFloat(transaction.amount);
            if (transaction.type === 'ingreso') {
                account.balance += amount;
            } else {
                account.balance -= amount;
            }
        }
    });
}

// ========== IMPORT/EXPORT ==========
function importFromJSON(jsonData) {
    try {
        const data = JSON.parse(jsonData);
        
        // Import transactions
        if (data.transactions && Array.isArray(data.transactions)) {
            transactions = data.transactions;
        }
        
        // Import accounts
        if (data.accounts && Array.isArray(data.accounts)) {
            accounts = data.accounts;
        } else {
            // If no accounts in backup, ensure default exists
            if (!accounts.length) accounts = [...defaultAccounts];
        }
        
        // Import categories
        if (data.categories && Array.isArray(data.categories)) {
            categories = data.categories;
        } else {
            // If no categories in backup, use defaults
            if (!categories.length) categories = [...defaultCategories];
        }
        
        // Ensure all transactions have required fields
        transactions.forEach(t => {
            if (!t.id) t.id = 'tx-' + Date.now() + '-' + Math.random();
            if (t.discount === undefined) t.discount = false;
            if (t.discountPercent === undefined) t.discountPercent = 0;
            if (t.discountFixed === undefined) t.discountFixed = 0;
            if (!t.currency) t.currency = 'ARS';
        });
        
        // Recalculate balances
        recalculateAllBalances();
        saveToLocalStorage();
        
        showToast('Importación exitosa', 'success');
        refreshAllViews();
        return true;
    } catch (error) {
        console.error('Error importing backup:', error);
        showToast('Error al importar el archivo', 'error');
        return false;
    }
}

function exportToJSON() {
    const exportData = {
        transactions: transactions,
        accounts: accounts,
        categories: categories,
        exportDate: new Date().toISOString()
    };
    
    const jsonStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wallet_backup_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('Backup exportado exitosamente', 'success');
}

// ========== CRUD: TRANSACTIONS ==========
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
    
    // Update account balance
    const account = accounts.find(a => a.id === newTransaction.accId);
    if (account) {
        if (newTransaction.type === 'ingreso') {
            account.balance += newTransaction.amount;
        } else {
            account.balance -= newTransaction.amount;
        }
    }
    
    saveToLocalStorage();
    refreshAllViews();
    showToast('Transacción guardada', 'success');
    return newTransaction;
}

function updateTransaction(id, updatedData) {
    const index = transactions.findIndex(t => t.id === id);
    if (index === -1) return null;
    
    const oldTransaction = transactions[index];
    const oldAccount = accounts.find(a => a.id === oldTransaction.accId);
    
    // Revert old balance
    if (oldAccount) {
        if (oldTransaction.type === 'ingreso') {
            oldAccount.balance -= oldTransaction.amount;
        } else {
            oldAccount.balance += oldTransaction.amount;
        }
    }
    
    // Update transaction
    transactions[index] = { ...transactions[index], ...updatedData };
    transactions[index].amount = parseFloat(transactions[index].amount);
    
    // Apply new balance
    const newAccount = accounts.find(a => a.id === transactions[index].accId);
    if (newAccount) {
        if (transactions[index].type === 'ingreso') {
            newAccount.balance += transactions[index].amount;
        } else {
            newAccount.balance -= transactions[index].amount;
        }
    }
    
    saveToLocalStorage();
    refreshAllViews();
    showToast('Transacción actualizada', 'success');
    return transactions[index];
}

function deleteTransaction(id) {
    const transaction = transactions.find(t => t.id === id);
    if (!transaction) return false;
    
    // Revert balance
    const account = accounts.find(a => a.id === transaction.accId);
    if (account) {
        if (transaction.type === 'ingreso') {
            account.balance -= transaction.amount;
        } else {
            account.balance += transaction.amount;
        }
    }
    
    transactions = transactions.filter(t => t.id !== id);
    saveToLocalStorage();
    refreshAllViews();
    showToast('Transacción eliminada', 'success');
    return true;
}

// ========== CRUD: ACCOUNTS ==========
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
    refreshAllViews();
    showToast('Billetera creada', 'success');
    return newAccount;
}

function updateAccount(id, updatedData) {
    const index = accounts.findIndex(a => a.id === id);
    if (index === -1) return null;
    
    accounts[index] = { ...accounts[index], ...updatedData };
    saveToLocalStorage();
    refreshAllViews();
    showToast('Billetera actualizada', 'success');
    return accounts[index];
}

function deleteAccount(id) {
    // Check if account has transactions
    const hasTransactions = transactions.some(t => t.accId === id);
    if (hasTransactions) {
        showToast('No se puede eliminar: la billetera tiene transacciones', 'error');
        return false;
    }
    
    accounts = accounts.filter(a => a.id !== id);
    saveToLocalStorage();
    refreshAllViews();
    showToast('Billetera eliminada', 'success');
    return true;
}

// ========== CRUD: CATEGORIES ==========
function addCategory(category) {
    const newCategory = {
        id: 'cat-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        name: category.name,
        color: category.color || '#10b981'
    };
    
    categories.push(newCategory);
    saveToLocalStorage();
    refreshAllViews();
    showToast('Categoría creada', 'success');
    return newCategory;
}

function updateCategory(id, updatedData) {
    const index = categories.findIndex(c => c.id === id);
    if (index === -1) return null;
    
    categories[index] = { ...categories[index], ...updatedData };
    saveToLocalStorage();
    refreshAllViews();
    showToast('Categoría actualizada', 'success');
    return categories[index];
}

function deleteCategory(id) {
    // Check if category has transactions
    const hasTransactions = transactions.some(t => t.catId === id);
    if (hasTransactions) {
        showToast('No se puede eliminar: la categoría tiene transacciones', 'error');
        return false;
    }
    
    categories = categories.filter(c => c.id !== id);
    saveToLocalStorage();
    refreshAllViews();
    showToast('Categoría eliminada', 'success');
    return true;
}

// ========== GETTERS ==========
function getAccountName(accountId) {
    const account = accounts.find(a => a.id === accountId);
    return account ? account.name : 'Desconocido';
}

function getCategoryName(categoryId) {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : 'Sin categoría';
}

function getCategoryColor(categoryId) {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.color : '#94a3b8';
}

// ========== UI RENDERING ==========
let currentCharts = {};

function refreshAllViews() {
    renderDashboard();
    renderTransactionsList();
    renderAccountsList();
    renderCategoriesList();
    updateFilters();
}

function renderDashboard() {
    // Calculate totals
    let totalIncome = 0;
    let totalExpense = 0;
    
    transactions.forEach(t => {
        const amount = parseFloat(t.amount);
        if (t.type === 'ingreso') {
            totalIncome += amount;
        } else {
            totalExpense += amount;
        }
    });
    
    const totalBalance = totalIncome - totalExpense;
    
    document.getElementById('totalBalance').innerHTML = formatCurrency(totalBalance);
    document.getElementById('totalIncome').innerHTML = formatCurrency(totalIncome);
    document.getElementById('totalExpense').innerHTML = formatCurrency(totalExpense);
    
    // Render recent transactions
    const recentTransactions = [...transactions]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);
    
    const container = document.getElementById('recentTransactionsList');
    if (container) {
        if (recentTransactions.length === 0) {
            container.innerHTML = '<div class="empty-state">No hay transacciones recientes</div>';
        } else {
            container.innerHTML = recentTransactions.map(t => `
                <div class="transaction-item">
                    <div class="transaction-info">
                        <div class="transaction-icon ${t.type}">
                            <i class="fas ${t.type === 'ingreso' ? 'fa-arrow-down' : 'fa-arrow-up'}"></i>
                        </div>
                        <div class="transaction-details">
                            <div class="transaction-description">${escapeHtml(t.note) || (t.type === 'ingreso' ? 'Ingreso' : 'Gasto')}</div>
                            <div class="transaction-meta">${formatDate(t.date)} • ${getCategoryName(t.catId)}</div>
                        </div>
                    </div>
                    <div class="transaction-amount ${t.type}">
                        ${t.type === 'ingreso' ? '+' : '-'} ${formatCurrency(t.amount)}
                    </div>
                </div>
            `).join('');
        }
    }
    
    // Update charts
    updateExpenseChart();
    updateBalanceChart();
}

function updateExpenseChart() {
    const ctx = document.getElementById('expenseChart')?.getContext('2d');
    if (!ctx) return;
    
    // Aggregate expenses by category
    const expensesByCategory = {};
    transactions.forEach(t => {
        if (t.type === 'gasto') {
            const catName = getCategoryName(t.catId);
            expensesByCategory[catName] = (expensesByCategory[catName] || 0) + parseFloat(t.amount);
        }
    });
    
    const labels = Object.keys(expensesByCategory);
    const data = Object.values(expensesByCategory);
    const colors = labels.map((_, i) => `hsl(${(i * 360 / labels.length) % 360}, 70%, 60%)`);
    
    if (currentCharts.expense) currentCharts.expense.destroy();
    
    currentCharts.expense = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { position: 'bottom' }
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
        data: {
            labels: labels,
            datasets: [{
                label: 'Saldo',
                data: balances,
                backgroundColor: colors,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: (value) => formatCurrency(value)
                    }
                }
            }
        }
    });
}

function renderTransactionsList() {
    const tbody = document.getElementById('transactionsList');
    if (!tbody) return;
    
    let filteredTransactions = [...transactions];
    
    // Apply filters
    const typeFilter = document.getElementById('filterType')?.value;
    const accountFilter = document.getElementById('filterAccount')?.value;
    const monthFilter = document.getElementById('filterMonth')?.value;
    
    if (typeFilter && typeFilter !== 'all') {
        filteredTransactions = filteredTransactions.filter(t => t.type === typeFilter);
    }
    
    if (accountFilter && accountFilter !== 'all') {
        filteredTransactions = filteredTransactions.filter(t => t.accId === accountFilter);
    }
    
    if (monthFilter) {
        filteredTransactions = filteredTransactions.filter(t => {
            const date = new Date(t.date);
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` === monthFilter;
        });
    }
    
    // Sort by date desc
    filteredTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (filteredTransactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px;">No hay transacciones</td></tr>';
        return;
    }
    
    tbody.innerHTML = filteredTransactions.map(t => `
        <tr>
            <td>${formatDate(t.date)}</td>
            <td>${escapeHtml(t.note) || (t.type === 'ingreso' ? 'Ingreso' : 'Gasto')}</td>
            <td><span class="category-badge" style="background: ${getCategoryColor(t.catId)}20; color: ${getCategoryColor(t.catId)}; padding: 4px 8px; border-radius: 8px; font-size: 0.75rem;">${getCategoryName(t.catId)}</span></td>
            <td>${getAccountName(t.accId)}</td>
            <td class="${t.type === 'ingreso' ? 'income-text' : 'expense-text'}" style="font-weight: 600; color: ${t.type === 'ingreso' ? '#10b981' : '#ef4444'}">
                ${t.type === 'ingreso' ? '+' : '-'} ${formatCurrency(t.amount)}
            </td>
            <td>
                <button class="btn-edit" onclick="editTransaction('${t.id}')"><i class="fas fa-pencil-alt"></i></button>
                <button class="btn-delete" onclick="deleteTransactionHandler('${t.id}')"><i class="fas fa-trash-alt"></i></button>
            </td>
        </tr>
    `).join('');
}

function renderAccountsList() {
    const container = document.getElementById('accountsList');
    if (!container) return;
    
    if (accounts.length === 0) {
        container.innerHTML = '<div class="empty-state">No hay billeteras. Crea una nueva.</div>';
        return;
    }
    
    container.innerHTML = accounts.map(acc => {
        const iconMap = {
            banknote: 'fa-money-bill-wave',
            'credit-card': 'fa-credit-card',
            'piggy-bank': 'fa-piggy-bank',
            wallet: 'fa-wallet',
            building: 'fa-building',
            coins: 'fa-coins'
        };
        const iconClass = iconMap[acc.icon] || 'fa-wallet';
        
        return `
            <div class="account-card">
                <div class="account-info">
                    <div class="account-icon ${acc.color}">
                        <i class="fas ${iconClass}"></i>
                    </div>
                    <div class="account-details">
                        <h4>${escapeHtml(acc.name)}</h4>
                        <span class="account-balance">${formatCurrency(acc.balance)}</span>
                    </div>
                </div>
                <div class="account-actions">
                    <button class="btn-edit" onclick="editAccount('${acc.id}')"><i class="fas fa-pencil-alt"></i></button>
                    <button class="btn-delete" onclick="deleteAccountHandler('${acc.id}')"><i class="fas fa-trash-alt"></i></button>
                </div>
            </div>
        `;
    }).join('');
}

function renderCategoriesList() {
    const container = document.getElementById('categoriesList');
    if (!container) return;
    
    if (categories.length === 0) {
        container.innerHTML = '<div class="empty-state">No hay categorías. Crea una nueva.</div>';
        return;
    }
    
    container.innerHTML = categories.map(cat => `
        <div class="category-card">
            <div class="category-info">
                <div class="category-color" style="background: ${cat.color}; border-radius: 10px;"></div>
                <span class="category-name">${escapeHtml(cat.name)}</span>
            </div>
            <div class="account-actions">
                <button class="btn-edit" onclick="editCategory('${cat.id}')"><i class="fas fa-pencil-alt"></i></button>
                <button class="btn-delete" onclick="deleteCategoryHandler('${cat.id}')"><i class="fas fa-trash-alt"></i></button>
            </div>
        </div>
    `).join('');
}

function updateFilters() {
    const accountSelect = document.getElementById('filterAccount');
    if (accountSelect) {
        const currentValue = accountSelect.value;
        accountSelect.innerHTML = '<option value="all">Todas las billeteras</option>' +
            accounts.map(acc => `<option value="${acc.id}" ${currentValue === acc.id ? 'selected' : ''}>${escapeHtml(acc.name)}</option>`).join('');
    }
    
    const categorySelect = document.getElementById('categoryId');
    if (categorySelect) {
        const currentValue = categorySelect.value;
        categorySelect.innerHTML = categories.map(cat => `<option value="${cat.id}" ${currentValue === cat.id ? 'selected' : ''}>${escapeHtml(cat.name)}</option>`).join('');
    }
    
    const accSelect = document.getElementById('accId');
    if (accSelect) {
        const currentValue = accSelect.value;
        accSelect.innerHTML = accounts.map(acc => `<option value="${acc.id}" ${currentValue === acc.id ? 'selected' : ''}>${escapeHtml(acc.name)}</option>`).join('');
    }
}

// ========== MODAL HANDLERS ==========
let currentModal = null;

function openTransactionModal(transactionId = null) {
    const modal = document.getElementById('transactionModal');
    const form = document.getElementById('transactionForm');
    form.reset();
    
    document.getElementById('modalTitle').textContent = transactionId ? 'Editar transacción' : 'Nueva transacción';
    document.getElementById('transactionId').value = transactionId || '';
    
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;
    
    // Set default type
    document.querySelector('.type-btn.active').classList.remove('active');
    document.querySelector('.type-btn[data-type="gasto"]').classList.add('active');
    
    updateFilters();
    
    if (transactionId) {
        const transaction = transactions.find(t => t.id === transactionId);
        if (transaction) {
            document.getElementById('amount').value = transaction.amount;
            document.getElementById('date').value = transaction.date.split('T')[0];
            document.getElementById('categoryId').value = transaction.catId;
            document.getElementById('accId').value = transaction.accId;
            document.getElementById('note').value = transaction.note || '';
            
            // Set type
            document.querySelectorAll('.type-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelector(`.type-btn[data-type="${transaction.type}"]`).classList.add('active');
            
            if (transaction.discount) {
                document.getElementById('hasDiscount').checked = true;
                document.getElementById('discountFields').style.display = 'block';
                if (transaction.discountPercent > 0) {
                    document.querySelector('input[name="discountType"][value="percent"]').checked = true;
                    document.getElementById('discountValue').value = transaction.discountPercent;
                } else {
                    document.querySelector('input[name="discountType"][value="fixed"]').checked = true;
                    document.getElementById('discountValue').value = transaction.discountFixed;
                }
            }
        }
    }
    
    modal.classList.add('active');
    currentModal = modal;
}

function openAccountModal(accountId = null) {
    const modal = document.getElementById('accountModal');
    const form = document.getElementById('accountForm');
    form.reset();
    
    document.getElementById('accountModalTitle').textContent = accountId ? 'Editar billetera' : 'Nueva billetera';
    document.getElementById('accountId').value = accountId || '';
    
    if (accountId) {
        const account = accounts.find(a => a.id === accountId);
        if (account) {
            document.getElementById('accName').value = account.name;
            document.getElementById('accIcon').value = account.icon;
            document.getElementById('accColor').value = account.color;
        }
    }
    
    modal.classList.add('active');
    currentModal = modal;
}

function openCategoryModal(categoryId = null) {
    const modal = document.getElementById('categoryModal');
    const form = document.getElementById('categoryForm');
    form.reset();
    
    document.getElementById('categoryModalTitle').textContent = categoryId ? 'Editar categoría' : 'Nueva categoría';
    document.getElementById('categoryId').value = categoryId || '';
    
    if (categoryId) {
        const category = categories.find(c => c.id === categoryId);
        if (category) {
            document.getElementById('catName').value = category.name;
            document.getElementById('catColor').value = category.color;
        }
    }
    
    modal.classList.add('active');
    currentModal = modal;
}

function closeModal() {
    if (currentModal) {
        currentModal.classList.remove('active');
        currentModal = null;
    }
}

// Transaction form submission
document.getElementById('transactionForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const id = document.getElementById('transactionId').value;
    const type = document.querySelector('.type-btn.active').dataset.type;
    let amount = parseFloat(document.getElementById('amount').value);
    const date = document.getElementById('date').value;
    const catId = document.getElementById('categoryId').value;
    const accId = document.getElementById('accId').value;
    const note = document.getElementById('note').value;
    const hasDiscount = document.getElementById('hasDiscount').checked;
    
    let discountPercent = 0;
    let discountFixed = 0;
    let originalAmount = amount;
    
    if (hasDiscount) {
        const discountType = document.querySelector('input[name="discountType"]:checked').value;
        const discountValue = parseFloat(document.getElementById('discountValue').value);
        
        if (discountType === 'percent') {
            discountPercent = discountValue;
            amount = originalAmount * (1 - discountValue / 100);
        } else {
            discountFixed = discountValue;
            amount = originalAmount - discountValue;
        }
    }
    
    const transactionData = {
        amount: amount,
        originalAmount: originalAmount,
        catId: catId,
        accId: accId,
        note: note,
        type: type,
        date: new Date(date).toISOString(),
        discount: hasDiscount,
        discountPercent: discountPercent,
        discountFixed: discountFixed,
        currency: 'ARS'
    };
    
    if (id) {
        updateTransaction(id, transactionData);
    } else {
        addTransaction(transactionData);
    }
    
    closeModal();
});

// Account form submission
document.getElementById('accountForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const id = document.getElementById('accountId').value;
    const name = document.getElementById('accName').value;
    const icon = document.getElementById('accIcon').value;
    const color = document.getElementById('accColor').value;
    
    const accountData = { name, icon, color };
    
    if (id) {
        updateAccount(id, accountData);
    } else {
        addAccount(accountData);
    }
    
    closeModal();
});

// Category form submission
document.getElementById('categoryForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const id = document.getElementById('categoryId').value;
    const name = document.getElementById('catName').value;
    const color = document.getElementById('catColor').value;
    
    const categoryData = { name, color };
    
    if (id) {
        updateCategory(id, categoryData);
    } else {
        addCategory(categoryData);
    }
    
    closeModal();
});

// ========== EVENT HANDLERS ==========
function editTransaction(id) {
    openTransactionModal(id);
}

function deleteTransactionHandler(id) {
    if (confirm('¿Eliminar esta transacción?')) {
        deleteTransaction(id);
    }
}

function editAccount(id) {
    openAccountModal(id);
}

function deleteAccountHandler(id) {
    if (confirm('¿Eliminar esta billetera?')) {
        deleteAccount(id);
    }
}

function editCategory(id) {
    openCategoryModal(id);
}

function deleteCategoryHandler(id) {
    if (confirm('¿Eliminar esta categoría?')) {
        deleteCategory(id);
    }
}

// ========== UTILITIES ==========
function formatCurrency(value) {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.style.background = type === 'success' ? '#10b981' : '#ef4444';
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ========== IMPORT/EXPORT HANDLERS ==========
document.getElementById('importBackupBtn')?.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            importFromJSON(event.target.result);
        };
        reader.readAsText(file);
    };
    input.click();
});

document.getElementById('exportBackupBtn')?.addEventListener('click', () => {
    exportToJSON();
});

// ========== NAVIGATION ==========
function switchView(viewId) {
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });
    document.getElementById(`${viewId}View`).classList.add('active');
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.view === viewId) {
            item.classList.add('active');
        }
    });
    
    const titles = {
        dashboard: 'Dashboard',
        transactions: 'Transacciones',
        accounts: 'Billeteras',
        categories: 'Categorías',
        reports: 'Reportes'
    };
    document.getElementById('currentViewTitle').textContent = titles[viewId] || 'Dashboard';
    
    if (viewId === 'reports') {
        generateReport();
    }
}

// ========== REPORT GENERATION ==========
let reportChart = null;

function generateReport() {
    const reportType = document.getElementById('reportType')?.value || 'category';
    const month = document.getElementById('reportMonth')?.value;
    
    let filteredTransactions = [...transactions];
    
    if (month) {
        filteredTransactions = filteredTransactions.filter(t => {
            const date = new Date(t.date);
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` === month;
        });
    }
    
    let labels = [];
    let data = [];
    let title = '';
    
    if (reportType === 'category') {
        // Group by category
        const byCategory = {};
        filteredTransactions.forEach(t => {
            if (t.type === 'gasto') {
                const catName = getCategoryName(t.catId);
                byCategory[catName] = (byCategory[catName] || 0) + parseFloat(t.amount);
            }
        });
        labels = Object.keys(byCategory);
        data = Object.values(byCategory);
        title = 'Gastos por Categoría';
    } else if (reportType === 'account') {
        // Group by account
        const byAccount = {};
        filteredTransactions.forEach(t => {
            const accName = getAccountName(t.accId);
            byAccount[accName] = (byAccount[accName] || 0) + (t.type === 'ingreso' ? parseFloat(t.amount) : -parseFloat(t.amount));
        });
        labels = Object.keys(byAccount);
        data = Object.values(byAccount);
        title = 'Balance por Billetera';
    } else {
        // Monthly summary
        const monthlyData = {};
        filteredTransactions.forEach(t => {
            const monthKey = new Date(t.date).toLocaleDateString('es-AR', { month: 'short', year: 'numeric' });
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = { income: 0, expense: 0 };
            }
            if (t.type === 'ingreso') {
                monthlyData[monthKey].income += parseFloat(t.amount);
            } else {
                monthlyData[monthKey].expense += parseFloat(t.amount);
            }
        });
        labels = Object.keys(monthlyData);
        title = 'Ingresos vs Gastos Mensuales';
        
        const ctx = document.getElementById('reportChart')?.getContext('2d');
        if (ctx) {
            if (reportChart) reportChart.destroy();
            reportChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Ingresos',
                            data: labels.map(l => monthlyData[l].income),
                            backgroundColor: '#10b981',
                            borderRadius: 8
                        },
                        {
                            label: 'Gastos',
                            data: labels.map(l => monthlyData[l].expense),
                            backgroundColor: '#ef4444',
                            borderRadius: 8
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: { position: 'top' },
                        title: { display: true, text: title }
                    },
                    scales: {
                        y: {
                            ticks: {
                                callback: (value) => formatCurrency(value)
                            }
                        }
                    }
                }
            });
        }
        
        // Render details table
        const detailsContainer = document.getElementById('reportDetails');
        if (detailsContainer) {
            let html = '<table><thead><tr><th>Mes</th><th>Ingresos</th><th>Gastos</th><th>Balance</th></tr></thead><tbody>';
            for (const [monthKey, values] of Object.entries(monthlyData)) {
                const balance = values.income - values.expense;
                html += `<tr>
                    <td>${monthKey}</td>
                    <td style="color: #10b981;">${formatCurrency(values.income)}</td>
                    <td style="color: #ef4444;">${formatCurrency(values.expense)}</td>
                    <td style="color: ${balance >= 0 ? '#10b981' : '#ef4444'}">${formatCurrency(balance)}</td>
                </tr>`;
            }
            html += '</tbody></table>';
            detailsContainer.innerHTML = html;
        }
        return;
    }
    
    // Render chart for category/account reports
    const ctx = document.getElementById('reportChart')?.getContext('2d');
    if (ctx) {
        if (reportChart) reportChart.destroy();
        
        const colors = labels.map((_, i) => `hsl(${(i * 360 / labels.length) % 360}, 70%, 60%)`);
        
        reportChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { position: 'bottom' },
                    title: { display: true, text: title }
                }
            }
        });
    }
    
    // Render details table
    const detailsContainer = document.getElementById('reportDetails');
    if (detailsContainer) {
        let html = '<table><thead><tr><th>Concepto</th><th>Monto</th><th>Porcentaje</th></tr></thead><tbody>';
        const total = data.reduce((a, b) => a + b, 0);
        for (let i = 0; i < labels.length; i++) {
            const percentage = total > 0 ? ((data[i] / total) * 100).toFixed(1) : 0;
            html += `<tr><td>${escapeHtml(labels[i])}</td><td>${formatCurrency(data[i])}</td><td>${percentage}%</td></tr>`;
        }
        html += `<tr style="font-weight: bold; border-top: 2px solid #e2e8f0;"><td>Total</td><td>${formatCurrency(total)}</td><td>100%</td></tr>`;
        html += '</tbody></table>';
        detailsContainer.innerHTML = html;
    }
}

// ========== TYPE TOGGLE ==========
document.querySelectorAll('.type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });
});

// Discount checkbox toggle
document.getElementById('hasDiscount')?.addEventListener('change', (e) => {
    const discountFields = document.getElementById('discountFields');
    if (discountFields) {
        discountFields.style.display = e.target.checked ? 'block' : 'none';
    }
});

// ========== FILTER HANDLERS ==========
document.getElementById('filterType')?.addEventListener('change', () => renderTransactionsList());
document.getElementById('filterAccount')?.addEventListener('change', () => renderTransactionsList());
document.getElementById('filterMonth')?.addEventListener('change', () => renderTransactionsList());
document.getElementById('clearFilters')?.addEventListener('click', () => {
    if (document.getElementById('filterType')) document.getElementById('filterType').value = 'all';
    if (document.getElementById('filterAccount')) document.getElementById('filterAccount').value = 'all';
    if (document.getElementById('filterMonth')) document.getElementById('filterMonth').value = '';
    renderTransactionsList();
});

document.getElementById('generateReportBtn')?.addEventListener('click', () => generateReport());

// Set default month for reports
const today = new Date();
const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
if (document.getElementById('reportMonth')) {
    document.getElementById('reportMonth').value = defaultMonth;
}
if (document.getElementById('filterMonth')) {
    document.getElementById('filterMonth').value = defaultMonth;
}

// ========== MODAL CLOSE HANDLERS ==========
document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', closeModal);
});

window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        closeModal();
    }
});

// ========== NAVIGATION ==========
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        switchView(item.dataset.view);
    });
});

document.querySelectorAll('[data-view]').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        switchView(link.dataset.view);
    });
});

// ========== ADD BUTTONS ==========
document.getElementById('addTransactionBtn')?.addEventListener('click', () => openTransactionModal());
document.getElementById('addTransactionBtn2')?.addEventListener('click', () => openTransactionModal());
document.getElementById('addAccountBtn')?.addEventListener('click', () => openAccountModal());
document.getElementById('addCategoryBtn')?.addEventListener('click', () => openCategoryModal());

// ========== SIDEBAR TOGGLE ==========
document.getElementById('menuToggle')?.addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
});

document.getElementById('closeSidebar')?.addEventListener('click', () => {
    document.getElementById('sidebar').classList.remove('open');
});

// ========== INITIALIZE ==========
initializeData();
refreshAllViews();
switchView('dashboard');
