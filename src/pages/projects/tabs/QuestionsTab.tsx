/**
 * Questions Tab
 * Track open questions that need answers in a project
 */

import { useState } from 'react'
import { Plus, HelpCircle, X, Filter, Edit3, Trash2, CheckCircle2 } from 'lucide-react'
import { questionApi, type Question, type QuestionStatus } from '../../../services/projectApi'
import { QUESTION_STATUS_META } from '../constants'

export interface QuestionsTabProps {
  projectId: string
  questions: Question[]
  onUpdate: () => void
}

export function QuestionsTab({ projectId, questions, onUpdate }: QuestionsTabProps) {
  const [showNewQuestion, setShowNewQuestion] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  const [filterStatus, setFilterStatus] = useState<QuestionStatus | 'all'>('all')
  const [answeringId, setAnsweringId] = useState<string | null>(null)
  const [answerText, setAnswerText] = useState('')
  const [deferringId, setDeferringId] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    question: '',
    context: '',
  })
  const [saving, setSaving] = useState(false)

  const resetForm = () => {
    setFormData({ question: '', context: '' })
  }

  const openEditModal = (question: Question) => {
    setEditingQuestion(question)
    setFormData({
      question: question.question,
      context: question.context || '',
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.question.trim()) return

    try {
      setSaving(true)
      const data = {
        question: formData.question.trim(),
        context: formData.context.trim() || undefined,
      }

      if (editingQuestion) {
        await questionApi.update(projectId, editingQuestion.id, data)
        setEditingQuestion(null)
      } else {
        await questionApi.create(projectId, data)
        setShowNewQuestion(false)
      }
      resetForm()
      onUpdate()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save question')
    } finally {
      setSaving(false)
    }
  }

  const handleAnswer = async (questionId: string) => {
    if (!answerText.trim()) return
    try {
      await questionApi.answer(projectId, questionId, answerText.trim())
      setAnsweringId(null)
      setAnswerText('')
      onUpdate()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to answer question')
    }
  }

  const handleDefer = async (questionId: string) => {
    try {
      await questionApi.update(projectId, questionId, { status: 'deferred' })
      setDeferringId(null)
      onUpdate()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to defer question')
    }
  }

  const handleReopen = async (questionId: string) => {
    try {
      await questionApi.update(projectId, questionId, { status: 'open', answer: undefined })
      onUpdate()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to reopen question')
    }
  }

  const handleClose = async (questionId: string) => {
    try {
      await questionApi.update(projectId, questionId, { status: 'closed' })
      onUpdate()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to close question')
    }
  }

  const handleDelete = async (questionId: string) => {
    if (!confirm('Delete this question?')) return
    try {
      await questionApi.delete(projectId, questionId)
      onUpdate()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete question')
    }
  }

  const filteredQuestions = questions.filter(q => {
    if (filterStatus === 'all') return true
    return q.status === filterStatus
  })

  const QuestionModal = ({ isEdit }: { isEdit: boolean }) => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? 'Edit Question' : 'New Question'}
          </h2>
          <button
            onClick={() => { if (isEdit) setEditingQuestion(null); else setShowNewQuestion(false); resetForm() }}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Question *</label>
            <textarea
              value={formData.question}
              onChange={(e) => setFormData({ ...formData, question: e.target.value })}
              placeholder="What do you need to clarify?"
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Context
              <span className="text-gray-400 font-normal ml-1">(optional)</span>
            </label>
            <textarea
              value={formData.context}
              onChange={(e) => setFormData({ ...formData, context: e.target.value })}
              placeholder="Where did this question come from? What additional context is helpful?"
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none text-sm"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => { if (isEdit) setEditingQuestion(null); else setShowNewQuestion(false); resetForm() }}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!formData.question.trim() || saving}
              className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Question'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  return (
    <div>
      {/* Header with filters */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-medium text-gray-900">Questions</h2>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as QuestionStatus | 'all')}
              className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary/20"
            >
              <option value="all">All Status</option>
              {Object.entries(QUESTION_STATUS_META).map(([status, meta]) => (
                <option key={status} value={status}>{meta.label}</option>
              ))}
            </select>
          </div>
        </div>
        <button
          onClick={() => { resetForm(); setShowNewQuestion(true) }}
          className="flex items-center gap-2 px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
        >
          <Plus size={16} />
          New Question
        </button>
      </div>

      {filteredQuestions.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <HelpCircle size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            {filterStatus !== 'all' ? 'No questions match filter' : 'No questions yet'}
          </h3>
          <p className="text-gray-500">
            {filterStatus !== 'all' ? 'Try adjusting your filter' : 'Track open questions that need answers'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredQuestions.map((question) => {
            const statusMeta = QUESTION_STATUS_META[question.status]
            const isAnswering = answeringId === question.id
            const isDeferring = deferringId === question.id

            return (
              <div key={question.id} className="bg-white rounded-xl border border-gray-200 hover:border-gray-300 p-4 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <HelpCircle size={16} className="text-gray-400 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 font-medium">{question.question}</p>
                      {question.context && (
                        <p className="text-sm text-gray-500 mt-1">{question.context}</p>
                      )}
                      {question.answer && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                          <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                            <CheckCircle2 size={12} />
                            Answer
                            {question.answered_by && <span>by {question.answered_by}</span>}
                          </div>
                          <p className="text-sm text-gray-700">{question.answer}</p>
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`px-2 py-0.5 text-xs rounded ${statusMeta.bg} ${statusMeta.color}`}>
                          {statusMeta.label}
                        </span>
                        {question.answered_at && (
                          <span className="text-xs text-gray-400">
                            {new Date(question.answered_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {question.status === 'open' && (
                      <>
                        <button
                          onClick={() => { setAnsweringId(question.id); setAnswerText('') }}
                          className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                        >
                          Answer
                        </button>
                        <button
                          onClick={() => setDeferringId(question.id)}
                          className="px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded"
                        >
                          Defer
                        </button>
                      </>
                    )}
                    {question.status === 'deferred' && (
                      <button
                        onClick={() => handleReopen(question.id)}
                        className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                      >
                        Reopen
                      </button>
                    )}
                    {question.status === 'answered' && (
                      <button
                        onClick={() => handleClose(question.id)}
                        className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                      >
                        Close
                      </button>
                    )}
                    <button onClick={() => openEditModal(question)} className="p-1 text-gray-400 hover:text-gray-600">
                      <Edit3 size={14} />
                    </button>
                    <button onClick={() => handleDelete(question.id)} className="p-1 text-gray-400 hover:text-red-500">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {isAnswering && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Your Answer</label>
                    <textarea
                      value={answerText}
                      onChange={(e) => setAnswerText(e.target.value)}
                      placeholder="Provide a clear answer..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none text-sm"
                      autoFocus
                    />
                    <div className="flex justify-end gap-2 mt-3">
                      <button onClick={() => setAnsweringId(null)} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
                        Cancel
                      </button>
                      <button
                        onClick={() => handleAnswer(question.id)}
                        disabled={!answerText.trim()}
                        className="px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
                      >
                        Submit
                      </button>
                    </div>
                  </div>
                )}

                {isDeferring && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-sm text-gray-600 mb-3">Defer this question for later?</p>
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setDeferringId(null)} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
                        Cancel
                      </button>
                      <button onClick={() => handleDefer(question.id)} className="px-3 py-1.5 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700">
                        Defer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modals */}
      {showNewQuestion && <QuestionModal isEdit={false} />}
      {editingQuestion && <QuestionModal isEdit={true} />}
    </div>
  )
}
