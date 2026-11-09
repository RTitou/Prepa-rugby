interface Props {
  values: readonly number[]
  /** Texte lu par les lecteurs d'écran. */
  label: string
  width?: number
  height?: number
  /** Plus bas = mieux (temps) : la courbe monte quand le joueur s'améliore. */
  lowerIsBetter?: boolean
}

/** Mini-courbe en SVG, sans librairie. Un seul point = un repère ; aucun point = rien. */
export default function Sparkline({ values, label, width = 96, height = 28, lowerIsBetter = false }: Props) {
  if (values.length === 0) return null
  const pad = 3
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min
  const x = (i: number) => (values.length === 1 ? width / 2 : pad + (i * (width - 2 * pad)) / (values.length - 1))
  const y = (v: number) => {
    const ratio = span === 0 ? 0.5 : (v - min) / span
    return pad + (lowerIsBetter ? ratio : 1 - ratio) * (height - 2 * pad)
  }
  const points = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const last = values.length - 1
  return (
    <svg className="sparkline" role="img" aria-label={label} width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {values.length > 1 ? <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" /> : null}
      <circle cx={x(last)} cy={y(values[last]!)} r="3" fill="currentColor" />
    </svg>
  )
}
