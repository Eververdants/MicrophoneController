import { motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'

// The core is drawn at a fixed 224px; this wrapper scales it to whatever
// vertical room the row has left, so the window never needs to scroll.
const CORE_SIZE = 224

export function CoreFit({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => {
      const { width, height } = el.getBoundingClientRect()
      setScale(Math.max(0.55, Math.min(1, width / (CORE_SIZE + 8), height / (CORE_SIZE + 8))))
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} className="grid min-h-0 min-w-0 flex-1 place-items-center self-stretch">
      <motion.div animate={{ scale }} transition={{ type: 'spring', stiffness: 260, damping: 28 }}>
        {children}
      </motion.div>
    </div>
  )
}
