export type Priority = 'baixa' | 'media' | 'alta'
export type TaskStatus = 'Não iniciado' | 'Em andamento' | 'Pausado' | 'Aguardando' | 'Concluído' | 'Cancelado'

export interface Task {
  id: string
  stage: string
  title: string
  responsible: string
  priority: Priority
  status: TaskStatus
  startDate: string
  endDate: string
  progress: number
  weight: number
}

export interface Project {
  id: string
  title: string
  subtitle: string
  startDate: string
  targetEndDate: string
  tasks: Task[]
}

export interface Filters {
  search: string
  responsible: string
  priority: '' | Priority
  status: '' | TaskStatus | 'Atrasado'
}

