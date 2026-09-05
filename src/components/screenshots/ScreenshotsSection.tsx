import { motion } from 'motion/react'
import { useLanguage } from '../../i18n/LanguageContext'
import AppPreview from './AppPreview'
import styles from './ScreenshotsSection.module.css'

export default function ScreenshotsSection() {
  const { t } = useLanguage()

  return (
    <section id="screenshots" className={styles.section}>
      <motion.div
        className={styles.header}
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.5 }}
      >
        <span className={styles.tag}>{t('screenshots.tag')}</span>
        <h2 className={styles.title}>{t('screenshots.title')}</h2>
        <div className={styles.goldBar} />
      </motion.div>

      <motion.div
        className={styles.showcase}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
      >
        <motion.div
          className={styles.frame}
          variants={{
            hidden: { opacity: 0, y: 24 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] as const } },
          }}
        >
          <div className={styles.mockupBar}>
            <div className={styles.dot} />
            <div className={styles.dot} />
            <div className={styles.dot} />
            <span className={styles.mockupTitle}>MicController</span>
          </div>
          <div className={styles.preview}>
            <AppPreview />
          </div>
        </motion.div>
      </motion.div>
    </section>
  )
}
