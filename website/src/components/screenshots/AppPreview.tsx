import { useLanguage } from '../../i18n/LanguageContext'
import styles from './AppPreview.module.css'

const labels: Record<string, Record<string, string>> = {
  input: { en: 'input', 'zh-CN': '输入' },
  ch1: { en: 'ch 1', 'zh-CN': '通道 1' },
  mute: { en: 'mute', 'zh-CN': '静音' },
  on: { en: 'on', 'zh-CN': '开' },
  onStatus: { en: 'on', 'zh-CN': '开启' },
  level: { en: 'level', 'zh-CN': '音量' },
  vu: { en: 'vu', 'zh-CN': '电平' },
  zeroMute: { en: 'zero=mute', 'zh-CN': '归零=静音' },
  norm: { en: 'norm', 'zh-CN': '归一' },
  patch: { en: 'patch', 'zh-CN': '跳线' },
  src: { en: 'src', 'zh-CN': '源' },
  key: { en: 'key', 'zh-CN': '快捷键' },
  bind: { en: 'bind', 'zh-CN': '绑定' },
  set: { en: 'set', 'zh-CN': '设置键' },
  config: { en: 'config', 'zh-CN': '配置' },
  sys: { en: 'sys', 'zh-CN': '系统' },
  startHidden: { en: 'start hidden', 'zh-CN': '启动隐藏' },
  hideOnClose: { en: 'hide on close', 'zh-CN': '关闭隐藏' },
  lang: { en: 'lang', 'zh-CN': '语言' },
  log: { en: 'log', 'zh-CN': '日志' },
  monitor: { en: 'monitor', 'zh-CN': '监控' },
  logAppStarted: { en: 'App started', 'zh-CN': '应用已启动' },
  logDevice: { en: 'Device: Microphone Array', 'zh-CN': '设备：麦克风阵列' },
  logHotkey: { en: 'Hotkey F8 registered', 'zh-CN': '快捷键 F8 已注册' },
  logMuted: { en: 'Muted by hotkey', 'zh-CN': '已通过快捷键静音' },
  logUnmuted: { en: 'Unmuted by app', 'zh-CN': '已通过应用开启' },
  logVolume: { en: 'Volume set to 70%', 'zh-CN': '音量已设为 70%' },
  logDeviceChanged: { en: 'Device changed to High Definition Audio Device', 'zh-CN': '设备已切换至高清晰音频设备' },
  tip: { en: 'hotkey active in background', 'zh-CN': '快捷键后台生效' },
  brand: { en: 'mic·controller · mk-1', 'zh-CN': 'mic·controller · mk-1' },
}

function _(key: string, lang: string): string {
  return labels[key]?.[lang] ?? labels[key]?.en ?? key
}

export default function AppPreview() {
  const { lang } = useLanguage()

  return (
    <div className={styles.wrapper}>
      <div className={styles.app}>
        <div className={styles.rackRail} />

        <div className={styles.module}>
          <div className={styles.moduleLabel}>
            <span className={styles.labelText}>{_('input', lang)}</span>
            <span className={styles.labelDivider} />
            <span className={styles.labelChannel}>{_('ch1', lang)}</span>
          </div>
          <div className={styles.statusBody}>
            <div className={styles.statusVisual}>
              <div className={styles.vuStrip}>
                {[20,30,40,50,65,80,90,100].map((h, i) => (
                  <div
                    key={i}
                    className={`${styles.vuSegment} ${i < 5 ? styles.vuActive : ''} ${i === 7 ? styles.vuClip : ''}`}
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
              <div className={styles.statusMeta}>
                <div className={`${styles.pilotLed} ${styles.pilotOn}`} />
                <div className={styles.statusLabelGroup}>
                  <span className={styles.statusLabel}>{_('mute', lang)}</span>
                  <span className={styles.statusValue}>{_('onStatus', lang)}</span>
                </div>
              </div>
            </div>
            <div className={styles.statusControls}>
              <button className={`${styles.switchToggle} ${styles.switchActive}`} type="button" tabIndex={-1}>
                <span className={styles.switchTrack}>
                  <span className={styles.switchThumb} />
                </span>
                <span className={styles.switchLabel}>{_('on', lang)}</span>
              </button>
              <button className={`${styles.btnRack} ${styles.btnRackMute}`} type="button" tabIndex={-1}>
                <span className={styles.btnRackInner}>{_('mute', lang)}</span>
              </button>
              <button className={`${styles.btnRack} ${styles.btnRackUnmute}`} type="button" tabIndex={-1}>
                <span className={styles.btnRackInner}>{_('on', lang)}</span>
              </button>
            </div>
          </div>
        </div>

        <div className={styles.module}>
          <div className={styles.moduleLabel}>
            <span className={styles.labelText}>{_('level', lang)}</span>
            <span className={styles.labelDivider} />
            <span className={styles.labelChannel}>{_('vu', lang)}</span>
          </div>
          <div className={styles.volumeBody}>
            <div className={styles.volumeHeader}>
              <span className={styles.volumeReading}>-6 dB</span>
              <div className={styles.volumeScale}>
                <span>-∞</span><span>-12</span><span>-6</span><span>-2</span><span>0</span>
              </div>
            </div>
            <div className={styles.volumeTrackWrap}>
              <div className={styles.volumeTrackBg} />
              <input type="range" className={styles.volumeSlider} min="0" max="100" value="70" readOnly tabIndex={-1} />
              <div className={styles.volumeMarkers}>
                <span /><span /><span /><span /><span />
              </div>
            </div>
            <div className={styles.volumeFooter}>
              <label className={styles.tieLabel}>
                <input type="checkbox" defaultChecked tabIndex={-1} />
                <span className={styles.tieSwitch} />
                <span className={styles.tieText}>{_('zeroMute', lang)}</span>
              </label>
              <label className={`${styles.tieLabel} ${styles.normToggle}`}>
                <input type="checkbox" tabIndex={-1} />
                <span className={`${styles.tieSwitch} ${styles.tieSwitchNorm}`} />
                <span className={styles.tieText}>{_('norm', lang)}</span>
              </label>
            </div>
          </div>
        </div>

        <div className={styles.patchRow}>
          <div className={`${styles.module} ${styles.modulePatch}`}>
            <div className={styles.moduleLabel}>
              <span className={styles.labelText}>{_('patch', lang)}</span>
              <span className={styles.labelDivider} />
              <span className={styles.labelChannel}>{_('src', lang)}</span>
            </div>
            <div className={styles.patchBody}>
              <select className={styles.patchSelect} tabIndex={-1}>
                <option>Microphone (2- High Definition Audio Device)</option>
              </select>
              <button className={styles.btnPatch} type="button" tabIndex={-1} title="scan">
                <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M2 8a6 6 0 0 1 10.47-4M14 8a6 6 0 0 1-10.47 4" />
                  <path d="M13 1.5V5h-3.5M3 14.5V11h3.5" />
                </svg>
              </button>
            </div>
          </div>

          <div className={`${styles.module} ${styles.modulePatch}`}>
            <div className={styles.moduleLabel}>
              <span className={styles.labelText}>{_('key', lang)}</span>
              <span className={styles.labelDivider} />
              <span className={styles.labelChannel}>{_('bind', lang)}</span>
            </div>
            <div className={styles.patchBody}>
              <input type="text" className={styles.keyInput} value="F8" readOnly tabIndex={-1} />
              <button className={`${styles.btnPatch} ${styles.btnPatchApply}`} type="button" tabIndex={-1}>
                <span>{_('set', lang)}</span>
              </button>
            </div>
          </div>
        </div>

        <div className={styles.module}>
          <div className={styles.moduleLabel}>
            <span className={styles.labelText}>{_('config', lang)}</span>
            <span className={styles.labelDivider} />
            <span className={styles.labelChannel}>{_('sys', lang)}</span>
          </div>
          <div className={styles.settingsBody}>
            <div className={styles.settingsRow}>
              <label className={styles.tieLabel}>
                <input type="checkbox" tabIndex={-1} />
                <span className={styles.tieSwitch} />
                <span className={styles.tieText}>{_('startHidden', lang)}</span>
              </label>
              <label className={styles.tieLabel}>
                <input type="checkbox" defaultChecked tabIndex={-1} />
                <span className={styles.tieSwitch} />
                <span className={styles.tieText}>{_('hideOnClose', lang)}</span>
              </label>
              <div className={styles.langGroup}>
                <span className={styles.langIndicator}>{_('lang', lang)}</span>
                <select className={styles.langSelect} tabIndex={-1}>
                  <option value="zh-CN">CN</option>
                  <option value="en">EN</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className={`${styles.module} ${styles.moduleLog}`}>
          <div className={styles.moduleLabel}>
            <span className={styles.labelText}>{_('log', lang)}</span>
            <span className={styles.labelDivider} />
            <span className={styles.labelChannel}>{_('monitor', lang)}</span>
          </div>
          <div className={styles.logBody}>
            <div className={styles.logScroll}>
              <div className={styles.historyEntry}>{_('logAppStarted', lang)}</div>
              <div className={styles.historyEntry}>{_('logDevice', lang)}</div>
              <div className={styles.historyEntry}>{_('logHotkey', lang)}</div>
              <div className={styles.historyEntry}>{_('logMuted', lang)}</div>
              <div className={styles.historyEntry}>{_('logUnmuted', lang)}</div>
              <div className={styles.historyEntry}>{_('logVolume', lang)}</div>
              <div className={styles.historyEntry}>{_('logDeviceChanged', lang)}</div>
            </div>
          </div>
        </div>

        <p className={styles.rackTip}>{_('tip', lang)}</p>

        <div className={`${styles.rackRail} ${styles.rackRailBottom}`} />

        <div className={styles.rackBrand}>{_('brand', lang)}</div>
      </div>
    </div>
  )
}
