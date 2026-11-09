interface Option<T extends string | number> {
  value: T
  label: string
  description?: string
}

interface Props<T extends string | number> {
  legend: string
  name: string
  options: readonly Option<T>[]
  value: T | '' | null
  onChange: (value: T) => void
}

/** Choix unique en cartes tactiles (boutons radio natifs, accessibles au clavier). */
export default function RadioGroup<T extends string | number>({ legend, name, options, value, onChange }: Props<T>) {
  return (
    <fieldset className="field-group">
      <legend>{legend}</legend>
      {options.map((o) => (
        <label key={o.value} className={`choice${value === o.value ? ' choice--selected' : ''}`}>
          <input type="radio" name={name} checked={value === o.value} onChange={() => onChange(o.value)} />
          <span className="choice__label">{o.label}</span>
          {o.description ? <span className="choice__desc">{o.description}</span> : null}
        </label>
      ))}
    </fieldset>
  )
}
