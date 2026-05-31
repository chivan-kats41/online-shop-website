// ============================================================
//  CART PAGE — js/cart.js
// ============================================================

const SHIPPING_COST = 5.00
let cartProducts = []   // Full product details fetched from Supabase

// ── ON PAGE LOAD ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    await loadCart()
    setupCoupon()
})

// ── LOAD CART FROM LOCALSTORAGE + FETCH PRODUCT DETAILS ─────
async function loadCart() {
    const cartItems = getCartFromStorage()

    if (cartItems.length === 0) {
        renderEmptyCart()
        renderSummary(0)
        return
    }

    // Show loading
    document.getElementById('cart-tbody').innerHTML = `
        <tr>
            <td colspan="5" class="text-center py-4">
                <div class="spinner-border text-primary" role="status"></div>
                <p class="mt-2">Loading cart...</p>
            </td>
        </tr>`

    // Fetch product details for each item in cart
    const productIds = cartItems.map(i => i.productId)

    const { data: products, error } = await db
        .from('products')
        .select('id, name, price, image_url')
        .in('id', productIds)

    if (error) {
        document.getElementById('cart-tbody').innerHTML =
            `<tr><td colspan="5" class="text-center text-danger">Could not load cart items.</td></tr>`
        return
    }

    // Merge cart quantities with product details
    cartProducts = cartItems.map(item => {
        const product = products.find(p => p.id === item.productId)
        return product ? { ...product, quantity: item.quantity } : null
    }).filter(Boolean)

    renderCartRows()
    renderSummary()
    updateCartCount()
}

// ── RENDER CART TABLE ROWS ───────────────────────────────────
function renderCartRows() {
    const tbody = document.getElementById('cart-tbody')
    if (!tbody) return

    if (cartProducts.length === 0) {
        renderEmptyCart()
        return
    }

    tbody.innerHTML = cartProducts.map(item => {
        const image    = item.image_url || 'img/product-1.jpg'
        const price    = parseFloat(item.price).toFixed(2)
        const total    = (parseFloat(item.price) * item.quantity).toFixed(2)

        return `
        <tr id="row-${item.id}">
            <td>
                <div class="img">
                    <a href="product-detail.html?id=${item.id}">
                        <img src="${image}" alt="${item.name}" onerror="this.src='img/product-1.jpg'">
                    </a>
                    <p>${item.name}</p>
                </div>
            </td>
            <td>$${price}</td>
            <td>
                <div class="qty">
                    <button class="btn-minus" onclick="changeQty('${item.id}', -1)">
                        <i class="fa fa-minus"></i>
                    </button>
                    <input type="text" id="qty-${item.id}" value="${item.quantity}" 
                           onchange="setQty('${item.id}', this.value)" style="width:40px; text-align:center;">
                    <button class="btn-plus" onclick="changeQty('${item.id}', 1)">
                        <i class="fa fa-plus"></i>
                    </button>
                </div>
            </td>
            <td id="total-${item.id}">$${total}</td>
            <td>
                <button onclick="removeItem('${item.id}')" style="background:none; border:none; cursor:pointer;">
                    <i class="fa fa-trash text-danger"></i>
                </button>
            </td>
        </tr>`
    }).join('')
}

// ── EMPTY CART STATE ─────────────────────────────────────────
function renderEmptyCart() {
    const tbody = document.getElementById('cart-tbody')
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-5">
                    <i class="fa fa-shopping-cart fa-3x mb-3" style="color:#ccc"></i>
                    <h5>Your cart is empty</h5>
                    <a href="product-list.html" class="btn mt-2">Continue Shopping</a>
                </td>
            </tr>`
    }
}

// ── CHANGE QUANTITY ──────────────────────────────────────────
function changeQty(productId, delta) {
    const item = cartProducts.find(p => p.id === productId)
    if (!item) return

    item.quantity = Math.max(1, item.quantity + delta)

    // Update input display
    const input = document.getElementById(`qty-${productId}`)
    if (input) input.value = item.quantity

    // Update row total
    const totalCell = document.getElementById(`total-${productId}`)
    if (totalCell) totalCell.textContent = '$' + (parseFloat(item.price) * item.quantity).toFixed(2)

    saveCartToStorage()
    renderSummary()
    updateCartCount()
}

function setQty(productId, value) {
    const qty = Math.max(1, parseInt(value) || 1)
    const item = cartProducts.find(p => p.id === productId)
    if (!item) return
    item.quantity = qty

    const totalCell = document.getElementById(`total-${productId}`)
    if (totalCell) totalCell.textContent = '$' + (parseFloat(item.price) * qty).toFixed(2)

    saveCartToStorage()
    renderSummary()
    updateCartCount()
}

// ── REMOVE ITEM ──────────────────────────────────────────────
function removeItem(productId) {
    cartProducts = cartProducts.filter(p => p.id !== productId)
    saveCartToStorage()

    const row = document.getElementById(`row-${productId}`)
    if (row) row.remove()

    if (cartProducts.length === 0) renderEmptyCart()
    renderSummary()
    updateCartCount()
}

// ── RENDER CART SUMMARY ──────────────────────────────────────
function renderSummary(discount = 0) {
    const subtotal = cartProducts.reduce(
        (sum, item) => sum + parseFloat(item.price) * item.quantity, 0
    )
    const shipping  = cartProducts.length > 0 ? SHIPPING_COST : 0
    const grandTotal = Math.max(0, subtotal + shipping - discount)

    const el = document.getElementById('cart-summary-content')
    if (el) {
        el.innerHTML = `
            <h1>Cart Summary</h1>
            <p>Sub Total <span>$${subtotal.toFixed(2)}</span></p>
            <p>Shipping Cost <span>$${shipping.toFixed(2)}</span></p>
            ${discount > 0 ? `<p>Discount <span>-$${discount.toFixed(2)}</span></p>` : ''}
            <h2>Grand Total <span>$${grandTotal.toFixed(2)}</span></h2>`
    }

    // Save grand total for checkout page
    localStorage.setItem('cartTotal', grandTotal.toFixed(2))
}

// ── COUPON CODE ──────────────────────────────────────────────
function setupCoupon() {
    const btn   = document.getElementById('coupon-btn')
    const input = document.getElementById('coupon-input')
    const msg   = document.getElementById('coupon-msg')
    if (!btn || !input) return

    // Demo coupons — replace with Supabase lookup later
    const coupons = { 'SAVE10': 10, 'WELCOME5': 5, 'DISCOUNT20': 20 }

    btn.addEventListener('click', () => {
        const code = input.value.trim().toUpperCase()
        if (coupons[code]) {
            const discount = coupons[code]
            msg.innerHTML = `<span class="text-success">Coupon applied! $${discount} off.</span>`
            renderSummary(discount)
        } else {
            msg.innerHTML = `<span class="text-danger">Invalid coupon code.</span>`
        }
    })
}

// ── UPDATE CART (re-render) ──────────────────────────────────
function updateCart() {
    saveCartToStorage()
    renderSummary()
    showToast('Cart updated!')
}

// ── PROCEED TO CHECKOUT ──────────────────────────────────────
async function proceedToCheckout() {
    const user = await getUser()
    if (!user) {
        alert('Please login to proceed to checkout.')
        window.location.href = 'login.html'
        return
    }
    if (cartProducts.length === 0) {
        alert('Your cart is empty!')
        return
    }
    window.location.href = 'checkout.html'
}

// ── LOCALSTORAGE HELPERS ─────────────────────────────────────
function getCartFromStorage() {
    return JSON.parse(localStorage.getItem('cart') || '[]')
}

function saveCartToStorage() {
    const items = cartProducts.map(p => ({ productId: p.id, quantity: p.quantity }))
    localStorage.setItem('cart', JSON.stringify(items))
}

// ── CART COUNT IN NAVBAR ─────────────────────────────────────
function updateCartCount() {
    const cart  = getCartFromStorage()
    const total = cart.reduce((sum, item) => sum + item.quantity, 0)
    const badge = document.getElementById('cart-count')
    if (badge) badge.textContent = total
}

// ── TOAST ────────────────────────────────────────────────────
function showToast(message) {
    let toast = document.getElementById('toast-msg')
    if (!toast) {
        toast = document.createElement('div')
        toast.id = 'toast-msg'
        toast.style.cssText = `
            position:fixed; bottom:30px; right:30px;
            background:#333; color:#fff;
            padding:12px 24px; border-radius:4px;
            z-index:9999; font-size:14px; transition:opacity 0.3s;`
        document.body.appendChild(toast)
    }
    toast.textContent = message
    toast.style.opacity = '1'
    setTimeout(() => { toast.style.opacity = '0' }, 2500)
}
