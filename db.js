/* ==========================================================================
   BEST FOOD PORTUGAL — MOTOR CENTRAL DE DADOS & REGRAS DE NEGÓCIO
   Ficheiro: js/db.js
   ========================================================================== */

const DB_KEYS = {
  FAMILIAS: 'bfp_familias',
  VENDEDORES: 'bfp_vendedores',
  TRANSACOES: 'bfp_transacoes',
  LOGS: 'bfp_logs'
};

class BFPDatabase {
  constructor() {
    this.initDefaults();
  }

  // Inicialização com dados padrão caso o sistema esteja limpo
  initDefaults() {
    if (!localStorage.getItem(DB_KEYS.FAMILIAS)) {
      const familiasIniciais = [
        { id: 'BFP-1001', nome: 'Maria Santos Silva', nif: '234567890', tel: '912345678', quota: 40, saldo: 40.00, pin: '9876', ativo: true },
        { id: 'BFP-1002', nome: 'João Pedro Alves', nif: '245678901', tel: '923456789', quota: 50, saldo: 50.00, pin: '1234', ativo: true }
      ];
      localStorage.setItem(DB_KEYS.FAMILIAS, JSON.stringify(familiasIniciais));
    }

    if (!localStorage.getItem(DB_KEYS.VENDEDORES)) {
      const vendedoresIniciais = [
        { id: 'VEND-01', banca: 'Banca do Zé (Frutas)', resp: 'José Santos', pin: '1234', ativo: true },
        { id: 'VEND-02', banca: 'Frutaria Central', resp: 'Ana Martins', pin: '1234', ativo: true }
      ];
      localStorage.setItem(DB_KEYS.VENDEDORES, JSON.stringify(vendedoresIniciais));
    }

    if (!localStorage.getItem(DB_KEYS.TRANSACOES)) {
      localStorage.setItem(DB_KEYS.TRANSACOES, JSON.stringify([]));
    }

    if (!localStorage.getItem(DB_KEYS.LOGS)) {
      const logInicial = [{
        id: 'LOG-1',
        texto: 'Sistema Inicializado — Módulos de Gestão, PWA Vendedor e Área da Família ativos',
        hora: new Date().toLocaleString('pt-PT'),
        tipo: 'blue'
      }];
      localStorage.setItem(DB_KEYS.LOGS, JSON.stringify(logInicial));
    }
  }

  getFamilias() {
    const familias = JSON.parse(localStorage.getItem(DB_KEYS.FAMILIAS) || '[]');
    return familias.map(f => {
      const pass = String(f.pin || f.senha || '1234').trim();
      return {
        ...f,
        pin: pass,
        senha: pass
      };
    });
  }

  // ADICIONAR FAMÍLIA COM PIN E SENHA SINCRONIZADOS
  addFamilia(famData) {
    const familias = this.getFamilias();
    const pass = String(famData.pin || famData.senha || '1234').trim();

    const novaFam = {
      id: famData.id || `BFP-${familias.length + 1001}`,
      nome: famData.nome,
      nif: famData.nif || 'N/A',
      tel: famData.tel || 'N/A',
      quota: parseFloat(famData.quota) || 40,
      saldo: parseFloat(famData.saldo !== undefined ? famData.saldo : famData.quota) || 40,
      pin: pass,
      senha: pass,
      ativo: famData.ativo !== undefined ? famData.ativo : true
    };

    familias.unshift(novaFam);
    localStorage.setItem(DB_KEYS.FAMILIAS, JSON.stringify(familias));
    this.addLog(`Nova Família Cadastrada — ${novaFam.nome} (${novaFam.id}) [PIN: ${novaFam.pin}]`, 'green');
    this.notifyTabs('bfp_familias');
    return novaFam;
  }

  deleteFamilia(id) {
    let familias = this.getFamilias();
    familias = familias.filter(f => f.id !== id);
    localStorage.setItem(DB_KEYS.FAMILIAS, JSON.stringify(familias));
    this.addLog(`Família Eliminada — Registo ${id} removido do sistema`, 'red');
    this.notifyTabs('bfp_familias');
  }

  toggleEstadoFamilia(id) {
    const familias = this.getFamilias();
    const fam = familias.find(f => f.id === id);
    if (fam) {
      fam.ativo = !fam.ativo;
      localStorage.setItem(DB_KEYS.FAMILIAS, JSON.stringify(familias));
      this.addLog(`Estado Alterado — Família ${fam.nome} (${fam.id}) está agora ${fam.ativo ? 'ATIVA' : 'INATIVA'}`, fam.ativo ? 'green' : 'red');
      this.notifyTabs('bfp_familias');
    }
  }

  adicionarSaldoFamilia(id, valor) {
    const familias = this.getFamilias();
    const fam = familias.find(f => f.id === id);
    if (fam) {
      fam.saldo += parseFloat(valor);
      localStorage.setItem(DB_KEYS.FAMILIAS, JSON.stringify(familias));
      this.addLog(`Carregamento Manual — Adicionados +${parseFloat(valor).toFixed(2)}€ ao cartão de ${fam.nome} (${fam.id})`, 'green');
      this.notifyTabs('bfp_familias');
    }
  }

  removerSaldoFamilia(id, valor) {
    const familias = this.getFamilias();
    const fam = familias.find(f => f.id === id);
    if (fam) {
      fam.saldo = Math.max(0, fam.saldo - parseFloat(valor));
      localStorage.setItem(DB_KEYS.FAMILIAS, JSON.stringify(familias));
      this.addLog(`Ajuste de Saldo — Deduzidos -${parseFloat(valor).toFixed(2)}€ da família ${fam.nome} (${fam.id})`, 'red');
      this.notifyTabs('bfp_familias');
    }
  }

  carregarSaldosGlobais() {
    const familias = this.getFamilias();
    let totalAdicionado = 0;
    familias.forEach(f => {
      if (f.ativo) {
        f.saldo += f.quota;
        totalAdicionado += f.quota;
      }
    });
    localStorage.setItem(DB_KEYS.FAMILIAS, JSON.stringify(familias));
    this.addLog(`Carregamento Mensal Global — Atribuídos +${totalAdicionado.toFixed(2)}€ a todas as famílias ativas`, 'green');
    this.notifyTabs('bfp_familias');
    return totalAdicionado;
  }

  // --- MÓDULO DE COMERCIANTE / VENDEDOR ---
  getVendedores() {
    return JSON.parse(localStorage.getItem(DB_KEYS.VENDEDORES) || '[]');
  }

  addVendedor(vendedorData) {
    const vendedores = this.getVendedores();
    const novoVend = {
      id: vendedorData.id || `VEND-0${vendedores.length + 1}`,
      banca: vendedorData.banca || vendedorData.nome,
      resp: vendedorData.resp || 'Responsável',
      pin: String(vendedorData.pin || '1234').trim(),
      ativo: vendedorData.ativo !== undefined ? vendedorData.ativo : true
    };
    vendedores.unshift(novoVend);
    localStorage.setItem(DB_KEYS.VENDEDORES, JSON.stringify(vendedores));
    this.addLog(`Novo Comerciante Cadastrado — ${novoVend.banca} (${novoVend.id})`, 'green');
    this.notifyTabs('bfp_vendedores');
    return novoVend;
  }

  deleteVendedor(id) {
    let vendedores = this.getVendedores();
    vendedores = vendedores.filter(v => v.id !== id);
    localStorage.setItem(DB_KEYS.VENDEDORES, JSON.stringify(vendedores));
    this.addLog(`Comerciante Eliminado — ${id} removido da plataforma`, 'red');
    this.notifyTabs('bfp_vendedores');
  }

  toggleEstadoVendedor(id) {
    const vendedores = this.getVendedores();
    const vend = vendedores.find(v => v.id === id);
    if (vend) {
      vend.ativo = !vend.ativo;
      localStorage.setItem(DB_KEYS.VENDEDORES, JSON.stringify(vendedores));
      this.addLog(`Estado de Comerciante Alterado — ${vend.banca} (${vend.id}) está ${vend.ativo ? 'ATIVO' : 'SUSPENSO'}`, vend.ativo ? 'green' : 'red');
      this.notifyTabs('bfp_vendedores');
    }
  }

  // --- CORE: REGISTO DE COBRANÇA 50/50 NA APP VENDEDOR ---
  registarVenda(vendedorId, cartaoId, produtos, valorTotal) {
    const total = parseFloat(valorTotal);
    if (isNaN(total) || total <= 0) {
      throw new Error('Valor da venda inválido.');
    }

    // 1. Validar e obter a família
    const familias = this.getFamilias();
    const fam = familias.find(f => f.id.toUpperCase() === cartaoId.toUpperCase() || f.nome.toUpperCase().includes(cartaoId.toUpperCase()));

    if (!fam) {
      throw new Error(`O Cartão "${cartaoId}" não foi encontrado no sistema.`);
    }

    if (!fam.ativo) {
      throw new Error(`O Cartão "${fam.id}" está inativo.`);
    }

    // 2. Cálculo do acerto 50/50
    const fam50 = total * 0.5;
    const egor50 = total * 0.5;

    // 3. Verificar saldo suficiente
    if (fam.saldo < fam50) {
      throw new Error(`Saldo insuficiente! Saldo atual: ${fam.saldo.toFixed(2)}€ | Necessário (50%): ${fam50.toFixed(2)}€`);
    }

    // 4. Obter dados do vendedor
    const vendedores = this.getVendedores();
    const vend = vendedores.find(v => v.id === vendedorId) || { banca: 'Comerciante Aderente', id: vendedorId };

    // 5. Deduzir saldo da família atomicamente
    fam.saldo -= fam50;
    localStorage.setItem(DB_KEYS.FAMILIAS, JSON.stringify(familias));

    // 6. Criar e guardar a transação
    const transacoes = this.getTransacoes();
    const novaTx = {
      id: `TX-${Math.floor(100000 + Math.random() * 900000)}`,
      data: new Date().toLocaleString('pt-PT'),
      vendedorId: vend.id,
      vendedor: vend.banca || vend.nome,
      familiaId: fam.id,
      familia: `${fam.nome} (${fam.id})`,
      produtos: produtos || 'Fruta e Legumes Frescos',
      total: total,
      fam50: fam50,
      egor50: egor50
    };

    transacoes.unshift(novaTx);
    localStorage.setItem(DB_KEYS.TRANSACOES, JSON.stringify(transacoes));

    // 7. Registar Log de Auditoria
    this.addLog(`Venda Comparticipada (50/50) — ${vend.banca} cobrou ${total.toFixed(2)}€ a ${fam.nome}. [Família Paga: ${fam50.toFixed(2)}€ | EGOR: ${egor50.toFixed(2)}€]`, 'blue');

    // 8. Sincronizar abas
    this.notifyTabs('bfp_transacoes');
    this.notifyTabs('bfp_familias');

    return novaTx;
  }

  getTransacoes() {
    return JSON.parse(localStorage.getItem(DB_KEYS.TRANSACOES) || '[]');
  }

  // --- INDICADORES PAINEL BACKOFFICE ---
  getStats() {
    const familias = this.getFamilias();
    const transacoes = this.getTransacoes();
    const vendedores = this.getVendedores();

    const totalSaldoCarregado = familias.reduce((acc, f) => acc + (f.saldo || 0), 0);
    const totalComparticipacaoEGOR = transacoes.reduce((acc, t) => acc + (t.egor50 || 0), 0);
    const vendedoresAtivos = vendedores.filter(v => v.ativo).length;

    return {
      totalSaldoCarregado,
      totalComparticipacaoEGOR,
      totalTransacoes: transacoes.length,
      vendedoresAtivos
    };
  }

  // --- PAINEL DE AUDITORIA / LOGS ---
  getLogs() {
    return JSON.parse(localStorage.getItem(DB_KEYS.LOGS) || '[]');
  }

  addLog(texto, tipo = 'blue') {
    const logs = this.getLogs();
    logs.unshift({
      id: `LOG-${Date.now()}`,
      texto,
      hora: new Date().toLocaleString('pt-PT'),
      tipo
    });
    localStorage.setItem(DB_KEYS.LOGS, JSON.stringify(logs.slice(0, 100))); // Guarda os últimos 100 registos
    this.notifyTabs('bfp_logs');
  }

  resetTotalDB() {
    localStorage.removeItem(DB_KEYS.FAMILIAS);
    localStorage.removeItem(DB_KEYS.VENDEDORES);
    localStorage.removeItem(DB_KEYS.TRANSACOES);
    localStorage.removeItem(DB_KEYS.LOGS);
    this.initDefaults();
    this.notifyTabs('bfp_reset');
  }

  // Despacha evento para sincronizar abas ativas instantaneamente
  notifyTabs(key) {
    window.dispatchEvent(new Event('storage'));
  }
}

// Instância Global
const db = new BFPDatabase();