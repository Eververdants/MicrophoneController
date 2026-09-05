import { LanguageProvider } from './i18n/LanguageContext'
import Navbar from './components/navbar/Navbar'
import HeroSection from './components/hero/HeroSection'
import FeaturesSection from './components/features/FeaturesSection'
import ScreenshotsSection from './components/screenshots/ScreenshotsSection'
import TechStackSection from './components/tech-stack/TechStackSection'
import InstallationSection from './components/installation/InstallationSection'
import ChangelogSection from './components/changelog/ChangelogSection'
import Footer from './components/footer/Footer'

export default function App() {
  return (
    <LanguageProvider>
      <Navbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <ScreenshotsSection />
        <TechStackSection />
        <InstallationSection />
        <ChangelogSection />
      </main>
      <Footer />
    </LanguageProvider>
  )
}
