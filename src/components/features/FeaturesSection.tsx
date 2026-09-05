import { motion } from 'motion/react'
import { useLanguage } from '../../i18n/LanguageContext'
import styles from './FeaturesSection.module.css'

const iconProps = {
  viewBox: '0 0 24 24',
  fill: 'none' as const,
  stroke: 'currentColor' as const,
  strokeWidth: '1.5' as const,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

const features = [
  {
    titleKey: 'features.toggle.title',
    descKey: 'features.toggle.desc',
    icon: (
      <svg {...iconProps} className={styles.icon}>
        <rect x="9" y="2" width="6" height="11" rx="3" ry="3" />
        <path d="M5 10a7 7 0 0 0 14 0" />
        <line x1="12" y1="19" x2="12" y2="22" />
      </svg>
    ),
  },
  {
    titleKey: 'features.hotkey.title',
    descKey: 'features.hotkey.desc',
    icon: (
      <svg {...iconProps} className={styles.icon}>
        <rect x="2" y="4" width="20" height="16" rx="2" ry="2" />
        <line x1="6" y1="8" x2="10" y2="12" />
        <line x1="10" y1="8" x2="6" y2="12" />
        <line x1="14" y1="8" x2="18" y2="12" />
        <line x1="18" y1="8" x2="14" y2="12" />
      </svg>
    ),
  },
  {
    titleKey: 'features.volume.title',
    descKey: 'features.volume.desc',
    icon: (
      <svg {...iconProps} className={styles.icon}>
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      </svg>
    ),
  },
  {
    titleKey: 'features.device.title',
    descKey: 'features.device.desc',
    icon: (
      <svg {...iconProps} className={styles.icon}>
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      </svg>
    ),
  },
  {
    titleKey: 'features.tray.title',
    descKey: 'features.tray.desc',
    icon: (
      <svg {...iconProps} className={styles.icon}>
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
  },
  {
    titleKey: 'features.bilingual.title',
    descKey: 'features.bilingual.desc',
    icon: (
      <svg {...iconProps} className={styles.icon}>
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
  },
]

const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.15 },
  },
}

const cardItem = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const } },
}

export default function FeaturesSection() {
  const { t } = useLanguage()

  return (
    <section id="features" className={styles.section}>
      <motion.div
        className={styles.header}
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.5 }}
      >
        <span className={styles.tag}>{t('features.tag')}</span>
        <h2 className={styles.title}>{t('features.title')}</h2>
        <div className={styles.goldBar} />
      </motion.div>

      <motion.div
        className={styles.grid}
        variants={container}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
      >
        {features.map((f, i) => (
          <motion.div key={i} className={styles.card} variants={cardItem}>
            <span className={styles.cardLabel}>0{i + 1}</span>
            {f.icon}
            <h3 className={styles.cardTitle}>{t(f.titleKey)}</h3>
            <p className={styles.cardDesc}>{t(f.descKey)}</p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  )
}
