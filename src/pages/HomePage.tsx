/**
 * Home Page
 * Landing page with two modes: Free Access (standalone diagrams) and Projects
 */

import { Link, useNavigate } from 'react-router-dom'
import {
  Network,
  Brain,
  GitBranch,
  ArrowRight,
  FolderOpen,
  Palette,
  Save,
  Cloud,
  MessageSquare,
  History,
  FileText,
} from 'lucide-react'
import { useAuth } from '../auth'

export function HomePage() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  const handleProjectsClick = () => {
    if (isAuthenticated) {
      navigate('/projects')
    } else {
      navigate('/login?redirect=/projects')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">R</span>
            </div>
            <span className="font-semibold text-gray-900">R'Diagrams</span>
          </Link>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <Link
                to="/projects"
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg
                         hover:bg-primary/90 transition-colors font-medium text-sm"
              >
                <FolderOpen size={16} />
                Mes Projets
              </Link>
            ) : (
              <Link
                to="/login"
                className="px-4 py-2 text-gray-700 hover:text-primary transition-colors font-medium text-sm"
              >
                Se connecter
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Créez des diagrammes professionnels
            <br />
            <span className="text-primary">avec l'intelligence artificielle</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Architecture, Mind Maps, Flowcharts — générez et éditez vos diagrammes
            en quelques secondes grâce à notre assistant IA.
          </p>
        </div>

        {/* Two Mode Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-16">
          {/* Mode Libre */}
          <div className="bg-white rounded-2xl border border-slate-200 p-8 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-6">
              <Palette size={24} className="text-slate-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Accès Libre</h2>
            <p className="text-gray-600 mb-6">
              Créez des diagrammes instantanément, sans inscription.
              Parfait pour des besoins ponctuels.
            </p>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-3 text-sm text-gray-600">
                <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <Network size={12} className="text-slate-500" />
                </div>
                Tous les types de diagrammes
              </li>
              <li className="flex items-center gap-3 text-sm text-gray-600">
                <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <MessageSquare size={12} className="text-slate-500" />
                </div>
                Assistant IA inclus
              </li>
              <li className="flex items-center gap-3 text-sm text-gray-600">
                <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <Save size={12} className="text-slate-500" />
                </div>
                Export PNG, SVG, JSON
              </li>
            </ul>
            <Link
              to="/diagrams"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-lg
                       hover:bg-slate-800 transition-colors font-medium text-sm group"
            >
              Commencer
              <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {/* Mes Projets */}
          <div className="bg-white rounded-2xl border-2 border-primary/20 p-8 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-6 relative">
              <FolderOpen size={24} className="text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Espace Projets</h2>
            <p className="text-gray-600 mb-6">
              Organisez votre travail, collaborez et accédez à toutes les fonctionnalités avancées.
            </p>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-3 text-sm text-gray-600">
                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Cloud size={12} className="text-primary" />
                </div>
                Sauvegarde dans le cloud
              </li>
              <li className="flex items-center gap-3 text-sm text-gray-600">
                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <FileText size={12} className="text-primary" />
                </div>
                User Stories, Questions, Décisions
              </li>
              <li className="flex items-center gap-3 text-sm text-gray-600">
                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <History size={12} className="text-primary" />
                </div>
                Historique des conversations IA
              </li>
            </ul>
            <button
              onClick={handleProjectsClick}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg
                       hover:bg-primary/90 transition-colors font-medium text-sm group"
            >
              {isAuthenticated ? 'Ouvrir mes projets' : 'Accéder'}
              <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* Diagram Types Section */}
        <div className="text-center mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Choisissez votre type de diagramme
          </h2>
          <p className="text-gray-500">
            Commencez directement avec l'éditeur de votre choix
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <Link
            to="/diagrams"
            className="bg-white rounded-xl border border-slate-200 p-6 hover:border-primary/30
                     hover:shadow-lg transition-all group"
          >
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-4
                          group-hover:bg-primary/20 transition-colors">
              <Network size={20} className="text-primary" />
            </div>
            <h3 className="font-medium text-gray-900 mb-1 group-hover:text-primary transition-colors">
              Architecture
            </h3>
            <p className="text-sm text-gray-500">
              Diagrammes d'infrastructure et systèmes
            </p>
          </Link>

          <Link
            to="/mindmap"
            className="bg-white rounded-xl border border-slate-200 p-6 hover:border-purple-300
                     hover:shadow-lg transition-all group"
          >
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center mb-4
                          group-hover:bg-purple-100 transition-colors">
              <Brain size={20} className="text-purple-600" />
            </div>
            <h3 className="font-medium text-gray-900 mb-1 group-hover:text-purple-600 transition-colors">
              Mind Map
            </h3>
            <p className="text-sm text-gray-500">
              Organisation d'idées et brainstorming
            </p>
          </Link>

          <Link
            to="/flowchart"
            className="bg-white rounded-xl border border-slate-200 p-6 hover:border-green-300
                     hover:shadow-lg transition-all group"
          >
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center mb-4
                          group-hover:bg-green-100 transition-colors">
              <GitBranch size={20} className="text-green-600" />
            </div>
            <h3 className="font-medium text-gray-900 mb-1 group-hover:text-green-600 transition-colors">
              Flowchart
            </h3>
            <p className="text-sm text-gray-500">
              Processus et workflows
            </p>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 mt-16">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
                <span className="text-white font-bold text-xs">R</span>
              </div>
              <span className="text-sm text-gray-500">R'Diagrams</span>
            </div>
            <p className="text-sm text-gray-400">
              Création de diagrammes assistée par IA
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
