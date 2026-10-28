# Central de Treino

Site para acompanhar treinos e hábitos pelo celular. Ela escolhe quantos
dias por semana quer treinar, o app monta a divisão e organiza a semana.
Durante o treino, o app mostra uma série por vez com a carga sugerida,
registra o que ela fez e cuida da pausa. No Início ficam o botão do treino e
o rastreador de hábitos.

## O que o app faz

- **Início:** a data, a semana atual com os dias de treino pintados e o
  contador da meta (ex.: 2/3), o botão "Começar treino" (ou "Criar ciclo",
  que monta o ciclo e já abre o primeiro treino) e os hábitos com o
  calendário do mês.
- **Configurações:** abertas pela engrenagem no canto do Início.
- **Rastreador de hábitos (Início):** um cartão por hábito com o calendário
  do mês, troca de mês e o contador da meta (vezes por semana ou por mês, ela
  escolhe em cada um). O check no canto marca o dia de hoje, e tocar num dia
  do calendário marca um dia anterior. Os treinos entram sozinhos como um
  hábito, com meta própria, separada da programação do ciclo.
- **Ciclo e divisão:** de 1 a 5 dias por semana, por 1 a 5 semanas. Os
  exercícios ficam fixos durante o ciclo e os treinos andam em fila.
- **Treino em andamento:** uma série por vez, com carga e repetições já
  preenchidas (ajustáveis no + e − ou digitando) e o botão "Concluir série".
  Tudo é salvo a cada toque: fechar o app no meio não perde nada.
- **Pausa:** botão que dispara um cronômetro, com +15, −15 e pular. Pode
  começar sozinho ao concluir a série, tocar um bipe, vibrar e manter a tela
  ligada (cada item liga e desliga em Configurações).
- **Progressão de carga:** guardada por exercício, vale para qualquer treino
  e ciclo. A tela Ciclo mostra a carga atual e a melhor marca de cada um.
- **Hábitos (aba):** criar, editar e excluir hábitos, com nome, meta e cor.
  Abaixo, 4 meses de cada hábito em quadradinhos, como no GitHub (cada coluna
  é uma semana, as linhas vão de segunda a domingo), com os dias feitos em
  verde e troca de mês.
- **Exercícios (aba):** os exercícios já feitos, separados em Inferiores,
  Superiores, Core e Cardio, com a carga atual e quantas vezes ela fez cada
  um. A página de cada exercício tem o gráfico da evolução, quantas vezes ela
  fez com cada carga e o histórico com as séries.
- **Cardio:** registrado no fim do treino (tipo e minutos). É opcional e não
  conta nas séries.
- **Configurações (engrenagem):** tempo de pausa, comportamento durante o
  treino e apagar os dados.

## Hábitos: incentivar sem destacar as falhas

- Os dias feitos ficam cheios, na cor do hábito. Os outros ficam neutros,
  sem X nem vermelho.
- Não existe contagem de dias seguidos: ela zera na primeira falha e
  desanima em hábitos que não são diários. O app só soma o que foi feito.
- No Início, as semanas com a meta batida ficam douradas (nas metas por mês,
  o mês inteiro), e os dias feitos continuam na cor do hábito. O dourado
  aparece só no Início.
- O resumo só mostra conquistas: em quantas semanas ou meses ela bateu a meta.
- Quando a meta é batida, aparece o selo "Meta batida" e um aviso na hora.
- As semanas começam na segunda-feira.

## Progressão de carga (dupla progressão)

- Cada exercício tem uma meta de repetições (ex.: 10 a 12).
- Fez **todas** as séries no topo da meta com a mesma carga: no próximo treino
  a carga sobe o `incremento` do exercício (definido em `exercicios.js`).
- Senão, a carga se mantém e o objetivo é fazer mais repetições.
- Três treinos seguidos sem evoluir: o app sugere baixar a carga ou trocar o
  exercício.
- Exercícios sem carga (peso do corpo, elástico): ao bater o topo da meta, o
  app avisa que dá para dificultar.
- As repetições de cada série começam com o que ela fez da última vez com a
  mesma carga. Se a carga subiu, começam no mínimo da meta.
- "Já fiz, só marcar como feito" conta o treino sem mexer nas cargas.

## Estrutura de pastas

```
central-de-treino/
├── index.html                  página única do app
├── manifest.webmanifest        permite instalar na tela inicial
├── sw.js                       funciona offline e busca atualizações
├── README.md
├── css/estilos.css             visual (cores e tamanhos no topo do arquivo)
├── fontes/                     fonte Archivo + licença
├── icones/                     ícones do app
└── js/
    ├── app.js                  inicia o app, rotas (#/hoje, #/sessao...) e eventos
    ├── config.js               dias, semanas, limites e valores iniciais das configurações
    ├── estado.js               carrega, altera, salva e migra os dados
    ├── armazenamento/
    │   ├── index.js            ponto de troca: local hoje, planilha depois
    │   └── local.js            salva no navegador do celular
    ├── dados/
    │   ├── exercicios.js       banco de exercícios (exemplo)
    │   ├── modelos.js          divisões de 1 a 5 dias
    │   └── regioes.js          regiões do corpo e tipos de cardio
    ├── habitos/
    │   └── regras-dos-habitos.js  metas, contagens e resumo do mês
    ├── treino/
    │   ├── gerador.js          monta os treinos do ciclo
    │   ├── regras-do-ciclo.js  ciclo, fila, semanas e histórico
    │   ├── sessao.js           treino em andamento (séries, cardio, pausa, finalizar)
    │   ├── historico.js        histórico de cada exercício, para a aba Exercícios
    │   └── progressao.js       regras da progressão de carga
    ├── telas/
    │   ├── hoje.js             Início: botão do treino + hábitos (rota #/hoje)
    │   ├── habitos.js          lista de hábitos
    │   ├── habito.js           criar e editar um hábito
    │   ├── sessao.js           treino em andamento
    │   ├── novo-ciclo.js       escolher dias e semanas
    │   ├── ciclo.js            treinos, histórico, cargas atuais
    │   ├── treino.js           ficha de qualquer treino do ciclo
    │   ├── configuracoes.js    pausa, opções do treino e dados
    │   ├── exercicios.js       aba Exercícios, por região do corpo
    │   ├── exercicio.js        página de um exercício (gráfico, cargas, histórico)
    │   └── comum.js            partes usadas por mais de uma tela
    ├── ui/
    │   ├── componentes.js      anilha, barra, ficha
    │   ├── calendario.js       semana do treino, calendário do mês e quadradinhos
    │   ├── grafico.js          gráfico de linha em SVG
    │   ├── cronometro.js       relógio da pausa, bipe, vibração e tela ligada
    │   ├── avisos.js           aviso com "Desfazer" e confirmação
    │   └── html.js             templates com escape automático
    └── util/
        ├── datas.js
        └── texto.js            plural, kg, tempo e duração
```

## Como testar no computador

O JavaScript está dividido em módulos, e o navegador não carrega módulos
abrindo o `index.html` com dois cliques. Rode um servidor simples dentro da
pasta do projeto:

```
python -m http.server 8000
```

e abra `http://localhost:8000`.

## Publicar e atualizar no GitHub Pages

- **Primeira vez:** envie os arquivos mantendo as pastas, com o `index.html`
  na raiz. Em **Settings → Pages**, escolha **Deploy from a branch**, branch
  `main`, pasta `/ (root)`.
- **Atualizações:** cada entrega vem num zip só com os arquivos alterados, já
  nas pastas certas. Extraia por cima do projeto e envie esses arquivos.
- Se o celular ainda mostrar a versão antiga depois de publicar, feche e abra
  o app de novo.

## Limites do navegador

- O bipe e a vibração só funcionam com o app aberto na tela. Com a opção
  "Manter a tela ligada", o celular não bloqueia durante o treino.
- O iPhone não vibra pelo navegador, então lá o aviso é só o bipe.
- O cronômetro usa o horário de término: se a tela apagar, o tempo continua
  certo quando ela voltar.

## Onde mexer

| Quero mudar...                                       | Arquivo                    |
| ---------------------------------------------------- | -------------------------- |
| Exercícios (nome, equipamento, incremento da carga)  | `js/dados/exercicios.js`   |
| Divisões, séries, repetições e cardio                | `js/dados/modelos.js`      |
| Regras da progressão                                 | `js/treino/progressao.js`  |
| Cores e sugestões de hábitos                         | `js/habitos/regras-dos-habitos.js` |
| Valores iniciais e limites das configurações         | `js/config.js`             |
| Cores, fonte, espaçamentos                           | `css/estilos.css`          |

Ao criar um arquivo novo, adicione o caminho dele na lista `ARQUIVOS` do
`sw.js` para ele também funcionar offline.

## Onde ficam os dados

Por enquanto, no navegador do celular dela (`localStorage`, chave
`central-de-treino`). Limpar os dados do navegador ou trocar de aparelho apaga
tudo: é provisório até ligarmos a planilha. Os dados da versão anterior são
convertidos sozinhos na primeira abertura.

Formato salvo (versão 4): `ciclos` (com o histórico e as séries de cada
treino), `progressao` (carga atual, última vez e melhor marca por exercício),
`habitos` (nome, cor, meta e dias feitos), `habitoTreinos` (a meta dos
treinos), `configuracoes` e `sessaoEmAndamento`.

Quando o Google Planilhas entrar, cada parte vira uma aba: **Exercícios**,
**Modelos**, **Ciclo**, **Sessões**, **Séries**, **Progressão** e **Hábitos**.

## Próximos passos

1. Adaptador do Google Planilhas (Apps Script) no lugar de
   `armazenamento/local.js`.
2. Pergunta de local de treino (academia ou casa) na tela de novo ciclo.
3. Avaliações (bioimpedância) e dieta.

---

Fonte: Archivo, licença SIL Open Font License (`fontes/OFL.txt`).
