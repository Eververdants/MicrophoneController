import { useLanguage } from '../../i18n/LanguageContext'
import styles from './AppPreview.module.css'

// Static replica of the v1.0.0 app window: title bar, concentric mute core
// with the live level ring, vertical volume slider, status pills, device row
// and the settings entry. Colours are the app's own dark palette — a snapshot
// of the real product, so it does not follow the site theme.
const labels: Record<string, Record<string, string>> = {
  title: { en: 'MicrophoneController', 'zh-CN': 'MicrophoneController' },
  live: { en: 'on air', 'zh-CN': '正在收音' },
  muted: { en: 'muted', 'zh-CN': '已静音' },
  inUse: { en: 'Discord · in use', 'zh-CN': 'Discord · 使用中' },
  device: { en: 'device', 'zh-CN': '设备' },
  deviceName: {
    en: 'Microphone (2- High Definition Audio Device)',
    'zh-CN': '麦克风 (2- High Definition Audio Device)',
  },
  pinned: { en: 'pinned to this endpoint', 'zh-CN': '已固定到该设备' },
  setAsDefault: { en: 'set as default', 'zh-CN': '设为默认' },
  settings: { en: 'Settings', 'zh-CN': '设置' },
}

function _(key: string, lang: string): string {
  return labels[key]?.[lang] ?? labels[key]?.en ?? key
}

// Level ring geometry mirrors the app: r=86 of a 200 viewBox, 38% swept.
const R = 86
const C = 2 * Math.PI * R

export default function AppPreview() {
  const { lang } = useLanguage()

  return (
    <div className={styles.wrapper}>
      <div className={styles.app}>
        <div className={styles.titleBar}>
          <span className={styles.tbIcon} />
          <span className={styles.tbTitle}>{_('title', lang)}</span>
          <span className={styles.tbTools}>
            <span className={styles.tbLang}>中文</span>
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
            </svg>
          </span>
          <span className={styles.winBtns}>
            <span className={styles.winBtn} />
            <span className={styles.winBtn} />
            <span className={`${styles.winBtn} ${styles.winClose}`} />
          </span>
        </div>

        <div className={styles.body}>
          <div className={styles.stageRow}>
            <div className={styles.core}>
              <span className={styles.ringOuter} />
              <span className={styles.ringMid} />
              <svg viewBox="0 0 200 200" className={styles.levelRing} aria-hidden>
                <g transform="rotate(-90 100 100)">
                  <circle cx="100" cy="100" r={R} fill="none" stroke="var(--mc-border)" strokeWidth="3" />
                  <circle
                    cx="100"
                    cy="100"
                    r={R}
                    fill="none"
                    stroke="var(--mc-success)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={C}
                    strokeDashoffset={C * 0.62}
                  />
                </g>
              </svg>
              <span className={styles.coreInner}>
                <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="var(--mc-fg)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="3" width="6" height="11" rx="3" />
                  <path d="M5 11a7 7 0 0 0 14 0" />
                  <path d="M12 18v3" />
                </svg>
              </span>
            </div>

            <div className={styles.sliderCol}>
              <div className={styles.track}>
                <div className={styles.fill} />
                <div className={styles.thumb} />
              </div>
              <span className={styles.readout}>70</span>
              <span className={styles.readoutDb}>-6.0 dB</span>
            </div>
          </div>

          <div className={styles.pills}>
            <span className={`${styles.pill} ${styles.pillLive}`}>
              <span className={styles.dot} />
              {_('live', lang)}
            </span>
            <span className={`${styles.pill} ${styles.pillUse}`}>{_('inUse', lang)}</span>
          </div>

          <div className={styles.deviceRow}>
            <span className={styles.label}>{_('device', lang)}</span>
            <div className={styles.selectBox}>
              <span className={styles.selectText}>{_('deviceName', lang)}</span>
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
            <div className={styles.noteRow}>
              <span className={styles.note}>{_('pinned', lang)}</span>
              <span className={styles.setDefault}>{_('setAsDefault', lang)}</span>
            </div>
          </div>

          <div className={styles.settingsRow}>
            <span className={styles.settingsLeft}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="21" x2="4" y2="14" />
                <line x1="4" y1="10" x2="4" y2="3" />
                <line x1="12" y1="21" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12" y2="3" />
                <line x1="20" y1="21" x2="20" y2="16" />
                <line x1="20" y1="12" x2="20" y2="3" />
                <line x1="1" y1="14" x2="7" y2="14" />
                <line x1="9" y1="8" x2="15" y2="8" />
                <line x1="17" y1="16" x2="23" y2="16" />
              </svg>
              {_('settings', lang)}
            </span>
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="var(--mc-muted)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}
