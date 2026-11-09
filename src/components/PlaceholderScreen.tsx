interface Props {
  title: string
  description: string
}

/** Écran vide, remplacé au fil des phases suivantes. */
export default function PlaceholderScreen({ title, description }: Props) {
  return (
    <section className="screen">
      <h1>{title}</h1>
      <p className="muted">{description}</p>
    </section>
  )
}
