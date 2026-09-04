import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { SupportChat } from './SupportChat'

type Panel = 'menu' | 'profile' | 'language' | 'help'

function initials(name: string | null | undefined, email: string | undefined) {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    return name.slice(0, 2).toUpperCase()
  }
  return (email?.slice(0, 2) ?? '?').toUpperCase()
}

export function UserAvatarMenu() {
  const { user, profile, signOut, uploadAvatar, uploadingAvatar, updateProfile, refreshProfile } = useAuth()
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

  const hasName = Boolean(profile?.full_name?.trim())
  const displayName = hasName ? profile!.full_name!.trim() : (user?.email ?? '')
  const showEmailBelow = hasName && Boolean(user?.email)
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

  async function saveProfile(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const { error: err } = await updateProfile({
      full_name: editName,
      phone: editPhone,
    })
    setSaving(false)
    if (err) setError(err)
    else {
      setSuccess(t('menu.profileOk'))
      setPanel('menu')
    }
  }

  function openMenu() {
    setOpen((v) => !v)
    setPanel('menu')
    setError(null)
    setSuccess(null)
    void refreshProfile()
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={openMenu}
        className="h-10 w-10 rounded-full overflow-hidden border-2 border-brand-gold bg-neutral-200 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2 touch-manipulation"
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
          className="fixed inset-0 z-[99] bg-neutral-950/50 md:hidden"
          onClick={() => {
            setOpen(false)
            setPanel('menu')
          }}
        />
      )}

      {open && (
        <div
          className={`fixed inset-x-0 bottom-0 z-[100] max-h-[min(85dvh,640px)] overflow-y-auto rounded-t-3xl border border-brand-gold/30 bg-white shadow-xl pb-[env(safe-area-inset-bottom)] md:absolute md:inset-auto md:right-0 md:top-full md:mt-2 md:max-h-[min(80vh,560px)] md:rounded-2xl md:pb-0 ${
            panel === 'help' ? 'md:w-[320px]' : 'md:w-[288px]'
          }`}
        >
          <div className="md:hidden flex justify-center pt-2 pb-1">
            <span className="h-1 w-10 rounded-full bg-neutral-300" />
          </div>
          <div className="px-4 py-3 bg-neutral-950 text-white border-b border-brand-gold/20">
            <p className="font-bold text-sm truncate text-brand-gold flex items-center gap-2 flex-wrap">
              <span className="truncate">{displayName}</span>
              {(profile?.role === 'instructor' || profile?.role === 'admin') && (
                <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border border-brand-gold/50 text-brand-gold/90 bg-transparent">
                  {profile.role === 'admin' ? 'Admin' : t('badge.instructor')}
                </span>
              )}
            </p>
            {showEmailBelow && (
              <p className="text-xs text-neutral-400 truncate mt-0.5">{user?.email}</p>
            )}
          </div>

          {panel === 'menu' && (
            <nav className="py-1.5">
              <SectionLabel>{t('menu.sectionAccount')}</SectionLabel>
              <MenuBtn icon={<IconUser />} onClick={() => setPanel('profile')}>
                {t('menu.editProfile')}
              </MenuBtn>
              {profile?.role === 'student' && (
                <MenuLink icon={<IconTeach />} to="/tornar-se-instrutor" onClick={() => setOpen(false)}>
                  {t('menu.becomeInstructor')}
                </MenuLink>
              )}
              {(profile?.role === 'instructor' || profile?.role === 'admin') && (
                <MenuLink icon={<IconTeach />} to="/instrutor" onClick={() => setOpen(false)}>
                  {t('nav.teach')}
                </MenuLink>
              )}
              {profile?.role === 'admin' && (
                <MenuLink icon={<IconShield />} to="/admin/moderacao" onClick={() => setOpen(false)}>
                  {t('menu.adminModeration')}
                </MenuLink>
              )}
              <MenuLink icon={<IconLock />} to="/alterar-senha" onClick={() => setOpen(false)}>
                {t('menu.password')}
              </MenuLink>
              <MenuLink icon={<IconSpark />} to="/novidades" onClick={() => setOpen(false)}>
                {t('menu.whatsNew')}
              </MenuLink>
              <MenuLink icon={<IconTeach />} to="/demo-video" onClick={() => setOpen(false)}>
                {t('footer.demoVideo')}
              </MenuLink>

              <Divider />
              <SectionLabel>{t('menu.sectionPrefs')}</SectionLabel>
              <MenuBtn icon={<IconGlobe />} onClick={() => setPanel('language')}>
                {t('menu.language')}
              </MenuBtn>

              <Divider />
              <SectionLabel>{t('menu.sectionSupport')}</SectionLabel>
              <MenuBtn
                icon={<IconHelp />}
                onClick={() => {
                  setHelpSession((n) => n + 1)
                  setPanel('help')
                }}
              >
                {t('menu.help')}
              </MenuBtn>

              <div className="border-t border-neutral-200 my-2" />
              <MenuBtn
                icon={<IconLogout />}
                danger
                onClick={() => {
                  setOpen(false)
                  void signOut()
                  navigate('/', { replace: true })
                }}
              >
                {t('menu.signOut')}
              </MenuBtn>
            </nav>
          )}

          {panel === 'profile' && (
            <SubPanel title={t('menu.editProfile')} backLabel={t('common.back')} onBack={() => setPanel('menu')}>
              <form onSubmit={saveProfile} className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 rounded-full overflow-hidden border-2 border-brand-gold/40 bg-neutral-100 flex items-center justify-center shrink-0">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-sm font-bold text-neutral-700">
                        {initials(editName || profile?.full_name, user?.email)}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      fileRef.current?.click()
                      setSuccess(null)
                    }}
                    disabled={uploadingAvatar}
                    className="btn-secondary !py-2 !text-xs"
                  >
                    {uploadingAvatar ? t('menu.uploading') : t('menu.changePhoto')}
                  </button>
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-600 mb-1">{t('menu.changeName')}</label>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="input-athenas !rounded-xl !py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-600 mb-1">{t('menu.phoneTitle')}</label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="input-athenas !rounded-xl !py-2"
                  />
                </div>
                <button type="submit" disabled={saving} className="btn-primary w-full !py-2">
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
            <p className={`mx-4 mb-3 text-xs ${error ? 'alert-error' : 'alert-brand'}`} role="alert">
              {error ?? success}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-400">
      {children}
    </p>
  )
}

function Divider() {
  return <div className="border-t border-neutral-100 my-1.5" />
}

function MenuBtn({
  children,
  onClick,
  disabled,
  danger,
  icon,
}: {
  children: ReactNode
  onClick: () => void
  disabled?: boolean
  danger?: boolean
  icon?: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-brand-gold-soft/50 disabled:opacity-50 ${
        danger ? 'text-red-600 font-semibold' : 'text-neutral-800'
      }`}
    >
      {icon ? <span className={`shrink-0 ${danger ? 'text-red-500' : 'text-brand-gold'}`}>{icon}</span> : null}
      <span>{children}</span>
    </button>
  )
}

function MenuLink({
  children,
  to,
  onClick,
  icon,
}: {
  children: ReactNode
  to: string
  onClick: () => void
  icon?: ReactNode
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-neutral-800 hover:bg-brand-gold-soft/50"
    >
      {icon ? <span className="shrink-0 text-brand-gold">{icon}</span> : null}
      <span>{children}</span>
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
  children: ReactNode
}) {
  return (
    <div className="p-4">
      <button type="button" onClick={onBack} className="text-xs font-bold text-neutral-500 hover:text-brand-gold mb-3">
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
  children: ReactNode
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full py-2.5 px-3 rounded-full text-sm font-medium border ${
        active
          ? 'border-neutral-900 bg-neutral-950 text-brand-gold'
          : 'border-neutral-200 text-neutral-700 hover:border-brand-gold'
      }`}
    >
      {children}
    </button>
  )
}

function IconUser() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a8.25 8.25 0 0115 0" />
    </svg>
  )
}

function IconLock() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V7.5a4.5 4.5 0 10-9 0v3m-1.5 0h12a1.5 1.5 0 011.5 1.5v7.5a1.5 1.5 0 01-1.5 1.5h-12A1.5 1.5 0 014.5 19.5v-7.5A1.5 1.5 0 016 10.5z" />
    </svg>
  )
}

function IconGlobe() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.6 9h16.8M3.6 15h16.8M12 3a15 15 0 010 18M12 3a15 15 0 000 18" />
    </svg>
  )
}

function IconHelp() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519A3 3 0 0112 7c1.657 0 3 1.12 3 2.5S13.657 12 12 12v1.5M12 17h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function IconLogout() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6A2.25 2.25 0 005.25 5.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l3 3m0 0l-3 3m3-3H5.25" />
    </svg>
  )
}

function IconTeach() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15M12 4.5h7.5V12M9 15l-4.5 4.5H12" />
    </svg>
  )
}

function IconShield() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7.5 3v5.25c0 4.556-3.086 8.606-7.5 9.75-4.414-1.144-7.5-5.194-7.5-9.75V6L12 3z" />
    </svg>
  )
}

function IconSpark() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3v3m0 12v3M3 12h3m12 0h3M6.3 6.3l2.1 2.1m7.2 7.2l2.1 2.1m0-11.4l-2.1 2.1M8.4 15.6l-2.1 2.1M12 8.25a3.75 3.75 0 100 7.5 3.75 3.75 0 000-7.5z"
      />
    </svg>
  )
}
