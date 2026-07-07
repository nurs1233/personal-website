const DRAGON_BASE = '/assets/dragonarium/'
const DRAGON_SIZE = 100
let dragonFrames = {}
let dragonState = 'Idle'
let dragonIdx = 0
let dragonLastTime = 0
let dragonX = 60, dragonY = 60
let targetX = 60, targetY = 60
let wanderX = 60, wanderY = 60
let dragonFlip = false
let dragonLoaded = false
let dragonEl = null
let dragonActive = true
let dragonChasing = false
let wanderTimer = 0
let interactionScore = 12
let targetScore = 12
let lastMouseMove = 0
let lastScoreAdd = 0
let lastMouseMoveForSleep = Date.now()
let dragonMood = 'excited'
let wasOverInteractive = false
let dragonIsPetting = false
let dragonPetScoreTimer = null
let dragonDownTime = 0
let dragonDownPos = { x: 0, y: 0 }
let dragonFeedTimer = null
let dragonFeedMenu = null
let dragonPetting = false
let sleepPhase = null
let sleepPrasleepDone = false
let prevDragonMood = ''
let prevDragonState = ''
let bubbleEl = null
let bubbleTimeout = null
let indicatorEl = null
let dragonHatched = false
let hatchClickText = null

const FOOD_ITEMS = ['🍎', '🐟', '🍰', '🍬', '🥩']
const FOOD_NAMES = { '🍎': 'Apple', '🐟': 'Fish', '🍰': 'Cake', '🍬': 'Candy', '🥩': 'Meat' }

const BUBBLE_MSG = {
  excited: ['Senang!', 'Asik!', 'Seru!', 'Hore!'],
  bored: ['Bosen...', 'Main yuk', 'Hellow?', 'Sepi...'],
  angry: ['Hmph!', 'Sebel', 'Gak suka!', 'Grr...'],
  sleepy: ['Ngantuk...', 'Mata berat...', 'Zzz...'],
  Sleep: ['Malam...', 'Zzz...', 'Tidur dulu...'],
  wake: ['Pagi!', 'Hai!', 'Bangun!'],
  fed: ['Nyam nyam', 'Enak!', 'Laparr'],
  petted: ['Senang', 'Hehe~', 'Lagi dong'],
  chasing: ['Kejar!', 'Cepetan!', 'Awas!'],
  confused: ['Hah?', 'Apaan tuh?', 'Bingung'],
  hungry: ['Lapar...', 'Makan dong', 'Lapaaar'],
}

const STILL_STATES = ['confused', 'Laugh', 'Sit', 'Sleep']
const DRAGON_FPS = { Idle: 5, Walk: 5, Fly: 2, Laugh: 2, Sleep: 2.5, Sit: 5, confused: 5, turn_away: 5 }

function initDragon() {
  if (dragonLoaded) return

  createIndicator()

  dragonEl = document.createElement('div')
  dragonEl.id = 'dragon-pet'
  dragonEl.style.cssText = `
    position:fixed;z-index:9999;pointer-events:none;
    bottom:80px;left:40px;width:${DRAGON_SIZE}px;height:${DRAGON_SIZE}px;
    image-rendering:pixelated;transition:none;
  `
  const c = document.createElement('canvas')
  c.width = DRAGON_SIZE; c.height = DRAGON_SIZE
  c.id = 'dragon-pet-canvas'
  c.style.cssText = 'width:100%;height:100%;image-rendering:pixelated;cursor:pointer;pointer-events:auto;border-radius:8px;'
  dragonEl.appendChild(c)

  const panel = document.createElement('div')
  panel.id = 'dragon-panel'
  panel.style.cssText = `
    position:absolute;bottom:100%;left:50%;transform:translateX(-50%);
    background:rgba(10,12,10,0.92);backdrop-filter:blur(6px);
    border:1px solid rgba(122,158,126,0.2);border-radius:8px;
    padding:6px 10px;white-space:nowrap;
    font-family:Inter,sans-serif;font-size:0.65rem;color:rgba(200,216,204,0.7);
    margin-bottom:4px;pointer-events:none;
    transition:opacity 0.2s;opacity:0.7;
  `
  panel.innerHTML = `
    <div id="dp-state" style="font-weight:600;color:#a8d4ac;font-size:0.7rem;margin-bottom:2px;">IDLE</div>
    <div id="dp-mood" style="margin-bottom:2px;">Excited</div>
    <div style="display:flex;align-items:center;gap:6px;">
      <span style="font-size:0.6rem;color:rgba(200,216,204,0.4);">Energy</span>
      <div style="flex:1;height:4px;background:rgba(200,216,204,0.1);border-radius:2px;overflow:hidden;width:50px;">
        <div id="dp-bar" style="height:100%;width:60%;border-radius:2px;background:#4CAF50;transition:width 0.2s;"></div>
      </div>
      <span id="dp-num" style="font-size:0.6rem;color:rgba(200,216,204,0.4);">12</span>
    </div>
  `
  dragonEl.appendChild(panel)

  hatchClickText = document.createElement('div')
  hatchClickText.textContent = 'Click to hatch!'
  hatchClickText.style.cssText = `
    position:fixed;z-index:9998;pointer-events:none;
    font-family:Inter,sans-serif;font-size:0.7rem;color:rgba(168,212,172,0.5);
    text-align:center;width:120px;left:50%;transform:translateX(-50%);
    transition:opacity 1s;
  `
  document.body.appendChild(hatchClickText)

  document.body.appendChild(dragonEl)

  createBubble()

  c.addEventListener('mouseenter', () => { panel.style.opacity = '1' })
  c.addEventListener('mouseleave', () => { panel.style.opacity = '0.7' })

  c.addEventListener('contextmenu', e => {
    e.preventDefault()
    if (dragonHatched) showFeedMenu()
  })

  c.addEventListener('mousedown', e => {
    if (e.button !== 0) return
    if (!dragonHatched) {
      advanceHatch()
      return
    }
    dragonDownTime = Date.now()
    dragonDownPos.x = e.clientX
    dragonDownPos.y = e.clientY
    dragonPetting = true

    clearTimeout(dragonFeedTimer)
    dragonFeedTimer = setTimeout(() => {
      if (dragonPetting) {
        const dx = Math.abs(dragonX - dragonDownPos.x)
        const dy = Math.abs(dragonY - dragonDownPos.y)
        if (Math.sqrt(dx * dx + dy * dy) < 15) showFeedMenu()
      }
    }, 800)

    document.addEventListener('mousemove', onDragMove, { passive: true })
    document.addEventListener('mouseup', onDragEnd)
  })

  const keys = ['Idle','Walk','Fly','Sleep','Laugh','Egg_hatch','Sit','turn_away','confused']
  let loaded = 0
  keys.forEach(key => {
    const frames = []
    let i = 1
    function next() {
      const img = new Image()
      img.onload = () => { frames.push(img); i++; next() }
      img.onerror = () => {
        dragonFrames[key] = frames
        loaded++
        if (loaded === keys.length) {
          dragonFrames.prasleep = (dragonFrames.Sleep || []).slice(0, 3)
          dragonFrames.sleep = (dragonFrames.Sleep || []).slice(3, 5)
          dragonLoaded = true
          dragonState = 'Egg_hatch'
          dragonX = (window.innerWidth - DRAGON_SIZE) / 2
          dragonY = window.innerHeight - DRAGON_SIZE - 60
          if (hatchClickText) {
            hatchClickText.style.bottom = (window.innerHeight - dragonY - DRAGON_SIZE - 25) + 'px'
          }
          requestAnimationFrame(dragonLoop)
        }
      }
      img.src = DRAGON_BASE + key + '/' + i + '.png'
    }
    next()
  })

  document.addEventListener('mousemove', e => {
    if (!dragonActive) return
    lastMouseMoveForSleep = Date.now()
    if (dragonState === 'Sleep') { setDragonState('wake'); return }
    if (dragonPetting) return
    if (dragonChasing) { targetX = e.clientX; targetY = e.clientY; return }

    targetX = e.clientX
    targetY = e.clientY
    lastMouseMove = Date.now()
    if (Date.now() - lastScoreAdd > 500) { targetScore = Math.min(20, targetScore + 0.5); lastScoreAdd = Date.now() }

    if (dragonState !== 'confused' && dragonState !== 'Laugh' && !dragonChasing) {
      const el = document.elementFromPoint(e.clientX, e.clientY)
      if (el) {
        const tag = el.tagName.toLowerCase()
        const isInteractive = ['a','button','input','textarea','select'].includes(tag)
          || el.closest('a') || el.closest('button') || el.closest('nav')
          || el.onclick || el.getAttribute('role') === 'button'
        if (isInteractive && !wasOverInteractive) {
          wasOverInteractive = true; setDragonState('confused'); targetScore = Math.max(0, targetScore - 2)
          showBubble('confused')
        } else if (!isInteractive && wasOverInteractive) {
          wasOverInteractive = false; setDragonState('Idle'); targetScore = Math.min(20, targetScore + 1)
        }
      }
    }
  })

  setInterval(() => {
    if (dragonState === 'Sleep') {
      targetScore = Math.min(20, targetScore + 2)
    } else if (Date.now() - lastMouseMove > 3000) {
      targetScore = Math.max(0, targetScore - 1)
    }
    if (dragonChasing) targetScore = Math.min(20, targetScore + 0.5)
  }, 1500)
}

function createBubble() {
  bubbleEl = document.createElement('div')
  bubbleEl.id = 'dragon-bubble'
  bubbleEl.style.cssText = `
    position:absolute;bottom:100%;left:50%;transform:translateX(-50%);
    margin-bottom:38px;pointer-events:none;
    opacity:0;transition:opacity 0.25s;
  `
  const inner = document.createElement('div')
  inner.id = 'dragon-bubble-inner'
  inner.style.cssText = `
    background:rgba(10,12,10,0.9);backdrop-filter:blur(6px);
    border:1px solid rgba(122,158,126,0.2);border-radius:10px;
    padding:4px 10px;font-family:Inter,sans-serif;font-size:0.7rem;
    color:rgba(200,216,204,0.85);white-space:nowrap;
  `
  bubbleEl.appendChild(inner)
  dragonEl.appendChild(bubbleEl)
}

function showBubble(category) {
  const msgs = BUBBLE_MSG[category]
  if (!msgs || !bubbleEl) return
  const inner = document.getElementById('dragon-bubble-inner')
  if (!inner) return
  clearTimeout(bubbleTimeout)
  inner.textContent = msgs[Math.floor(Math.random() * msgs.length)]
  bubbleEl.style.opacity = '1'
  bubbleTimeout = setTimeout(() => { bubbleEl.style.opacity = '0' }, 2500)
}

function createIndicator() {
  indicatorEl = document.createElement('div')
  indicatorEl.id = 'dragon-indicator'
  indicatorEl.style.cssText = `
    position:fixed;z-index:9998;pointer-events:auto;cursor:pointer;
    bottom:52px;right:12px;
    display:flex;align-items:center;gap:6px;
    background:rgba(10,12,10,0.85);backdrop-filter:blur(6px);
    border:1px solid rgba(122,158,126,0.15);border-radius:8px;
    padding:5px 9px;font-family:Inter,sans-serif;font-size:0.6rem;color:rgba(200,216,204,0.6);
    transition:opacity 0.3s;opacity:0.6;
  `
  indicatorEl.innerHTML = `
    <span style="font-size:0.8rem;">IGNIS</span>
    <div style="width:32px;height:3px;background:rgba(200,216,204,0.1);border-radius:2px;overflow:hidden;">
      <div id="ind-bar" style="height:100%;width:60%;border-radius:2px;background:#4CAF50;transition:width 0.3s;"></div>
    </div>
    <span id="ind-num">12</span>
  `
  indicatorEl.addEventListener('mouseenter', () => { indicatorEl.style.opacity = '1' })
  indicatorEl.addEventListener('mouseleave', () => { indicatorEl.style.opacity = '0.6' })
  indicatorEl.addEventListener('click', () => {
    const vw = window.innerWidth, vh = window.innerHeight, margin = 60
    dragonX = margin + Math.random() * (vw - DRAGON_SIZE - margin * 2)
    dragonY = margin + Math.random() * (vh - DRAGON_SIZE - margin * 2)
    if (dragonState === 'Sleep') { setDragonState('Idle'); showBubble('wake') }
  })
  document.body.appendChild(indicatorEl)
}

function onDragMove(e) {
  if (!dragonPetting || !dragonHatched) return
  const dx = Math.abs(e.clientX - dragonDownPos.x)
  const dy = Math.abs(e.clientY - dragonDownPos.y)
  if (Math.sqrt(dx * dx + dy * dy) > 10) {
    clearTimeout(dragonFeedTimer)
    if (!dragonIsPetting) {
      dragonIsPetting = true
      if (!STILL_STATES.includes(dragonState)) setDragonState('Sit')
      dragonPetScoreTimer = setInterval(() => {
        targetScore = Math.min(20, targetScore + 0.5)
        spawnHeart()
      }, 800)
    }
  }
}

function onDragEnd(e) {
  if (e.button !== 0) return
  document.removeEventListener('mousemove', onDragMove)
  document.removeEventListener('mouseup', onDragEnd)
  clearTimeout(dragonFeedTimer)
  const held = Date.now() - dragonDownTime
  const dx = Math.abs(e.clientX - dragonDownPos.x)
  const dy = Math.abs(e.clientY - dragonDownPos.y)
  const moved = Math.sqrt(dx * dx + dy * dy)

  if (dragonIsPetting) {
    dragonIsPetting = false
    clearInterval(dragonPetScoreTimer)
    dragonPetScoreTimer = null
    targetScore = Math.min(20, targetScore + 2)
    setDragonState('Laugh')
    spawnHeart(); spawnHeart(); spawnHeart()
    showBubble('petted')
    showToast('Pet! +2 Energy')
  } else if (held < 300 && moved < 10) {
    if (dragonChasing) {
      dragonChasing = false
      setDragonState('Idle')
    } else {
      dragonChasing = true
      setDragonState('Fly')
      showBubble('chasing')
    }
  }
  dragonPetting = false
}

function showFeedMenu() {
  if (!dragonHatched) return
  hideFeedMenu()
  wasOverInteractive = false

  dragonFeedMenu = document.createElement('div')
  dragonFeedMenu.id = 'dragon-feed-menu'
  dragonFeedMenu.style.cssText = `
    position:fixed;z-index:10000;pointer-events:auto;
    display:flex;gap:6px;padding:8px 12px;
    background:rgba(10,12,10,0.92);backdrop-filter:blur(8px);
    border:1px solid rgba(122,158,126,0.25);border-radius:12px;
    box-shadow:0 4px 20px rgba(0,0,0,0.4);
  `
  FOOD_ITEMS.forEach(emoji => {
    const btn = document.createElement('button')
    btn.textContent = emoji
    btn.style.cssText = `
      font-size:1.3rem;width:36px;height:36px;display:flex;
      align-items:center;justify-content:center;
      background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);
      border-radius:8px;cursor:pointer;transition:all 0.15s;
    `
    btn.addEventListener('mouseenter', () => {
      btn.style.background = 'rgba(168,212,172,0.2)'
      btn.style.borderColor = 'rgba(168,212,172,0.4)'
      btn.style.transform = 'scale(1.15)'
    })
    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'rgba(255,255,255,0.05)'
      btn.style.borderColor = 'rgba(255,255,255,0.08)'
      btn.style.transform = 'scale(1)'
    })
    btn.addEventListener('click', e => { e.stopPropagation(); feedDragon(emoji) })
    dragonFeedMenu.appendChild(btn)
  })

  const vw = window.innerWidth, vh = window.innerHeight
  let mx = dragonX - 40, my = dragonY - 10
  if (mx < 10) mx = 10
  if (mx + 140 > vw) mx = vw - 150
  if (my < 10) my = dragonY + DRAGON_SIZE + 10
  dragonFeedMenu.style.left = mx + 'px'
  dragonFeedMenu.style.top = my + 'px'
  document.body.appendChild(dragonFeedMenu)
  setTimeout(hideFeedMenu, 4000)
}

function feedDragon(emoji) {
  hideFeedMenu()
  targetScore = Math.min(20, targetScore + 3)
  setDragonState('Laugh')
  spawnHeart(); spawnHeart()
  showBubble('fed')
  showToast(FOOD_NAMES[emoji] || emoji + '! +3 Energy')
}

function hideFeedMenu() {
  if (dragonFeedMenu) { dragonFeedMenu.remove(); dragonFeedMenu = null }
}

function spawnHeart() {
  const el = document.createElement('div')
  el.textContent = ['💕', '❤️', '✨', '⭐', '💖'][Math.floor(Math.random() * 5)]
  el.style.cssText = `
    position:fixed;z-index:10001;pointer-events:none;
    font-size:1.1rem;left:${dragonX + DRAGON_SIZE / 2}px;
    top:${dragonY}px;transition:all 0.8s ease-out;opacity:1;
  `
  document.body.appendChild(el)
  requestAnimationFrame(() => {
    el.style.transform = `translateY(-${30 + Math.random() * 30}px) translateX(${(Math.random() - 0.5) * 30}px)`
    el.style.opacity = '0'
  })
  setTimeout(() => el.remove(), 900)
}

let toastTimeout

function showToast(msg) {
  const existing = document.getElementById('dragon-toast')
  if (existing) existing.remove()
  clearTimeout(toastTimeout)
  const el = document.createElement('div')
  el.id = 'dragon-toast'
  el.textContent = msg
  el.style.cssText = `
    position:fixed;z-index:10002;pointer-events:none;top:60px;left:50%;transform:translateX(-50%);
    background:rgba(10,12,10,0.85);backdrop-filter:blur(6px);
    border:1px solid rgba(168,212,172,0.3);border-radius:8px;
    padding:6px 14px;font-family:Inter,sans-serif;font-size:0.8rem;
    color:#a8d4ac;transition:opacity 0.5s;
  `
  document.body.appendChild(el)
  toastTimeout = setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 500) }, 1500)
}

function isOverInteractive(x, y) {
  const el = document.elementFromPoint(x + DRAGON_SIZE / 2, y + DRAGON_SIZE / 2)
  if (!el) return false
  const tag = el.tagName.toLowerCase()
  if (['a', 'button', 'input', 'textarea', 'select'].includes(tag)) return true
  if (el.closest('a') || el.closest('button') || el.closest('nav')) return true
  if (el.onclick || el.getAttribute('role') === 'button') return true
  return false
}

function pickNewWander() {
  if (!dragonHatched) return
  const vw = window.innerWidth, vh = window.innerHeight, margin = 40
  let attempts = 0
  do {
    wanderX = margin + Math.random() * (vw - DRAGON_SIZE - margin * 2)
    wanderY = margin + Math.random() * (vh - DRAGON_SIZE - margin * 2)
    attempts++
  } while (isOverInteractive(wanderX, wanderY) && attempts < 20)
}

function advanceHatch() {
  const egg = dragonFrames.Egg_hatch || []
  if (!egg.length) return
  if (dragonIdx >= egg.length - 1) {
    dragonHatched = true
    dragonIdx = 0
    dragonState = 'Idle'
    if (hatchClickText) hatchClickText.remove()
    pickNewWander()
    targetScore = Math.min(20, Math.max(1, targetScore + 3))
    showBubble('wake')
    window.dispatchEvent(new CustomEvent('dragon:hatched'))
    return
  }
  dragonIdx++
}

function setDragonState(state) {
  if (dragonState === state) return
  if (state === 'Sleep') {
    sleepPhase = 'prasleep'
    sleepPrasleepDone = false
    showBubble('Sleep')
  } else if (dragonState === 'Sleep' && state === 'wake') {
    showBubble('wake')
    state = 'Idle'
  }
  if (!dragonFrames[state] || !dragonFrames[state].length) return
  dragonState = state
  dragonIdx = 0
}

function updatePanel() {
  const stateEl = document.getElementById('dp-state')
  const moodEl = document.getElementById('dp-mood')
  const barEl = document.getElementById('dp-bar')
  const numEl = document.getElementById('dp-num')
  const indBar = document.getElementById('ind-bar')
  const indNum = document.getElementById('ind-num')
  if (!stateEl) return

  if (!dragonHatched) {
    const pct = Math.round((dragonIdx + 1) / (dragonFrames.Egg_hatch || []).length * 100)
    stateEl.textContent = 'EGG'
    moodEl.textContent = 'Hatching ' + pct + '%'
    const c = Math.round(pct * 2.55)
    barEl.style.width = pct + '%'
    barEl.style.background = '#8BC34A'
    numEl.textContent = (dragonIdx + 1) + '/' + (dragonFrames.Egg_hatch || []).length
    if (indBar) { indBar.style.width = pct + '%'; indBar.style.background = '#8BC34A' }
    if (indNum) indNum.textContent = (dragonIdx + 1) + '/' + (dragonFrames.Egg_hatch || []).length
    indicatorEl.style.animation = ''
    indicatorEl.style.borderColor = 'rgba(122,158,126,0.15)'
    return
  }

  const pct = Math.round((interactionScore / 20) * 100)
  stateEl.textContent = dragonState.toUpperCase()
  moodEl.textContent = dragonMood.charAt(0).toUpperCase() + dragonMood.slice(1)

  const moodColors = { excited: '#4CAF50', bored: '#FFC107', sleepy: '#F44336', angry: '#FF0000' }
  const color = moodColors[dragonMood] || '#4CAF50'
  barEl.style.width = pct + '%'
  barEl.style.background = color
  numEl.textContent = Math.round(interactionScore)

  if (indBar) {
    indBar.style.width = pct + '%'
    indBar.style.background = color
  }
  if (indNum) indNum.textContent = Math.round(interactionScore)

  if (interactionScore < 5) {
    indicatorEl.style.animation = 'indPulse 0.8s ease-in-out infinite alternate'
    indicatorEl.style.borderColor = 'rgba(255,68,68,0.4)'
  } else {
    indicatorEl.style.animation = ''
    indicatorEl.style.borderColor = 'rgba(122,158,126,0.15)'
  }
  if (interactionScore < 5 && dragonState !== 'Sleep') {
    showBubble('hungry')
  }
}

function updateMood() {
  if (!dragonHatched) return
  const prev = dragonMood
  if (interactionScore >= 15) dragonMood = 'excited'
  else if (interactionScore >= 5) dragonMood = 'bored'
  else if (interactionScore < 3) dragonMood = 'angry'
  else dragonMood = 'sleepy'
  if (dragonMood !== prev && !STILL_STATES.includes(dragonState)) showBubble(dragonMood)
}

let moodInterval

function dragonLoop(time) {
  const canvas = document.getElementById('dragon-pet-canvas')
  if (!canvas || !dragonEl) { requestAnimationFrame(dragonLoop); return }

  interactionScore += (targetScore - interactionScore) * 0.08
  interactionScore = Math.max(0, Math.min(20, interactionScore))
  updateMood()
  updatePanel()

  if (!moodInterval) { moodInterval = setInterval(updatePanel, 500) }

  if (!dragonHatched) {
    const anim = dragonFrames.Egg_hatch || []
    if (anim.length) {
      const img = anim[Math.min(dragonIdx, anim.length - 1)]
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, DRAGON_SIZE, DRAGON_SIZE)
      if (img) {
        ctx.save()
        ctx.imageSmoothingEnabled = false
        const s = Math.min(64 / img.width, 64 / img.height)
        ctx.drawImage(img, (DRAGON_SIZE - img.width * s) / 2, (DRAGON_SIZE - img.height * s) / 2 + 4, img.width * s, img.height * s)
        ctx.restore()
      }
    }
    dragonEl.style.left = dragonX + 'px'
    dragonEl.style.top = dragonY + 'px'
    if (hatchClickText) {
      hatchClickText.style.left = '50%'
      hatchClickText.style.bottom = 'calc(100vh - ' + (dragonY + 20) + 'px)'
      hatchClickText.style.transform = 'translateX(-50%)'
    }
    requestAnimationFrame(dragonLoop)
    return
  }

  const isStill = STILL_STATES.includes(dragonState)

  if (dragonState !== 'Sleep' && Date.now() - lastMouseMoveForSleep > 15000 && !dragonChasing && !dragonPetting) {
    setDragonState('Sleep')
    wasOverInteractive = false
  }

  let moveX = 0, moveY = 0
  const now = Date.now()

  if (!isStill) {
    if (dragonChasing) {
      const dx = targetX - dragonX
      const dy = targetY - dragonY
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 20) { dragonChasing = false; setDragonState('Laugh') }
      else {
        const speed = Math.min(2, dist * 0.02)
        moveX = (dx / dist) * speed; moveY = (dy / dist) * speed
        if (dragonState !== 'Fly') setDragonState('Fly')
      }
    } else {
      const toCursor = Math.sqrt((targetX - dragonX) ** 2 + (targetY - dragonY) ** 2)
      if (toCursor < 60) { moveX = (dragonX - targetX) * 0.03; moveY = (dragonY - targetY) * 0.03 }

      if (isOverInteractive(dragonX, dragonY)) {
        const angle = Math.random() * Math.PI * 2
        moveX = Math.cos(angle) * 2; moveY = Math.sin(angle) * 2
        if (dragonState === 'Idle') setDragonState('Fly')
      }

      if (Math.abs(moveX) < 0.1 && Math.abs(moveY) < 0.1) {
        if (now - wanderTimer > 3000 + Math.random() * 4000) { pickNewWander(); wanderTimer = now }
        const wdx = wanderX - dragonX
        const wdy = wanderY - dragonY
        const wdist = Math.sqrt(wdx * wdx + wdy * wdy)
        if (wdist > 5) {
          moveX = (wdx / wdist) * 0.4; moveY = (wdy / wdist) * 0.4
          if (dragonState === 'Idle') setDragonState('Fly')
        } else { if (dragonState !== 'Idle') setDragonState('Idle') }
      }
    }
  }

  dragonX += moveX; dragonY += moveY
  if (Math.abs(moveX) > 0.3) dragonFlip = moveX < 0
  dragonX = Math.max(0, Math.min(window.innerWidth - DRAGON_SIZE, dragonX))
  dragonY = Math.max(0, Math.min(window.innerHeight - DRAGON_SIZE, dragonY))

  let anim = dragonFrames[dragonState]
  if (!anim || !anim.length) anim = dragonFrames.Idle || []
  if (!anim.length) { requestAnimationFrame(dragonLoop); return }

  if (dragonState === 'Sleep') {
    if (sleepPhase === 'prasleep') {
      const pra = dragonFrames.prasleep || []
      if (pra.length && dragonIdx >= pra.length - 1) {
        sleepPhase = 'sleep'
        dragonIdx = 0
        anim = (dragonFrames.sleep && dragonFrames.sleep.length) ? dragonFrames.sleep : anim
      } else {
        anim = pra.length ? pra : anim
      }
    } else {
      anim = (dragonFrames.sleep && dragonFrames.sleep.length) ? dragonFrames.sleep : anim
    }
  }

  const fps = DRAGON_FPS[dragonState] || 4
  if (time - dragonLastTime > 1000 / fps) {
    dragonIdx = (dragonIdx + 1) % anim.length
    dragonLastTime = time
  }

  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, DRAGON_SIZE, DRAGON_SIZE)
  const img = anim[dragonIdx]
  if (img) {
    ctx.save()
    ctx.imageSmoothingEnabled = false
    if (dragonFlip) { ctx.translate(DRAGON_SIZE, 0); ctx.scale(-1, 1) }
    const s = Math.min(64 / img.width, 64 / img.height)
    const dw = img.width * s; const dh = img.height * s
    ctx.drawImage(img, (DRAGON_SIZE - dw) / 2, (DRAGON_SIZE - dh) / 2 + 4, dw, dh)
    ctx.restore()
  }
  dragonEl.style.left = dragonX + 'px'
  dragonEl.style.top = dragonY + 'px'
  requestAnimationFrame(dragonLoop)
}

const style = document.createElement('style')
style.textContent = `
  @keyframes indPulse {
    from { background:rgba(10,12,10,0.85); }
    to { background:rgba(50,12,12,0.95); }
  }
`
document.head.appendChild(style)

document.addEventListener('DOMContentLoaded', initDragon)
