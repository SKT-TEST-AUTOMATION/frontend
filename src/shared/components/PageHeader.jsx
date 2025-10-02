import { Link } from "react-router-dom";

export default function PageHeader({
  title, 
  subtitle,
  actions,
  breadcrumbs = [], // [{ label: '시나리오', to: '/scenarios' }, { label: '상세' }]
  className = "",
}) {
  return (
    <header className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${className}`}>  
      <div>
        {/* breadcrumb => 현재 depth */}
        {breadcrumbs?.length > 0 && (
          <nav className="mb-2 text-xs text-gray-500 dark:text-gray-400">
            <ol className="flex items-center gap-1.5">
              {breadcrumbs.map((bc, idx) => (
                <li key={`${bc.label}-${idx}`} className="flex items-center gap-1.5">
                  {bc.to ? (
                    <Link to={bc.to} className="hover:underline">
                      {bc.label}
                    </Link>
                  ) : (
                    <span className="font-medium text-gray-700 dark:text-gray-300">{bc.label}</span>
                  )}
                  {idx < breadcrumbs.length - 1 && <span className="opacity-60">/</span>}
                </li>
              ))}
            </ol>
          </nav>
        )}

        {/* 타이틀/서브타이틀 */}
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{title}</h1>
        {subtitle && (
          <p className="text-lg text-gray-600 dark:text-gray-400 mt-1.5">{subtitle}</p>
        )}
      </div>

      {/* 우측 액션 영역 */}
      {actions && <div className="flex items-center gap-2.5">{actions}</div>}
    </header>
  )
}