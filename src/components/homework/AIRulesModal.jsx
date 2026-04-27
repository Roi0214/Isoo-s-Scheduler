import { useState, useEffect } from 'react'
import { RotateCcw, Lock } from 'lucide-react'
import Modal from '../common/Modal'
import { DEFAULT_AI_RULES, saveRules } from '../../data/aiRules'

export default function AIRulesModal({ isOpen, onClose, rules, onSave }) {
  const [draft, setDraft] = useState(rules)

  // 모달 열릴 때마다 최신 rules로 초기화
  useEffect(() => {
    if (isOpen) setDraft(rules)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const updateText = (key, text) =>
    setDraft(prev => prev.map(r => r.key === key ? { ...r, text } : r))

  const toggleEnabled = (key) =>
    setDraft(prev => prev.map(r => r.key === key ? { ...r, enabled: !r.enabled } : r))

  const resetAll = () =>
    setDraft(DEFAULT_AI_RULES.map(r => ({ ...r, enabled: true })))

  const handleSave = () => {
    saveRules(draft)
    onSave(draft)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="AI 배분 규칙 편집">
      <div className="flex flex-col gap-3">
        <p className="text-xs text-slate-400 leading-relaxed">
          각 규칙의 내용을 수정하거나 끄고 켤 수 있어요.
          <span className="inline-flex items-center gap-0.5 text-slate-300 ml-1"><Lock size={10} /> 잠금</span> 규칙은 비활성화 불가합니다.
        </p>

        {draft.map(rule => (
          <div
            key={rule.key}
            className={`rounded-2xl border p-3 flex flex-col gap-2 transition-opacity
              ${rule.enabled === false ? 'opacity-40' : ''}`}
          >
            {/* 헤더 행 */}
            <div className="flex items-center gap-2">
              {rule.locked ? (
                <Lock size={13} className="text-slate-300 flex-shrink-0" />
              ) : (
                <div
                  onClick={() => toggleEnabled(rule.key)}
                  className={`w-10 h-5 rounded-full relative cursor-pointer flex-shrink-0 transition-colors
                    ${rule.enabled !== false ? 'bg-indigo-500' : 'bg-slate-200'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform
                    ${rule.enabled !== false ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </div>
              )}
              <span className="text-xs font-bold text-slate-600">{rule.label}</span>
            </div>

            {/* 규칙 텍스트 */}
            <textarea
              value={rule.text}
              onChange={e => updateText(rule.key, e.target.value)}
              rows={3}
              className="w-full text-xs text-slate-600 border border-slate-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 leading-relaxed"
            />
          </div>
        ))}

        {/* 액션 버튼 */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={resetAll}
            className="flex items-center gap-1 text-xs text-slate-400 bg-slate-100 px-3 py-2 rounded-xl font-medium"
          >
            <RotateCcw size={11} /> 기본값으로 초기화
          </button>
          <button
            onClick={handleSave}
            className="flex-1 bg-indigo-600 text-white text-sm font-bold py-2 rounded-xl active:bg-indigo-700"
          >
            저장
          </button>
        </div>
      </div>
    </Modal>
  )
}
