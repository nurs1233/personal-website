function showToast(message, type = '') {
  const toast = document.getElementById('toast')
  toast.textContent = message
  toast.className = 'toast ' + type
  requestAnimationFrame(() => toast.classList.add('visible'))
  setTimeout(() => toast.classList.remove('visible'), 3500)
}

function formatDate(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric'
  })
}

function openModal(id) {
  document.getElementById(id).classList.add('open')
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open')
}
