// ============================================================
//  PRODUCT LIST PAGE — js/product-list.js
// ============================================================

const PRODUCTS_PER_PAGE = 9
let allProducts = []
let currentPage = 1
let currentSort  = 'newest'
let currentCategory = ''
let currentMinPrice = 0
let currentMaxPrice = 99999
let searchTerm = ''

// ── ON PAGE LOAD ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    await loadCategories()
    await loadProducts()
    setupSearch()
    setupSort()
    setupPriceFilter()
})

// ── LOAD ALL PRODUCTS FROM SUPABASE ─────────────────────────
async function loadProducts() {
    showLoading(true)

    let query = db.from('products').select('*')

    // Apply category filter
    if (currentCategory) {
        query = query.eq('category', currentCategory)
    }

    // Apply price range
    query = query.gte('price', currentMinPrice).lte('price', currentMaxPrice)

    // Apply search
    if (searchTerm) {
        query = query.ilike('name', `%${searchTerm}%`)
    }

    // Apply sort
    if (currentSort === 'newest') {
        query = query.order('created_at', { ascending: false })
    } else if (currentSort === 'price-low') {
        query = query.order('price', { ascending: true })
    } else if (currentSort === 'price-high') {
        query = query.order('price', { ascending: false })
    }

    const { data: products, error } = await query

    showLoading(false)

    if (error) {
        showError('Could not load products: ' + error.message)
        return
    }

    allProducts = products || []
    currentPage = 1
    renderProducts()
    renderPagination()
}

// ── RENDER PRODUCT CARDS ─────────────────────────────────────
function renderProducts() {
    const grid = document.getElementById('products-grid')
    if (!grid) return

    const start = (currentPage - 1) * PRODUCTS_PER_PAGE
    const end   = start + PRODUCTS_PER_PAGE
    const page  = allProducts.slice(start, end)

    if (page.length === 0) {
        grid.innerHTML = `
            <div class="col-md-12 text-center py-5">
                <i class="fa fa-box-open fa-3x mb-3" style="color:#ccc"></i>
                <h5>No products found</h5>
                <p class="text-muted">Try adjusting your search or filters.</p>
            </div>`
        return
    }

    grid.innerHTML = page.map(product => productCard(product)).join('')
}

// ── SINGLE PRODUCT CARD TEMPLATE ────────────────────────────
function productCard(product) {
    const imageUrl = product.image_url || 'img/product-1.jpg'
    const price    = parseFloat(product.price || 0).toFixed(2)
    const name     = product.name || 'Product'
    const id       = product.id

    return `
        <div class="col-md-4">
            <div class="product-item">
                <div class="product-title">
                    <a href="product-detail.html?id=${id}">${name}</a>
                    <div class="ratting">
                        <i class="fa fa-star"></i>
                        <i class="fa fa-star"></i>
                        <i class="fa fa-star"></i>
                        <i class="fa fa-star"></i>
                        <i class="fa fa-star"></i>
                    </div>
                </div>
                <div class="product-image">
                    <a href="product-detail.html?id=${id}">
                        <img src="${imageUrl}" alt="${name}" onerror="this.src='img/product-1.jpg'">
                    </a>
                    <div class="product-action">
                        <a href="#" onclick="addToCart('${id}'); return false;"><i class="fa fa-cart-plus"></i></a>
                        <a href="#" onclick="addToWishlist('${id}'); return false;"><i class="fa fa-heart"></i></a>
                        <a href="product-detail.html?id=${id}"><i class="fa fa-search"></i></a>
                    </div>
                </div>
                <div class="product-price">
                    <h3><span>$</span>${price}</h3>
                    <a class="btn" href="#" onclick="addToCart('${id}'); return false;">
                        <i class="fa fa-shopping-cart"></i>Add to Cart
                    </a>
                </div>
            </div>
        </div>`
}

// ── PAGINATION ───────────────────────────────────────────────
function renderPagination() {
    const container = document.getElementById('pagination')
    if (!container) return

    const totalPages = Math.ceil(allProducts.length / PRODUCTS_PER_PAGE)
    if (totalPages <= 1) { container.innerHTML = ''; return }

    let html = `<ul class="pagination justify-content-center">`

    // Previous
    html += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="goToPage(${currentPage - 1}); return false;">Previous</a>
    </li>`

    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        html += `<li class="page-item ${i === currentPage ? 'active' : ''}">
            <a class="page-link" href="#" onclick="goToPage(${i}); return false;">${i}</a>
        </li>`
    }

    // Next
    html += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="goToPage(${currentPage + 1}); return false;">Next</a>
    </li>`

    html += `</ul>`
    container.innerHTML = html
}

function goToPage(page) {
    const totalPages = Math.ceil(allProducts.length / PRODUCTS_PER_PAGE)
    if (page < 1 || page > totalPages) return
    currentPage = page
    renderProducts()
    renderPagination()
    window.scrollTo({ top: 0, behavior: 'smooth' })
}

// ── SEARCH ───────────────────────────────────────────────────
function setupSearch() {
    const btn   = document.getElementById('search-btn')
    const input = document.getElementById('search-input')
    if (!btn || !input) return

    btn.addEventListener('click', () => {
        searchTerm = input.value.trim()
        loadProducts()
    })
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchTerm = input.value.trim()
            loadProducts()
        }
    })
}

// ── SORT ─────────────────────────────────────────────────────
function setupSort() {
    document.querySelectorAll('.sort-option').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault()
            currentSort = e.target.dataset.sort
            loadProducts()
        })
    })
}

// ── PRICE FILTER ─────────────────────────────────────────────
function setupPriceFilter() {
    document.querySelectorAll('.price-option').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault()
            currentMinPrice = parseInt(e.target.dataset.min)
            currentMaxPrice = parseInt(e.target.dataset.max)
            loadProducts()
        })
    })
}

// ── CATEGORY FILTER ──────────────────────────────────────────
async function loadCategories() {
    const { data, error } = await db
        .from('products')
        .select('category')

    if (error || !data) return

    // Get unique categories
    const categories = [...new Set(data.map(p => p.category).filter(Boolean))]
    const nav = document.getElementById('category-nav')
    if (!nav || categories.length === 0) return

    nav.innerHTML = `
        <li class="nav-item">
            <a class="nav-link" href="#" onclick="filterCategory(''); return false;">
                <i class="fa fa-th"></i>All Products
            </a>
        </li>` +
        categories.map(cat => `
            <li class="nav-item">
                <a class="nav-link" href="#" onclick="filterCategory('${cat}'); return false;">
                    <i class="fa fa-tag"></i>${cat}
                </a>
            </li>`).join('')
}

function filterCategory(category) {
    currentCategory = category
    loadProducts()
}

// ── ADD TO CART ──────────────────────────────────────────────
async function addToCart(productId) {
    const user = await getUser()
    if (!user) {
        alert('Please login to add items to your cart.')
        window.location.href = 'login.html'
        return
    }

    // Get cart from localStorage for now (we'll wire full DB cart in cart.html)
    let cart = JSON.parse(localStorage.getItem('cart') || '[]')
    const exists = cart.find(item => item.productId === productId)

    if (exists) {
        exists.quantity += 1
    } else {
        cart.push({ productId, quantity: 1 })
    }

    localStorage.setItem('cart', JSON.stringify(cart))
    updateCartCount()

    // Visual feedback
    showToast('Item added to cart!')
}

// ── ADD TO WISHLIST ──────────────────────────────────────────
async function addToWishlist(productId) {
    const user = await getUser()
    if (!user) {
        alert('Please login to save to wishlist.')
        window.location.href = 'login.html'
        return
    }
    showToast('Added to wishlist!')
}

// ── CART COUNT IN NAVBAR ─────────────────────────────────────
function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]')
    const total = cart.reduce((sum, item) => sum + item.quantity, 0)
    const badge = document.getElementById('cart-count')
    if (badge) badge.textContent = total
}

// ── TOAST NOTIFICATION ───────────────────────────────────────
function showToast(message) {
    let toast = document.getElementById('toast-msg')
    if (!toast) {
        toast = document.createElement('div')
        toast.id = 'toast-msg'
        toast.style.cssText = `
            position: fixed; bottom: 30px; right: 30px;
            background: #333; color: #fff;
            padding: 12px 24px; border-radius: 4px;
            z-index: 9999; font-size: 14px;
            transition: opacity 0.3s;`
        document.body.appendChild(toast)
    }
    toast.textContent = message
    toast.style.opacity = '1'
    setTimeout(() => { toast.style.opacity = '0' }, 2500)
}

// ── LOADING STATE ────────────────────────────────────────────
function showLoading(visible) {
    const grid = document.getElementById('products-grid')
    if (!grid) return
    if (visible) {
        grid.innerHTML = `
            <div class="col-md-12 text-center py-5">
                <div class="spinner-border text-primary" role="status"></div>
                <p class="mt-2">Loading products...</p>
            </div>`
    }
}

function showError(msg) {
    const grid = document.getElementById('products-grid')
    if (grid) grid.innerHTML = `<div class="col-md-12"><div class="alert alert-danger">${msg}</div></div>`
}

// Init cart count on load
updateCartCount()
