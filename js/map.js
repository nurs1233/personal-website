let map
let markers = []
let selectedLatLng = null

function initMap() {
  map = new maplibregl.Map({
    container: 'map',
    style: 'https://demotiles.maplibre.org/style.json',
    center: [115, -2.5],
    zoom: 2,
    attributionControl: false
  })

  map.on('load', () => {
    map.setProjection('globe')
    map.dragRotate.enable()
    map.addControl(new maplibregl.NavigationControl(), 'bottom-left')
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')
  })

  loadPhotos()

  map.on('click', (e) => {
    if (document.getElementById('addModal').classList.contains('open')) {
      selectedLatLng = { lat: e.lngLat.lat, lng: e.lngLat.lng }
      document.getElementById('mapCoords').textContent =
        `${e.lngLat.lat.toFixed(4)}, ${e.lngLat.lng.toFixed(4)}`
    }
  })
}

async function loadPhotos() {
  try {
    const res = await fetch('/api/photos')
    const photos = await res.json()
    renderMarkers(photos)
  } catch (err) {
    showToast('Gagal load foto', 'error')
  }
}

function renderMarkers(photos) {
  markers.forEach(m => m.remove())
  markers = []

  photos.forEach(photo => {
    const coordStr = `${photo.latitude}, ${photo.longitude}`
    const html = `
      <div class="popup-content">
        <img src="${photo.imgur_url}" alt="${photo.title}" loading="lazy" />
        <div class="popup-title">${photo.title}</div>
        <div class="popup-date">${formatDate(photo.created_at)}</div>
        <div style="font-size:0.75rem;color:var(--text-light);margin-bottom:8px;font-family:monospace">📍 ${coordStr}</div>
        ${photo.description ? `<div class="popup-desc">${photo.description}</div>` : ''}
        <div class="popup-actions">
          ${isLoggedIn() ? `<button class="btn-delete" data-id="${photo.id}">Hapus</button>` : ''}
        </div>
      </div>
    `

    const el = document.createElement('div')
    el.className = 'custom-marker'
    el.textContent = '📸'
    el.style.cssText = `
      font-size: 20px; width: 36px; height: 36px;
      display: flex; align-items: center; justify-content: center;
      background: rgba(15,17,15,0.85);
      border: 2px solid var(--accent); border-radius: 50%;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
      transition: transform 0.2s;
    `

    const popup = new maplibregl.Popup({
      className: 'photo-popup',
      maxWidth: '320px',
      closeButton: true,
      closeOnClick: false
    }).setHTML(html)

    const marker = new maplibregl.Marker({ element: el })
      .setLngLat([photo.longitude, photo.latitude])
      .setPopup(popup)
      .addTo(map)

    markers.push(marker)
  })
}

document.getElementById('map').addEventListener('click', (e) => {
  const btn = e.target.closest('.btn-delete')
  if (btn && confirm('Hapus foto ini?')) {
    deletePhoto(btn.dataset.id)
  }
})

async function deletePhoto(id) {
  try {
    const res = await fetch(`/api/photos/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + getToken() }
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Gagal hapus')
    }
    showToast('Foto dihapus!', 'success')
    loadPhotos()
  } catch (err) {
    showToast(err.message, 'error')
  }
}

function openModal(id) {
  document.getElementById(id).classList.add('open')
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open')
  selectedLatLng = null
}

document.addEventListener('DOMContentLoaded', () => {
  initMap()

  const fabAdd = document.getElementById('fabAdd')
  const addModal = document.getElementById('addModal')

  fabAdd.addEventListener('click', () => {
    selectedLatLng = null
    document.getElementById('mapCoords').textContent = 'Klik di peta untuk pilih lokasi'
    openModal('addModal')
  })

  document.getElementById('cancelAdd').addEventListener('click', () => {
    closeModal('addModal')
  })

  document.getElementById('addForm').addEventListener('submit', async (e) => {
    e.preventDefault()

    if (!selectedLatLng) {
      showToast('Klik peta dulu untuk pilih lokasi', 'error')
      return
    }

    const submitBtn = e.target.querySelector('.btn-primary')
    submitBtn.textContent = 'Upload...'
    submitBtn.disabled = true

    const form = new FormData()
    form.append('title', e.target.title.value)
    form.append('description', e.target.description.value)
    form.append('region', e.target.region.value)
    form.append('latitude', selectedLatLng.lat)
    form.append('longitude', selectedLatLng.lng)

    const fileInput = e.target.querySelector('input[type="file"]')
    if (fileInput.files.length > 0) {
      form.append('image', fileInput.files[0])
    } else {
      showToast('Pilih gambar dulu', 'error')
      submitBtn.textContent = 'Simpan'
      submitBtn.disabled = false
      return
    }

    try {
      const res = await fetch('/api/photos', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + getToken() },
        body: form
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Gagal upload')
      }

      showToast('Foto ditambahkan!', 'success')
      closeModal('addModal')
      e.target.reset()
      loadPhotos()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      submitBtn.textContent = 'Simpan'
      submitBtn.disabled = false
    }
  })
})
