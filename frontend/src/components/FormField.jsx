// Labeled form control in the AuthPage style (underlined), with an error message below
import { errorClass, inputClass, labelClass } from '../utils/styles'

function FormField({ id, label, error, as = 'input', className = '', children, ...controlProps }) {
  const Control = as
  const errorId = `${id}-error`

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <Control
        id={id}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? errorId : undefined}
        className={inputClass}
        {...controlProps}
      >
        {children}
      </Control>
      {error && (
        <p id={errorId} className={errorClass}>
          {error}
        </p>
      )}
    </div>
  )
}

export default FormField
