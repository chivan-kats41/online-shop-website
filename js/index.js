// ============================================================
//  HOMEPAGE — js/index.js
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
    updateCartCount()
    updateAuthNav()
    await loadFeaturedProducts()
    await loadRecentProducts()
    setupNewsletter()
    setupSearch()
})

// ── AUTH-AWARE NAV ───────────────────────────────────────────
async function updateAuthNav() {
    const user = await getUser()
    const dropdown = document.getElementById('auth-dropdown')
    if (!dropdown) return

    if (user) {
        const name = user.user_metadata?.full_name || user.email
        dropdown.innerHTML = `
            <a href="my-account.html" class="dropdown-item">
                <i class="fa fa-user mr-1"></i> ${name}
            </a>
            <div class="dropdown-divider"></div>
            <a href="my-account.html" class="dropdown-item">My Orders</a>
            <a href="admin.html" class="dropdown-item">Admin Panel</a>
            <div class="dropdown-divider"></div>
            <a href="#" class="dropdown-item text-danger" onclick="handleLogout()">
                <i class="fa fa-sign-out-alt mr-1"></i> Logout
            </a>`
    } else {
        dropdown.innerHTML = `
            <a href="login.html" class="dropdown-item">Login</a>
            <a href="login.html" class="dropdown-item">Register</a>`
    }
}

async function handleLogout() {
    await logout()
}

// ── CART COUNT ───────────────────────────────────────────────
function updateCartCount() {
    const cart  = JSON.parse(localStorage.getItem('cart') || '[]')
    const total = cart.reduce((sum, i) => sum + i.quantity, 0)
    document.querySelectorAll('.cart-count').forEach(el => {
        el.textContent = `(${total})`
    })
}

// ── LOAD FEATURED PRODUCTS ───────────────────────────────────
async function loadFeaturedProducts() {
    const container = document.getElementById('featured-products')
    if (!container) return

    const { data: products, error } = await db
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)

    if (error || !products || products.length === 0) {
        container.innerHTML = `<div class="col-12 text-center py-4 text-muted">No products yet.</div>`
        return
    }

    container.innerHTML = products.map(p => productCard(p)).join('')
}

// ── LOAD RECENT PRODUCTS ─────────────────────────────────────
async function loadRecentProducts() {
    const container = document.getElementById('recent-products')
    if (!container) return

    const { data: products, error } = await db
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })
        .range(5, 10)   // next 5 after featured

    if (error || !products || products.length === 0) {
        container.innerHTML = `<div class="col-12 text-center py-4 text-muted">No products yet.</div>`
        return
    }

    container.innerHTML = products.map(p => productCard(p)).join('')
}

// ── PRODUCT CARD TEMPLATE ────────────────────────────────────
function productCard(product) {
    const image = product.image_url || 'img/product-1.jpg'
    const price = parseFloat(product.price || 0).toFixed(2)
    const name  = product.name || 'Product'
    const id    = product.id

    return `
        <div class="col-lg-3">
            <div class="product-item">
                <div class="product-title">
                    <a href="product-detail.html?id=${id}">${name}</a>
                    <div class="ratting">
                        <i class="fa fa-star"></i><i class="fa fa-star"></i>
                        <i class="fa fa-star"></i><i class="fa fa-star"></i>
                        <i class="fa fa-star"></i>
                    </div>
                </div>
                <div class="product-image">
                    <a href="product-detail.html?id=${id}">
                        <img src="${image}" alt="${name}" onerror="this.src='img/product-1.jpg'">
                    </a>
                    <div class="product-action">
                        <a href="#" onclick="quickAddToCart('${id}'); return false;">
                            <i class="fa fa-cart-plus"></i>
                        </a>
                        <a href="#" onclick="quickAddToWishlist('${id}'); return false;">
                            <i class="fa fa-heart"></i>
                        </a>
                        <a href="product-detail.html?id=${id}">
                            <i class="fa fa-search"></i>
                        </a>
                    </div>
                </div>
                <div class="product-price">
                    <h3><span>$</span>${price}</h3>
                    <a class="btn" href="#" onclick="quickAddToCart('${id}'); return false;">
                        <i class="fa fa-shopping-cart"></i>Buy Now
                    </a>
                </div>
            </div>
        </div>`
}

// ── QUICK ADD TO CART ────────────────────────────────────────
async function quickAddToCart(productId) {
    let cart = JSON.parse(localStorage.getItem('cart') || '[]')
    const exists = cart.find(i => i.productId === productId)

    if (exists) {
        exists.quantity += 1
    } else {
        cart.push({ productId, quantity: 1 })
    }

    localStorage.setItem('cart', JSON.stringify(cart))
    updateCartCount()
    showToast('Item added to cart!')
}

// ── QUICK ADD TO WISHLIST ────────────────────────────────────
async function quickAddToWishlist(productId) {
    const user = await getUser()
    if (!user) {
        showToast('Please login to save to wishlist.')
        setTimeout(() => window.location.href = 'login.html', 1500)
        return
    }

    // Save to Supabase wishlist table
    const { error } = await db.from('wishlist').upsert([{
        user_id: user.id,
        product_id: productId
    }], { onConflict: 'user_id,product_id' })

    showToast(error ? 'Could not save to wishlist.' : 'Added to wishlist!')
}

// ── NEWSLETTER ───────────────────────────────────────────────
function setupNewsletter() {
    const btn   = document.getElementById('newsletter-btn')
    const input = document.getElementById('newsletter-email')
    if (!btn || !input) return

    btn.addEventListener('click', async () => {
        const email = input.value.trim()
        if (!email || !email.includes('@')) {
            showToast('Please enter a valid email.')
            return
        }

        const { error } = await db.from('newsletter').upsert(
            [{ email }], { onConflict: 'email' }
        )

        if (error) {
            showToast('Could not subscribe. Try again.')
        } else {
            input.value = ''
            showToast('Subscribed! Thank you.')
        }
    })
}

// ── SEARCH ───────────────────────────────────────────────────
function setupSearch() {
    const btn   = document.querySelector('.bottom-bar .search button')
    const input = document.querySelector('.bottom-bar .search input')
    if (!btn || !input) return

    btn.addEventListener('click', () => {
        const q = input.value.trim()
        if (q) window.location.href = `product-list.html?search=${encodeURIComponent(q)}`
    })

    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const q = input.value.trim()
            if (q) window.location.href = `product-list.html?search=${encodeURIComponent(q)}`
        }
    })
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
