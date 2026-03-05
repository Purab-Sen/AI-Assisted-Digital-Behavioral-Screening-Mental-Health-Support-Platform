import { useState, useCallback } from 'react'

export function useForm(initialValues, validate) {
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})

  const handleChange = useCallback((e) => {
    const { name, value } = e.target
    setValues((prev) => ({ ...prev, [name]: value }))
  }, [])

  const handleBlur = useCallback((e) => {
    const { name } = e.target
    setTouched((prev) => ({ ...prev, [name]: true }))
    
    if (validate) {
      const validationErrors = validate(values)
      setErrors(validationErrors)
    }
  }, [values, validate])

  const handleSubmit = useCallback((onSubmit) => {
    return (e) => {
      e.preventDefault()
      
      if (validate) {
        const validationErrors = validate(values)
        setErrors(validationErrors)
        
        const allTouched = Object.keys(values).reduce(
          (acc, key) => ({ ...acc, [key]: true }),
          {}
        )
        setTouched(allTouched)
        
        if (Object.keys(validationErrors).length === 0) {
          onSubmit(values)
        }
      } else {
        onSubmit(values)
      }
    }
  }, [values, validate])

  const reset = useCallback(() => {
    setValues(initialValues)
    setErrors({})
    setTouched({})
  }, [initialValues])

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
    setValues,
    setErrors
  }
}
