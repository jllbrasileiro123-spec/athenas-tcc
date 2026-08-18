import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import { isIosDevice, isStandaloneDisplay } from '../lib/pwa'

const DISMISS_KEY = 'athenas_pwa_dismissed'
const INSTALL_EVENT = 'athenas:beforeinstallprompt'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent
    'athenas:beforeinstallprompt': CustomEvent<BeforeInstallPromptEvent>
  }
}

let deferredInstall: BeforeInstallPromptEvent | null = null

export function captureInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferredInstall = event as BeforeInstallPromptEvent
    window.dispatchEvent(new CustomEvent(INSTALL_EVENT, { detail: deferredInstall }))
  })
}

const PUBLIC_PATHS = new Set(['/', '/login', '/cadastro', '/esqueci-senha', '/redefinir-senha', '/auth/callback'])

export function InstallAppBanner() {
  const { t } = useLanguage()
  const location = useLocation()
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(deferredInstall)
  const [visible, setVisible] = useState(false)
  const [ios, setIos] = useState(false)
  const aboveTabBar = !PUBLIC_PATHS.has(location.pathname)

  useEffect(() => {
    if (isStandaloneDisplay()) return
    if (localStorage.getItem(DISMISS_KEY) === '1') return

    const isiOS = isIosDevice()
    setIos(isiOS)
    setVisible(isiOS || Boolean(deferredInstall))

    function onPrompt(event: CustomEvent<BeforeInstallPromptEvent>) {
      setPromptEvent(event.detail)
      setVisible(true)
    }
    function onInstalled() {
      setVisible(false)
    }
    window.addEventListener(INSTALL_EVENT, onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener(INSTALL_EVENT, onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (!visible) return null

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1')
    setVisible(false)
  }

  async function install() {
    if (!promptEvent) return
    await promptEvent.prompt()
    const choice = await promptEvent.userChoice
    if (choice.outcome === 'accepted') setVisible(false)
  }

  return (
    <div
      className={`fixed inset-x-0 z-[70] px-3 pointer-events-none md:bottom-4 ${
        aboveTabBar
          ? 'bottom-[calc(3.5rem+env(safe-area-inset-bottom)+0.5rem)]'
          : 'bottom-[max(1rem,env(safe-area-inset-bottom))]'
      }`}
    >
      <div className="pointer-events-auto mx-auto max-w-lg rounded-2xl border border-brand-gold/30 bg-neutral-950 text-white shadow-xl p-4">
        <p className="text-sm font-bold text-brand-gold">{t('pwa.installTitle')}</p>
        <p className="text-xs text-neutral-300 mt-1 leading-relaxed">
          {ios && !promptEvent ? t('pwa.iosHint') : t('pwa.installBody')}
        </p>
        <div className="mt-3 flex items-center gap-2">
          {promptEvent && (
            <button type="button" onClick={() => void install()} className="btn-primary !py-2 !px-4 !text-xs">
              {t('pwa.installCta')}
            </button>
          )}
          <button
            type="button"
            onClick={dismiss}
            className="text-xs font-semibold text-neutral-400 hover:text-brand-gold px-2 py-2"
          >
            {t('pwa.dismiss')}
          </button>
        </div>
      </div>
    </div>
  )
}
