import { useState } from 'react'
import { motion } from 'motion/react'
import { useLanguage } from '../../i18n/LanguageContext'
import styles from './InstallationSection.module.css'

const codeLines = [
  { text: '# Install dependencies', type: 'comment' },
  { text: 'pip install -r app/requirements.txt', type: 'command' },
  { text: '', type: 'comment' },
  { text: '# Run the application', type: 'comment' },
  { text: 'python app/app.py', type: 'command' },
]

export default function InstallationSection() {
  const { t } = useLanguage()
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const text = codeLines.map((l) => l.text).join('\n')
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const steps = [
    { titleKey: 'installation.step1.title', descKey: 'installation.step1.desc' },
    { titleKey: 'installation.step2.title', descKey: 'installation.step2.desc' },
    { titleKey: 'installation.step3.title', descKey: 'installation.step3.desc' },
  ]

  return (
    <section id="installation" className={styles.section}>
      <motion.div
        className={styles.header}
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.5 }}
      >
        <span className={styles.tag}>{t('installation.tag')}</span>
        <h2 className={styles.title}>{t('installation.title')}</h2>
        <div className={styles.goldBar} />
      </motion.div>

      <div className={styles.content}>
        <motion.div
          className={styles.steps}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          {steps.map((step, i) => (
            <motion.div
              key={i}
              className={styles.step}
              variants={{
                hidden: { opacity: 0, x: -16 },
                visible: { opacity: 1, x: 0, transition: { duration: 0.5, delay: i * 0.15, ease: [0.25, 0.1, 0.25, 1] as const } },
              }}
            >
              <div className={styles.stepNum}>{String(i + 1).padStart(2, '0')}</div>
              <div className={styles.stepContent}>
                <h3 className={styles.stepTitle}>{t(step.titleKey)}</h3>
                <p className={styles.stepDesc}>{t(step.descKey)}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 16 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] as const }}
        >
          <div className={styles.codeBlock}>
            <div className={styles.codeHeader}>
              <span className={styles.codeLabel}>{t('installation.terminal')}</span>
              <button
                className={`${styles.copyBtn} ${copied ? styles.copied : ''}`}
                onClick={handleCopy}
              >
                {copied ? t('installation.copied') : t('installation.copy')}
              </button>
            </div>
            <div className={styles.codeBody}>
              {codeLines.map((line, i) => (
                <code key={i} className={`${styles.codeLine} ${styles[line.type as keyof typeof styles]}`}>
                  {line.text || '\u00A0'}
                </code>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
