import { useLanguage } from '../../i18n/LanguageContext'
import styles from './Footer.module.css'

export default function Footer() {
  const { t } = useLanguage()

  const scrollTo = (id: string) => {
    document.querySelector(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  const navItems = [
    { label: t('nav.features'), href: '#features' },
    { label: t('nav.screenshots'), href: '#screenshots' },
    { label: t('nav.techStack'), href: '#tech-stack' },
    { label: t('nav.setup'), href: '#installation' },
    { label: t('nav.updates'), href: '#changelog' },
  ]

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <div className={styles.logo}>
            <div className={styles.logoDot} />
            MICCONTROLLER
          </div>
          <p className={styles.brandDesc}>
            {t('footer.desc')}
          </p>
        </div>

        <div>
          <h4 className={styles.columnTitle}>{t('footer.navTitle')}</h4>
          <ul className={styles.links}>
            {navItems.map((item) => (
              <li key={item.href}>
                <button className={styles.link} onClick={() => scrollTo(item.href)}>{item.label}</button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className={styles.columnTitle}>{t('footer.linkTitle')}</h4>
          <ul className={styles.links}>
            <li>
              <a className={styles.link} href="https://github.com/Eververdants/MicrophoneController" target="_blank" rel="noopener noreferrer">
                GitHub
              </a>
            </li>
            <li>
              <a className={styles.link} href="https://github.com/Eververdants/MicrophoneController/releases" target="_blank" rel="noopener noreferrer">
                Releases
              </a>
            </li>
            <li>
              <a className={styles.link} href="https://github.com/Eververdants/MicrophoneController/blob/main/LICENSE" target="_blank" rel="noopener noreferrer">
                MIT License
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className={styles.bottom}>
        <span className={styles.copyright}>{t('footer.copyright', { year: new Date().getFullYear() })}</span>
        <span className={styles.madeBy}>
          {t('footer.designBy', { author: 'Eververdants' })}
        </span>
      </div>
    </footer>
  )
}
