// ============================================================
//  CHECKOUT PAGE — js/checkout.js
// ============================================================

const SHIPPING_COST = 5.00
let cartProducts = []
let currentUser  = null

// ── ON PAGE LOAD ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {

    // 1. Require login
    currentUser = await requireAuth()

    // 2. Pre-fill billing form with user's saved details
    prefillBillingForm(currentUser)

    // 3. Load order summary from cart
    await loadOrderSummary()

    // 4. Toggle shipping address checkbox
    setupShippingToggle()
})

// ── PRE-FILL BILLING FROM USER PROFILE ──────────────────────
function prefillBillingForm(user) {
    const meta     = user.user_metadata || {}
    const fullName = (meta.full_name || '').split(' ')

    setValue('bill-firstname', fullName[0] || '')
    setValue('bill-lastname',  fullName.slice(1).join(' ') || '')
    setValue('bill-email',     user.email || '')
    setValue('bill-mobile',    meta.mobile || '')
    setValue('bill-address',   meta.address || '')
}

function setValue(id, value) {
    const el = document.getElementById(id)
    if (el) el.value = value
}

// ── LOAD ORDER SUMMARY FROM LOCALSTORAGE + SUPABASE ─────────
async function loadOrderSummary() {
    const cartItems = JSON.parse(localStorage.getItem('cart') || '[]')

    if (cartItems.length === 0) {
        document.getElementById('order-summary').innerHTML =
            `<p class="text-muted">Your cart is empty. <a href="product-list.html">Shop now</a></p>`
        return
    }

    // Fetch product details
    const productIds = cartItems.map(i => i.productId)
    const { data: products, error } = await db
        .from('products')
        .select('id, name, price, image_url')
        .in('id', productIds)

    if (error || !products) return

    // Merge quantities
    cartProducts = cartItems.map(item => {
        const product = products.find(p => p.id === item.productId)
        return product ? { ...product, quantity: item.quantity } : null
    }).filter(Boolean)

    renderOrderSummary()
}

// ── RENDER ORDER SUMMARY (right side panel) ──────────────────
function renderOrderSummary() {
    const subtotal   = cartProducts.reduce((sum, p) => sum + parseFloat(p.price) * p.quantity, 0)
    const grandTotal = subtotal + SHIPPING_COST

    const itemsHTML = cartProducts.map(p => `
        <p>${p.name} x${p.quantity}
            <span>$${(parseFloat(p.price) * p.quantity).toFixed(2)}</span>
        </p>`).join('')

    const el = document.getElementById('order-summary')
    if (el) {
        el.innerHTML = `
            <h1>Cart Total</h1>
            ${itemsHTML}
            <p class="sub-total">Sub Total <span>$${subtotal.toFixed(2)}</span></p>
            <p class="ship-cost">Shipping Cost <span>$${SHIPPING_COST.toFixed(2)}</span></p>
            <h2>Grand Total <span>$${grandTotal.toFixed(2)}</span></h2>`
    }

    // Save grand total for order saving
    localStorage.setItem('cartTotal', grandTotal.toFixed(2))
}

// ── SHIPPING ADDRESS TOGGLE ──────────────────────────────────
function setupShippingToggle() {
    const checkbox = document.getElementById('shipto')
    const section  = document.getElementById('shipping-section')
    if (!checkbox || !section) return

    section.style.display = 'none'
    checkbox.addEventListener('change', () => {
        section.style.display = checkbox.checked ? 'block' : 'none'
    })
}

// ── PLACE ORDER ──────────────────────────────────────────────
async function placeOrder() {
    // 1. Validate billing form
    const billing = getBillingData()
    if (!billing) return   // validation failed, message already shown

    // 2. Get selected payment method
    const paymentMethod = getSelectedPayment()
    if (!paymentMethod) {
        showMessage('checkout-msg', 'Please select a payment method.', 'warning')
        return
    }

    // 3. Disable button to prevent double submit
    const btn = document.getElementById('place-order-btn')
    if (btn) { btn.disabled = true; btn.textContent = 'Placing order...' }

    try {
        const grandTotal = parseFloat(localStorage.getItem('cartTotal') || '0')

        // 4. Insert order into Supabase orders table
        const { data: order, error: orderError } = await db
            .from('orders')
            .insert([{
                user_id:        currentUser.id,
                total_amount:   grandTotal,
                status:         'pending',
                payment_method: paymentMethod,
                billing_name:   billing.firstName + ' ' + billing.lastName,
                billing_email:  billing.email,
                billing_phone:  billing.mobile,
                billing_address: billing.address + ', ' + billing.city + ', ' + billing.state + ' ' + billing.zip + ', ' + billing.country
            }])
            .select()
            .single()

        if (orderError) throw orderError

        // 5. Insert order items
        const orderItems = cartProducts.map(p => ({
            order_id:   order.id,
            product_id: p.id,
            quantity:   p.quantity,
            unit_price: parseFloat(p.price)
        }))

        const { error: itemsError } = await db
            .from('order_items')
            .insert(orderItems)

        if (itemsError) throw itemsError

        // 6. Clear cart
        localStorage.removeItem('cart')
        localStorage.removeItem('cartTotal')

        // 7. Success — redirect to confirmation
        showMessage('checkout-msg', 'Order placed successfully! Redirecting...', 'success')
        setTimeout(() => {
            window.location.href = `order-confirmation.html?order=${order.id}`
        }, 1500)

    } catch (err) {
        showMessage('checkout-msg', 'Error placing order: ' + err.message, 'danger')
        if (btn) { btn.disabled = false; btn.textContent = 'Place Order' }
    }
}

// ── GET + VALIDATE BILLING DATA ──────────────────────────────
function getBillingData() {
    const firstName = document.getElementById('bill-firstname')?.value.trim()
    const lastName  = document.getElementById('bill-lastname')?.value.trim()
    const email     = document.getElementById('bill-email')?.value.trim()
    const mobile    = document.getElementById('bill-mobile')?.value.trim()
    const address   = document.getElementById('bill-address')?.value.trim()
    const city      = document.getElementById('bill-city')?.value.trim()
    const state     = document.getElementById('bill-state')?.value.trim()
    const zip       = document.getElementById('bill-zip')?.value.trim()
    const country   = document.getElementById('bill-country')?.value

    if (!firstName || !email || !address || !city) {
        showMessage('checkout-msg', 'Please fill in all required billing fields.', 'warning')
        return null
    }

    return { firstName, lastName, email, mobile, address, city, state, zip, country }
}

// ── GET SELECTED PAYMENT METHOD ──────────────────────────────
function getSelectedPayment() {
    const selected = document.querySelector('input[name="payment"]:checked')
    if (!selected) return null
    return selected.nextElementSibling?.textContent?.trim() || selected.value
}

// ── SHOW MESSAGE ─────────────────────────────────────────────
function showMessage(id, message, type) {
    const el = document.getElementById(id)
    if (el) el.innerHTML = `<div class="alert alert-${type} mt-3">${message}</div>`
}
