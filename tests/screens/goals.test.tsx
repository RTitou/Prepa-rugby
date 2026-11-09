import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import App from '../../src/App'
import { buildBackup } from '../../src/data/backup/exportData'
import { importBackupText } from '../../src/data/backup/importData'
import { getProfile, setGoals } from '../../src/data/repositories/profileRepo'
import { resetDb, seedProfile } from '../helpers'

beforeEach(async () => {
  await resetDb()
  await seedProfile()
})

describe('objectifs dans les réglages', () => {
  it('change l’objectif principal et le secondaire', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/profil']}>
        <App />
      </MemoryRouter>,
    )
    const section = await screen.findByRole('region', { name: 'Ce que tu veux améliorer' })
    await user.click(within(within(section).getByRole('group', { name: 'Ton objectif principal' })).getByLabelText(/^Force/))
    await user.click(within(within(section).getByRole('group', { name: 'Ton objectif secondaire' })).getByLabelText(/^Explosivité/))
    await user.click(within(section).getByRole('button', { name: 'Enregistrer les objectifs' }))
    await waitFor(async () => expect((await getProfile())?.goals).toEqual({ primary: 'force-hypertrophie', secondary: 'explosivite' }))
  })

  it('refuse un secondaire identique au principal, à l’enregistrement comme à l’import', async () => {
    await expect(setGoals({ primary: 'endurance', secondary: 'endurance' })).rejects.toThrow('différent')
    await setGoals({ primary: 'endurance', secondary: null })
    const file = await buildBackup()
    const rows = file.tables.profile as unknown as Record<string, unknown>[]
    rows[0]!.goals = { primary: 'endurance', secondary: 'endurance' }
    await expect(importBackupText(JSON.stringify(file))).rejects.toThrow()
  })
})
