import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface HeaderProps {
  logoUrl: string;
  logoFailed: boolean;
  onLogoError: () => void;
  onContactClick: () => void;
}

const NAV_LINKS = [
  { href: '#planos',          label: 'Planos'     },
  { href: '#galeria',         label: 'Galeria'    },
  { href: '#contato',         label: 'Contato'    },
  { href: '/app/meta-barbeiro', label: 'Plataforma' },
  { href: '/app/manual',      label: 'Manual'     },
];

export default function Header({ logoUrl, logoFailed, onLogoError, onContactClick }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled,   setScrolled]   = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMenuOpen]);

  const close = () => setIsMenuOpen(false);

  return (
    <>
      <header
        className={`fixed w-full top-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'bg-black/90 backdrop-blur-md border-b border-gold/20 shadow-[0_4px_30px_rgba(0,0,0,0.5)]'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-4">

          {/* Logo */}
          <a href="#" className="flex-shrink-0">
            {!logoFailed ? (
              <img
                src={logoUrl}
                alt="Fonseca Barber Club"
                className="h-9 sm:h-11 w-auto brightness-125 contrast-125 drop-shadow-[0_0_12px_rgba(0,0,0,0.9)]"
                onError={onLogoError}
              />
            ) : (
              <div className="border border-gold/30 rounded-xl px-3 py-1.5 bg-black/60 backdrop-blur-sm">
                <span className="font-serif font-bold text-white text-sm tracking-widest italic">
                  Fonseca Barber Club
                </span>
              </div>
            )}
          </a>

          {/* Desktop nav — hidden on mobile */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-8 text-xs font-semibold tracking-[0.15em] uppercase">
            {NAV_LINKS.map(link => (
              <a
                key={link.href}
                href={link.href}
                className="text-white/60 hover:text-gold transition-colors duration-200"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Right side: CTA + hamburger */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onContactClick}
              className="bg-gold text-zinc-950 px-4 sm:px-6 py-2 sm:py-2.5 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-white transition-colors shadow-lg shadow-gold/20"
            >
              Agendar
            </button>
            <button
              onClick={() => setIsMenuOpen(true)}
              className="md:hidden p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all"
              aria-label="Abrir menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile Drawer ── */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm"
              onClick={close}
            />

            {/* Drawer */}
            <motion.aside
              key="drawer"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 240, mass: 0.8 }}
              className="fixed right-0 top-0 h-full z-[70] w-72 bg-zinc-950 border-l border-zinc-800 flex flex-col overflow-y-auto"
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
                <span className="font-serif italic font-bold text-gold text-base tracking-wide">
                  Fonseca Barber Club
                </span>
                <button
                  onClick={close}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Nav links */}
              <nav className="flex-1 p-4 space-y-1">
                {NAV_LINKS.map((link, i) => (
                  <motion.a
                    key={link.href}
                    href={link.href}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 + i * 0.06 }}
                    onClick={close}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-white/70 hover:text-gold hover:bg-gold/10 transition-all text-sm font-semibold uppercase tracking-[0.1em]"
                  >
                    {link.label}
                  </motion.a>
                ))}
              </nav>

              {/* Drawer CTA */}
              <div className="p-4 border-t border-zinc-800">
                <button
                  onClick={() => { onContactClick(); close(); }}
                  className="w-full bg-gold text-zinc-950 py-4 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-white transition-colors"
                >
                  Agendar Horário
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
