// ============================================================
//  MY ACCOUNT PAGE — js/my-account.js
// ============================================================

// Run when page loads
document.addEventListener('DOMContentLoaded', async () => {

    // 1. Check user is logged in — redirect to login if not
    const user = await requireAuth()

    // 2. Load user data into the dashboard and account form
    loadDashboard(user)
    loadAccountForm(user)
    loadOrders(user)
})

// ── DASHBOARD TAB ────────────────────────────────────────────
function loadDashboard(user) {
    const name = user.user_metadata?.full_name || user.email
    const el = document.getElementById('dashboard-welcome')
    if (el) {
        el.innerHTML = `
            <p>Hello <strong>${name}</strong>, welcome to your account dashboard.</p>
            <p>From here you can manage your <strong>orders</strong>, update your 
            <strong>account details</strong>, and change your <strong>password</strong>.</p>
            <p><small class="text-muted">Logged in as: ${user.email}</small></p>
        `
    }
}

// ── ACCOUNT DETAILS TAB ──────────────────────────────────────
function loadAccountForm(user) {
    const meta = user.user_metadata || {}
    const fullName = (meta.full_name || '').split(' ')

    const firstName = document.getElementById('acc-firstname')
    const lastName  = document.getElementById('acc-lastname')
    const email     = document.getElementById('acc-email')

    if (firstName) firstName.value = fullName[0] || ''
    if (lastName)  lastName.value  = fullName.slice(1).join(' ') || ''
    if (email)     email.value     = user.email || ''
}

// ── SAVE ACCOUNT DETAILS ─────────────────────────────────────
async function saveAccount() {
    const firstName = document.getElementById('acc-firstname').value.trim()
    const lastName  = document.getElementById('acc-lastname').value.trim()
    const mobile    = document.getElementById('acc-mobile').value.trim()
    const address   = document.getElementById('acc-address').value.trim()

    const { data, error } = await db.auth.updateUser({
        data: {
            full_name: firstName + ' ' + lastName,
            mobile: mobile,
            address: address
        }
    })

    if (error) {
        showMessage('account-msg', 'Error: ' + error.message, 'danger')
    } else {
        showMessage('account-msg', 'Account details updated successfully!', 'success')
    }
}

// ── CHANGE PASSWORD ──────────────────────────────────────────
async function changePassword() {
    const newPassword     = document.getElementById('new-password').value
    const confirmPassword = document.getElementById('confirm-password').value

    if (!newPassword || newPassword.length < 6) {
        showMessage('password-msg', 'Password must be at least 6 characters.', 'warning')
        return
    }
    if (newPassword !== confirmPassword) {
        showMessage('password-msg', 'Passwords do not match.', 'danger')
        return
    }

    const { data, error } = await db.auth.updateUser({ password: newPassword })

    if (error) {
        showMessage('password-msg', 'Error: ' + error.message, 'danger')
    } else {
        showMessage('password-msg', 'Password changed successfully!', 'success')
        document.getElementById('new-password').value = ''
        document.getElementById('confirm-password').value = ''
    }
}

// ── LOAD ORDERS ──────────────────────────────────────────────
async function loadOrders(user) {
    const tbody = document.getElementById('orders-tbody')
    if (!tbody) return

    const { data: orders, error } = await db
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    if (error || !orders || orders.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">No orders found.</td>
            </tr>`
        return
    }

    tbody.innerHTML = orders.map((order, i) => `
        <tr>
            <td>${i + 1}</td>
            <td>Order #${order.id.substring(0, 8)}</td>
            <td>${new Date(order.created_at).toLocaleDateString()}</td>
            <td>$${parseFloat(order.total_amount).toFixed(2)}</td>
            <td><span class="badge badge-${statusColor(order.status)}">${order.status}</span></td>
            <td><button class="btn btn-sm">View</button></td>
        </tr>
    `).join('')
}

function statusColor(status) {
    const map = { paid: 'success', pending: 'warning', shipped: 'info', cancelled: 'danger' }
    return map[status] || 'secondary'
}

// ── LOGOUT ───────────────────────────────────────────────────
async function handleLogout() {
    await logout()   // logout() is defined in supabase.js
}
