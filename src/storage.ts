import type { Project } from './types'

const PROJECTS_KEY = 'cronograma-ts-projects-v1'
const SESSION_KEY = 'cronograma-ts-session-v1'

export function loadProjects(): Project[] {
  try {
    return JSON.parse(localStorage.getItem(PROJECTS_KEY) ?? '[]') as Project[]
  } catch {
    return []
  }
}

export function saveProjects(projects: Project[]) {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects))
}

export function isLoggedIn() {
  return sessionStorage.getItem(SESSION_KEY) === '1'
}

export function login(username: string, password: string) {
  // Login local de demonstração. Para produção, substituir por autenticação de servidor/Supabase.
  const ok = username === 'admin' && password === '1234'
  if (ok) sessionStorage.setItem(SESSION_KEY, '1')
  return ok
}

export function logout() {
  sessionStorage.removeItem(SESSION_KEY)
}

