import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import App from '../../src/App'
import { db } from '../../src/data/db'
import { addMatch, setClubDays } from '../../src/data/repositories/calendarRepo'
import { ensureWeekPlan, getWeekPlan } from '../../src/data/repositories/planRepo'
import { addRecord } from '../../src/data/repositories/recordsRepo'
import { resetDb, seedProfile } from '../helpers'

const WEEK = '2026-10-05'
const SQUAT_LOAD = 'Charge série 1, Squat arrière (kg)'

let sessionId = ''

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

beforeEach(async () => {
  await resetDb()
  await seedProfile()
  await setClubDays([
    { weekday: 2, intensity: 'lourd', durationMin: 90 },
    { weekday: 4, intensity: 'normal', durationMin: 90 },
  ])
  await addMatch({ date: '2026-10-10', time: null })
  const plan = await ensureWeekPlan(WEEK, WEEK)
  sessionId = plan!.days.find((d) => d.session?.slot === 'bas-force')!.session!.id
})

describe('écran de séance', () => {
  it('affiche l’échauffement en premier puis les exercices avec leur prescription', async () => {
    renderAt(`/seance/${sessionId}`)
    const heading = await screen.findByRole('heading', { name: /Muscu B · force bas du corps/ })
    expect(heading).toBeInTheDocument()
    const sections = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(sections[0]).toMatch(/Échauffement Activate/)
    expect(screen.getByRole('region', { name: 'Squat arrière' })).toHaveTextContent('4×5 @ RPE 8')
  })

  it('conseille une charge calculée depuis le record du joueur', async () => {
    renderAt(`/seance/${sessionId}`)
    await screen.findByRole('region', { name: 'Squat arrière' })
    await waitFor(() => expect(screen.getByRole('region', { name: 'Squat arrière' })).toHaveTextContent('Ajoute ton record de squat'))

    await db.records.clear()
    await addRecord({ test: 'squat', value: 120, unit: 'kg', reps: 1, date: '2026-09-20' })
    await waitFor(() => expect(screen.getByRole('region', { name: 'Squat arrière' })).toHaveTextContent('95 kg'))
    expect(screen.getByLabelText(SQUAT_LOAD)).toHaveAttribute('placeholder', '95')
  })

  it('enregistre la saisie (virgule acceptée) et la garde après rechargement', async () => {
    const user = userEvent.setup()
    const first = renderAt(`/seance/${sessionId}`)
    await user.type(await screen.findByLabelText(SQUAT_LOAD), '102,5')
    await user.type(screen.getByLabelText('Répétitions série 1, Squat arrière'), '5')
    await user.type(screen.getByLabelText('RPE série 1, Squat arrière'), '8')
    await user.click(screen.getByLabelText('Échauffement fait'))

    await waitFor(async () => {
      const logs = await db.sessionLogs.toArray()
      expect(logs).toHaveLength(1)
      expect(logs[0]!.warmupDone).toBe(true)
      expect(logs[0]!.sets).toEqual([{ exerciseId: 'back-squat', setIndex: 1, loadKg: 102.5, reps: 5, rpe: 8, done: false }])
    })

    first.unmount()
    renderAt(`/seance/${sessionId}`)
    expect(await screen.findByLabelText(SQUAT_LOAD)).toHaveValue('102,5')
    expect(screen.getByLabelText('Échauffement fait')).toBeChecked()
  })

  it('termine la séance avec le RPE global et la durée, et la marque faite dans la semaine', async () => {
    const user = userEvent.setup()
    renderAt(`/seance/${sessionId}`)
    await user.type(await screen.findByLabelText(SQUAT_LOAD), '100')
    await user.type(screen.getByLabelText('Répétitions série 1, Squat arrière'), '5')

    await user.click(screen.getByRole('button', { name: /Terminer/ }))
    await user.click(screen.getByRole('button', { name: 'Enregistrer la séance' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('RPE')

    await user.type(screen.getByLabelText('RPE de la séance (0 à 10)'), '7,5')
    const duration = screen.getByLabelText('Durée (minutes)')
    await user.clear(duration)
    await user.type(duration, '62')
    await user.click(screen.getByRole('button', { name: 'Enregistrer la séance' }))

    await waitFor(async () => {
      const [log] = await db.sessionLogs.toArray()
      expect(log).toMatchObject({ status: 'terminee', sessionRpe: 7.5, durationMin: 62, sessionId })
    })
    const plan = await getWeekPlan(WEEK)
    expect(plan!.days.find((d) => d.session?.id === sessionId)!.session).toMatchObject({ status: 'faite' })
    // Retour à l'accueil après l'enregistrement.
    expect(await screen.findByRole('heading', { name: 'Accueil' })).toBeInTheDocument()
  })

  it('affiche une séance terminée en lecture seule', async () => {
    const user = userEvent.setup()
    const first = renderAt(`/seance/${sessionId}`)
    await user.type(await screen.findByLabelText(SQUAT_LOAD), '90')
    await user.click(screen.getByRole('button', { name: /Terminer/ }))
    await user.type(screen.getByLabelText('RPE de la séance (0 à 10)'), '6')
    await user.click(screen.getByRole('button', { name: 'Enregistrer la séance' }))
    await screen.findByRole('heading', { name: 'Accueil' })
    first.unmount()

    renderAt(`/seance/${sessionId}`)
    expect(await screen.findByLabelText(SQUAT_LOAD)).toBeDisabled()
    expect(screen.getByLabelText(SQUAT_LOAD)).toHaveValue('90')
    expect(screen.getByRole('status')).toHaveTextContent('Séance terminée')
  })

  it('indique une séance introuvable', async () => {
    renderAt('/seance/s-2026-10-07-haut')
    expect(await screen.findByText(/introuvable/)).toBeInTheDocument()
  })
})
