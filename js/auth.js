// ── SIGN UP ──────────────────────────────────────────
async function signUp(email, password) {
  const { data, error } = await db.auth.signUp({ email, password })
  if (error) {
    alert('Signup error: ' + error.message)
  } else {
    alert('Check your email to confirm your account!')
  }
}

// ── LOG IN ───────────────────────────────────────────
async function login(email, password) {
  const { data, error } = await db.auth.signInWithPassword({ email, password })
  if (error) {
    alert('Login error: ' + error.message)
  } else {
    window.location.href = 'dashboard.html' // redirect after login
  }
}

// ── LOG OUT ──────────────────────────────────────────
async function logout() {
  await db.auth.signOut()
  window.location.href = 'index.html'
}

// ── GET CURRENT USER ─────────────────────────────────
async function getUser() {
  const { data: { user } } = await db.auth.getUser()
  return user
}
