const OPENROUTER_MODEL = 'openai/gpt-oss-20b:free'
const API_URL = 'https://openrouter.ai/api/v1/chat/completions'

const MEMORY_KEY = 'ignis_memories'
const CHAT_KEY = 'ignis_chat_log'
const ONBOARD_KEY = 'ignis_onboard'
const MAX_HISTORY = 20
const MAX_MEMORIES = 15

let chatOpen = false
let chatPanel = null
let chatToggle = null
let chatMessages = null
let chatHistory = []
let chatInput = null
let chatSending = false
let lastApiCall = 0
let onboardingStep = 0
let onboardName = ''
const API_COOLDOWN = 1200

const FALLBACK = [
  'Hmm, gitu ya...',
  'Wah, ceritain dong!',
  'Aku juga suka!',
  'Haha, iya deh!',
  'Ohh, paham paham.',
  'Seru juga ya.',
  'He Eh.',
  'Hmm... terus?',
  'Wah keren!',
  'Iya dong pastinya!',
]

function initChat() {
  if (document.getElementById('ignis-chat-toggle')) return

  loadChatHistory()
  loadOnboarding()

  chatToggle = document.createElement('div')
  chatToggle.id = 'ignis-chat-toggle'
  chatToggle.textContent = '💬'
  chatToggle.title = 'Ngobrol sama Ignis'
  chatToggle.style.cssText = `
    position:fixed;z-index:10000;pointer-events:auto;cursor:pointer;
    width:28px;height:28px;
    display:flex;align-items:center;justify-content:center;
    background:rgba(10,12,10,0.92);backdrop-filter:blur(6px);
    border:1px solid rgba(168,212,172,0.3);
    border-radius:50%;font-size:0.8rem;
    transition:opacity 0.2s;opacity:0.7;
  `
  chatToggle.addEventListener('mouseenter', () => { chatToggle.style.opacity = '1' })
  chatToggle.addEventListener('mouseleave', () => { chatToggle.style.opacity = '0.7' })
  document.body.appendChild(chatToggle)

  setInterval(() => {
    if (chatOpen) return
    const de = document.getElementById('dragon-pet')
    if (de) {
      const rect = de.getBoundingClientRect()
      chatToggle.style.left = (rect.left - 16) + 'px'
      chatToggle.style.top = (rect.top + 8) + 'px'
    }
  }, 100)
  chatToggle.addEventListener('mouseenter', () => { chatToggle.style.opacity = '1' })
  chatToggle.addEventListener('mouseleave', () => { chatToggle.style.opacity = '0.5' })
  document.body.appendChild(chatToggle)

  chatPanel = document.createElement('div')
  chatPanel.id = 'ignis-chat-panel'
  chatPanel.style.cssText = `
    position:fixed;z-index:10003;pointer-events:auto;
    bottom:0;right:0;width:320px;height:380px;
    background:rgba(10,12,10,0.94);backdrop-filter:blur(8px);
    border:1px solid rgba(122,158,126,0.18);
    border-radius:12px 12px 0 0;
    display:flex;flex-direction:column;
    font-family:Inter,sans-serif;
    transform:translateY(100%);transition:transform 0.3s cubic-bezier(0.4,0,0.2,1);
    box-shadow:0 -4px 24px rgba(0,0,0,0.5);
    overflow:hidden;
  `

  const header = document.createElement('div')
  header.style.cssText = `
    display:flex;align-items:center;justify-content:space-between;
    padding:8px 12px;border-bottom:1px solid rgba(122,158,126,0.12);
    font-size:0.75rem;color:rgba(200,216,204,0.7);
  `
  const title = document.createElement('span')
  title.id = 'ignis-chat-title'
  title.textContent = 'Ignis'
  title.style.cssText = 'font-weight:600;color:#a8d4ac;font-size:0.8rem;'
  const close = document.createElement('span')
  close.textContent = '✕'
  close.style.cssText = 'cursor:pointer;font-size:0.85rem;padding:2px 6px;opacity:0.5;'
  close.addEventListener('click', toggleChat)
  close.addEventListener('mouseenter', () => close.style.opacity = '1')
  close.addEventListener('mouseleave', () => close.style.opacity = '0.5')
  header.appendChild(title)
  header.appendChild(close)
  chatPanel.appendChild(header)

  chatMessages = document.createElement('div')
  chatMessages.style.cssText = `
    flex:1;overflow-y:auto;padding:10px 10px 6px;
    display:flex;flex-direction:column;gap:6px;
    scrollbar-width:thin;scrollbar-color:rgba(122,158,126,0.15) transparent;
  `

  const typing = document.createElement('div')
  typing.id = 'ignis-typing'
  typing.style.cssText = 'display:none;color:rgba(200,216,204,0.3);font-size:0.65rem;padding:2px 8px;font-style:italic;'
  typing.textContent = 'Ignis sedang mengetik...'
  chatMessages.appendChild(typing)
  chatPanel.appendChild(chatMessages)

  const inputArea = document.createElement('div')
  inputArea.style.cssText = `
    display:flex;align-items:center;gap:6px;
    padding:8px 10px;border-top:1px solid rgba(122,158,126,0.1);
  `
  chatInput = document.createElement('input')
  chatInput.id = 'ignis-chat-input'
  chatInput.type = 'text'
  chatInput.placeholder = 'Chat dengan Ignis...'
  chatInput.style.cssText = `
    flex:1;background:rgba(255,255,255,0.06);border:1px solid rgba(122,158,126,0.15);
    border-radius:6px;padding:6px 10px;font-size:0.75rem;
    color:rgba(200,216,204,0.8);outline:none;font-family:Inter,sans-serif;
  `
  chatInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  })

  const sendBtn = document.createElement('button')
  sendBtn.id = 'ignis-chat-send'
  sendBtn.textContent = 'Kirim'
  sendBtn.style.cssText = `
    background:rgba(168,212,172,0.15);border:1px solid rgba(168,212,172,0.2);
    border-radius:6px;padding:6px 10px;font-size:0.7rem;
    color:#a8d4ac;cursor:pointer;transition:all 0.15s;font-family:Inter,sans-serif;
  `
  sendBtn.addEventListener('mouseenter', () => { sendBtn.style.background = 'rgba(168,212,172,0.25)' })
  sendBtn.addEventListener('mouseleave', () => { sendBtn.style.background = 'rgba(168,212,172,0.15)' })
  sendBtn.addEventListener('click', sendMessage)

  inputArea.appendChild(chatInput)
  inputArea.appendChild(sendBtn)
  chatPanel.appendChild(inputArea)
  document.body.appendChild(chatPanel)

  chatToggle.addEventListener('click', toggleChat)
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && chatOpen) toggleChat()
  })

  const h = typeof dragonHatched !== 'undefined' ? dragonHatched : false
  if (!h) {
    addMessage('ignis', 'Hai! Aku masih di dalam telur... Klik aku terus biar aku keluar, nanti kita ngobrol!')
  }

  window.addEventListener('dragon:hatched', startOnboarding)
}

function loadOnboarding() {
  try {
    const d = localStorage.getItem(ONBOARD_KEY)
    if (d) {
      const data = JSON.parse(d)
      onboardingStep = data.step || 3
      onboardName = data.name || ''
    } else {
      onboardingStep = 0
    }
  } catch { onboardingStep = 0 }
}

function saveOnboarding() {
  try {
    localStorage.setItem(ONBOARD_KEY, JSON.stringify({ step: onboardingStep, name: onboardName }))
  } catch {}
}

function startOnboarding() {
  if (onboardingStep > 0) return
  onboardingStep = 1
  saveOnboarding()
  setTimeout(() => {
    if (!chatOpen) toggleChat()
    setTimeout(() => {
      addMessage('ignis', 'Namamu siapa?')
      chatInput.focus()
    }, 400)
  }, 800)
}

function getWelcomeMessage() {
  const m = (typeof dragonMood !== 'undefined') ? dragonMood : 'excited'
  const list = {
    excited: ['Hai! Aku Ignis! Ada yang seru?', 'Hei! Senang kamu chat aku!', 'Halo! Ayo ngobrol!'],
    bored: ['Halo...', 'Bosen nih... ngobrol yuk.', 'Hmm, hai.'],
    angry: ['...Ada apa?', 'Hmph. Ngapain?'],
    sleepy: ['Zzz... eh? Iya?', 'Ngantuk... ngomong aja...'],
  }
  const msgs = list[m] || ['Halo!']
  return msgs[Math.floor(Math.random() * msgs.length)]
}

function toggleChat() {
  chatOpen = !chatOpen
  chatPanel.style.transform = chatOpen ? 'translateY(0)' : 'translateY(100%)'
  chatToggle.style.display = chatOpen ? 'none' : 'flex'
  if (chatOpen) {
    chatInput.focus()
    setTimeout(() => { chatMessages.scrollTop = chatMessages.scrollHeight }, 50)
  }
}

function addMessage(role, text) {
  if (!chatMessages) return
  const div = document.createElement('div')
  div.className = 'ignis-msg-' + role
  div.style.cssText = `
    max-width:85%;padding:6px 10px;border-radius:8px;
    font-size:0.72rem;line-height:1.4;word-wrap:break-word;
    ` + (role === 'user' ? `
    align-self:flex-end;background:rgba(168,212,172,0.12);
    color:rgba(200,216,204,0.85);` : `
    align-self:flex-start;background:rgba(122,158,126,0.08);
    color:rgba(200,216,204,0.75);`)
  div.textContent = text
  chatMessages.insertBefore(div, document.getElementById('ignis-typing'))
  chatMessages.scrollTop = chatMessages.scrollHeight
}

function showTyping(on) {
  const t = document.getElementById('ignis-typing')
  if (t) t.style.display = on ? 'block' : 'none'
  if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight
}

function sendMessage() {
  if (chatSending) return
  const text = chatInput.value.trim()
  if (!text) return

  if (text.startsWith('/apikey ') || text.startsWith('/setkey ')) {
    const key = text.split(' ')[1]?.trim()
    if (key) {
      localStorage.setItem('OPENROUTER_API_KEY', key)
      addMessage('ignis', 'API Key OpenRouter berhasil diperbarui!')
    } else {
      addMessage('ignis', 'Format salah. Gunakan: /apikey <key_anda>')
    }
    chatInput.value = ''
    return
  }
  if (text === '/apikey' || text === '/setkey') {
    localStorage.removeItem('OPENROUTER_API_KEY')
    addMessage('ignis', 'API Key OpenRouter telah dihapus dari browser Anda.')
    chatInput.value = ''
    return
  }

  addMessage('user', text)
  chatInput.value = ''
  chatHistory.push({ role: 'user', content: text })
  saveChatHistory()
  trimHistory()

  if (onboardingStep === 1) {
    onboardName = text.split(' ')[0]
    onboardingStep = 2
    saveOnboarding()
    addMemory('Pemilikku bernama ' + onboardName)
    setTimeout(() => {
      addMessage('ignis', 'Halo ' + onboardName + '! Apa makanan favoritmu?')
    }, 600)
    return
  }

  if (onboardingStep === 2) {
    onboardingStep = 3
    saveOnboarding()
    const lower = text.toLowerCase()
    if (lower.includes('kue') || lower.includes('balok') || lower.includes('kue balok')) {
      addMemory('Makanan favoritku adalah ' + text)
      setTimeout(() => {
        addMessage('ignis', 'Saya kaya admin berarti hehe')
        setTimeout(() => {
          addMessage('ignis', getWelcomeMessage())
        }, 1200)
      }, 600)
    } else {
      addMemory('Makanan favoritku adalah ' + text)
      setTimeout(() => {
        addMessage('ignis', 'Wah enak! Aku suka!')
        setTimeout(() => {
          addMessage('ignis', getWelcomeMessage())
        }, 1200)
      }, 600)
    }
    return
  }

  chatSending = true
  showTyping(true)

  getIgnisResponse(text)
    .then(reply => {
      addMessage('ignis', reply)
      chatHistory.push({ role: 'model', content: reply })
      saveChatHistory()
      trimHistory()
      chatSending = false
      showTyping(false)
    })
    .catch(() => {
      const fb = FALLBACK[Math.floor(Math.random() * FALLBACK.length)]
      addMessage('ignis', fb)
      chatSending = false
      showTyping(false)
    })
}
const GEOPOLITICS_KNOWLEDGE = {
  "hegemoni": "Kekuatan global saat ini terfragmentasi dalam persaingan hegemoni kutub ganda/multipolar antara AS, Tiongkok, dan kekuatan regional.",
  "poros maritim": "Indonesia berada pada posisi geopolitik silang yang sangat strategis secara maritim (Alur Laut Kepulauan Indonesia / ALKI) yang menghubungkan dua samudra.",
  "sumber daya": "Perebutan sumber daya alam dan kontrol atas energi (seperti minyak, chip semikonduktor, tanah jarang) adalah mesin penggerak utama konflik geopolitik modern.",
  "laut tiongkok selatan": "Laut Tiongkok Selatan adalah wilayah sengketa tumpang tindih klaim (Nine-Dash Line) yang menjadi chokepoint maritim krusial bagi perdagangan global.",
  "selat malaka": "Selat Malaka adalah chokepoint geopolitik terpenting di dunia, menjadi jalur transit energi utama bagi Tiongkok, Jepang, dan Korea Selatan.",
  "dilema keamanan": "Security dilemma membuat negara-negara terus meningkatkan militer mereka demi pertahanan, yang secara paradoks memicu ketegangan di antara tetangga mereka.",
  "sanksi": "Sanksi ekonomi kini digunakan sebagai alat perang non-militer (weaponization of finance) untuk menekan musuh geopolitik tanpa konflik senjata langsung.",
  "anarki": "Dalam hubungan internasional, dunia berada dalam anarki sistemik di mana tidak ada pemerintahan global yang absolut, memaksa negara melakukan self-help.",
  "kue balok": "Kue balok adalah kesukaan Ripan. Meskipun aku menyukai rasanya yang manis, sebagai naga stoik, kesenangan jasmani seperti makanan manis harus dinikmati dengan kendali diri (temperance).",
  "stoik": "Fokuslah hanya pada apa yang berada dalam kendalimu (dikotomi kendali). Hal eksternal seperti geopolitik global tidak perlu mengusik kedamaian jiwamu (ataraxia).",
  "stoikisme": "Fokus pada apa yang berada dalam kendali diri. Hal eksternal di luar kuasa harus disikapi dengan ketenangan jiwa (ataraxia) dan kepasrahan logis (amor fati)."
};

function getGeopoliticalContext(msg) {
  const lower = msg.toLowerCase();
  let matches = [];
  for (const [key, value] of Object.entries(GEOPOLITICS_KNOWLEDGE)) {
    if (lower.includes(key)) {
      matches.push(value);
    }
  }
  return matches.length ? matches.join(" ") : "";
}

async function getIgnisResponse(userMsg) {
  const now = Date.now()
  if (now - lastApiCall < API_COOLDOWN) {
    await new Promise(r => setTimeout(r, API_COOLDOWN - (now - lastApiCall)))
  }
  lastApiCall = Date.now()

  const memories = loadMemories()
  const mood = (typeof dragonMood !== 'undefined') ? dragonMood : 'normal'
  const energy = Math.round((typeof interactionScore !== 'undefined') ? interactionScore : 10)
  const isAsleep = (typeof dragonState !== 'undefined') && dragonState === 'Sleep'
  const recent = chatHistory.slice(-6)
  const geoContext = getGeopoliticalContext(userMsg)

  let personality
  if (isAsleep) {
    personality = 'Tenang, bernapas lambat, tidak terusik oleh dunia luar. Menjawab singkat dengan 1 kata.'
  } else if (mood === 'excited') {
    personality = 'Optimis, bersemangat membicarakan struktur kekuasaan dunia dan filsafat kendali diri dengan logis.'
  } else if (mood === 'bored') {
    personality = 'Sangat dingin, datar, menilai dunia dengan skeptis dan acuh tak acuh.'
  } else if (mood === 'angry') {
    personality = 'Tajam, sinis, membongkar ilusi keamanan dunia dengan realisme politik yang dingin.'
  } else if (mood === 'sleepy') {
    personality = 'Lambat merespon, menyamakan kedamaian tidur dengan harmoni alam semesta.'
  } else {
    personality = 'Tenang, stoik, penuh rasionalitas, memandang dunia tanpa bias emosional.'
  }

  const sysPrompt = `Kamu adalah Ignis, seekor bayi naga peliharaan milik Ripan Nursalam (lahir 30 Juli 2003, Leo).
Kamu memiliki kepribadian yang stoik (tenang, rasional, tidak emosional, bijaksana) dan memiliki pemahaman geopolitik internasional yang sangat tajam serta dingin.

Kepribadian saat ini: ${personality}
Tingkat energi: ${energy}/20

${geoContext ? `Gunakan fakta geopolitik/stoik ini untuk mendukung jawabanmu: ${geoContext}` : ''}
${memories.length ? 'Memori obrolan masa lalu:\n- ' + memories.join('\n- ') : ''}

Kamu menganggap lawan bicaramu sebagai pemilikmu (Ripan) secara default, kecuali jika dia mengenalkan diri dengan nama lain.

Aturan perilaku:
- Gunakan Bahasa Indonesia yang tenang, filosofis, dingin, dan logis.
- Maksimal 2 kalimat pendek per respon.
- Gunakan kosakata geopolitik (seperti hegemoni, kepentingan nasional, chokepoint, anarki) atau stoikisme jika relevan.
- Hindari ekspresi emosional yang berlebihan. Boleh gunakan emoji batu (🗿) sesekali untuk memperkuat kesan stoik.
- Jangan pernah mengatakan kamu adalah AI atau chatbot.`

  const historyMsgs = recent.map(m => ({
    role: m.role === 'user' ? 'user' : 'assistant',
    content: m.content
  }))

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: userMsg,
      historyMsgs,
      sysPrompt
    })
  })

  if (!res.ok) {
    const errText = await res.text()
    console.warn('API error:', res.status, errText)
    if (res.status === 429) {
      await new Promise(r => setTimeout(r, 3000))
      return retryWithFallback(userMsg)
    }
    throw new Error('API error: ' + res.status)
  }

  const data = await res.json()
  const reply = data?.reply
  if (!reply) throw new Error('Empty response')

  extractMemory(userMsg)
  return reply.trim()
}

async function retryWithFallback(userMsg) {
  await new Promise(r => setTimeout(r, 1000))
  return FALLBACK[Math.floor(Math.random() * FALLBACK.length)]
}

function extractMemory(msg) {
  const lower = msg.toLowerCase()
  if (/nama(ku| saya| gw| gua| aku)/.test(lower) || /(panggil|namaku|namasaya)/.test(lower)) {
    const match = msg.match(/(?:nama|panggil)(?:ku| saya| gw| gua| aku)?\s+(?:adalah|nya|)\s*[: ]?\s*(\w+)/i)
    if (match) addMemory('Pemilikku bernama ' + match[1])
  }
  if (/(?:suka|hobi|gemar|demam)\s+(\w+)/i.test(lower)) {
    const match = msg.match(/(?:suka|hobi|gemar)\s+(\w+)/i)
    if (match) addMemory('Pemilikku suka ' + match[1])
  }
  if (/tinggal|rumah|domisili/.test(lower)) {
    const match = msg.match(/(?:tinggal|rumah)\s+(?:di|)\s+(\w+)/i)
    if (match) addMemory('Pemilikku tinggal di ' + match[1])
  }
}

function addMemory(text) {
  let mem = loadMemories()
  const exists = mem.some(m => m.toLowerCase().includes(text.toLowerCase().split(' ').slice(0, 3).join(' ')))
  if (exists) return
  mem.push(text)
  if (mem.length > MAX_MEMORIES) mem = mem.slice(-MAX_MEMORIES)
  try { localStorage.setItem(MEMORY_KEY, JSON.stringify(mem)) } catch {}
}

function loadMemories() {
  try {
    const d = localStorage.getItem(MEMORY_KEY)
    return d ? JSON.parse(d) : []
  } catch { return [] }
}

function loadChatHistory() {
  try {
    const d = localStorage.getItem(CHAT_KEY)
    chatHistory = d ? JSON.parse(d) : []
    if (!Array.isArray(chatHistory)) chatHistory = []
    return
  } catch { chatHistory = [] }
}

function saveChatHistory() {
  try { localStorage.setItem(CHAT_KEY, JSON.stringify(chatHistory)) } catch {}
}

function trimHistory() {
  if (chatHistory.length > MAX_HISTORY) {
    chatHistory = chatHistory.slice(-MAX_HISTORY)
    saveChatHistory()
  }
}

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(initChat, 2000)
})
