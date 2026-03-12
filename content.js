if (!window.__lovableInfiniteInjected) {
    window.__lovableInfiniteInjected = true

    const SELECTOR = '#sidebar-panel > div > div:nth-child(2) > div > div.relative.w-full.rounded-t-lg.bg-background.py-2.pb-2 > div.flex.w-full.select-none.flex-nowrap.gap-2.overflow-x-auto.px-3.pb-0\\.5.scrollbar-hide'

    let lastButtons = []

    function extractButtons() {
        const container = document.querySelector(SELECTOR)
        if (!container) return []
        const buttons = container.querySelectorAll('button')
        return Array.from(buttons).map(btn => btn.textContent.trim()).filter(t => t.length > 0)
    }

    function checkButtons() {
        const current = extractButtons()
        const changed = current.length !== lastButtons.length || current.some((t, i) => t !== lastButtons[i])
        if (changed) {
            lastButtons = current
            chrome.runtime.sendMessage({ action: 'lovableSuggestions', buttons: current })
        }
    }

    const observer = new MutationObserver(() => {
        checkButtons()
    })

    observer.observe(document.body, { childList: true, subtree: true })

    setInterval(checkButtons, 2000)

    checkButtons()

    chrome.runtime.onMessage.addListener((msg) => {
        if (msg.action === 'toggleShield') {
            const chatInput = document.querySelector('#chat-input')
            if (!chatInput) return
            const existing = document.querySelector('#lovable-shield-overlay')
            if (msg.active) {
                if (existing) return
                chatInput.style.position = 'relative'
                const overlay = document.createElement('div')
                overlay.id = 'lovable-shield-overlay'
                Object.assign(overlay.style, {
                    position: 'absolute', top: '0', left: '0', width: '100%', height: '100%',
                    background: 'rgba(220, 38, 38, 0.12)', border: '2px solid rgba(239, 68, 68, 0.5)',
                    borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: '9999', backdropFilter: 'blur(3px)', cursor: 'not-allowed'
                })
                const span = document.createElement('span')
                Object.assign(span.style, {
                    color: '#ef4444', fontWeight: '700', fontSize: '14px',
                    textShadow: '0 0 10px rgba(239,68,68,0.3)', letterSpacing: '0.5px'
                })
                span.textContent = msg.text
                overlay.appendChild(span)
                chatInput.appendChild(overlay)
            } else {
                if (existing) existing.remove()
            }
        }

        if (msg.action === 'toggleSidebar') {
            const el = document.querySelector('[data-panel-id="sidebar-panel"]')
            if (el) el.style.display = msg.hide ? 'none' : ''
        }
    })
}
