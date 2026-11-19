
(() => {
  'use strict';

  // Mesmas chaves da versão anterior: NÃO alterar.
  const CHAVE = 'rifa-sobrepeliz-v1';
  const CHAVE_SORTEIO = 'rifa-sobrepeliz-sorteio-v1';
  const INICIAIS = [1,6,8,12,13,14,15,16,22,25,26,28,30,45,48,52,77,85];
  const PIX_COPIA_COLA = '00020126410014BR.GOV.BCB.PIX0119adsonnph@icloud.com5204000053039865802BR5925Adson Phelipe Soares da S6009SAO PAULO62140510K0ebY5ANla6304C25B';
  const $ = id => document.getElementById(id);
  const moeda = n => n.toLocaleString('pt-BR', {style:'currency',currency:'BRL'});
  const numeroTexto = n => String(n).padStart(3,'0');
  const soDigitos = v => String(v || '').replace(/\D/g,'');
  const normalizar = v => String(v || '').normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim();

  let numeros = null;
  let erroLeitura = '';
  let dadosIniciais = false;
  let filtro = 'todos';
  let selecionado = null;
  let fotoAnterior = '';
  let contatosAtuais = [];
  let timerAviso;

  function inicial() {
    return Array.from({length:100}, (_,i) => ({
      situacao: INICIAIS.includes(i+1) ? 'comprado' : 'disponivel',
      nome:'', telefone:'', observacao:''
    }));
  }

  function validarNumeros(lista) {
    if (!Array.isArray(lista) || lista.length !== 100 ||
        !lista.every(n => n && typeof n === 'object' &&
          ['disponivel','reservado','comprado'].includes(n.situacao))) {
      throw Error('Os 100 números não estão no formato esperado. Restaure um backup confiável.');
    }
    return lista; // Mantém campos antigos e desconhecidos sem modificá-los.
  }

  function lerNumeros() {
    const salvo = localStorage.getItem(CHAVE);
    dadosIniciais = salvo === null;
    return salvo === null ? inicial() : validarNumeros(JSON.parse(salvo));
  }

  function validarSorteio(r) {
    if (!r || r.tipo !== 'rifa-sobrepeliz-sorteio' ||
        !Number.isInteger(r.numero) || r.numero < 1 || r.numero > 100 ||
        typeof r.nome !== 'string' || typeof r.realizadoEm !== 'string' ||
        !Number.isFinite(Date.parse(r.realizadoEm))) {
      throw Error('Registro do sorteio inválido. Não altere os números antes de recuperar o backup.');
    }
    return r;
  }

  function lerSorteio() {
    const salvo = localStorage.getItem(CHAVE_SORTEIO);
    return salvo === null ? null : validarSorteio(JSON.parse(salvo));
  }

  function existeSorteio() {
    try { return localStorage.getItem(CHAVE_SORTEIO) !== null; }
    catch (_) { return true; } // Na dúvida, bloqueia a edição.
  }

  function carregar() {
    try {
      numeros = lerNumeros();
      erroLeitura = '';
    } catch (e) {
      numeros = null;
      erroLeitura = e.message;
    }
    desenhar();
  }

  function notificar(texto) {
    clearTimeout(timerAviso);
    $('mensagem').textContent = texto;
    $('mensagem').style.display = 'block';
    timerAviso = setTimeout(() => $('mensagem').style.display = 'none', 3200);
  }

  function desenhar() {
    const grade = $('grade');
    grade.replaceChildren();
    $('erroDados').hidden = !erroLeitura;
    $('erroDados').textContent = erroLeitura;
    $('baixarBackup').disabled = !numeros;
    if (!numeros) {
      ['comprados','reservados','disponiveis','arrecadado','percentual'].forEach(id => $(id).textContent = '—');
      $('progressoTexto').textContent = 'Não foi possível ler os dados deste navegador.';
      $('textoGrade').textContent = 'Os dados existentes não foram alterados. Restaure um backup.';
      $('estadoSorteio').textContent = 'Sorteio indisponível até a recuperação dos dados.';
      return;
    }

    let visiveis = 0;
    const fragmento = document.createDocumentFragment();
    numeros.forEach((item,indice) => {
      const n = indice + 1;
      const mostrar = filtro === 'todos' || item.situacao === filtro;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'numero ' + item.situacao + (mostrar ? '' : ' oculto');
      b.textContent = numeroTexto(n);
      b.title = `Número ${numeroTexto(n)} — ${item.situacao}`;
      b.setAttribute('aria-label', b.title);
      b.addEventListener('click', () => abrir(n));
      fragmento.append(b);
      if (mostrar) visiveis++;
    });
    grade.append(fragmento);
    $('semNumeros').hidden = visiveis !== 0;

    const comprados = numeros.filter(n => n.situacao === 'comprado').length;
    const reservados = numeros.filter(n => n.situacao === 'reservado').length;
    $('comprados').textContent = comprados;
    $('reservados').textContent = reservados;
    $('disponiveis').textContent = 100 - comprados - reservados;
    $('arrecadado').textContent = moeda(comprados * 5);
    $('percentual').textContent = comprados + '%';
    $('preenchimento').style.width = comprados + '%';
    $('barra').setAttribute('aria-valuenow', String(comprados));
    $('progressoTexto').textContent = `${comprados} de 100 números comprados`;
    $('textoGrade').textContent = dadosIniciais
      ? 'Este navegador ainda não tem cadastro salvo: exibindo a configuração inicial da versão anterior.'
      : `Exibindo ${visiveis} de 100 números. Dados armazenados apenas neste navegador.`;

    $('areaSorteio').classList.toggle('concluido', existeSorteio());
    try {
      const resultado = lerSorteio();
      $('estadoSorteio').textContent = resultado
        ? `✠ Sorteio realizado! Número vencedor: ${numeroTexto(resultado.numero)}. Cadastros bloqueados.`
        : comprados === 100
          ? '✥ Todos os números foram comprados. Sorteio liberado!'
          : `🔒 Faltam ${100 - comprados} números comprados para liberar o sorteio.`;
      $('atalhoSorteio').textContent = resultado
        ? 'Ver resultado do sorteio' : comprados === 100
          ? 'Iniciar Sorteio Solene' : 'Acompanhar sorteio';
    } catch (e) {
      $('estadoSorteio').textContent = e.message;
      $('atalhoSorteio').textContent = 'Consultar registro do sorteio';
    }
  }

  function listaContatos(excluir) {
    const mapa = new Map();
    numeros.forEach((item,i) => {
      if (i+1 === excluir || item.situacao === 'disponivel') return;
      const nome = String(item.nome || '').trim();
      const telefone = String(item.telefone || '').trim();
      if (!nome && !telefone) return;
      const chave = soDigitos(telefone) ? 'tel:'+soDigitos(telefone) : 'nome:'+normalizar(nome);
      if (!mapa.has(chave)) mapa.set(chave,{nome,telefone});
      else {
        const anterior = mapa.get(chave);
        if (!anterior.nome) anterior.nome = nome;
        if (!anterior.telefone) anterior.telefone = telefone;
      }
    });
    return [...mapa.values()].sort((a,b) => a.nome.localeCompare(b.nome,'pt-BR'));
  }

  function prepararContatos() {
    contatosAtuais = listaContatos(selecionado);
    const seletor = $('compradorExistente');
    seletor.replaceChildren(new Option('— Selecionar comprador —',''));
    contatosAtuais.forEach((p,i) => {
      seletor.add(new Option(`${p.nome || 'Sem nome'}${p.telefone ? ' — '+p.telefone : ''}`,String(i)));
    });
  }

  function atualizarCampos() {
    const livre = $('formulario').elements.situacao.value === 'disponivel';
    ['compradorExistente','nome','telefone','observacao'].forEach(id => $(id).disabled = livre);
    $('alertaCadastro').textContent = livre
      ? 'Ao salvar como disponível, o nome, contato e observação serão apagados.' : '';
  }

  function abrir(n) {
    if (!numeros || erroLeitura) return;
    if (existeSorteio()) {
      alert('O sorteio já foi registrado. Os cadastros estão bloqueados para preservar o resultado.');
      return;
    }
    selecionado = n;
    const item = numeros[n-1];
    fotoAnterior = JSON.stringify(item);
    $('tituloJanela').textContent = 'Número ' + numeroTexto(n);
    $('formulario').elements.situacao.value = item.situacao;
    $('nome').value = String(item.nome || '');
    $('telefone').value = String(item.telefone || '');
    $('observacao').value = String(item.observacao || '');
    prepararContatos();
    atualizarCampos();
    $('janela').showModal();
  }

  function preencherPorNome() {
    if ($('telefone').value.trim()) return;
    const nome = normalizar($('nome').value);
    if (!nome) return;
    const candidatos = contatosAtuais.filter(p => normalizar(p.nome) === nome && soDigitos(p.telefone));
    const unicos = [...new Set(candidatos.map(p => soDigitos(p.telefone)))];
    if (unicos.length === 1) $('telefone').value = candidatos[0].telefone;
    if (unicos.length > 1) $('alertaCadastro').textContent = 'Há mais de um WhatsApp para este nome. Selecione o comprador na lista.';
  }

  function preencherPorTelefone() {
    if ($('nome').value.trim()) return;
    const telefone = soDigitos($('telefone').value);
    if (!telefone) return;
    const p = contatosAtuais.find(c => soDigitos(c.telefone) === telefone && c.nome);
    if (p) $('nome').value = p.nome;
  }

  $('compradorExistente').addEventListener('change', () => {
    const i = $('compradorExistente').value;
    if (i === '') return;
    const p = contatosAtuais[Number(i)];
    if (p) { $('nome').value = p.nome; $('telefone').value = p.telefone; }
  });
  $('nome').addEventListener('change', preencherPorNome);
  $('telefone').addEventListener('change', preencherPorTelefone);
  document.querySelectorAll('input[name="situacao"]').forEach(radio =>
    radio.addEventListener('change', atualizarCampos));
  $('cancelar').addEventListener('click', () => $('janela').close());

  $('formulario').addEventListener('submit', event => {
    event.preventDefault();
    if (selecionado === null || erroLeitura) return;
    if (existeSorteio()) { alert('Sorteio registrado. Edição bloqueada.'); $('janela').close(); carregar(); return; }

    const situacao = $('formulario').elements.situacao.value;
    if (!['disponivel','reservado','comprado'].includes(situacao)) return;
    if (situacao !== 'disponivel') { preencherPorNome(); preencherPorTelefone(); }
    const nome = $('nome').value.trim();
    const telefone = $('telefone').value.trim();
    const observacao = $('observacao').value.trim();
    const tel = soDigitos(telefone);
    if (situacao !== 'disponivel' && telefone && (tel.length < 8 || tel.length > 13)) {
      alert('Confira o número do WhatsApp (8 a 13 dígitos).'); return;
    }
    if (situacao === 'comprado' && !nome && !telefone &&
        !confirm('O número ficará comprado sem identificação. Deseja continuar?')) return;
    if (situacao === 'disponivel' && (numeros[selecionado-1].nome || numeros[selecionado-1].telefone || numeros[selecionado-1].observacao) &&
        !confirm('Apagar o nome, contato e observação deste número?')) return;

    try {
      // Releitura evita sobrescrever silenciosamente uma edição feita em outra aba.
      const recentes = lerNumeros();
      if (JSON.stringify(recentes[selecionado-1]) !== fotoAnterior) {
        alert('Este número foi modificado em outra aba. A página será atualizada.');
        $('janela').close(); carregar(); return;
      }
      if (existeSorteio()) throw Error('Sorteio já registrado.');
      recentes[selecionado-1] = {
        ...recentes[selecionado-1], situacao,
        nome: situacao === 'disponivel' ? '' : nome,
        telefone: situacao === 'disponivel' ? '' : telefone,
        observacao: situacao === 'disponivel' ? '' : observacao
      };
      localStorage.setItem(CHAVE, JSON.stringify(recentes));
      numeros = recentes;
      dadosIniciais = false;
      $('janela').close(); desenhar();
      notificar('Número ' + numeroTexto(selecionado) + ' atualizado!');
    } catch (e) {
      alert('Não foi possível salvar: ' + e.message);
    }
  });

  document.querySelectorAll('[data-filtro]').forEach(botao => {
    botao.addEventListener('click', () => {
      filtro = botao.dataset.filtro;
      document.querySelectorAll('[data-filtro]').forEach(b => {
        const ativo = b === botao;
        b.classList.toggle('ativo', ativo);
        b.setAttribute('aria-pressed', String(ativo));
      });
      desenhar();
    });
  });

  async function copiar(texto) {
    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText) throw Error('Sem acesso à área de transferência');
      await navigator.clipboard.writeText(texto);
      notificar('Copiado para a área de transferência!');
    } catch (_) {
      window.prompt('Copie o texto abaixo:',texto);
    }
  }
  $('copiarChave').addEventListener('click', () => copiar($('chavePix').textContent.trim()));
  $('copiarCodigo').addEventListener('click', () => copiar(PIX_COPIA_COLA));

  function baixarArquivo(conteudo,nome) {
    const blob = new Blob([conteudo],{type:'application/json;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = nome;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  $('baixarBackup').addEventListener('click', () => {
    try {
      if (!numeros || erroLeitura) throw Error('Dados não disponíveis.');
      const sorteio = lerSorteio();
      const data = new Date().toISOString();
      baixarArquivo(JSON.stringify({
        tipo:'rifa-sobrepeliz', versao:5, criadoEm:data,
        numeros:lerNumeros(), sorteio
      },null,2),'backup-rifa-sobrepeliz-'+data.slice(0,10)+'.json');
      notificar('Backup preparado. Guarde o arquivo em local seguro.');
    } catch (e) { alert('Erro ao criar backup: ' + e.message); }
  });

  $('restaurarBackup').addEventListener('click', () => $('arquivoBackup').click());
  $('arquivoBackup').addEventListener('change', async event => {
    const arquivo = event.target.files[0];
    if (!arquivo) return;
    try {
      if (arquivo.size > 5 * 1024 * 1024) throw Error('Arquivo muito grande.');
      const conteudo = JSON.parse(await arquivo.text());
      // Compatível com backups antigos com {numeros} ou um array simples.
      const lista = Array.isArray(conteudo) ? conteudo : conteudo.numeros;
      const restaurados = validarNumeros(lista);
      if (!Array.isArray(conteudo) && conteudo.tipo && conteudo.tipo !== 'rifa-sobrepeliz') {
        throw Error('O arquivo não é um backup desta rifa.');
      }
      const resultadoBackup = !Array.isArray(conteudo) && conteudo.sorteio != null
        ? validarSorteio(conteudo.sorteio) : null;
      if (resultadoBackup && restaurados.some(n => n.situacao !== 'comprado')) {
        throw Error('O backup possui sorteio, mas nem todos os números estão comprados.');
      }
      const resultadoAtual = lerSorteio();
      if (resultadoAtual && (!resultadoBackup ||
          resultadoAtual.numero !== resultadoBackup.numero ||
          resultadoAtual.realizadoEm !== resultadoBackup.realizadoEm)) {
        throw Error('Já existe um resultado diferente neste navegador. Não é permitido substituí-lo ou apagá-lo.');
      }
      if (!confirm('Restaurar os 100 números e os compradores deste arquivo? Os cadastros atuais serão substituídos. Faça um backup antes de continuar.')) return;

      const antigo = localStorage.getItem(CHAVE);
      const antigoResultado = localStorage.getItem(CHAVE_SORTEIO);
      try {
        localStorage.setItem(CHAVE, JSON.stringify(restaurados));
        if (resultadoBackup) localStorage.setItem(CHAVE_SORTEIO, JSON.stringify(resultadoBackup));
        else localStorage.removeItem(CHAVE_SORTEIO);
      } catch (e) {
        // Tenta recuperar o estado anterior se a gravação falhar.
        try {
          if (antigo === null) localStorage.removeItem(CHAVE);
          else localStorage.setItem(CHAVE,antigo);
          if (antigoResultado === null) localStorage.removeItem(CHAVE_SORTEIO);
          else localStorage.setItem(CHAVE_SORTEIO,antigoResultado);
        } catch (_) {}
        throw Error('Falha ao gravar o backup neste navegador.');
      }
      carregar();
      notificar('Backup restaurado com sucesso!');
    } catch (e) { alert('Não foi possível restaurar: ' + e.message); }
    finally { event.target.value = ''; }
  });

  function conexao() {
    $('seloConexao').textContent = navigator.onLine
      ? '● Dados locais • Online' : '● Dados locais • Offline';
  }
  window.addEventListener('online', conexao);
  window.addEventListener('offline', conexao);
  window.addEventListener('pageshow', carregar);
  window.addEventListener('storage', e => {
    if (e.key === CHAVE || e.key === CHAVE_SORTEIO) carregar();
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !$('janela').open) carregar();
  });

  conexao();
  carregar();
  const pedido = Number(new URLSearchParams(location.search).get('numero'));
  if (Number.isInteger(pedido) && pedido >= 1 && pedido <= 100) abrir(pedido);

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () =>
      navigator.serviceWorker.register('./sw.js').catch(console.warn));
  }
})();
