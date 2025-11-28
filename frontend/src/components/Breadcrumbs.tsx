import './Breadcrumbs.css'

export interface BreadcrumbItem {
  label: string
  onClick?: () => void
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol className="breadcrumbs-list">
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          
          return (
            <li key={index} className="breadcrumb-item">
              {!isLast && item.onClick ? (
                <button 
                  className="breadcrumb-link"
                  onClick={item.onClick}
                >
                  {item.label}
                </button>
              ) : (
                <span className={isLast ? 'breadcrumb-current' : 'breadcrumb-text'}>
                  {item.label}
                </span>
              )}
              {!isLast && (
                <span className="breadcrumb-separator" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

