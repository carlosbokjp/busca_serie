 Consulta de Séries Temporais - BCB (API SGS)
Aplicação web em **HTML + CSS + JavaScript puro** para consulta dinâmica de séries temporais do Banco Central do Brasil através da API oficial do SGS (Sistema Gerenciador de Séries).
Permite filtrar por período, calcular fator acumulado mensal e exportar os resultados em CSV.
---
## Funcionalidades

-  Consulta por código da série SGS
-  Filtro por período (mês/ano inicial e final)
-  Processamento automático dos dados:
  - Acúmulo mensal de índices diários
  - Regra especial para poupança (códigos 25 e 195)
-  Cálculo automático do fator (1 + percentual/100)
-  Exportação para CSV
-  Recarregamento rápido da consulta
-  Interface moderna com layout responsivo

##  Regras Especiais Implementadas
###  Poupança (Códigos 25 e 195)
- Utiliza apenas o **primeiro dia útil de cada mês**
- Converte taxa percentual em **fator**
- Exibe:
  - Mês/Ano
  - Data de referência
  - Percentual
  - Fator calculado
### Demais Índices
- Acumula os valores diários dentro do mês:

