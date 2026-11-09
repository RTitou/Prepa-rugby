import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/App'
import { db } from '../../src/data/db'
import { buildBackup } from '../../src/data/backup/exportData'
import { importBackupText, replaceAllData } from '../../src/data/backup/importData'
import { ensureWeekPlan, getWeekPlan } from '../../src/data/repositories/planRepo'
import { getProfile, setTrainingPhase } from '../../src/data/repositories/profileRepo'
import { addRecord } from '../../src/data/repositories/recordsRepo'
import { programWeek } from '../../src/engine/season'
import { resetDb, seedProfile } from '../helpers'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

beforeEach(async () => {
  // Lundi 5 octobre 2026, 10 h.
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 5, 10, 0, 0))
  await resetDb()
  await seedProfile()
  await addRecord({ test: 'squat', value: 120, unit: 'kg', reps: 5, date: '2026-09-20' })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('phase de saison', () => {
  it('Réglages : choisir Intersaison et un lundi affiche « Intersaison · semaine 1 sur 9 » sur l’accueil', async () => {
    const user = userEvent.setup()
    const view = renderAt('/profil')
    await user.click(await screen.findByLabelText('Intersaison'))
    const start = screen.getByLabelText('Départ (un lundi)')
    expect(start).toHaveValue('2026-10-05')
    expect(screen.getByText(/Fin le dimanche 6 décembre/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Enregistrer la phase' }))
    await waitFor(async () => expect((await getProfile())?.trainingPhase).toEqual({ kind: 'intersaison', startMonday: '2026-10-05' }))
    view.unmount()

    renderAt('/')
    expect(await screen.findByText('Intersaison · semaine 1 sur 9')).toBeInTheDocument()
    expect(await screen.findByText(/Lower body · S1\/9/)).toBeInTheDocument()
  })

  it('refuse un départ qui n’est pas un lundi', async () => {
    const user = userEvent.setup()
    renderAt('/profil')
    await user.click(await screen.findByLabelText('Intersaison'))
    const start = screen.getByLabelText('Départ (un lundi)')
    await user.clear(start)
    await user.type(start, '2026-10-07')
    await user.click(screen.getByRole('button', { name: 'Enregistrer la phase' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('lundi')
  })

  it('revenir en saison régénère les semaines à venir sans toucher aux séances faites', async () => {
    await setTrainingPhase({ kind: 'intersaison', startMonday: '2026-10-05' })
    const before = await ensureWeekPlan('2026-10-05', '2026-10-05')
    const monday = before!.days[0]!.session!
    expect(monday.slot).toBe('atp-lower')
    // Séance du lundi faite.
    const { setSessionDone } = await import('../../src/data/repositories/planRepo')
    await setSessionDone('2026-10-05', monday.id, 'log-1')

    await setTrainingPhase({ kind: 'saison' })
    const after = await ensureWeekPlan('2026-10-05', '2026-10-06')
    expect(after!.days[0]!.session).toMatchObject({ id: monday.id, status: 'faite' })
    expect(after!.days.slice(1).some((d) => d.session?.slot.startsWith('atp-'))).toBe(false)
  })

  it('un export puis un import gardent la phase et la semaine du programme', async () => {
    await setTrainingPhase({ kind: 'intersaison', startMonday: '2026-09-28' })
    const file = await buildBackup()
    await resetDb()
    await replaceAllData(await importBackupText(JSON.stringify(file)))
    const profile = await getProfile()
    expect(profile?.trainingPhase).toEqual({ kind: 'intersaison', startMonday: '2026-09-28' })
    expect(programWeek(profile?.trainingPhase, '2026-10-05')).toBe(2)
  })

  it('refuse une phase illisible à l’import', async () => {
    const file = await buildBackup()
    const rows = file.tables.profile as unknown as Record<string, unknown>[]
    rows[0]!.trainingPhase = { kind: 'intersaison', startMonday: 'demain' }
    await expect(importBackupText(JSON.stringify(file))).rejects.toThrow()
  })
})

describe('séance par blocs', () => {
  beforeEach(async () => {
    // Départ une semaine plus tôt : la semaine du 5 octobre est la S2.
    await setTrainingPhase({ kind: 'intersaison', startMonday: '2026-09-28' })
  })

  it('séance lower de S2 : blocs A à F titrés, C en 5 × 5 avec kg conseillé, F replié et facultatif', async () => {
    await ensureWeekPlan('2026-10-05', '2026-10-05')
    renderAt('/seance/s-2026-10-05-atp-lower')
    expect(await screen.findByRole('heading', { name: /Lower body · S2\/9/ })).toBeInTheDocument()
    const titles = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent ?? '')
    expect(titles[0]).toMatch(/Échauffement Activate/)
    for (const letter of ['A', 'B', 'C', 'D', 'E', 'F']) expect(titles.some((t) => t.startsWith(`${letter} · `)), letter).toBe(true)
    expect(titles.find((t) => t.startsWith('C · '))).toMatch(/Squat arrière/)
    const squat = screen.getByRole('region', { name: 'Squat arrière' })
    expect(squat).toHaveTextContent('5×5 @ RPE 9 · 80-85 %')
    // 5RM de 120 kg : 1RM ATP 142,9 kg ; 82,5 % = 117,9 → 117,5 kg.
    await waitFor(() => expect(within(squat).getByLabelText('Charge série 1, Squat arrière (kg)')).toHaveAttribute('placeholder', '117,5'))
    const finisher = screen.getByText(/^F · /).closest('details')!
    expect(finisher).not.toHaveAttribute('open')
    expect(finisher).toHaveTextContent('facultatif')
  })

  it('séance de S4 : chaque série de la vague affiche ses reps, son % et son kg', async () => {
    vi.setSystemTime(new Date(2026, 9, 19, 10, 0, 0))
    await ensureWeekPlan('2026-10-19', '2026-10-19')
    renderAt('/seance/s-2026-10-19-atp-lower')
    const squat = await screen.findByRole('region', { name: 'Squat arrière' })
    expect(squat).toHaveTextContent('vague 6-4-2-4-6')
    await waitFor(() => expect(within(squat).getByTestId('vague-back-squat-1')).toHaveTextContent(/6 · 78-82 %\s*112,5 kg/))
    expect(within(squat).getByTestId('vague-back-squat-3')).toHaveTextContent('2 · au max')
    expect(within(squat).getByTestId('vague-back-squat-3')).toHaveTextContent('le plus lourd possible')
    expect(within(squat).getByTestId('vague-back-squat-2')).toHaveTextContent('4 · 80-85 %')
  })

  it('séance de tests : renvoie vers Records', async () => {
    await setTrainingPhase({ kind: 'intersaison', startMonday: '2026-10-05' })
    await ensureWeekPlan('2026-10-05', '2026-10-05')
    renderAt('/seance/s-2026-10-09-atp-terrain')
    const note = await screen.findByRole('note')
    expect(note).toHaveTextContent('Broad jump')
    expect(within(note).getByRole('link', { name: /Records/ })).toHaveAttribute('href', '/records')
  })
})

describe('bilan des tests', () => {
  it('après des tests S1 et S9, Records affiche l’écart de chaque test et l’asymétrie gauche / droite', async () => {
    vi.setSystemTime(new Date(2026, 11, 3, 10, 0, 0))
    await setTrainingPhase({ kind: 'intersaison', startMonday: '2026-10-05' })
    await addRecord({ test: 'squat', value: 120, unit: 'kg', reps: 3, date: '2026-10-05' })
    await addRecord({ test: 'squat', value: 130, unit: 'kg', reps: 3, date: '2026-11-30' })
    await addRecord({ test: 'broad-jump', value: 240, unit: 'cm', reps: null, date: '2026-10-09' })
    await addRecord({ test: 'broad-jump', value: 252, unit: 'cm', reps: null, date: '2026-12-04' })
    await addRecord({ test: 't-test', value: 10.4, unit: 's', reps: null, date: '2026-10-09' })
    await addRecord({ test: 't-test', value: 10.1, unit: 's', reps: null, date: '2026-12-04' })
    await addRecord({ test: 'saut-lateral-gauche', value: 180, unit: 'cm', reps: null, date: '2026-12-04' })
    await addRecord({ test: 'saut-lateral-droite', value: 200, unit: 'cm', reps: null, date: '2026-12-04' })

    renderAt('/records')
    const bilan = await screen.findByRole('region', { name: 'Bilan de l’intersaison' })
    expect(bilan).toHaveTextContent('120 kg × 3 → 130 kg × 3 (+10,0 kg)')
    expect(bilan).toHaveTextContent('240 cm → 252 cm (+12 cm)')
    expect(bilan).toHaveTextContent('(−0,30 s)')
    expect(bilan).toHaveTextContent('gauche 180 cm, droite 200 cm · écart 10 % (jambe gauche plus faible)')
  })

  it('saisit un broad jump en cm', async () => {
    const user = userEvent.setup()
    renderAt('/records')
    await user.click(await screen.findByRole('button', { name: '+ Ajouter' }))
    await user.selectOptions(screen.getByLabelText('Test'), 'broad-jump')
    await user.type(screen.getByLabelText('Distance (cm)'), '245')
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await waitFor(async () => expect((await db.records.toArray()).find((r) => r.test === 'broad-jump')).toMatchObject({ value: 245, unit: 'cm', reps: null }))
    expect(await getWeekPlan('2026-10-05')).toBeDefined()
  })
})
