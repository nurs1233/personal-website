import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js'

const EARTH_RADIUS = 5
const EARTH_SEGMENTS = 64
let scene, camera, renderer, labelRenderer, controls, earth, atmosphere
let markers = []
let selectedLatLng = null
let tempMarker = null
let popupOpen = false
let sunDirection = new THREE.Vector3(1, 0.2, 0)
let dayFadeProgress = 0
let earthTextureMap = null

const container = document.getElementById('globe-container')

function getSubsolarPoint() {
  const now = new Date()
  const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600
  const startOfYear = new Date(now.getFullYear(), 0, 0)
  const dayOfYear = Math.floor((now - startOfYear) / 86400000)

  const dec = 23.44 * Math.sin((dayOfYear - 80) * 2 * Math.PI / 365.25)
  const lng = (12 - utcHours) * 15

  const phi = (90 - dec) * Math.PI / 180
  const theta = (90 + lng) * Math.PI / 180
  return new THREE.Vector3(
    Math.sin(phi) * Math.cos(theta),
    Math.cos(phi),
    Math.sin(phi) * Math.sin(theta)
  ).normalize()
}

function init() {
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x080c10)

  camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000)
  camera.position.set(0, 2, 18)
  camera.lookAt(0, 0, 0)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  container.appendChild(renderer.domElement)

  labelRenderer = new CSS2DRenderer()
  labelRenderer.setSize(container.clientWidth, container.clientHeight)
  labelRenderer.domElement.style.position = 'absolute'
  labelRenderer.domElement.style.top = '0'
  labelRenderer.domElement.style.left = '0'
  labelRenderer.domElement.style.pointerEvents = 'none'
  container.appendChild(labelRenderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.rotateSpeed = 0.6
  controls.minDistance = 5.3
  controls.maxDistance = 50
  controls.autoRotate = true
  controls.autoRotateSpeed = 0.5

  sunDirection = getSubsolarPoint()

  createStars()
  createEarth()
  createAtmosphere()
  loadPhotos()

  renderer.domElement.addEventListener('click', onGlobeClick)
  renderer.domElement.addEventListener('dblclick', onGlobeDblClick)

  animate()
  startFadeIn()
}

function startFadeIn() {
  dayFadeProgress = 0
  const start = performance.now()
  const duration = 2000
  function tick() {
    dayFadeProgress = Math.min(1, (performance.now() - start) / duration)
    const eased = 1 - Math.pow(1 - dayFadeProgress, 3)
    if (earth) earth.material.opacity = eased
    if (atmosphere) atmosphere.material.opacity = eased * 0.5
    if (dayFadeProgress < 1) requestAnimationFrame(tick)
  }
  tick()
}

function createStars() {
  const starsGeo = new THREE.BufferGeometry()
  const count = 6000
  const positions = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    const r = 80 + Math.random() * 40
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
    positions[i * 3 + 1] = r * Math.cos(phi)
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
    sizes[i] = 0.5 + Math.random() * 1.5
  }
  starsGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))

  const starsMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.15,
    transparent: true,
    opacity: 0.8,
    sizeAttenuation: true,
  })
  scene.add(new THREE.Points(starsGeo, starsMat))
}

const earthFragShader = `
  uniform vec3 sunDirUniform;
  uniform sampler2D dayTex;
  uniform bool hasTex;
  varying vec3 vNormal;
  varying vec2 vUv;

  void main() {
    vec3 n = normalize(vNormal);
    vec3 s = normalize(sunDirUniform);
    float cosAngle = dot(n, s);

    float dayFactor = smoothstep(-0.3, 0.4, cosAngle);

    vec3 dayColor;
    if (hasTex) {
      dayColor = texture2D(dayTex, vUv).rgb;
      dayColor = dayColor * 1.15 + 0.06;
      float avg = (dayColor.r + dayColor.g + dayColor.b) / 3.0;
      dayColor = mix(dayColor, vec3(avg), 0.10);
    } else {
      vec2 p = vUv * 6.0;
      float land = smoothstep(0.4, 0.6, sin(p.x * 3.7 + p.y * 2.1) * cos(p.y * 4.3 + p.x * 1.7) * 0.7 + 0.3);
      dayColor = mix(vec3(0.10, 0.15, 0.22), vec3(0.20, 0.35, 0.18), land);
    }

    vec3 nightColor = vec3(0.03, 0.04, 0.09);
    float cityNoise = sin(vUv.x * 120.0 + vUv.y * 80.0) * cos(vUv.y * 60.0 - vUv.x * 40.0);
    cityNoise = pow(max(0.0, cityNoise * 0.8 + 0.2), 6.0);
    cityNoise *= sin(vUv.x * 40.0 + 1.5) * 0.5 + 0.5;
    nightColor += vec3(0.15, 0.10, 0.03) * cityNoise * 0.5;

    vec3 color = mix(nightColor, dayColor, dayFactor);

    float terminator = 1.0 - abs(cosAngle + 0.05) * 3.0;
    float glow = exp(-terminator * terminator * 4.0) * 0.15;
    color += vec3(0.5, 0.3, 0.1) * glow;

    gl_FragColor = vec4(color, 1.0);
  }
`

function createEarth() {
  const geo = new THREE.SphereGeometry(EARTH_RADIUS, EARTH_SEGMENTS, EARTH_SEGMENTS)

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      sunDirUniform: { value: sunDirection.clone() },
      dayTex: { value: null },
      hasTex: { value: false },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec2 vUv;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: earthFragShader,
    transparent: true,
    opacity: 0,
  })

  earth = new THREE.Mesh(geo, mat)
  scene.add(earth)

  const loader = new THREE.TextureLoader()
  loader.load(
    'https://unpkg.com/three-globe@2.24.13/example/img/earth-blue-marble.jpg',
    (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace
      earthTextureMap = tex
      mat.uniforms.dayTex.value = tex
      mat.uniforms.hasTex.value = true
    },
    undefined,
    () => {}
  )
}

function createAtmosphere() {
  const geo = new THREE.SphereGeometry(EARTH_RADIUS * 1.025, 48, 48)
  const mat = new THREE.ShaderMaterial({
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vPosition;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vNormal;
      varying vec3 vPosition;
      void main() {
        vec3 viewDir = normalize(-vPosition);
        float intensity = pow(1.0 - abs(dot(vNormal, viewDir)), 3.0);
        gl_FragColor = vec4(0.35, 0.55, 0.8, intensity * 0.4);
      }
    `,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
    transparent: true,
    depthWrite: false,
    opacity: 0,
  })
  atmosphere = new THREE.Mesh(geo, mat)
  scene.add(atmosphere)
}

function latLngToPosition(lat, lng) {
  const phi = (90 - lat) * Math.PI / 180
  const theta = (90 + lng) * Math.PI / 180
  return new THREE.Vector3(
    EARTH_RADIUS * Math.sin(phi) * Math.cos(theta),
    EARTH_RADIUS * Math.cos(phi),
    EARTH_RADIUS * Math.sin(phi) * Math.sin(theta)
  )
}

function positionToLatLng(pos) {
  const lat = 90 - Math.acos(pos.y / EARTH_RADIUS) * 180 / Math.PI
  const lng = (Math.atan2(pos.z, pos.x) * 180 / Math.PI) - 90
  return { lat, lng: ((lng + 180) % 360) - 180 }
}

function createPinSVG() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 32 48')
  svg.setAttribute('width', '32')
  svg.setAttribute('height', '48')
  svg.innerHTML = `
    <defs>
      <linearGradient id="pinG" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#7a9e7e"/>
        <stop offset="100%" style="stop-color:#4a7a4e"/>
      </linearGradient>
      <filter id="pinS">
        <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.4"/>
      </filter>
    </defs>
    <path d="M16 2C8.27 2 2 8.27 2 16c0 10.5 14 30 14 30s14-19.5 14-30C30 8.27 23.73 2 16 2z"
      fill="url(#pinG)" filter="url(#pinS)"/>
    <circle cx="16" cy="16" r="6" fill="#1a2a1a"/>
    <circle cx="16" cy="16" r="4" fill="#a8d4ac"/>
  `
  return svg
}

function createPinElement(photo) {
  const wrapper = document.createElement('div')
  wrapper.className = 'globe-pin'
  wrapper.style.pointerEvents = 'auto'
  wrapper.dataset.id = photo.id
  wrapper.appendChild(createPinSVG())

  const label = document.createElement('div')
  label.className = 'globe-label'
  label.innerHTML = `<div class="gl-title">${photo.title}</div><div class="gl-date">${formatDate(photo.created_at)}</div>`
  label.style.display = 'none'
  wrapper.appendChild(label)

  wrapper.addEventListener('mouseenter', () => { label.style.display = 'block' })
  wrapper.addEventListener('mouseleave', () => { label.style.display = 'none' })
  wrapper.addEventListener('click', (e) => {
    e.stopPropagation()
    if (popupOpen) return
    showPhotoPopup(photo)
  })
  return wrapper
}

function addMarker(photo) {
  const pos = latLngToPosition(photo.latitude, photo.longitude)
  const el = createPinElement(photo)
  const label = new CSS2DObject(el)
  label.position.copy(pos)
  scene.add(label)
  markers.push({ label, data: photo, pos })
}

function clearMarkers() {
  markers.forEach(m => scene.remove(m.label))
  markers = []
}

function renderMarkers(photos) {
  clearMarkers()
  photos.forEach(photo => addMarker(photo))
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

function showPhotoPopup(photo) {
  popupOpen = true
  const overlay = document.getElementById('photoPopup')
  const card = document.getElementById('popupCard')
  const coordStr = `${photo.latitude}, ${photo.longitude}`

  card.innerHTML = `
    ${photo.imgur_url ? `<img src="${photo.imgur_url}" alt="${photo.title}" loading="lazy" />` : ''}
    <div class="popup-body">
      <h3>${photo.title}</h3>
      <div class="date">${formatDate(photo.created_at)}</div>
      <div class="coords">📍 ${coordStr}</div>
      ${photo.description ? `<div class="desc">${photo.description}</div>` : ''}
      <button class="btn-close-popup">Tutup</button>
      ${isLoggedIn() ? `<button class="btn-delete-popup" data-id="${photo.id}">Hapus Foto</button>` : ''}
    </div>
  `
  overlay.classList.add('open')

  card.querySelector('.btn-close-popup').onclick = closePhotoPopup
  const delBtn = card.querySelector('.btn-delete-popup')
  if (delBtn) {
    delBtn.onclick = async () => {
      if (confirm('Hapus foto ini?')) await deletePhoto(delBtn.dataset.id)
    }
  }
}

function closePhotoPopup() {
  popupOpen = false
  document.getElementById('photoPopup').classList.remove('open')
}

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
    closePhotoPopup()
    showToast('Foto dihapus!', 'success')
    loadPhotos()
  } catch (err) {
    showToast(err.message, 'error')
  }
}

let zoomTarget = null

function animateZoom() {
  if (zoomTarget) {
    controls.target.lerp(zoomTarget, 0.08)
    const dist = camera.position.distanceTo(controls.target)
    if (dist > 3.5) {
      const dir = new THREE.Vector3().subVectors(controls.target, camera.position).normalize()
      camera.position.addScaledVector(dir, dist * 0.06)
    }
    if (controls.target.distanceTo(zoomTarget) < 0.01) {
      zoomTarget = null
    }
    controls.update()
    requestAnimationFrame(animateZoom)
  }
}

function onGlobeDblClick(event) {
  const rect = renderer.domElement.getBoundingClientRect()
  const mouse = new THREE.Vector2(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1
  )

  const raycaster = new THREE.Raycaster()
  raycaster.setFromCamera(mouse, camera)

  const intersects = raycaster.intersectObject(earth)
  if (intersects.length > 0) {
    const point = intersects[0].point.clone()
    const normal = point.clone().normalize()
    const localPoint = normal.multiplyScalar(EARTH_RADIUS)

    zoomTarget = localPoint
    animateZoom()
  }
}

function onGlobeClick(event) {
  const rect = renderer.domElement.getBoundingClientRect()
  const mouse = new THREE.Vector2(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1
  )

  const raycaster = new THREE.Raycaster()
  raycaster.setFromCamera(mouse, camera)

  const intersects = raycaster.intersectObject(earth)
  if (intersects.length > 0 && document.getElementById('addSheet').classList.contains('open')) {
    const point = intersects[0].point.clone()
    const normal = point.clone().normalize()
    const localPoint = normal.multiplyScalar(EARTH_RADIUS)
    const ll = positionToLatLng(localPoint)
    setSelectedCoords(ll.lat, ll.lng, localPoint)
  }
}

window.setSelectedCoords = function(lat, lng, localPoint) {
  selectedLatLng = { lat, lng }
  document.getElementById('mapCoords').textContent = `${lat.toFixed(4)}, ${lng.toFixed(3)}`

  if (tempMarker) scene.remove(tempMarker)
  if (localPoint) {
    const dotGeo = new THREE.SphereGeometry(0.15, 8, 8)
    const dotMat = new THREE.MeshBasicMaterial({ color: 0xa8d4ac })
    tempMarker = new THREE.Mesh(dotGeo, dotMat)
    tempMarker.position.copy(localPoint)
    scene.add(tempMarker)
  }
}

function animate() {
  requestAnimationFrame(animate)

  sunDirection.copy(getSubsolarPoint())
  if (earth) {
    earth.material.uniforms.sunDirUniform.value.copy(sunDirection)
  }
  if (atmosphere) atmosphere.rotation.y += 0.0003

  controls.update()
  renderer.render(scene, camera)
  labelRenderer.render(scene, camera)
}

window.addEventListener('resize', () => {
  const w = container.clientWidth
  const h = container.clientHeight
  camera.aspect = w / h
  camera.updateProjectionMatrix()
  renderer.setSize(w, h)
  labelRenderer.setSize(w, h)
})

document.addEventListener('DOMContentLoaded', () => {
  init()

  const fabAdd = document.getElementById('fabAdd')
  fabAdd.addEventListener('click', () => {
    selectedLatLng = null
    document.getElementById('mapCoords').textContent = 'Klik di globe / peta untuk pilih lokasi'
    if (tempMarker) { scene.remove(tempMarker); tempMarker = null }
    if (typeof window.clearMarker2D === 'function') window.clearMarker2D()
    openSheet('addSheet')
  })

  document.getElementById('cancelAdd').addEventListener('click', () => {
    closeSheet('addSheet')
    if (tempMarker) { scene.remove(tempMarker); tempMarker = null }
    if (typeof window.clearMarker2D === 'function') window.clearMarker2D()
  })

  document.getElementById('addForm').addEventListener('submit', async (e) => {
    e.preventDefault()

    if (!selectedLatLng) {
      showToast('Klik globe dulu untuk pilih lokasi', 'error')
      return
    }

    const submitBtn = e.target.querySelector('.btn-primary')
    submitBtn.textContent = 'Upload...'
    submitBtn.disabled = true

    const form = new FormData()
    form.append('title', e.target.title.value)
    form.append('description', e.target.description.value)
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
      closeSheet('addSheet')
      e.target.reset()
      if (tempMarker) { scene.remove(tempMarker); tempMarker = null }
      if (typeof window.clearMarker2D === 'function') window.clearMarker2D()
      loadPhotos()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      submitBtn.textContent = 'Simpan'
      submitBtn.disabled = false
    }
  })

  document.getElementById('btnZoomIn').addEventListener('click', () => {
    const dir = new THREE.Vector3()
    camera.getWorldDirection(dir)
    camera.position.addScaledVector(dir, 1.5)
    controls.update()
  })

  document.getElementById('btnZoomOut').addEventListener('click', () => {
    const dir = new THREE.Vector3()
    camera.getWorldDirection(dir)
    camera.position.addScaledVector(dir, -1.5)
    controls.update()
  })

  document.getElementById('btnReset').addEventListener('click', () => {
    camera.position.set(0, 2, 18)
    controls.target.set(0, 0, 0)
    controls.update()
  })
})
