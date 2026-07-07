const AUTH_KEY = 'personal_website_token'

function getToken() {
  return localStorage.getItem(AUTH_KEY)
}

function setToken(token) {
  localStorage.setItem(AUTH_KEY, token)
}

function clearToken() {
  localStorage.removeItem(AUTH_KEY)
}

function isLoggedIn() {
  return !!getToken()
}

function updateLoginButton() {
  const btn = document.getElementById('btnLogin')
  if (isLoggedIn()) {
    btn.textContent = 'Logout'
    btn.classList.add('logged-in')
    document.getElementById('fabAdd').classList.add('visible')
  } else {
    btn.textContent = 'Login'
    btn.classList.remove('logged-in')
    document.getElementById('fabAdd').classList.remove('visible')
  }
}

async function login(password) {
  const res = await fetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  })
  if (!res.ok) throw new Error('Password salah')
  const data = await res.json()
  setToken(data.token)
  updateLoginButton()
}

function logout() {
  clearToken()
  updateLoginButton()
  closeModal('loginModal')
}

document.addEventListener('DOMContentLoaded', () => {
  const loginBtn = document.getElementById('btnLogin')
  const loginModal = document.getElementById('loginModal')

  loginBtn.addEventListener('click', () => {
    if (isLoggedIn()) {
      logout()
    } else {
      openModal('loginModal')
    }
  })

  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault()
    const submitBtn = e.target.querySelector('.btn-primary')
    submitBtn.textContent = 'Cek...'
    submitBtn.disabled = true
    try {
      await login(e.target.password.value)
      showToast('Login berhasil!', 'success')
      closeModal('loginModal')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      submitBtn.textContent = 'Masuk'
      submitBtn.disabled = false
    }
    e.target.reset()
  })

  updateLoginButton()
})
