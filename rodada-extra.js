
(() => {
  'use strict';

  const CHAVE_BASE = 'rifa-sobrepeliz-v1';
  const CHAVE_EXTRA = 'rifa-sobrepeliz-extra-v1';
  const CHAVE_SORTEIO = 'rifa-sobrepeliz-sorteio-v1';

  const INICIAIS = [1,6,8,12,13,14,15,16,22,25,26,28,30,45,48,52,77,85];

  const $ = id => document.getElementById(id);
  const formato = n => String(n).padStart(3, '0');
  const dinheiro = n => n.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });

  const digitos = v => String(v || '').replace(/\D/g, '');
  const normalizar = v => String(v || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim();

  const estados = ['disponivel', 'reservado', 'comprado'];

  const inicialExtra = () => Array.from(
    {length:25},
    () => ({
      situacao:'disponivel',
      nome:'',
      telefone:'',
      observacao:''
    })
  );

  let base = null;
  let extras = null;
  let selecionado = null;
  let anterior = '';
  let filtro = 'todos';
  let contatos = [];
  let erro = '';
  let avisoTimer;

  function validar(lista, tamanho) {
    if (
      !Array.isArray(lista) ||
      lista.length !== tamanho ||
      !lista.every(n =>
        n &&
        typeof n === 'object' &&
        estados.includes(n.situacao)
      )
    ) {
      throw Error(
        `O cadastro de ${tamanho} números está inválido. Restaure um backup pela página inicial.`
      );
    }
    return lista;
  }

  function lerBase() {
    const bruto = localStorage.getItem(CHAVE_BASE);

    return bruto === null
      ? Array.from({length:100}, (_,i) => ({
          situacao: INICIAIS.includes(i+1)
            ? 'comprado'
            : 'disponivel',
          nome:'',
          telefone:'',
          observacao:''
        }))
      : validar(JSON.parse(bruto), 100);
  }

  function lerExtras() {
    const bruto = localStorage.getItem(CHAVE_EXTRA);

    return bruto === null
      ? inicialExtra()
      : validar(JSON.parse(bruto), 25);
  }

  function sorteioExiste() {
    return localStorage.getItem(CHAVE_SORTEIO) !== null;
  }

  function liberada() {
    return base &&
      base.every(n => n.situacao === 'comprado') &&
      !sorteioExiste();
  }

  function toast(msg) {
    clearTimeout(avisoTimer);
    $('mensagem').textContent = msg;
    $('mensagem').style.display = 'block';
    avisoTimer = setTimeout(
      () => $('mensagem').style.display = 'none',
      3400
    );
  }

  function carregar() {
    try {
      base = lerBase();
      extras = lerExtras();
      sorteioExiste();
      erro = '';
    } catch(e) {
      base = null;
      extras = null;
      erro = e.message;
    }

    desenhar();
  }

  function desenhar() {
    const grade = $('gradeExtra');
    grade.replaceChildren();

    $('erroDados').hidden = !erro;
    $('erroDados').textContent = erro;

    if (erro) {
      $('tituloEstado').textContent = 'Não foi possível ler os cadastros';
      $('mensagemEstado').textContent = erro;
      $('notaGrade').textContent = 'Nenhum cadastro foi apagado.';
      $('estadoSorteio').textContent = 'Sorteio indisponível até a recuperação dos dados.';
      return;
    }

    const originalComprados = base.filter(
      n => n.situacao === 'comprado'
    ).length;

    const vendidos = extras.filter(
      n => n.situacao === 'comprado'
    ).length;

    const reservados = extras.filter(
      n => n.situacao === 'reservado'
    ).length;

    const livre = liberada();
    const concluido = sorteioExiste();

    $('avisoBloqueio').classList.toggle('liberado', livre);

    $('iconeEstado').textContent = concluido
      ? '✠'
      : livre ? '✥' : '🔒';

    $('tituloEstado').textContent = concluido
      ? 'Sorteio já registrado'
      : livre ? 'Rodada Extra liberada!'
      : 'Rodada Extra bloqueada';

    $('mensagemEstado').textContent = concluido
      ? 'Já existe um resultado do Sorteio Solene neste navegador. Não é permitido cadastrar novos números ou sortear novamente.'
      : livre
        ? 'Os 100 números originais foram comprados. Agora é possível cadastrar os números de 101 a 125.'
        : `Faltam ${100 - originalComprados} números comprados na rifa original. As vendas extras existentes serão preservadas, mas a edição está suspensa.`;

    $('botaoEstado').href = livre
      ? './sorteio.html'
      : './index.html#numeros';

    $('botaoEstado').textContent = livre
      ? 'Acompanhar Sorteio Solene'
      : 'Ver rifa original';

    let visiveis = 0;
    const frag = document.createDocumentFragment();

    extras.forEach((item,i) => {
      const n = 101+i;
      const mostrar = filtro === 'todos' || filtro === item.situacao;

      const botao = document.createElement('button');
      botao.type = 'button';
      botao.className = 'numero ' + item.situacao +
        (mostrar ? '' : ' oculto');

      botao.textContent = formato(n);
      botao.title = `Número ${n} — ${item.situacao}`;
      botao.setAttribute('aria-label', botao.title);
      botao.disabled = !livre;
      botao.addEventListener('click', () => abrir(n));

      frag.append(botao);
      if (mostrar) visiveis++;
    });

    grade.append(frag);
    $('semNumeros').hidden = visiveis !== 0;

    $('extrasComprados').textContent = vendidos;
    $('extrasReservados').textContent = reservados;
    $('extrasDisponiveis').textContent = 25 - vendidos - reservados;

    $('percentualExtra').textContent = vendidos * 4 + '%';
    $('barraExtra').setAttribute('aria-valuenow', String(vendidos));
    $('preenchimentoExtra').style.width = vendidos * 4 + '%';

    $('valorExtra').textContent =
      `${dinheiro(vendidos*10)} em ${vendidos} números extras comprados.`;

    $('valorTotal').textContent =
      'Arrecadação conjunta: ' +
      dinheiro(originalComprados*5 + vendidos*10);

    $('notaGrade').textContent = concluido
      ? 'Sorteio registrado: cadastros bloqueados.'
      : livre
        ? 'Toque em um número para cadastrar, reservar ou confirmar a compra neste dispositivo.'
        : 'Os números são apenas exibidos. O cadastro será liberado ao completar a rifa original.';

    $('estadoSorteio').textContent = concluido
      ? 'O resultado já foi registrado. Consulte a página do Sorteio Solene.'
      : originalComprados === 100 && vendidos === 25
        ? '✥ Os 125 números foram comprados. Sorteio liberado!'
        : `O sorteio será liberado após 125 compras: ${originalComprados+vendidos}/125 confirmadas.`;
  }

  function prepararContatos() {
    const mapa = new Map();

    [...base, ...extras].forEach((item,i) => {
      if (i+1 === selecionado || item.situacao === 'disponivel') return;

      const nome = String(item.nome || '').trim();
      const telefone = String(item.telefone || '').trim();

      if (!nome && !telefone) return;

      const chave = digitos(telefone)
        ? 'tel:' + digitos(telefone)
        : 'nome:' + normalizar(nome);

      if (!mapa.has(chave)) {
        mapa.set(chave, {nome,telefone});
      } else {
        const anterior = mapa.get(chave);
        if (!anterior.nome) anterior.nome = nome;
        if (!anterior.telefone) anterior.telefone = telefone;
      }
    });

    contatos = [...mapa.values()].sort(
      (a,b) => a.nome.localeCompare(b.nome,'pt-BR')
    );

    const seletor = $('compradorExistente');
    seletor.replaceChildren(
      new Option('— Selecionar comprador —','')
    );

    contatos.forEach((p,i) => {
      seletor.add(new Option(
        `${p.nome || 'Sem nome'}${p.telefone ? ' — '+p.telefone : ''}`,
        String(i)
      ));
    });
  }

  function atualizarCampos() {
    const livre =
      $('formularioExtra').elements.situacao.value === 'disponivel';

    ['compradorExistente','nome','telefone','observacao']
      .forEach(id => $(id).disabled = livre);

    $('alertaCadastro').textContent = livre
      ? 'Ao marcar como disponível, o nome, contato e observação serão apagados.'
      : '';
  }

  function abrir(n) {
    if (!liberada() || erro) return;

    selecionado = n;
    const item = extras[n-101];
    anterior = JSON.stringify(item);

    $('tituloJanela').textContent = 'Número ' + formato(n);
    $('formularioExtra').elements.situacao.value = item.situacao;
    $('nome').value = String(item.nome || '');
    $('telefone').value = String(item.telefone || '');
    $('observacao').value = String(item.observacao || '');

    prepararContatos();
    atualizarCampos();
    $('janelaExtra').showModal();
  }

  function preencherNome() {
    if ($('telefone').value.trim()) return;

    const nome = normalizar($('nome').value);
    const possiveis = contatos.filter(
      p => normalizar(p.nome) === nome && digitos(p.telefone)
    );

    const telefones = [
      ...new Set(possiveis.map(p => digitos(p.telefone)))
    ];

    if (telefones.length === 1) {
      $('telefone').value = possiveis[0].telefone;
    }

    if (telefones.length > 1) {
      $('alertaCadastro').textContent =
        'Há mais de um contato com este nome. Selecione o comprador na lista.';
    }
  }

  function preencherTelefone() {
    if ($('nome').value.trim()) return;

    const telefone = digitos($('telefone').value);
    if (!telefone) return;

    const p = contatos.find(
      c => digitos(c.telefone) === telefone && c.nome
    );

    if (p) $('nome').value = p.nome;
  }

  $('compradorExistente').addEventListener('change', () => {
    const i = $('compradorExistente').value;
    if (i === '') return;

    const p = contatos[Number(i)];

    if (p) {
      $('nome').value = p.nome;
      $('telefone').value = p.telefone;
    }
  });

  $('nome').addEventListener('change', preencherNome);
  $('telefone').addEventListener('change', preencherTelefone);

  document.querySelectorAll('input[name="situacao"]').forEach(
    radio => radio.addEventListener('change', atualizarCampos)
  );

  $('cancelar').addEventListener(
    'click',
    () => $('janelaExtra').close()
  );

  $('formularioExtra').addEventListener('submit', e => {
    e.preventDefault();

    if (selecionado === null || erro) return;

    const situacao =
      $('formularioExtra').elements.situacao.value;

    if (!estados.includes(situacao)) return;

    if (situacao !== 'disponivel') {
      preencherNome();
      preencherTelefone();
    }

    const nome = $('nome').value.trim();
    const telefone = $('telefone').value.trim();
    const observacao = $('observacao').value.trim();
    const tel = digitos(telefone);

    if (
      situacao !== 'disponivel' &&
      telefone &&
      (tel.length < 8 || tel.length > 13)
    ) {
      alert('Confira o WhatsApp (8 a 13 dígitos).');
      return;
    }

    if (
      situacao === 'comprado' &&
      !nome &&
      !telefone &&
      !confirm('O número ficará comprado sem identificação. Deseja continuar?')
    ) return;

    if (
      situacao === 'disponivel' &&
      (
        extras[selecionado-101].nome ||
        extras[selecionado-101].telefone ||
        extras[selecionado-101].observacao
      ) &&
      !confirm('Apagar nome, contato e observação deste número?')
    ) return;

    try {
      if (sorteioExiste()) {
        throw Error('O Sorteio Solene já foi realizado.');
      }

      if (!lerBase().every(n => n.situacao === 'comprado')) {
        throw Error('A primeira etapa deixou de estar completa.');
      }

      const recentes = lerExtras();

      if (
        JSON.stringify(recentes[selecionado-101]) !== anterior
      ) {
        $('janelaExtra').close();
        carregar();
        alert('O número foi alterado em outra aba. Confira os dados atualizados.');
        return;
      }

      if (sorteioExiste()) {
        throw Error('O Sorteio Solene já foi realizado.');
      }

      recentes[selecionado-101] = {
        ...recentes[selecionado-101],
        situacao,
        nome: situacao === 'disponivel' ? '' : nome,
        telefone: situacao === 'disponivel' ? '' : telefone,
        observacao: situacao === 'disponivel' ? '' : observacao
      };

      localStorage.setItem(
        CHAVE_EXTRA,
        JSON.stringify(recentes)
      );

      $('janelaExtra').close();
      carregar();

      toast(
        'Número ' + formato(selecionado) +
        ' atualizado com sucesso!'
      );
    } catch(e) {
      alert('Não foi possível salvar: ' + e.message);
    }
  });

  document.querySelectorAll('[data-filtro]').forEach(
    botao => botao.addEventListener('click', () => {
      filtro = botao.dataset.filtro;

      document.querySelectorAll('[data-filtro]').forEach(b => {
        const ativo = b === botao;
        b.classList.toggle('ativo', ativo);
        b.setAttribute('aria-pressed', String(ativo));
      });

      desenhar();
    })
  );

  function conexao() {
    $('seloConexao').textContent = navigator.onLine
      ? '● Dados locais • Online'
      : '● Dados locais • Offline';
  }

  window.addEventListener('online', conexao);
  window.addEventListener('offline', conexao);
  window.addEventListener('pageshow', carregar);

  window.addEventListener('storage', e => {
    if (
      [CHAVE_BASE,CHAVE_EXTRA,CHAVE_SORTEIO].includes(e.key)
    ) carregar();
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !$('janelaExtra').open) carregar();
  });

  conexao();
  carregar();

  const pedido = Number(
    new URLSearchParams(location.search).get('numero')
  );

  if (
    Number.isInteger(pedido) &&
    pedido >= 101 &&
    pedido <= 125
  ) abrir(pedido);

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () =>
      navigator.serviceWorker
        .register('./sw.js')
        .catch(console.warn)
    );
  }
})();
