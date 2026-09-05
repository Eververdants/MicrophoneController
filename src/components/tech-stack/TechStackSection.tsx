import { motion } from 'framer-motion'
import { useLanguage } from '../../i18n/LanguageContext'
import styles from './TechStackSection.module.css'

const svgProps = {
  width: 28,
  height: 28,
  viewBox: '0 0 24 24',
  fill: 'none' as const,
  stroke: 'currentColor' as const,
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

const techs = [
  {
    name: 'Python',
    icon: (
      <svg {...svgProps}>
        <path d="M12 2C8.13 2 5 5.13 5 9v6c0 3.87 3.13 7 7 7s7-3.13 7-7V9c0-3.87-3.13-7-7-7z" />
        <circle cx="9" cy="12" r="1" fill="currentColor" stroke="none" />
        <circle cx="15" cy="12" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    name: 'pywebview',
    icon: (
      <svg {...svgProps}>
        <rect x="2" y="4" width="20" height="14" rx="2" ry="2" />
        <circle cx="8" cy="8" r="1" fill="currentColor" stroke="none" />
        <circle cx="12" cy="8" r="1" fill="currentColor" stroke="none" />
        <circle cx="16" cy="8" r="1" fill="currentColor" stroke="none" />
        <line x1="4" y1="18" x2="20" y2="18" />
        <path d="M8 18v2" />
        <path d="M16 18v2" />
        <path d="M10 20h4" />
      </svg>
    ),
  },
  {
    name: 'PyCaw',
    icon: (
      <svg {...svgProps}>
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      </svg>
    ),
  },
  {
    name: 'keyboard',
    icon: (
      <svg {...svgProps}>
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <line x1="6" y1="8" x2="6" y2="8.01" />
        <line x1="10" y1="8" x2="10" y2="8.01" />
        <line x1="14" y1="8" x2="14" y2="8.01" />
        <line x1="18" y1="8" x2="18" y2="8.01" />
        <line x1="6" y1="12" x2="6" y2="12.01" />
        <line x1="10" y1="12" x2="10" y2="12.01" />
        <line x1="14" y1="12" x2="14" y2="12.01" />
        <line x1="18" y1="12" x2="18" y2="12.01" />
        <line x1="8" y1="16" x2="16" y2="16" />
      </svg>
    ),
  },
  {
    name: 'comtypes',
    icon: (
      <svg {...svgProps}>
        <path d="M4 4h6v16H4z" />
        <path d="M14 8h6v12h-6z" />
        <circle cx="7" cy="20" r="2" />
        <circle cx="17" cy="20" r="2" />
        <line x1="7" y1="20" x2="7" y2="16" />
        <line x1="17" y1="20" x2="17" y2="16" />
      </svg>
    ),
  },
  {
    name: 'PyInstaller',
    icon: (
      <svg {...svgProps}>
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.29 7 12 12 20.71 7" />
        <line x1="12" y1="22" x2="12" y2="12" />
      </svg>
    ),
  },
  {
    name: 'Win Core Audio',
    icon: (
      <svg {...svgProps}>
        <path d="M12 2a3 3 0 0 0-3 3v9a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="22" />
      </svg>
    ),
  },
  {
    name: 'Pystray',
    icon: (
      <svg {...svgProps}>
        <rect x="2" y="2" width="20" height="14" rx="2" />
        <line x1="8" y1="16" x2="16" y2="16" />
        <line x1="12" y1="14" x2="12" y2="20" />
        <line x1="8" y1="20" x2="16" y2="20" />
        <circle cx="12" cy="7" r="2" fill="currentColor" stroke="none" />
        <rect x="7" y="10" width="10" height="1" rx="0.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
]

const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.15 },
  },
}

const item = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const } },
}

export default function TechStackSection() {
  const { t } = useLanguage()

  return (
    <section id="tech-stack" className={styles.section}>
      <motion.div
        className={styles.header}
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.5 }}
      >
        <span className={styles.tag}>{t('techStack.tag')}</span>
        <h2 className={styles.title}>{t('techStack.title')}</h2>
        <div className={styles.goldBar} />
      </motion.div>

      <motion.div
        className={styles.grid}
        variants={container}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
      >
        {techs.map((tech) => (
          <motion.div key={tech.name} className={styles.badge} variants={item}>
            <span className={styles.badgeIcon}>{tech.icon}</span>
            <span className={styles.badgeName}>{tech.name}</span>
          </motion.div>
        ))}
      </motion.div>
    </section>
  )
}
