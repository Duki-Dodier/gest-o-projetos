# Cronograma de Projetos — TypeScript

Versão migrada para **Vite + TypeScript**.

## Recursos
- múltiplos projetos;
- Gantt em formato de planilha;
- etapas recolhíveis;
- atividades com responsável, prioridade, status, progresso e peso;
- filtros por texto, responsável, prioridade e status;
- cálculo de progresso ponderado;
- previsão de término pelo ritmo atual;
- login/sair de demonstração;
- persistência local no navegador.

## Desenvolvimento
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
```

A pasta `dist/` gerada é estática e pode ser publicada em qualquer hospedagem de site estático.

## Login de demonstração
- usuário: `admin`
- senha: `1234`

> Para produção, substitua o login local por Supabase Auth, Auth0, Clerk ou backend próprio. Não use credenciais fixas no front-end.

