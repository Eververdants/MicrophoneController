import { motion } from 'motion/react'
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
    name: 'Tauri v2',
    icon: (
      <svg {...svgProps}>
        <rect x="3" y="3" width="18" height="18" rx="4" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    name: 'Rust',
    icon: (
      <svg {...svgProps}>
        <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" />
        <path d="M12 6v12M6 12h12" />
        <path d="M8 8l8 8M16 8l-8 8" />
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
    name: 'React 19',
    icon: (
      <svg {...svgProps}>
        <circle cx="12" cy="12" r="2" />
        <ellipse cx="12" cy="12" rx="10" ry="4" />
        <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" />
        <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)" />
      </svg>
    ),
  },
  {
    name: 'Tailwind v4',
    icon: (
      <svg {...svgProps}>
        <path d="M6 9c2-4 6-4 8 0s4 4 6 0" />
        <path d="M6 15c2-4 6-4 8 0s4 4 6 0" />
      </svg>
    ),
  },
  {
    name: 'Motion',
    icon: (
      <svg {...svgProps}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3v9l6 3" />
      </svg>
    ),
  },
  {
    name: 'TypeScript',
    icon: (
      <svg {...svgProps}>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M10 8v8M14 8v8M10 12h4" />
      </svg>
    ),
  },
  {
    name: 'Vite',
    icon: (
      <svg {...svgProps}>
        <polygon points="12 2 22 22 2 22" />
        <polygon points="12 10 17 22 7 22" fill="currentColor" stroke="none" />
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
