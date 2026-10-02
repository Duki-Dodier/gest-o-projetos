import './style.css'
import type { Filters, Priority, Project, Task, TaskStatus } from './types'
import { isLoggedIn, loadProjects, login, logout as endSession, saveProjects } from './storage'

const app = document.querySelector<HTMLDivElement>('#app')!
const dayMs = 86_400_000
let projects = loadProjects()
let currentProjectId = projects[0]?.id ?? ''
let collapsedStages = new Set<string>()
let editingTaskId: string | null = null
let editingProjectId: string | null = null
let filters: Filters = { search: '', responsible: '', priority: '', status: '' }

const uid = () => crypto.randomUUID()
const todayIso = () => new Date().toISOString().slice(0, 10)
const addDays = (date: string, days: number) => {
  const d = new Date(`${date}T00:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}
const diffDays = (a: string, b: string) => Math.max(1, Math.round((new Date(`${b}T00:00:00`).getTime() - new Date(`${a}T00:00:00`).getTime()) / dayMs) + 1)
const formatDate = (date: string) => new Date(`${date}T00:00:00`).toLocaleDateString('pt-BR')
const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c] ?? c))

function seed() {
  if (projects.length) return
  const start = todayIso()
  projects = [{
    id: uid(), title: 'Projeto Exemplo', subtitle: 'Cronograma em formato de planilha/Gantt', startDate: start, targetEndDate: addDays(start, 20), tasks: [
      task('Planejamento', 'Levantamento inicial', 'Ana', 'alta', start, addDays(start, 2), 100, 10),
      task('Planejamento', 'Definição de escopo', 'Carlos', 'media', addDays(start, 2), addDays(start, 4), 60, 10),
      task('Layout', 'Desenvolver layout', 'João', 'alta', addDays(start, 5), addDays(start, 8), 20, 20),
      task('Projeto Executivo', 'Modelagem técnica', 'Maria', 'media', addDays(start, 8), addDays(start, 13), 0, 30),
      task('Protótipo', 'Montagem e validação', 'Paulo', 'alta', addDays(start, 13), addDays(start, 18), 0, 30),
    ]
  }]
  currentProjectId = projects[0].id
  persist()
}
function task(stage:string,title:string,responsible:string,priority:Priority,startDate:string,endDate:string,progress:number,weight:number):Task {
  return { id: uid(), stage, title, responsible, priority, status: progress === 100 ? 'Concluído' : progress > 0 ? 'Em andamento' : 'Não iniciado', startDate, endDate, progress, weight }
}
function persist(){ saveProjects(projects) }
function currentProject(){ return projects.find(p => p.id === currentProjectId) ?? projects[0] }
function isLate(t: Task){ return t.status !== 'Concluído' && t.status !== 'Cancelado' && t.endDate < todayIso() }
function displayStatus(t: Task){ return isLate(t) ? 'Atrasado' : t.status }
function projectProgress(p: Project){
  const active = p.tasks.filter(t => t.status !== 'Cancelado')
  const totalWeight = active.reduce((s,t)=>s+t.weight,0) || 1
  return Math.round(active.reduce((s,t)=>s+(t.progress/100)*t.weight,0)/totalWeight*100)
}
function predictedEnd(p: Project){
  const pct = projectProgress(p)
  const elapsed = Math.max(1, diffDays(p.startDate, todayIso()))
  if (pct <= 0) return p.targetEndDate
  const totalEstimate = Math.ceil(elapsed / (pct/100))
  return addDays(p.startDate, totalEstimate - 1)
}

function render(){
  if (!isLoggedIn()) return renderLogin()
  seed()
  renderDashboard()
}
function renderLogin(){
  app.innerHTML = `<main class="login-screen"><section class="login-card"><div style="font-size:36px;text-align:center">📊</div><h1>Cronograma de Projetos</h1><p>Entre para acessar seus cronogramas</p><form id="login-form"><label>Usuário</label><input name="user" autocomplete="username" required><label>Senha</label><input name="pass" type="password" autocomplete="current-password" required><button class="primary">Entrar</button><div id="login-error"></div></form><div class="demo-note">Acesso de demonstração: <b>admin</b> / <b>1234</b></div></section></main>`
  document.querySelector<HTMLFormElement>('#login-form')!.onsubmit = e => {
    e.preventDefault(); const fd = new FormData(e.currentTarget); const ok = login(String(fd.get('user')), String(fd.get('pass')))
    if(ok) render(); else document.querySelector('#login-error')!.innerHTML = '<div class="login-error">Usuário ou senha inválidos.</div>'
  }
}
function renderDashboard(){
  const p = currentProject(); if(!p){ projects=[]; seed(); return renderDashboard() }
  const pct = projectProgress(p)
  const pred = predictedEnd(p)
  const responsibles = [...new Set(p.tasks.map(t=>t.responsible).filter(Boolean))].sort()
  app.innerHTML = `
  <header class="topbar"><div class="topline"><div class="brand">📋 CRONOGRAMA DE PROJETOS<small>Planejamento e acompanhamento</small></div><div class="actions"><button class="icon-btn" id="new-project">+ Projeto</button><button class="icon-btn" id="new-task">+ Atividade</button><button class="danger" id="logout">Sair do aplicativo</button></div></div><div class="legend"><span class="blue">EM ANDAMENTO</span><span class="green">CONCLUÍDO</span><span class="yellow">PENDENTE</span><span class="red">ATRASADO</span><span class="purple">ALTA PRIORIDADE</span></div></header>
  <main class="shell"><div class="project-title">${esc(p.title)}${p.subtitle?` — ${esc(p.subtitle)}`:''}</div>
  <section class="filterbar">
    <select id="project-select">${projects.map(x=>`<option value="${x.id}" ${x.id===p.id?'selected':''}>${esc(x.title)}</option>`).join('')}</select>
    <input id="search" placeholder="🔎 Buscar atividade..." value="${esc(filters.search)}">
    <select id="resp"><option value="">Responsável: todos</option>${responsibles.map(r=>`<option ${filters.responsible===r?'selected':''}>${esc(r)}</option>`).join('')}</select>
    <select id="priority"><option value="">Prioridade: todas</option><option value="alta" ${filters.priority==='alta'?'selected':''}>Alta</option><option value="media" ${filters.priority==='media'?'selected':''}>Média</option><option value="baixa" ${filters.priority==='baixa'?'selected':''}>Baixa</option></select>
    <select id="status"><option value="">Status: todos</option>${['Não iniciado','Em andamento','Pausado','Aguardando','Concluído','Cancelado','Atrasado'].map(s=>`<option ${filters.status===s?'selected':''}>${s}</option>`).join('')}</select>
    <button class="secondary" id="edit-project">Editar projeto</button>
  </section>
  <section class="stats"><div class="stat">Atividades <b>${p.tasks.length}</b></div><div class="stat">Concluídas <b>${p.tasks.filter(t=>t.status==='Concluído').length}</b></div><div class="stat">Evolução <b>${pct}%</b></div><div class="stat">Meta <b>${formatDate(p.targetEndDate)}</b></div><div class="stat">Previsão atual <b>${formatDate(pred)}</b></div></section>
  <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
  <section class="gantt-wrap" style="margin-top:10px"><div id="gantt"></div></section><div class="footer-note">A linha vermelha indica hoje. O progresso do projeto considera o peso de cada atividade.</div></main>`
  bindDashboardEvents(); renderGantt()
}
function filteredTasks(p:Project){
  return p.tasks.filter(t => {
    const hay = `${t.title} ${t.stage} ${t.responsible}`.toLowerCase()
    return (!filters.search || hay.includes(filters.search.toLowerCase())) && (!filters.responsible || t.responsible===filters.responsible) && (!filters.priority || t.priority===filters.priority) && (!filters.status || displayStatus(t)===filters.status)
  })
}
function renderGantt(){
  const p = currentProject(); const holder = document.querySelector<HTMLDivElement>('#gantt'); if(!p||!holder) return
  const tasks = filteredTasks(p)
  const allDates = [p.startDate,p.targetEndDate,...p.tasks.flatMap(t=>[t.startDate,t.endDate])].sort()
  const start = allDates[0], end = allDates.at(-1)!, days = diffDays(start,end), timeline = days*28
  const groups = [...new Set(tasks.map(t=>t.stage))]
  let html = `<div class="gantt" style="--timeline:${timeline}px;--days:${days}"><div class="row head"><div>Etapas / Atividades</div><div>Responsável</div><div>Duração</div><div class="timeline-head">${Array.from({length:days},(_,i)=>{const d=new Date(`${addDays(start,i)}T00:00:00`);return `<div><b>${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}</b><br>${['DOM','SEG','TER','QUA','QUI','SEX','SÁB'][d.getDay()]}</div>`}).join('')}</div></div>`
  for(const stage of groups){
    const st = tasks.filter(t=>t.stage===stage), collapsed = collapsedStages.has(stage)
    html += `<div class="row group"><div class="cell"><button class="tiny edit stage-toggle" data-stage="${esc(stage)}">${collapsed?'▶':'▼'}</button> ${esc(stage)}</div><div class="cell"></div><div class="cell">${st.length} itens</div><div class="timeline"></div></div>`
    if(collapsed) continue
    for(const t of st){
      const duration=diffDays(t.startDate,t.endDate), left=(diffDays(start,t.startDate)-1)*28, width=duration*28-2, late=isLate(t)
      html += `<div class="row"><div class="cell task-title"><b>${esc(t.title)}</b><div class="task-actions"><button class="tiny edit" data-edit="${t.id}">Editar</button><button class="tiny done" data-done="${t.id}">${t.status==='Concluído'?'Reabrir':'Concluir'}</button><button class="tiny delete" data-delete="${t.id}">Excluir</button></div></div><div class="cell">${esc(t.responsible||'—')}</div><div class="cell">${duration} d</div><div class="timeline"><div class="gbar ${t.status==='Concluído'?'done':''} ${late?'late':''} ${t.priority==='alta'?'high':''}" style="left:${left}px;width:${Math.max(width,20)}px" title="${esc(displayStatus(t))} · ${t.progress}%">${t.progress}%</div></div></div>`
    }
  }
  if(!tasks.length) html += '<div class="empty">Nenhuma atividade corresponde aos filtros.</div>'
  const today=todayIso(); if(today>=start&&today<=end) html += `<div class="today" style="left:${300+120+78+(diffDays(start,today)-1)*28}px"></div>`
  html += '</div>'; holder.innerHTML=html
  document.querySelectorAll<HTMLButtonElement>('.stage-toggle').forEach(b=>b.onclick=()=>{const s=b.dataset.stage!; collapsedStages.has(s)?collapsedStages.delete(s):collapsedStages.add(s);renderGantt()})
  document.querySelectorAll<HTMLButtonElement>('[data-edit]').forEach(b=>b.onclick=()=>openTaskModal(b.dataset.edit!))
  document.querySelectorAll<HTMLButtonElement>('[data-done]').forEach(b=>b.onclick=()=>toggleDone(b.dataset.done!))
  document.querySelectorAll<HTMLButtonElement>('[data-delete]').forEach(b=>b.onclick=()=>deleteTask(b.dataset.delete!))
}
function bindDashboardEvents(){
  document.querySelector<HTMLButtonElement>('#logout')!.onclick=()=>{endSession();render()}
  document.querySelector<HTMLButtonElement>('#new-project')!.onclick=()=>openProjectModal()
  document.querySelector<HTMLButtonElement>('#new-task')!.onclick=()=>openTaskModal()
  document.querySelector<HTMLButtonElement>('#edit-project')!.onclick=()=>openProjectModal(currentProjectId)
  document.querySelector<HTMLSelectElement>('#project-select')!.onchange=e=>{currentProjectId=(e.target as HTMLSelectElement).value;filters={search:'',responsible:'',priority:'',status:''};renderDashboard()}
  const update=()=>{filters.search=document.querySelector<HTMLInputElement>('#search')!.value;filters.responsible=document.querySelector<HTMLSelectElement>('#resp')!.value;filters.priority=document.querySelector<HTMLSelectElement>('#priority')!.value as Filters['priority'];filters.status=document.querySelector<HTMLSelectElement>('#status')!.value as Filters['status'];renderGantt()}
  document.querySelector<HTMLInputElement>('#search')!.oninput=update; document.querySelector<HTMLSelectElement>('#resp')!.onchange=update; document.querySelector<HTMLSelectElement>('#priority')!.onchange=update; document.querySelector<HTMLSelectElement>('#status')!.onchange=update
}
function openProjectModal(projectId?:string){
  editingProjectId=projectId??null; const p=projects.find(x=>x.id===projectId)
  showModal(`<div class="modal-head"><h2>${p?'Editar':'Novo'} projeto</h2><button class="icon-btn" id="close-modal">✕</button></div><form id="project-form"><div class="form-grid"><div><label>Título</label><input name="title" required value="${esc(p?.title??'')}"></div><div><label>Subtítulo</label><input name="subtitle" value="${esc(p?.subtitle??'')}"></div><div><label>Início</label><input name="start" type="date" required value="${p?.startDate??todayIso()}"></div><div><label>Meta de término</label><input name="end" type="date" required value="${p?.targetEndDate??addDays(todayIso(),30)}"></div></div><div class="modal-actions"><button type="button" class="secondary" id="cancel-modal">Cancelar</button><button class="primary">Salvar</button></div></form>`)
  document.querySelector<HTMLFormElement>('#project-form')!.onsubmit=e=>{e.preventDefault();const fd=new FormData(e.currentTarget);if(p){p.title=String(fd.get('title'));p.subtitle=String(fd.get('subtitle'));p.startDate=String(fd.get('start'));p.targetEndDate=String(fd.get('end'))}else{const np:Project={id:uid(),title:String(fd.get('title')),subtitle:String(fd.get('subtitle')),startDate:String(fd.get('start')),targetEndDate:String(fd.get('end')),tasks:[]};projects.push(np);currentProjectId=np.id}persist();closeModal();renderDashboard()}
}
function openTaskModal(taskId?:string){
  const p=currentProject(); if(!p)return; editingTaskId=taskId??null; const t=p.tasks.find(x=>x.id===taskId)
  showModal(`<div class="modal-head"><h2>${t?'Editar':'Nova'} atividade</h2><button class="icon-btn" id="close-modal">✕</button></div><form id="task-form"><div class="form-grid"><div><label>Etapa</label><input name="stage" required value="${esc(t?.stage??'')}"></div><div><label>Atividade</label><input name="title" required value="${esc(t?.title??'')}"></div><div><label>Responsável</label><input name="responsible" value="${esc(t?.responsible??'')}"></div><div><label>Prioridade</label><select name="priority">${['baixa','media','alta'].map(x=>`<option value="${x}" ${(t?.priority??'media')===x?'selected':''}>${x}</option>`).join('')}</select></div><div><label>Status</label><select name="status">${['Não iniciado','Em andamento','Pausado','Aguardando','Concluído','Cancelado'].map(x=>`<option ${t?.status===x?'selected':''}>${x}</option>`).join('')}</select></div><div><label>Progresso (%)</label><input name="progress" type="number" min="0" max="100" value="${t?.progress??0}"></div><div><label>Início</label><input name="start" type="date" required value="${t?.startDate??p.startDate}"></div><div><label>Término</label><input name="end" type="date" required value="${t?.endDate??p.targetEndDate}"></div><div><label>Peso</label><input name="weight" type="number" min="1" max="100" value="${t?.weight??10}"></div></div><div class="modal-actions"><button type="button" class="secondary" id="cancel-modal">Cancelar</button><button class="primary">Salvar</button></div></form>`)
  document.querySelector<HTMLFormElement>('#task-form')!.onsubmit=e=>{e.preventDefault();const fd=new FormData(e.currentTarget);const item:Task={id:t?.id??uid(),stage:String(fd.get('stage')),title:String(fd.get('title')),responsible:String(fd.get('responsible')),priority:String(fd.get('priority')) as Priority,status:String(fd.get('status')) as TaskStatus,startDate:String(fd.get('start')),endDate:String(fd.get('end')),progress:Number(fd.get('progress')),weight:Number(fd.get('weight'))};if(t)Object.assign(t,item);else p.tasks.push(item);persist();closeModal();renderDashboard()}
}
function toggleDone(id:string){const p=currentProject();const t=p?.tasks.find(x=>x.id===id);if(!t)return;if(t.status==='Concluído'){t.status='Em andamento';t.progress=Math.min(t.progress,99)}else{t.status='Concluído';t.progress=100}persist();renderDashboard()}
function deleteTask(id:string){const p=currentProject();if(!p||!confirm('Excluir esta atividade?'))return;p.tasks=p.tasks.filter(t=>t.id!==id);persist();renderDashboard()}
function showModal(content:string){document.body.insertAdjacentHTML('beforeend',`<div class="modal-backdrop" id="modal-backdrop"><section class="modal">${content}</section></div>`);document.querySelector<HTMLButtonElement>('#close-modal')!.onclick=closeModal;document.querySelector<HTMLButtonElement>('#cancel-modal')!.onclick=closeModal}
function closeModal(){document.querySelector('#modal-backdrop')?.remove();editingTaskId=null;editingProjectId=null}

render()

