'use client'

import { forwardRef, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Loader2, Check } from 'lucide-react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps {
  variant?: Variant
  size?: Size
  loading?: boolean
  success?: boolean
  icon?: React.ReactNode
  className?: string
  children?: React.ReactNode
  onClick?: React.MouseEventHandler<HTMLButtonElement>
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  title?: string
}

const variantStyles: Record<Variant, string> = {
  primary:
    'bg-[var(--green-700)] text-white hover:bg-[var(--green-900)] shadow-sm hover:shadow-md focus-visible:ring-[var(--green-500)]',
  secondary:
    'bg-[var(--warm-50)] text-[var(--warm-700)] hover:bg-[var(--warm-100)] border border-[var(--warm-100)] focus-visible:ring-[var(--warm-300)]',
  danger:
    'bg-red-600 text-white hover:bg-red-700 shadow-sm hover:shadow-md focus-visible:ring-red-400',
  ghost:
    'bg-transparent text-[var(--warm-500)] hover:text-[var(--warm-700)] hover:bg-[var(--warm-50)] focus-visible:ring-[var(--warm-300)]',
}

const sizeStyles: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2.5 text-sm gap-2',
  lg: 'px-5 py-3 text-sm gap-2',
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, success, icon, children, disabled, className = '', onClick, type = 'button', title }, ref) => {
    const [ripples, setRipples] = useState<{ x: number; y: number; id: number }[]>([])

    const handleClick = useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        const rect = e.currentTarget.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        const id = Date.now()
        setRipples((prev) => [...prev, { x, y, id }])
        setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 600)

        onClick?.(e)
      },
      [onClick]
    )

    const isDisabled = disabled || loading

    return (
      <motion.button
        ref={ref}
        whileTap={isDisabled ? undefined : { scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        className={`
          relative inline-flex items-center justify-center font-medium rounded-xl
          transition-colors duration-200
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
          overflow-hidden select-none
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${className}
        `}
        disabled={isDisabled}
        type={type}
        title={title}
        onClick={handleClick}
      >
        {/* Ripple effects */}
        {ripples.map((ripple) => (
          <span
            key={ripple.id}
            className="absolute rounded-full bg-white/20 animate-ripple pointer-events-none"
            style={{
              left: ripple.x - 10,
              top: ripple.y - 10,
              width: 20,
              height: 20,
            }}
          />
        ))}

        {/* Content */}
        {loading ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            <span>{typeof children === 'string' ? children.replace(/^(Create|Save|Send|Delete|Update|Move|Confirm)/, '$1ing').replace('eing', 'ing') : children}</span>
          </>
        ) : success ? (
          <>
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 15 }}
            >
              <Check size={14} />
            </motion.span>
            <span>Done</span>
          </>
        ) : (
          <>
            {icon}
            {children}
          </>
        )}
      </motion.button>
    )
  }
)

Button.displayName = 'Button'
export default Button
