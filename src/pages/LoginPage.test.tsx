import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../auth/AuthProvider'
import { apiError, jsonResponse, mockFetch } from '../test/helpers'
import { LoginPage } from './LoginPage'

function renderLogin() {
  return render(
    <AuthProvider baseUrl="">
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<p>Dashboard home</p>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}

describe('LoginPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('posts the credentials and goes to the dashboard on success', async () => {
    const fetchMock = mockFetch(jsonResponse(200, { accessToken: 'jwt', tokenType: 'Bearer', expiresInSeconds: 3600 }))
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText('Username'), 'admin')
    await user.type(screen.getByLabelText('Password'), 'change-me-please')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('Dashboard home')).toBeInTheDocument()
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/auth/login')
    expect(JSON.parse(init?.body as string)).toEqual({ username: 'admin', password: 'change-me-please' })
  })

  it('shows an error banner for wrong credentials and stays on the login page', async () => {
    vi.stubGlobal('fetch', mockFetch(jsonResponse(401, apiError(401, 'Invalid username or password'))))
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText('Username'), 'admin')
    await user.type(screen.getByLabelText('Password'), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid username or password.')
    expect(screen.queryByText('Dashboard home')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled()
  })
})
