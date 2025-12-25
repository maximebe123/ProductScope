/**
 * App Layout
 * Simple layout wrapper - module selector is in the sidebar
 */

import { ReactNode } from 'react'

interface AppLayoutProps {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {children}
    </div>
  )
}
