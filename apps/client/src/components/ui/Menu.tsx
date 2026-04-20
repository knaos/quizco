import React, { useState, useRef, useEffect, useImperativeHandle } from 'react';
import { MoreHorizontal } from 'lucide-react';

interface MenuProps {
  children: React.ReactNode;
}

export interface MenuRef {
  closeMenu: () => void;
}

export const Menu = React.forwardRef<MenuRef, MenuProps>(({ children }, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    closeMenu: () => setIsOpen(false),
  }));

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleDropdownClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const button = target.closest('button');
    if (button) {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-2xl border border-gray-200 bg-white p-3 text-gray-500 transition hover:text-gray-700"
        aria-label="Menu"
        aria-expanded={isOpen}
      >
        <MoreHorizontal className="h-5 w-5" />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full z-50 mt-2 min-w-[200px] overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl"
          onClick={handleDropdownClick}
        >
          <div className="flex flex-col divide-y divide-gray-100">
            {React.Children.map(children, (child, index) => (
              <div key={index} className="p-1">
                {child}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});