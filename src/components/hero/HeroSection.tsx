import { motion } from 'framer-motion'
import { useLanguage } from '../../i18n/LanguageContext'
import styles from './HeroSection.module.css'

const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.3 },
  },
}

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] as const } },
}

export default function HeroSection() {
  const { t } = useLanguage()

  return (
    <section className={styles.hero}>
      <div className={styles.glow} />
      <div className={styles.decorativeLine} />
      <motion.div className={styles.content} variants={stagger} initial="hidden" animate="visible">
        <motion.span className={styles.badgeTag} variants={fadeUp}>
          {t('hero.badge')}
        </motion.span>

        <motion.svg
          className={styles.micIcon}
          variants={fadeUp}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="9" y="2" width="6" height="11" rx="3" ry="3" />
          <path d="M5 10a7 7 0 0 0 14 0" />
          <line x1="12" y1="19" x2="12" y2="22" />
          <line x1="8" y1="22" x2="16" y2="22" />
        </motion.svg>

        <motion.h1 className={styles.title} variants={fadeUp}>
          {t('hero.title1')}
          <span className={styles.titleAccent}>{t('hero.title2')}</span>
        </motion.h1>

        <motion.div className={styles.goldBar} variants={fadeUp} />

        <motion.p className={styles.subtitle} variants={fadeUp}>
          {t('hero.subtitle')}
        </motion.p>

        <motion.div className={styles.actions} variants={fadeUp}>
          <a
            className={styles.btnPrimary}
            href="https://github.com/Eververdants/MicrophoneController/releases"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('hero.download')}
          </a>
          <button
            className={styles.btnSecondary}
            onClick={() => document.querySelector('#features')?.scrollIntoView({ behavior: 'smooth' })}
          >
            {t('hero.learnMore')}
          </button>
        </motion.div>

        <motion.div className={styles.vuMeter} variants={fadeUp}>
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className={styles.vuBar} />
          ))}
        </motion.div>
      </motion.div>
    </section>
  )
}
