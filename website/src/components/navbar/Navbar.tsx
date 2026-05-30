import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useLanguage } from '../../i18n/LanguageContext'
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

  const toggleLang = () => setLang(lang === 'en' ? 'zh-CN' : 'en')

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
            <button className={styles.langBtn} onClick={toggleLang}>
              {lang === 'en' ? '中文' : 'EN'}
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
