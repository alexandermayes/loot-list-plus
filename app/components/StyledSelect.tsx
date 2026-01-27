'use client'

interface StyledSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  children: React.ReactNode
  variant?: 'default' | 'small' | 'xs'
}

export default function StyledSelect({
  children,
  className = '',
  variant = 'default',
  ...props
}: StyledSelectProps) {
  const baseClasses = 'bg-background-elevated border border-border-strong rounded-[52px] text-white focus:outline-none focus:border-accent transition-colors cursor-pointer'

  const variantClasses = {
    default: 'w-full pl-4 pr-12 py-2 text-[13px] select-custom-sm',
    small: 'px-3 py-1.5 text-sm select-custom-sm',
    xs: 'w-full px-3 py-1 text-xs select-custom-xs'
  }

  return (
    <select
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </select>
  )
}
