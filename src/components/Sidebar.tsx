import React from 'react';
import { 
  LayoutDashboard, 
  Radio, 
  Map as MapIcon, 
  Sparkles, 
  FileDown, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  Menu,
  X,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export type ViewType = 'dashboard' | 'news' | 'map' | 'insight' | 'settings';

interface SidebarProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onOpenExport: () => void;
}

export default function Sidebar({ activeView, onViewChange, isOpen, setIsOpen, onOpenExport }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'news', label: 'Berita Terkini', icon: Radio },
    { id: 'map', label: 'Peta Sebaran', icon: MapIcon },
    { id: 'insight', label: 'AI Insight', icon: Sparkles },
  ];

  const bottomItems = [
    { id: 'export', label: 'Ekspor Laporan', icon: FileDown, action: onOpenExport },
    { id: 'settings', label: 'Pengaturan', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Container */}
      <motion.aside
        initial={false}
        animate={{ 
          width: isOpen ? '260px' : '80px',
          x: 0 
        }}
        className={`fixed top-0 left-0 h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 z-50 transition-colors duration-300 flex flex-col hidden lg:flex`}
      >
        {/* Logo Section */}
        <div className="h-20 flex items-center px-6 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3 overflow-hidden whitespace-nowrap group cursor-default">
            <div className="w-10 h-10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
              <img src="https://smilingwestjava.jabarprov.go.id/ic-logo.svg" alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
            </div>
            <AnimatePresence mode="wait">
              {isOpen && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex flex-col"
                >
                  <span className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tighter leading-none">Media Monitoring</span>
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">News Online</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 py-6 px-3 space-y-2 overflow-y-auto hide-scrollbar">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id as ViewType)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all group relative ${
                activeView === item.id
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              <item.icon className={`w-6 h-6 shrink-0 ${activeView === item.id ? 'text-blue-600 dark:text-blue-400' : 'group-hover:scale-110 transition-transform'}`} />
              <AnimatePresence mode="wait">
                {isOpen && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="text-sm font-bold whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {!isOpen && (
                <div className="absolute left-full ml-4 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-[60]">
                  {item.label}
                </div>
              )}
            </button>
          ))}
        </nav>

        {/* Bottom Section */}
        <div className="p-3 border-t border-gray-100 dark:border-gray-800 space-y-2">
          {bottomItems.map((item) => (
            <button
              key={item.id}
              onClick={item.action ? item.action : () => onViewChange(item.id as ViewType)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all group relative ${
                activeView === item.id
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              <item.icon className={`w-6 h-6 shrink-0 ${activeView === item.id ? 'text-blue-600 dark:text-blue-400' : 'group-hover:scale-110 transition-transform'}`} />
              <AnimatePresence mode="wait">
                {isOpen && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="text-sm font-bold whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {!isOpen && (
                <div className="absolute left-full ml-4 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-[60]">
                  {item.label}
                </div>
              )}
            </button>
          ))}

          {/* Toggle Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="w-full flex items-center gap-3 p-3 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all group"
          >
            {isOpen ? <ChevronLeft className="w-6 h-6" /> : <ChevronRight className="w-6 h-6" />}
            {isOpen && <span className="text-sm font-bold">Sembunyikan</span>}
          </button>
        </div>
      </motion.aside>

      {/* Mobile Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 z-50 flex items-center justify-around px-2 lg:hidden">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id as ViewType)}
            className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${
              activeView === item.id ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[10px] font-bold">{item.label.split(' ')[0]}</span>
          </button>
        ))}
        <button
          onClick={onOpenExport}
          className="flex flex-col items-center justify-center gap-1 flex-1 h-full text-gray-500 dark:text-gray-400"
        >
          <FileDown className="w-5 h-5" />
          <span className="text-[10px] font-bold">Ekspor</span>
        </button>
        <button
          onClick={() => onViewChange('settings')}
          className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${
            activeView === 'settings' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="text-[10px] font-bold">Set</span>
        </button>
      </div>
    </>
  );
}
