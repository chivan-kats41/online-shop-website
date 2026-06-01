// ============================================================
//  PRODUCT DETAIL PAGE — js/product-detail.js
// ============================================================

let currentProduct = null
let selectedRating  = 0

// ── ON PAGE LOAD ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    const productId = getProductIdFromURL()

    if (!productId) {
        showError('No product specified. <a href="product-list.html">Browse products</a>')
        return
    }

    updateCartCount()
    await loadProduct(productId)
    await loadReviews(productId)
    await loadRelatedProducts(productId)
    setupRatingStars()
    setupQtyButtons()
})

// ── GET PRODUCT ID FROM URL ──────────────────────────────────
function getProductIdFromURL() {
    return new URLSearchParams(window.location.search).get('id')
}

// ── LOAD PRODUCT ─────────────────────────────────────────────
async function loadProduct(productId) {
    const { data: product, error } = await db
        .from('products')
        .select('*')
        .eq('id', productId)
        .single()

    if (error || !product) {
        showError('Product not found. <a href="product-list.html">Browse products</a>')
        return
    }

    currentProduct = product
    renderProduct(product)

    // Update breadcrumb
    const crumb = document.getElementById('product-breadcrumb')
    if (crumb) crumb.textContent = product.name
}

// ── RENDER PRODUCT DETAILS ───────────────────────────────────
function renderProduct(product) {
    const image = product.image_url || 'img/product-1.jpg'
    const price = parseFloat(product.price || 0).toFixed(2)

    // Image
    const imgMain = document.getElementById('product-img-main')
    const imgNav  = document.getElementById('product-img-nav')
    if (imgMain) {
        imgMain.innerHTML = `<img src="${image}" alt="${product.name}" onerror="this.src='img/product-1.jpg'">`
    }
    if (imgNav) {
        imgNav.innerHTML = `<div class="slider-nav-img"><img src="${image}" alt="${product.name}"></div>`
    }

    // Name
    const nameEl = document.getElementById('product-name')
    if (nameEl) nameEl.textContent = product.name

    // Price
    const priceEl = document.getElementById('product-price')
    if (priceEl) priceEl.innerHTML = `$${price}`

    // Category badge
    const catEl = document.getElementById('product-category')
    if (catEl && product.category) {
        catEl.textContent = product.category
        catEl.style.display = 'inline-block'
    }

    // Stock
    const stockEl = document.getElementById('product-stock')
    if (stockEl) {
        if (product.stock > 0) {
            stockEl.innerHTML = `<span class="text-success"><i class="fa fa-check-circle"></i> In Stock (${product.stock} available)</span>`
        } else {
            stockEl.innerHTML = `<span class="text-danger"><i class="fa fa-times-circle"></i> Out of Stock</span>`
        }
    }

    // Description tab
    const descEl = document.getElementById('product-description')
    if (descEl) {
        descEl.innerHTML = product.description
            ? `<h4>Product Description</h4><p>${product.description}</p>`
            : `<h4>Product Description</h4><p>No description available for this product.</p>`
    }

    // Page title
    document.title = `${product.name} - E Store`
}

// ── QTY BUTTONS ──────────────────────────────────────────────
function setupQtyButtons() {
    const input   = document.getElementById('qty-input')
    const minusBtn = document.getElementById('qty-minus')
    const plusBtn  = document.getElementById('qty-plus')
    if (!input) return

    minusBtn?.addEventListener('click', () => {
        const v = Math.max(1, parseInt(input.value) - 1)
        input.value = v
    })
    plusBtn?.addEventListener('click', () => {
        input.value = parseInt(input.value) + 1
    })
}

// ── ADD TO CART ──────────────────────────────────────────────
async function addToCart() {
    if (!currentProduct) return

    const qty  = parseInt(document.getElementById('qty-input')?.value || 1)
    let cart   = JSON.parse(localStorage.getItem('cart') || '[]')
    const item = cart.find(i => i.productId === currentProduct.id)

    if (item) {
        item.quantity += qty
    } else {
        cart.push({ productId: currentProduct.id, quantity: qty })
    }

    localStorage.setItem('cart', JSON.stringify(cart))
    updateCartCount()
    showToast(`${currentProduct.name} added to cart!`)
}

// ── BUY NOW ──────────────────────────────────────────────────
async function buyNow() {
    await addToCart()
    window.location.href = 'cart.html'
}

// ── CART COUNT ───────────────────────────────────────────────
function updateCartCount() {
    const cart  = JSON.parse(localStorage.getItem('cart') || '[]')
    const total = cart.reduce((s, i) => s + i.quantity, 0)
    document.querySelectorAll('.cart-count').forEach(el => {
        el.textContent = `(${total})`
    })
}

// ── LOAD REVIEWS ─────────────────────────────────────────────
async function loadReviews(productId) {
    const container = document.getElementById('reviews-list')
    const countEl   = document.getElementById('reviews-count')
    if (!container) return

    const { data: reviews, error } = await db
        .from('reviews')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false })

    if (error || !reviews || reviews.length === 0) {
        container.innerHTML = `<p class="text-muted">No reviews yet. Be the first!</p>`
        if (countEl) countEl.textContent = 'Reviews (0)'
        return
    }

    if (countEl) countEl.textContent = `Reviews (${reviews.length})`

    container.innerHTML = reviews.map(r => `
        <div class="reviews-submitted mb-3">
            <div class="reviewer">
                <strong>${r.reviewer_name || 'Anonymous'}</strong>
                <span class="text-muted ml-2">${new Date(r.created_at).toLocaleDateString()}</span>
            </div>
            <div class="ratting">
                ${'<i class="fa fa-star text-warning"></i>'.repeat(r.rating || 5)}
                ${'<i class="far fa-star text-warning"></i>'.repeat(5 - (r.rating || 5))}
            </div>
            <p>${r.review_text || ''}</p>
        </div>`).join('<hr>')
}

// ── STAR RATING SELECTOR ─────────────────────────────────────
function setupRatingStars() {
    const stars = document.querySelectorAll('.rating-input i')
    stars.forEach((star, idx) => {
        star.addEventListener('mouseover', () => highlightStars(idx + 1))
        star.addEventListener('mouseout',  () => highlightStars(selectedRating))
        star.addEventListener('click', () => {
            selectedRating = idx + 1
            highlightStars(selectedRating)
        })
    })
}

function highlightStars(count) {
    document.querySelectorAll('.rating-input i').forEach((s, i) => {
        s.className = i < count ? 'fa fa-star text-warning' : 'far fa-star'
    })
}

// ── SUBMIT REVIEW ─────────────────────────────────────────────
async function submitReview() {
    const productId = getProductIdFromURL()
    const name      = document.getElementById('review-name')?.value.trim()
    const text      = document.getElementById('review-text')?.value.trim()

    if (!name || !text) {
        showToast('Please fill in your name and review.')
        return
    }
    if (selectedRating === 0) {
        showToast('Please select a star rating.')
        return
    }

    const { error } = await db.from('reviews').insert([{
        product_id:    productId,
        reviewer_name: name,
        review_text:   text,
        rating:        selectedRating
    }])

    if (error) {
        showToast('Error submitting review: ' + error.message)
    } else {
        showToast('Review submitted! Thank you.')
        document.getElementById('review-name').value = ''
        document.getElementById('review-text').value = ''
        selectedRating = 0
        highlightStars(0)
        await loadReviews(productId)
    }
}

// ── RELATED PRODUCTS ─────────────────────────────────────────
async function loadRelatedProducts(productId) {
    const container = document.getElementById('related-products')
    if (!container || !currentProduct) return

    const { data: products } = await db
        .from('products')
        .select('*')
        .eq('category', currentProduct.category)
        .neq('id', productId)
        .limit(4)

    if (!products || products.length === 0) {
        container.innerHTML = `<p class="text-muted col-12">No related products found.</p>`
        return
    }

    container.innerHTML = products.map(p => `
        <div class="col-lg-3">
            <div class="product-item">
                <div class="product-title">
                    <a href="product-detail.html?id=${p.id}">${p.name}</a>
                    <div class="ratting">
                        <i class="fa fa-star"></i><i class="fa fa-star"></i>
                        <i class="fa fa-star"></i><i class="fa fa-star"></i>
                        <i class="fa fa-star"></i>
                    </div>
                </div>
                <div class="product-image">
                    <a href="product-detail.html?id=${p.id}">
                        <img src="${p.image_url || 'img/product-1.jpg'}" alt="${p.name}"
                             onerror="this.src='img/product-1.jpg'">
                    </a>
                    <div class="product-action">
                        <a href="#" onclick="quickAdd('${p.id}'); return false;">
                            <i class="fa fa-cart-plus"></i>
                        </a>
                        <a href="product-detail.html?id=${p.id}">
                            <i class="fa fa-search"></i>
                        </a>
                    </div>
                </div>
                <div class="product-price">
                    <h3><span>$</span>${parseFloat(p.price).toFixed(2)}</h3>
                    <a class="btn" href="product-detail.html?id=${p.id}">
                        <i class="fa fa-shopping-cart"></i>View
                    </a>
                </div>
            </div>
        </div>`).join('')
}

function quickAdd(productId) {
    let cart = JSON.parse(localStorage.getItem('cart') || '[]')
    const item = cart.find(i => i.productId === productId)
    if (item) item.quantity += 1
    else cart.push({ productId, quantity: 1 })
    localStorage.setItem('cart', JSON.stringify(cart))
    updateCartCount()
    showToast('Added to cart!')
}

// ── ERROR STATE ───────────────────────────────────────────────
function showError(msg) {
    const detail = document.getElementById('product-detail-content')
    if (detail) {
        detail.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="fa fa-box-open fa-3x mb-3" style="color:#ccc"></i>
                <h4>${msg}</h4>
            </div>`
    }
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
