import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { SupportChat } from './SupportChat'

type Panel = 'menu' | 'name' | 'phone' | 'language' | 'help'

function initials(name: string | null | undefined, email: string | undefined) {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    return name.slice(0, 2).toUpperCase()
  }
  return (email?.slice(0, 2) ?? '?').toUpperCase()
}

export function UserAvatarMenu() {
  const { user, profile, signOut, uploadAvatar, uploadingAvatar, updateProfile } = useAuth()
  const { language, setLanguage, t } = useLanguage()
  const navigate = useNavigate()
  const rootRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const [open, setOpen] = useState(false)
  const [panel, setPanel] = useState<Panel>('menu')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [helpSession, setHelpSession] = useState(0)

  const displayName = profile?.full_name ?? user?.email ?? ''
  const avatarUrl = profile?.avatar_url

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
        setPanel('menu')
      }
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false)
        setPanel('menu')
      }
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])

  useEffect(() => {
    setEditName(profile?.full_name ?? '')
    setEditPhone(profile?.phone ?? '')
  }, [profile?.full_name, profile?.phone])

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError(t('menu.imageOnly'))
      return
    }
    setError(null)
    const { error: err } = await uploadAvatar(file)
    if (err) setError(err)
    else setSuccess(t('menu.photoOk'))
  }

  async function saveName(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const { error: err } = await updateProfile({ full_name: editName })
    setSaving(false)
    if (err) setError(err)
    else {
      setSuccess(t('menu.nameOk'))
      setPanel('menu')
    }
  }

  async function savePhone(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const { error: err } = await updateProfile({ phone: editPhone })
    setSaving(false)
    if (err) setError(err)
    else {
      setSuccess(t('menu.phoneOk'))
      setPanel('menu')
    }
  }

  function openMenu() {
    setOpen((v) => !v)
    setPanel('menu')
    setError(null)
    setSuccess(null)
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={openMenu}
        className="h-12 w-12 rounded-full overflow-hidden border-2 border-neutral-900 bg-neutral-200 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={t('menu.account')}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-sm font-bold text-neutral-800">
            {initials(profile?.full_name, user?.email)}
          </span>
        )}
      </button>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={onFileChange}
      />

      {open && (
        <div
          className={`absolute right-0 top-full mt-2 rounded-2xl border border-neutral-200 bg-white shadow-xl z-[100] overflow-hidden ${
            panel === 'help' ? 'w-[320px]' : 'w-[280px]'
          }`}
        >
          <div className="px-4 py-3 bg-neutral-950 text-white">
            <p className="font-bold text-sm truncate">{displayName}</p>
            <p className="text-xs text-neutral-400 truncate">{user?.email}</p>
          </div>

          {panel === 'menu' && (
            <nav className="py-2">
              <MenuBtn
                onClick={() => {
                  fileRef.current?.click()
                  setSuccess(null)
                }}
                disabled={uploadingAvatar}
              >
                {uploadingAvatar ? t('menu.uploading') : t('menu.changePhoto')}
              </MenuBtn>
              <MenuLink to="/meus-cursos?view=learning" onClick={() => setOpen(false)}>
                {t('nav.myLearning')}
              </MenuLink>
              <MenuLink to="/meus-cursos?view=teaching" onClick={() => setOpen(false)}>
                {t('nav.myLessons')}
              </MenuLink>
              <MenuBtn onClick={() => setPanel('name')}>{t('menu.changeName')}</MenuBtn>
              <MenuBtn onClick={() => setPanel('phone')}>{t('menu.phone')}</MenuBtn>
              <MenuLink
                to="/alterar-senha"
                onClick={() => setOpen(false)}
              >
                {t('menu.password')}
              </MenuLink>
              <MenuBtn onClick={() => setPanel('language')}>{t('menu.language')}</MenuBtn>
              <MenuBtn
                onClick={() => {
                  setHelpSession((n) => n + 1)
                  setPanel('help')
                }}
              >
                {t('menu.help')}
              </MenuBtn>
              <div className="border-t border-neutral-100 my-2" />
              <MenuBtn
                onClick={() => {
                  setOpen(false)
                  void signOut()
                  navigate('/', { replace: true })
                }}
                danger
              >
                {t('menu.signOut')}
              </MenuBtn>
            </nav>
          )}

          {panel === 'name' && (
            <SubPanel title={t('menu.changeName')} backLabel={t('common.back')} onBack={() => setPanel('menu')}>
              <form onSubmit={saveName} className="space-y-3">
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-neutral-900"
                  required
                />
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-2 bg-neutral-950 text-white text-sm font-bold rounded-full disabled:opacity-60"
                >
                  {saving ? '...' : t('common.save')}
                </button>
              </form>
            </SubPanel>
          )}

          {panel === 'phone' && (
            <SubPanel title={t('menu.phoneTitle')} backLabel={t('common.back')} onBack={() => setPanel('menu')}>
              <form onSubmit={savePhone} className="space-y-3">
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-neutral-900"
                />
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-2 bg-neutral-950 text-white text-sm font-bold rounded-full disabled:opacity-60"
                >
                  {saving ? '...' : t('common.save')}
                </button>
              </form>
            </SubPanel>
          )}

          {panel === 'language' && (
            <SubPanel title={t('menu.language')} backLabel={t('common.back')} onBack={() => setPanel('menu')}>
              <div className="space-y-2">
                <LangBtn active={language === 'pt'} onClick={() => setLanguage('pt')}>
                  {t('menu.langPt')}
                </LangBtn>
                <LangBtn active={language === 'en'} onClick={() => setLanguage('en')}>
                  {t('menu.langEn')}
                </LangBtn>
              </div>
            </SubPanel>
          )}

          {panel === 'help' && (
            <SubPanel title={t('menu.helpTitle')} backLabel={t('common.back')} onBack={() => setPanel('menu')}>
              <SupportChat key={helpSession} />
            </SubPanel>
          )}

          {(error || success) && (
            <p
              className={`px-4 pb-3 text-xs ${error ? 'text-red-600' : 'text-green-700'}`}
              role="alert"
            >
              {error ?? success}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function MenuBtn({
  children,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-neutral-50 disabled:opacity-50 ${
        danger ? 'text-red-600 font-semibold' : 'text-neutral-800'
      }`}
    >
      {children}
    </button>
  )
}

function MenuLink({
  children,
  to,
  onClick,
}: {
  children: React.ReactNode
  to: string
  onClick: () => void
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="block w-full text-left px-4 py-2.5 text-sm text-neutral-800 hover:bg-neutral-50"
    >
      {children}
    </Link>
  )
}

function SubPanel({
  title,
  backLabel,
  onBack,
  children,
}: {
  title: string
  backLabel: string
  onBack: () => void
  children: React.ReactNode
}) {
  return (
    <div className="p-4">
      <button
        type="button"
        onClick={onBack}
        className="text-xs font-bold text-neutral-500 hover:text-neutral-900 mb-3"
      >
        ← {backLabel}
      </button>
      <h3 className="text-sm font-bold text-neutral-900 mb-3">{title}</h3>
      {children}
    </div>
  )
}

function LangBtn({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full py-2.5 px-3 rounded-lg text-sm font-medium border ${
        active
          ? 'border-neutral-900 bg-neutral-950 text-white'
          : 'border-neutral-200 text-neutral-700 hover:border-neutral-400'
      }`}
    >
      {children}
    </button>
  )
}
