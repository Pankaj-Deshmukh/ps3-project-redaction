export default function Button({ children, disabled, variant = 'primary', className = '', ...props }) {
    const baseStyles = 'px-4 py-2 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
    const variantStyles = variant === 'outline'
      ? 'border border-gray-300 hover:bg-gray-50 focus:ring-blue-500'
      : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500';
    return (
        <button
        disabled={disabled}
        className={`${baseStyles} ${variantStyles} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
        {...props}
        >
        {children}
        </button>
    )
};
