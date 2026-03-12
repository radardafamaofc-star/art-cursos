chrome.sidePanel.setPanelBehavior({
    openPanelOnActionClick: true
}).catch(error => console.error(error))

chrome.webRequest.onBeforeSendHeaders.addListener(details => {
    const authHeader = details.requestHeaders.find(header => header.name.toLowerCase() === 'authorization')
    if (authHeader && authHeader.value) {
        const token = authHeader.value.replace('Bearer ', '').trim()
        if (token.length > 20) {
            chrome.storage.local.set({ lovable_token: token })
        }
    }
}, {
    urls: ['https://api.lovable.dev/*']
}, ['requestHeaders'])

function extractProjectFromUrl(url) {
    if (!url || !url.includes('lovable.dev/projects/')) return null
    const match = url.match(/projects\/([a-zA-Z0-9-]+)/)
    return match && match[1] ? match[1] : null
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    const url = changeInfo.url || (tab && tab.url)
    const pid = extractProjectFromUrl(url)
    if (pid) {
        const name = (tab?.title || '').replace(' | Lovable', '').replace(' - Lovable', '').trim() || pid.substring(0, 8)
        chrome.storage.local.set({ lastProjectId: pid, projectName: name })
    }
})

chrome.tabs.onActivated.addListener((activeInfo) => {
    chrome.tabs.get(activeInfo.tabId, (tab) => {
        if (chrome.runtime.lastError) return
        const pid = extractProjectFromUrl(tab?.url)
        if (pid) {
            const name = (tab.title || '').replace(' | Lovable', '').replace(' - Lovable', '').trim() || pid.substring(0, 8)
            chrome.storage.local.set({ lastProjectId: pid, projectName: name })
        }
    })
})

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'ping') {
        sendResponse('pong')
        return
    }
    if (message.action === 'getProjectFromTabs') {
        chrome.tabs.query({ url: 'https://lovable.dev/*' }, tabs => {
            for (const tab of tabs) {
                if (!tab.url) continue
                const match = tab.url.match(/projects\/([a-zA-Z0-9-]+)/)
                if (match && match[1]) {
                    const name = (tab.title || '').replace(' | Lovable', '').replace(' - Lovable', '').trim() || match[1].substring(0, 8)
                    sendResponse({ projectId: match[1], projectName: name })
                    return
                }
            }
            sendResponse({ projectId: null })
        })
        return true
    }
    if (message.action === 'lovableSuggestions') {
        return
    }
})

