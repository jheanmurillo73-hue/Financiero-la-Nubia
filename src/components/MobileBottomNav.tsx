import React from 'react'
import {
  LayoutDashboard,
  Zap,
  FileSpreadsheet,
  Layers,
  SlidersHorizontal,
} from 'lucide-react'

interface MobileBottomNavProps {
  activeTab: string
  setActiveTab: (tab: string) => void
  warningsCount?: number
  isSimulation?: boolean
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  isSimulation = false,
}) => {
  const tabs = [
    { id: 'resumen', label: 'Resumen', icon: LayoutDashboard },
    { id: 'disciplinas', label: 'Eléctrico/Civil', icon: Zap, badge: '!' },
    { id: 'actas', label: 'Actas', icon: FileSpreadsheet },
    { id: 'capitulos', label: 'Capítulos', icon: Layers },
    {
      id: 'simulador',
      label: 'Simulador',
      icon: SlidersHorizontal,
      badge: isSimulation ? '●' : undefined,
    },
  ]

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0b1724]/95 backdrop-blur-md border-t border-[#1e2d3d] text-white safe-area-pb"
      aria-label="Navegación móvil"
    >
      <div className="grid grid-cols-5 h-16 items-center px-1">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex flex-col items-center justify-center h-full min-h-[44px] transition-colors ${
                isActive
                  ? 'text-[#f8c866]'
                  : 'text-[#8598a8] hover:text-[#c4d4e0]'
              }`}
            >
              <div className="relative">
                <Icon size={19} strokeWidth={isActive ? 2.3 : 1.8} />
                {tab.badge && (
                  <span
                    className={`absolute -top-1.5 -right-2 px-1 min-w-[13px] h-[13px] text-[8px] font-mono font-bold rounded-full flex items-center justify-center ${
                      tab.id === 'disciplinas'
                        ? 'bg-[#e5a83b] text-[#0b1724]'
                        : 'bg-[#3b8f71] text-white'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </div>
              <span
                className={`text-[9px] mt-1 font-mono tracking-tight truncate max-w-[62px] ${
                  isActive ? 'font-bold' : 'font-normal'
                }`}
              >
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute top-0 w-8 h-0.5 bg-[#f8c866] rounded-full" />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
