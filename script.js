// --- JavaScript puro (sem dependências) ---
(function() {
    // Elementos principais
    const tabelaCorpo = document.getElementById('tabela-corpo');
    const registrosInfo = document.getElementById('registros-info');
    const atualizarBtn = document.getElementById('atualizarBtn');
    const codigoInput = document.getElementById('codigoSerie');
    const buscarBtn = document.getElementById('buscarBtn');
    const chips = document.querySelectorAll('.codigo-chip');
    
    // Elementos do filtro de datas
    const dataInicio = document.getElementById('dataInicio');
    const dataFim = document.getElementById('dataFim');
    const aplicarFiltroBtn = document.getElementById('aplicarFiltroBtn');
    const limparFiltroBtn = document.getElementById('limparFiltroBtn');

    // NOVO: Botão de exportar CSV
    const exportarCSVBtn = document.getElementById('exportarCSVBtn');

    // Elemento para mostrar qual regra está sendo aplicada
    const infoRegra = document.getElementById('info-regra') || criarInfoRegra();

    // Cache dos dados
    let dadosAtuais = [];
    let indicesProcessadosAtuais = [];
    let codigoAtual = '';
    let tipoProcessamentoAtual = '';

    // Lista de códigos da poupança (usam primeiro dia do mês)
    const CODIGOS_POUPANCA = [25, 195];

    // --- Função auxiliar para criar elemento de informação da regra ---
    function criarInfoRegra() {
        const div = document.createElement('div');
        div.id = 'info-regra';
        div.style.margin = '10px 0';
        div.style.padding = '8px';
        div.style.borderRadius = '4px';
        div.style.fontWeight = 'bold';
        div.style.textAlign = 'center';
        
        const container = document.querySelector('.filtros-container') || 
                         document.querySelector('.controles') || 
                         document.getElementById('filtros') ||
                         document.body;
        container.appendChild(div);
        return div;
    }

    // --- Função para atualizar a informação da regra na interface ---
    function atualizarInfoRegra(codigo) {
        if (!infoRegra) return;
        
        if (codigo === 25) {
            infoRegra.innerHTML = '🏦 <strong>Poupança - Regra Antiga</strong> (até 03/05/2012): Taxa do primeiro dia útil de cada mês → Fator';
            infoRegra.style.backgroundColor = '#e3f2fd';
            infoRegra.style.color = '#0d47a1';
            infoRegra.style.border = '1px solid #90caf9';
        } else if (codigo === 195) {
            infoRegra.innerHTML = '🏦 <strong>Poupança - Regra Nova</strong> (a partir de 04/05/2012): Taxa do primeiro dia útil de cada mês → Fator';
            infoRegra.style.backgroundColor = '#e8f5e8';
            infoRegra.style.color = '#1e7e34';
            infoRegra.style.border = '1px solid #a5d6a7';
        } else {
            infoRegra.innerHTML = `📊 <strong>Regra Padrão</strong>: Acumulando índices diários por mês (código ${codigo})`;
            infoRegra.style.backgroundColor = '#fff3e0';
            infoRegra.style.color = '#bf360c';
            infoRegra.style.border = '1px solid #ffb74d';
        }
    }

    // --- Função para processar poupança (códigos 25 e 195) ---
    function processarPoupanca(dadosDiarios) {
        // Agrupa por mês/ano e pega o PRIMEIRO registro de cada mês
        const meses = {};
        
        // Primeiro, ordena os dados por data
        const dadosOrdenados = [...dadosDiarios].sort((a, b) => {
            const [dA, mA, aA] = a.data.split('/').map(Number);
            const [dB, mB, aB] = b.data.split('/').map(Number);
            return new Date(aA, mA - 1, dA) - new Date(aB, mB - 1, dB);
        });
        
        dadosOrdenados.forEach(item => {
            const partes = item.data.split('/');
            const mesAno = `${partes[1]}/${partes[2]}`; // "MM/AAAA"
            
            // Para poupança, usa o PRIMEIRO valor de cada mês
            if (!meses[mesAno]) {
                const valorPercentual = parseFloat(item.valor.replace(',', '.'));
                
                if (!isNaN(valorPercentual)) {
                    meses[mesAno] = {
                        mesAno: mesAno,
                        dataReferencia: item.data,
                        valorOriginal: item.valor,
                        percentual: valorPercentual,
                        fator: 1 + (valorPercentual / 100)
                    };
                }
            }
        });
        
        // Converte para array e ordena
        return Object.values(meses).sort((a, b) => {
            const [mesA, anoA] = a.mesAno.split('/').map(Number);
            const [mesB, anoB] = b.mesAno.split('/').map(Number);
            return (anoA - anoB) || (mesA - mesB);
        });
    }

    // --- Função para acumular índices diários (regra padrão) ---
    function acumularIndicesMensais(dadosDiarios) {
        const grupos = {};
        
        dadosDiarios.forEach(item => {
            const partes = item.data.split('/');
            const mesAno = `${partes[1]}/${partes[2]}`;
            const valorPercentual = parseFloat(item.valor.replace(',', '.'));
            
            if (isNaN(valorPercentual)) return;
            
            if (!grupos[mesAno]) {
                grupos[mesAno] = {
                    mesAno: mesAno,
                    fatorAcumulado: 1 + (valorPercentual / 100),
                    primeiroDia: item.data,
                    ultimoDia: item.data,
                    count: 1
                };
            } else {
                grupos[mesAno].fatorAcumulado *= (1 + (valorPercentual / 100));
                grupos[mesAno].ultimoDia = item.data;
                grupos[mesAno].count++;
            }
        });
        
        return Object.values(grupos).sort((a, b) => {
            const [mesA, anoA] = a.mesAno.split('/').map(Number);
            const [mesB, anoB] = b.mesAno.split('/').map(Number);
            return (anoA - anoB) || (mesA - mesB);
        });
    }

    // Função para converter input month (YYYY-MM) para formato DD/MM/AAAA
    function converterParaDataBR(monthStr) {
        if (!monthStr) return null;
        const partes = monthStr.split('-');
        if (partes.length !== 2) return null;
        return `01/${partes[1]}/${partes[0]}`;
    }

    // Função para converter input month (YYYY-MM) para último dia do mês
    function converterParaDataBRUltimoDia(monthStr) {
        if (!monthStr) return null;
        const partes = monthStr.split('-');
        if (partes.length !== 2) return null;
        
        const ano = parseInt(partes[0]);
        const mes = parseInt(partes[1]);
        const ultimoDia = new Date(ano, mes, 0).getDate();
        
        return `${ultimoDia.toString().padStart(2, '0')}/${mes.toString().padStart(2, '0')}/${ano}`;
    }

    // Função para construir URL com filtros de data
    function montarUrl(codigo, dataInicial = null, dataFinal = null) {
        let url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${codigo}/dados?formato=json`;
        
        if (dataInicial) {
            url += `&dataInicial=${dataInicial}`;
        }
        if (dataFinal) {
            url += `&dataFinal=${dataFinal}`;
        }
        
        return url;
    }

    // NOVA FUNÇÃO: Exportar para CSV
    function exportarParaCSV() {
        if (!indicesProcessadosAtuais || indicesProcessadosAtuais.length === 0) {
            alert('Não há dados para exportar. Faça uma busca primeiro.');
            return;
        }

        // Prepara o cabeçalho do CSV
        let cabecalho = [];
        let linhas = [];

        if (CODIGOS_POUPANCA.includes(codigoAtual)) {
            // Para poupança
            cabecalho = ['Mês/Ano', 'Data Referência', 'Taxa (%)', 'Fator Acumulado'];
            
            indicesProcessadosAtuais.forEach(item => {
                linhas.push([
                    item.mesAno,
                    item.dataReferencia,
                    item.percentual.toFixed(4).replace('.', ','),
                    item.fator.toFixed(6).replace('.', ',')
                ]);
            });
        } else {
            // Para índices acumulados
            cabecalho = ['Mês/Ano', 'Período', 'Dias', 'Fator Acumulado'];
            
            indicesProcessadosAtuais.forEach(item => {
                linhas.push([
                    item.mesAno,
                    `${item.primeiroDia} a ${item.ultimoDia}`,
                    item.count,
                    item.fatorAcumulado.toFixed(6).replace('.', ',')
                ]);
            });
        }

        // Monta o conteúdo do CSV
        let csvContent = cabecalho.join(';') + '\n';
        
        linhas.forEach(linha => {
            csvContent += linha.join(';') + '\n';
        });

        // Adiciona informações de rodapé
        csvContent += '\n';
        csvContent += `# Código da Série: ${codigoAtual}\n`;
        csvContent += `# Total de meses: ${indicesProcessadosAtuais.length}\n`;
        csvContent += `# Tipo: ${CODIGOS_POUPANCA.includes(codigoAtual) ? 'Poupança' : 'Índice Acumulado'}\n`;
        
        if (dataInicio.value || dataFim.value) {
            csvContent += `# Período: ${dataInicio.value || 'início'} a ${dataFim.value || 'fim'}\n`;
        }

        // Cria e faz o download do arquivo
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        
        const dataAtual = new Date();
        const dataStr = `${dataAtual.getFullYear()}${(dataAtual.getMonth()+1).toString().padStart(2,'0')}${dataAtual.getDate().toString().padStart(2,'0')}`;
        
        link.download = `INDICE_${codigoAtual}_${dataStr}.csv`;
        link.click();
        
        // Feedback para o usuário
        alert(`✅ CSV exportado com sucesso!\n📊 ${indicesProcessadosAtuais.length} meses exportados.`);
    }

    // Função para buscar dados com filtros
    function buscarDados(codigo, usarFiltros = false) {
        // Validação básica
        if (!codigo || isNaN(codigo) || codigo <= 0) {
            alert('Por favor, digite um código numérico válido.');
            return;
        }

        codigoAtual = codigo;
        
        // Atualiza informação da regra
        atualizarInfoRegra(codigo);
        
        // Prepara as datas para a consulta
        let dataInicialStr = null;
        let dataFinalStr = null;
        
        if (usarFiltros) {
            if (dataInicio.value) {
                dataInicialStr = converterParaDataBR(dataInicio.value);
            }
            if (dataFim.value) {
                dataFinalStr = converterParaDataBRUltimoDia(dataFim.value);
            }
        }
        
        const url = montarUrl(codigo, dataInicialStr, dataFinalStr);
        
        // Atualiza interface
        let mensagemBusca = `🔍 Buscando série código ${codigo}`;
        if (dataInicialStr && dataFinalStr) {
            mensagemBusca += ` de ${dataInicialStr} até ${dataFinalStr}`;
        } else if (dataInicialStr) {
            mensagemBusca += ` a partir de ${dataInicialStr}`;
        } else if (dataFinalStr) {
            mensagemBusca += ` até ${dataFinalStr}`;
        }
        mensagemBusca += `... aguarde`;
        
        tabelaCorpo.innerHTML = `<tr><td colspan="2" class="loading">${mensagemBusca}</td></tr>`;
        registrosInfo.innerHTML = `⏳ Consultando código ${codigo}...`;

        fetch(url)
            .then(response => {
                if (!response.ok) {
                    if (response.status === 404) {
                        throw new Error(`Código ${codigo} não encontrado (erro 404). Verifique se o código existe.`);
                    }
                    if (response.status === 406) {
                        throw new Error(`Formato de data inválido. Use o formato DD/MM/AAAA`);
                    }
                    throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
                }
                return response.json();
            })
            .then(dados => {
                // Verifica se dados é array e tem conteúdo
                if (!Array.isArray(dados)) {
                    throw new Error('Formato de resposta inesperado.');
                }
                
                if (dados.length === 0) {
                    tabelaCorpo.innerHTML = `<tr><td colspan="2" class="sem-resultados">📭 Nenhum registro encontrado para o período selecionado.</td></tr>`;
                    
                    if (dataInicialStr && dataFinalStr) {
                        registrosInfo.innerHTML = `📊 Série ${codigo}: 0 registros no período de ${dataInicialStr} a ${dataFinalStr}`;
                    } else {
                        registrosInfo.innerHTML = `📊 Série ${codigo}: 0 registros`;
                    }
                    
                    dadosAtuais = [];
                    indicesProcessadosAtuais = [];
                    return;
                }

                // Armazena no cache os dados originais
                dadosAtuais = dados.slice();

                // Ordena os dados por data crescente
                dadosAtuais.sort((a, b) => {
                    const partesA = a.data.split('/');
                    const partesB = b.data.split('/');
                    const dataA = new Date(partesA[2], partesA[1]-1, partesA[0]);
                    const dataB = new Date(partesB[2], partesB[1]-1, partesB[0]);
                    return dataA - dataB;
                });

                // Escolhe o processamento baseado no código
                let indicesProcessados;
                let tipoProcessamento;
                
                if (CODIGOS_POUPANCA.includes(codigo)) {
                    // Para poupança (25 e 195): pega primeiro dia de cada mês
                    indicesProcessados = processarPoupanca(dadosAtuais);
                    tipoProcessamento = 'meses (primeiro dia)';
                } else {
                    // Para outros índices: acumula diariamente por mês
                    indicesProcessados = acumularIndicesMensais(dadosAtuais);
                    tipoProcessamento = 'meses acumulados';
                }

                // Armazena os dados processados para exportação
                indicesProcessadosAtuais = indicesProcessados;
                tipoProcessamentoAtual = tipoProcessamento;

                // Atualiza contador e tabela
                let infoMsg = `📊 <strong>${indicesProcessados.length}</strong> ${tipoProcessamento} encontrados <span>código ${codigo}</span>`;
                if (dataInicialStr && dataFinalStr) {
                    infoMsg = `📊 <strong>${indicesProcessados.length}</strong> ${tipoProcessamento} de ${dataInicialStr} a ${dataFinalStr} <span>código ${codigo}</span>`;
                } else if (dataInicialStr) {
                    infoMsg = `📊 <strong>${indicesProcessados.length}</strong> ${tipoProcessamento} a partir de ${dataInicialStr} <span>código ${codigo}</span>`;
                } else if (dataFinalStr) {
                    infoMsg = `📊 <strong>${indicesProcessados.length}</strong> ${tipoProcessamento} até ${dataFinalStr} <span>código ${codigo}</span>`;
                }
                
                registrosInfo.innerHTML = infoMsg;

                // Renderiza tabela
                let linhasHTML = '';
                
                if (CODIGOS_POUPANCA.includes(codigo)) {
                    // Renderização específica para poupança
                    indicesProcessados.forEach(mes => {
                        linhasHTML += `<tr>
                            <td><strong>${mes.mesAno}</strong><br><small>Data referência: ${mes.dataReferencia}</small></td>
                            <td class="valor">
                                Taxa: ${mes.percentual.toFixed(4)}%<br>
                                <strong>Fator: ${mes.fator.toLocaleString('pt-BR', {
                                    minimumFractionDigits: 6,
                                    maximumFractionDigits: 6
                                })}</strong>
                            </td>
                        </tr>`;
                    });
                } else {
                    // Renderização padrão para índices acumulados
                    indicesProcessados.forEach(mes => {
                        const periodo = `${mes.primeiroDia} a ${mes.ultimoDia}`;
                        
                        linhasHTML += `<tr>
                            <td><strong>${mes.mesAno}</strong><br><small>${periodo} (${mes.count} dias)</small></td>
                            <td class="valor">${mes.fatorAcumulado.toLocaleString('pt-BR', {
                                minimumFractionDigits: 6,
                                maximumFractionDigits: 6
                            })}</td>
                        </tr>`;
                    });
                }
                
                tabelaCorpo.innerHTML = linhasHTML;
            })
            .catch(error => {
                console.error('Erro na requisição:', error);
                tabelaCorpo.innerHTML = `<tr><td colspan="2" class="error-message">❌ Erro: ${error.message}</td></tr>`;
                registrosInfo.innerHTML = '⚠️ Falha na consulta';
                dadosAtuais = [];
                indicesProcessadosAtuais = [];
            });
    }

    // Evento do botão buscar (sem filtro)
    if (buscarBtn) {
        buscarBtn.addEventListener('click', function(e) {
            e.preventDefault();
            const codigo = parseInt(codigoInput.value, 10);
            buscarDados(codigo, false);
        });
    }

    // Evento dos chips de sugestão
    chips.forEach(chip => {
        chip.addEventListener('click', function() {
            const codigo = this.getAttribute('data-codigo');
            codigoInput.value = codigo;
            buscarDados(parseInt(codigo, 10), false);
        });
    });

    // Evento do botão recarregar
    if (atualizarBtn) {
        atualizarBtn.addEventListener('click', function(e) {
            e.preventDefault();
            const codigo = parseInt(codigoInput.value, 10);
            if (codigo) {
                buscarDados(codigo, false);
            } else {
                alert('Digite um código válido.');
            }
        });
    }

    // Evento do botão filtrar
    if (aplicarFiltroBtn) {
        aplicarFiltroBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            if (!dataInicio.value && !dataFim.value) {
                alert('Selecione pelo menos uma data para filtrar.');
                return;
            }
            
            if (dataInicio.value && dataFim.value && dataInicio.value > dataFim.value) {
                alert('A data inicial não pode ser maior que a data final.');
                return;
            }
            
            const codigo = parseInt(codigoInput.value, 10);
            buscarDados(codigo, true);
        });
    }

    // Evento do botão limpar filtros
    if (limparFiltroBtn) {
        limparFiltroBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            dataInicio.value = '';
            dataFim.value = '';
            
            const codigo = parseInt(codigoInput.value, 10);
            if (codigo) {
                buscarDados(codigo, false);
            }
        });
    }

    // NOVO: Evento do botão exportar CSV
    if (exportarCSVBtn) {
        exportarCSVBtn.addEventListener('click', function(e) {
            e.preventDefault();
            exportarParaCSV();
        });
    }

    // Permite buscar pressionando Enter no input
    if (codigoInput) {
        codigoInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                buscarBtn.click();
            }
        });
    }

    // Carrega o padrão (226 - IGP-DI diário) ao iniciar
    buscarDados(226, false);
})();