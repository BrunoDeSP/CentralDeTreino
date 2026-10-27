# Central de Treino

Site para acompanhar os treinos pelo celular. Esta primeira versão cuida da
montagem do treino: ela escolhe quantos dias por semana quer treinar, o app
monta a divisão, organiza a semana como uma fila e guarda o histórico.

## Estrutura de pastas

Mantenha exatamente estas pastas ao subir para o GitHub:

```
central-de-treino/
├── index.html                  página única do app
├── manifest.webmanifest        permite instalar na tela inicial
├── sw.js                       funciona offline (academia com sinal ruim)
├── README.md
├── css/
│   └── estilos.css             visual (cores e tamanhos no topo do arquivo)
├── fontes/
│   ├── archivo-variavel.woff2  fonte Archivo, hospedada junto com o site
│   └── OFL.txt                 licença da fonte
├── icones/
│   ├── icone-192.png
│   ├── icone-512.png
│   ├── icone-maskable-512.png
│   └── apple-touch-icon.png
└── js/
    ├── app.js                  inicia o app, rotas (#/hoje, #/ciclo...) e eventos
    ├── config.js               dias permitidos, duração do ciclo, equipamentos por local
    ├── estado.js               carrega, altera e salva os dados
    ├── armazenamento/
    │   ├── index.js            ponto de troca: local hoje, planilha depois
    │   └── local.js            salva no navegador do celular
    ├── dados/
    │   ├── exercicios.js       banco de exercícios (exemplo)
    │   └── modelos.js          divisões de 1 a 5 dias
    ├── treino/
    │   ├── gerador.js          monta os treinos do ciclo
    │   └── regras-do-ciclo.js  ciclo, fila, semanas e histórico
    ├── telas/
    │   ├── hoje.js             barra da semana + treino do dia
    │   ├── novo-ciclo.js       escolher dias e semanas
    │   ├── ciclo.js            treinos, histórico e ações do ciclo
    │   ├── treino.js           ficha de qualquer treino do ciclo
    │   └── comum.js            partes usadas por mais de uma tela
    ├── ui/
    │   ├── componentes.js      anilha, barra, ficha
    │   ├── avisos.js           aviso com "Desfazer" e confirmação
    │   └── html.js             templates com escape automático
    └── util/
        ├── datas.js
        └── texto.js
```

## Como testar no computador

O JavaScript está dividido em módulos, e o navegador não carrega módulos
abrindo o `index.html` com dois cliques. Rode um servidor simples dentro da
pasta do projeto:

```
python -m http.server 8000
```

e abra `http://localhost:8000`. Para testar no celular na mesma rede Wi-Fi,
use `http://IP-DO-COMPUTADOR:8000` (o modo offline só liga em `https` ou
`localhost`, mas o resto funciona).

## Publicar no GitHub Pages

1. Crie um repositório e envie os arquivos mantendo as pastas, com o
   `index.html` na raiz.
2. Em **Settings → Pages → Build and deployment**, escolha
   **Deploy from a branch**, branch `main`, pasta `/ (root)`.
3. Em alguns minutos o site fica em
   `https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/`.
4. No celular dela: abrir o link no navegador e usar
   **Adicionar à tela inicial**.

## Como a montagem funciona

- **Ciclo:** período de 4 a 6 semanas em que os exercícios não mudam, para a
  progressão de carga ter com o que comparar.
- **Modelo:** cada quantidade de dias tem uma divisão em `modelos.js`
  (1 dia: corpo todo; 2 e 3 dias: corpo todo variado; 4 dias: pernas e
  tronco alternados; 5 dias: pernas e tronco + circuito).
- **Vagas:** cada treino é uma lista de vagas por padrão de movimento
  (agachar, dobrar o quadril, empurrar, puxar, core...). O gerador preenche
  cada vaga com um exercício do banco, em rodízio, para os treinos não
  repetirem exercícios.
- **Fila:** o próximo treino é sempre o seguinte ao último concluído, sem
  ficar preso a dia da semana. Se ela fizer um treino fora da ordem, a fila
  continua a partir dele.
- **Semanas:** contam a partir do dia em que o ciclo começou. A meta da
  semana é a quantidade de dias escolhida.
- **Mudança definitiva de dias:** montar um novo ciclo encerra o atual. O
  histórico continua salvo.

## Onde mexer

| Quero mudar...                                   | Arquivo                   |
| ------------------------------------------------ | ------------------------- |
| Exercícios (nomes, equipamento, incremento)      | `js/dados/exercicios.js`  |
| Divisões, séries, repetições, descanso, cardio   | `js/dados/modelos.js`     |
| Dias permitidos, semanas, equipamentos por local | `js/config.js`            |
| Cores, fonte, espaçamentos                       | `css/estilos.css`         |

Ao criar um arquivo novo, adicione o caminho dele na lista `ARQUIVOS` do
`sw.js` para ele também funcionar offline.

## Onde ficam os dados

Por enquanto, no navegador do celular dela (`localStorage`, chave
`central-de-treino`). Limpar os dados do navegador ou trocar de aparelho apaga
tudo: é provisório até ligarmos a planilha. Nenhum dado pessoal vai para o
repositório.

Quando o Google Planilhas entrar, cada parte vira uma aba:
`exercicios.js` → **Exercícios**, `modelos.js` → **Modelos**, ciclos →
**Ciclo**, treinos concluídos → **Sessões**, cargas → **Séries**.

## Próximos passos

1. Registro de carga e repetições por série, com a progressão de carga.
2. Adaptador do Google Planilhas (Apps Script) no lugar de
   `armazenamento/local.js`.
3. Pergunta de local de treino (academia ou casa) na tela de novo ciclo.
4. Avaliações (bioimpedância), hábitos e dieta.

---

Fonte: Archivo, licença SIL Open Font License (`fontes/OFL.txt`).
