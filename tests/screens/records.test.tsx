import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/App'
import { registerRecordsOrientation } from '../../src/data/orientation'
import { ensureWeekPlan } from '../../src/data/repositories/planRepo'
import { getProfile, saveProfile } from '../../src/data/repositories/profileRepo'
import { addRecord } from '../../src/data/repositories/recordsRepo'
import type { ProfileInput } from '../../src/types/profile'
import { resetDb, SAMPLE_PROFILE } from '../helpers'

const AVANT: ProfileInput = { ...SAMPLE_PROFILE, position: 1, weightKg: 100, level: 'federale' }

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

async function seedRecords() {
  await addRecord({ test: 'squat', value: 120, unit: 'kg', reps: 1, date: '2026-09-01' })
  await addRecord({ test: 'sprint-10m', value: 1.85, unit: 's', reps: null, date: '2026-09-01' })
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 7, 10, 0, 0))
  await resetDb()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('écran Records', () => {
  it('affiche courbe, écart au niveau au-dessus et source ; un ajout met à jour courbe et accueil', async () => {
    const user = userEvent.setup()
    await saveProfile(AVANT)
    await seedRecords()
    renderAt('/records')

    const squat = await screen.findByRole('region', { name: 'Back squat' })
    expect(within(squat).getByText(/vs niveau sup\./)).toHaveTextContent('en dessous')
    expect(within(squat).getByText(/vs niveau sup\./)).toHaveTextContent('estimation')
    expect(within(squat).getByRole('img', { name: /1 valeur/ })).toBeInTheDocument()
    expect(within(squat).getByText(/Owen/)).toBeInTheDocument()
    const sprint = screen.getByRole('region', { name: 'Sprint 10 m' })
    expect(within(sprint).getByText(/vs niveau sup\./)).toHaveTextContent('dans la norme')
    expect(screen.getByRole('heading', { name: 'Point faible' })).toBeInTheDocument()
    expect(screen.getByText(/force relative/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '+ Ajouter' }))
    await user.type(screen.getByLabelText('Charge (kg)'), '130')
    await user.clear(screen.getByLabelText('Répétitions'))
    await user.type(screen.getByLabelText('Répétitions'), '5')
    expect(screen.getByRole('status')).toHaveTextContent('1RM estimé (Epley) : 151,7 kg')
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))

    const updated = await screen.findByRole('img', { name: /2 valeurs/ })
    expect(updated).toBeInTheDocument()
    const card = screen.getByRole('region', { name: 'Back squat' })
    expect(card).toHaveTextContent('1RM estimé : 151,7 kg')
    expect(card).toHaveTextContent('dans la norme')
    expect(screen.getByText(/Aucun point faible détecté/)).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Accueil' }))
    expect(await screen.findByText(/Dernier record : Back squat/)).toBeInTheDocument()
    expect(screen.getByText('130 kg × 5')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /Courbe Back squat/ })).toBeInTheDocument()
    // Laisse la génération de la semaine (déclenchée par l’accueil) se terminer avant la remise à zéro de la base.
    await vi.waitFor(() => expect(screen.queryByText(/Préparation de ta semaine/)).toBeNull())
    await screen.findByRole('link', { name: 'Commencer' })
  })

  it('prévient quand l’estimation est imprécise (plus de 10 répétitions)', async () => {
    const user = userEvent.setup()
    await saveProfile(AVANT)
    renderAt('/records')
    await user.click(await screen.findByRole('button', { name: '+ Ajouter' }))
    await user.type(screen.getByLabelText('Charge (kg)'), '80')
    await user.clear(screen.getByLabelText('Répétitions'))
    await user.type(screen.getByLabelText('Répétitions'), '12')
    expect(screen.getByRole('status')).toHaveTextContent('imprécis au-delà de 10 répétitions')
  })

  it('Bronco : progression personnelle seule, sans comparaison', async () => {
    const user = userEvent.setup()
    await saveProfile(AVANT)
    renderAt('/records')
    await user.click(await screen.findByRole('button', { name: '+ Ajouter' }))
    await user.selectOptions(screen.getByLabelText('Test'), 'bronco')
    await user.type(screen.getByLabelText('Temps (s ou m:ss)'), '4:52')
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
    const card = await screen.findByRole('region', { name: 'Bronco' })
    expect(card).toHaveTextContent('4:52')
    expect(card).toHaveTextContent('Pas de repère pour le Bronco')
    expect(card).not.toHaveTextContent('vs niveau sup.')
  })

  it('joueuse : progression seule et mention « repères à venir »', async () => {
    await saveProfile({ ...AVANT, sex: 'femme', weightKg: 65 })
    await seedRecords()
    renderAt('/records')
    const squat = await screen.findByRole('region', { name: 'Back squat' })
    expect(squat).toHaveTextContent('Repères à venir')
    expect(squat).not.toHaveTextContent('vs niveau sup.')
    expect(screen.getAllByText(/Repères à venir/).length).toBeGreaterThan(1)
    expect(screen.getByText(/Aucun point faible détecté/)).toBeInTheDocument()
  })

  it('front squat : comparé au protocole front squat 3RM, jamais au back squat', async () => {
    const user = userEvent.setup()
    await saveProfile({ ...AVANT, level: 'nationale' })
    renderAt('/records')
    await user.click(await screen.findByRole('button', { name: '+ Ajouter' }))
    await user.selectOptions(screen.getByLabelText('Exercice'), 'front-squat')
    await user.type(screen.getByLabelText('Charge (kg)'), '100')
    await user.clear(screen.getByLabelText('Répétitions'))
    await user.type(screen.getByLabelText('Répétitions'), '3')
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
    const card = await screen.findByRole('region', { name: 'Front squat' })
    // Le front squat 3RM a son propre repère (U21) : l’écart est affiché.
    expect(card).toHaveTextContent('vs niveau sup.')
  })

  it('propose le niveau supérieur par un bouton, sans le changer seul', async () => {
    const user = userEvent.setup()
    await saveProfile(AVANT)
    await addRecord({ test: 'squat', value: 160, unit: 'kg', reps: 1, date: '2026-09-01' })
    await addRecord({ test: 'sprint-10m', value: 1.7, unit: 's', reps: null, date: '2026-09-01' })
    renderAt('/records')
    const button = await screen.findByRole('button', { name: /Passer au niveau Nationale/ })
    expect((await getProfile())?.level).toBe('federale')
    await user.click(button)
    await vi.waitFor(async () => expect((await getProfile())?.level).toBe('nationale'))
  })
})

describe('orientation des séances à venir', () => {
  it('un point faible change le contenu des séances suivantes et la raison est visible', async () => {
    const unregister = registerRecordsOrientation()
    try {
      await saveProfile(AVANT)
      await seedRecords()
      const plan = await ensureWeekPlan('2026-10-05', '2026-10-07')
      const sessions = plan!.days.flatMap((d) => (d.session && d.session.kind === 'muscu' && d.date >= '2026-10-07' ? [d.session] : []))
      expect(sessions.length).toBeGreaterThan(0)
      for (const s of sessions) expect(s.reasons.some((r) => r.source === 'records' && r.code === 'orientation-force')).toBe(true)

      // Un meilleur squat lève le point faible : la semaine est régénérée sans l’orientation.
      await addRecord({ test: 'squat', value: 150, unit: 'kg', reps: 1, date: '2026-10-06' })
      const after = await ensureWeekPlan('2026-10-05', '2026-10-07')
      const later = after!.days.flatMap((d) => (d.session && d.session.kind === 'muscu' && d.date >= '2026-10-07' ? [d.session] : []))
      for (const s of later) expect(s.reasons.some((r) => r.source === 'records')).toBe(false)
    } finally {
      unregister()
    }
  })
})
