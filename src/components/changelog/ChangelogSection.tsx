import { motion } from 'framer-motion'
import { useLanguage } from '../../i18n/LanguageContext'
import styles from './ChangelogSection.module.css'

export default function ChangelogSection() {
  const { t } = useLanguage()

  const entries = [
    {
      versionKey: 'changelog.v3.title',
      dateKey: 'changelog.v3.date',
      itemPrefix: 'changelog.v3.item',
      itemCount: 8,
      isLatest: true,
    },
    {
      versionKey: 'changelog.v2_1.title',
      dateKey: 'changelog.v2_1.date',
      itemPrefix: 'changelog.v2_1.item',
      itemCount: 2,
      isLatest: false,
    },
    {
      versionKey: 'changelog.v2.title',
      dateKey: 'changelog.v2.date',
      itemPrefix: 'changelog.v2.item',
      itemCount: 10,
      isLatest: false,
    },
    {
      versionKey: 'changelog.v1.title',
      dateKey: 'changelog.v1.date',
      itemPrefix: 'changelog.v1.item',
      itemCount: 5,
      isLatest: false,
    },
  ]

  return (
    <section id="changelog" className={styles.section}>
      <motion.div
        className={styles.header}
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.5 }}
      >
        <span className={styles.tag}>{t('changelog.tag')}</span>
        <h2 className={styles.title}>{t('changelog.title')}</h2>
        <div className={styles.goldBar} />
      </motion.div>

      <motion.div
        className={styles.entries}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
      >
        {entries.map((entry, i) => {
          const items = Array.from({ length: entry.itemCount }, (_, j) =>
            t(`${entry.itemPrefix}${j + 1}`)
          )

          return (
            <motion.div
              key={entry.versionKey}
              className={`${styles.entry} ${entry.isLatest ? styles.latest : ''}`}
              variants={{
                hidden: { opacity: 0, y: 16 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay: i * 0.2, ease: [0.25, 0.1, 0.25, 1] as const } },
              }}
            >
              <div className={styles.versionHeader}>
                <h3 className={styles.version}>{t(entry.versionKey)}</h3>
                {entry.isLatest && <span className={styles.badge}>Latest</span>}
              </div>
              {entry.dateKey && <p className={styles.date}>{t(entry.dateKey)}</p>}
              <ul className={styles.list}>
                {items.map((item, j) => (
                  <li key={j} className={styles.listItem}>{item}</li>
                ))}
              </ul>
            </motion.div>
          )
        })}
      </motion.div>
    </section>
  )
}
