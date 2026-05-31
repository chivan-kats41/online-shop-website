
// ============================================================
//  SUPABASE CLIENT — js/supabase.js
//  Place this file in your project at: js/supabase.js
//  Load it AFTER the Supabase CDN script in every HTML page
// ============================================================

// 1. Get these values from: Supabase Dashboard → Settings → API
const SUPABASE_URL = 'https://rnhvxynawjkoiwdkkugj.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_HkNtJkbYL9XXT2Iyv1FItw_6n2IQkP6'

// 2. Create the client (supabase global comes from the CDN script)
const { createClient } = supabase
const db = createClient(SUPABASE_URL, SUPABASE_KEY)

// ============================================================
//  AUTH HELPERS — used by login.html
// ============================================================

// Sign Up a new user
async function signUp(firstName, lastName, email, password) {
    const { data, error } = await db.auth.signUp({
        email: email,
        password: password,
        options: {
            data: {
                full_name: firstName + ' ' + lastName
            }
        }
    })

    if (error) {
        showMessage('register-msg', error.message, 'danger')
    } else {
        showMessage('register-msg', 'Account created! Please check your email to confirm.', 'success')
    }
}

// Log In an existing user
async function login(email, password) {
    const { data, error } = await db.auth.signInWithPassword({
        email: email,
        password: password
    })

    if (error) {
        showMessage('login-msg', error.message, 'danger')
    } else {
        // Redirect to account page after login
        window.location.href = 'my-account.html'
    }
}

// Log Out
async function logout() {
    await db.auth.signOut()
    window.location.href = 'login.html'
}

// Get current logged-in user
async function getUser() {
    const { data: { user } } = await db.auth.getUser()
    return user
}

// Check if user is logged in, redirect if not
async function requireAuth() {
    const user = await getUser()
    if (!user) {
        window.location.href = 'login.html'
    }
    return user
}

// ============================================================
//  HELPER — show success/error messages in the UI
// ============================================================
function showMessage(elementId, message, type) {
    const el = document.getElementById(elementId)
    if (el) {
        el.innerHTML = `<div class="alert alert-${type} mt-2">${message}</div>`
    }
}
