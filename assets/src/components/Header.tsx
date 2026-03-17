import { Link } from '@tanstack/react-router'
import { Camera, GalleryHorizontal, Sparkles } from 'lucide-react'

const links = [
  { to: '/', label: 'Gallery', icon: <GalleryHorizontal size={18} /> },
  { to: '/create', label: 'Create', icon: <Sparkles size={18} /> },
  { to: '/templates', label: 'Templates', icon: <Camera size={18} /> },
] as const

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-gradient-to-r from-slate-950/90 via-slate-900/80 to-indigo-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <Link to="/" className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-400 via-cyan-300 to-lime-200 shadow-lg shadow-indigo-500/40" />
          <div className="leading-tight">
            <p className="m-0 text-xs uppercase tracking-[0.38em] text-cyan-200/70">
              Meme Smith
            </p>
            <p className="m-0 text-lg font-semibold text-white">Generator Lab</p>
          </div>
        </Link>

        <nav className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2 py-1 shadow-lg shadow-indigo-500/10">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              activeProps={{
                className:
                  'text-white bg-indigo-500/20 border-indigo-400/60 shadow-md shadow-indigo-500/30',
              }}
              className="group flex items-center gap-2 rounded-full border border-transparent px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-white/20 hover:text-white"
            >
              <span className="text-indigo-200 transition group-hover:text-white">{link.icon}</span>
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}
