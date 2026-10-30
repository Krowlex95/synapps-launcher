import type { ReactNode } from 'react';

interface MainContentProps {
  children: ReactNode;
  sidebarCollapsed: boolean;
}

export default function MainContent({ children, sidebarCollapsed }: MainContentProps) {
  return (
    <main
      className={`custom-scrollbar absolute bottom-0 right-0 top-11 z-20 overflow-y-auto overflow-x-hidden px-6 pb-8 pt-4 transition-[left] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] sm:px-9 ${
        sidebarCollapsed ? 'left-[88px]' : 'left-[252px]'
      }`}
    >
      {children}
    </main>
  );
}
