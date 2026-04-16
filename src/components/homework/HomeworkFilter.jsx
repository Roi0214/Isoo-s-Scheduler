export const FILTER_OPTIONS = [
  { key: 'all',       label: '전체' },
  { key: 'todo',      label: '미완료' },
  { key: 'done',      label: '완료' },
]

export default function HomeworkFilter({ active, onChange }) {
  return (
    <div className="flex gap-2 mb-4">
      {FILTER_OPTIONS.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all
            ${active === key
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-500 border border-slate-200 hover:border-indigo-300'
            }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
