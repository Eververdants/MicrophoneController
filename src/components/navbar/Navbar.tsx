import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { useLanguage } from '../../i18n/LanguageContext'
import { toggleTheme } from '../../styles/initTheme'
import styles from './Navbar.module.css'

const navKeyMap: Record<string, string> = {
  'Features': 'nav.features',
  'Screenshots': 'nav.screenshots',
  'Tech Stack': 'nav.techStack',
  'Setup': 'nav.setup',
  'Updates': 'nav.updates',
}

export default function Navbar() {
  const { lang, setLang, t } = useLanguage()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollTo = (href: string) => {
    document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleToggleLang = () => setLang(lang === 'en' ? 'zh-CN' : 'en')

  return (
    <motion.nav
      className={`${styles.navbar} ${scrolled ? styles.scrolled : ''}`}
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <div className={styles.inner}>
        <div className={styles.logo}>
          <div className={styles.logoDot} />
          MICCONTROLLER
        </div>
        <ul className={styles.links}>
          {Object.entries(navKeyMap).map(([label, key]) => (
            <li key={key}>
              <button className={styles.link} onClick={() => scrollTo(`#${label.toLowerCase().replace(/\s+/g, '-')}`)}>
                {t(key)}
              </button>
            </li>
          ))}
          <li>
            <button className={styles.langBtn} onClick={handleToggleLang}>
              {lang === 'en' ? '中文' : 'EN'}
            </button>
          </li>
          <li>
            <button
              className={styles.themeBtn}
              onClick={() => toggleTheme()}
              aria-label="toggle theme"
            >
              <ThemeIcon />
            </button>
          </li>
        </ul>
        <a
          href="https://github.com/Eververdants/MicrophoneController/releases"
          target="_blank"
          rel="noopener noreferrer"
        >
          <button className={styles.downloadBtn}>{t('nav.download')}</button>
        </a>
      </div>
    </motion.nav>
  )
}

function ThemeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  )
}
