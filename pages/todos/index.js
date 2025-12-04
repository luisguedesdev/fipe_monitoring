import { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import Header from "../../components/Header";
import { useAuth } from "../../contexts/AuthContext";
import styles from "../../styles/TodosAgrupado.module.css";

export default function TodosVeiculosAgrupado() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const isAdmin = user?.isAdmin;

  const [veiculos, setVeiculos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [marcaExpandida, setMarcaExpandida] = useState(null);
  const [atualizando, setAtualizando] = useState(false);
  const [atualizacaoStatus, setAtualizacaoStatus] = useState(null);

  // Estados para seleção (admin)
  const [modoSelecao, setModoSelecao] = useState(false);
  const [selecionados, setSelecionados] = useState(new Set());
  const [deletando, setDeletando] = useState(false);

  useEffect(() => {
    carregarVeiculos();
  }, []);

  const carregarVeiculos = async () => {
    try {
      const response = await fetch("/api/veiculos");
      const data = await response.json();

      if (data.success) {
        setVeiculos(data.veiculos);
      }
    } catch (error) {
      console.error("Erro ao carregar veículos:", error);
    } finally {
      setLoading(false);
    }
  };

  const atualizarTodos = async () => {
    if (atualizando) return;

    setAtualizando(true);
    setAtualizacaoStatus({
      tipo: "info",
      mensagem: "Verificando meses faltantes...",
    });

    try {
      const response = await fetch("/api/atualizar-todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (data.success) {
        if (data.totalAtualizados > 0) {
          setAtualizacaoStatus({
            tipo: "sucesso",
            mensagem: `✅ ${data.totalAtualizados} registro(s) adicionado(s)!`,
          });
          await carregarVeiculos();
        } else {
          setAtualizacaoStatus({
            tipo: "info",
            mensagem: "✓ Todos os veículos já estão atualizados!",
          });
        }
      } else {
        setAtualizacaoStatus({
          tipo: "erro",
          mensagem: `Erro: ${data.error}`,
        });
      }
    } catch (error) {
      console.error("Erro ao atualizar:", error);
      setAtualizacaoStatus({
        tipo: "erro",
        mensagem: "Erro ao conectar com o servidor",
      });
    } finally {
      setAtualizando(false);
      setTimeout(() => setAtualizacaoStatus(null), 5000);
    }
  };

  // Funções de seleção (admin)
  const toggleSelecao = (chave) => {
    const novoSet = new Set(selecionados);
    if (novoSet.has(chave)) {
      novoSet.delete(chave);
    } else {
      novoSet.add(chave);
    }
    setSelecionados(novoSet);
  };

  const selecionarTodosDaMarca = (marca) => {
    const veiculosMarca = veiculosPorMarca[marca];
    const novoSet = new Set(selecionados);
    const chaves = veiculosMarca.map(
      (v) => `${v.codigoMarca}-${v.codigoModelo}-${v.anoModelo}`
    );

    // Se todos já estão selecionados, desseleciona todos
    const todosJaSelecionados = chaves.every((c) => novoSet.has(c));
    if (todosJaSelecionados) {
      chaves.forEach((c) => novoSet.delete(c));
    } else {
      chaves.forEach((c) => novoSet.add(c));
    }
    setSelecionados(novoSet);
  };

  const cancelarSelecao = () => {
    setModoSelecao(false);
    setSelecionados(new Set());
  };

  const deletarSelecionados = async () => {
    if (selecionados.size === 0) return;

    const confirmar = window.confirm(
      `Tem certeza que deseja excluir ${selecionados.size} veículo(s) do banco de dados?\n\nIsso removerá TODO o histórico de preços destes veículos.`
    );

    if (!confirmar) return;

    setDeletando(true);
    setAtualizacaoStatus({
      tipo: "info",
      mensagem: `Excluindo ${selecionados.size} veículo(s)...`,
    });

    try {
      let excluidos = 0;
      let erros = 0;

      for (const chave of selecionados) {
        // chave formato: "marca-modelo-anoModelo" onde anoModelo pode ser "2020-3"
        const partes = chave.split("-");
        const marca = partes[0];
        const modelo = partes[1];
        const ano = partes.slice(2).join("-"); // Junta o resto caso ano tenha hífen
        try {
          const response = await fetch("/api/admin/veiculos", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              codigo_marca: marca,
              codigo_modelo: modelo,
              ano_modelo: ano,
            }),
          });

          if (response.ok) {
            excluidos++;
          } else {
            erros++;
          }
        } catch (e) {
          erros++;
        }
      }

      if (excluidos > 0) {
        setAtualizacaoStatus({
          tipo: "sucesso",
          mensagem: `✅ ${excluidos} veículo(s) excluído(s)!${
            erros > 0 ? ` (${erros} erro(s))` : ""
          }`,
        });
        setSelecionados(new Set());
        setModoSelecao(false);
        await carregarVeiculos();
      } else {
        setAtualizacaoStatus({
          tipo: "erro",
          mensagem: "Erro ao excluir veículos",
        });
      }
    } catch (error) {
      console.error("Erro ao deletar:", error);
      setAtualizacaoStatus({
        tipo: "erro",
        mensagem: "Erro ao conectar com o servidor",
      });
    } finally {
      setDeletando(false);
      setTimeout(() => setAtualizacaoStatus(null), 5000);
    }
  };

  // Agrupar veículos por marca
  const veiculosPorMarca = veiculos.reduce((acc, veiculo) => {
    const marca = veiculo.nomeMarca;
    if (!acc[marca]) {
      acc[marca] = [];
    }
    acc[marca].push(veiculo);
    return acc;
  }, {});

  // Ordenar marcas alfabeticamente e veículos por preço
  const marcasOrdenadas = Object.keys(veiculosPorMarca).sort();
  marcasOrdenadas.forEach((marca) => {
    veiculosPorMarca[marca].sort((a, b) => b.ultimoPrecoNum - a.ultimoPrecoNum);
  });

  const formatarMoeda = (valor) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(valor);
  };

  const formatarVariacao = (valor) => {
    const sinal = valor > 0 ? "+" : "";
    return `${sinal}${valor.toFixed(2)}%`;
  };

  const formatarDataHora = (data) => {
    if (!data) return "Nunca";
    return new Date(data).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const toggleMarca = (marca) => {
    setMarcaExpandida(marcaExpandida === marca ? null : marca);
  };

  // Calcular estatísticas por marca
  const getEstatisticasMarca = (veiculosMarca) => {
    const total = veiculosMarca.length;
    const totalRegistros = veiculosMarca.reduce(
      (acc, v) => acc + v.totalRegistros,
      0
    );
    const mediaPreco =
      veiculosMarca.reduce((acc, v) => acc + v.ultimoPrecoNum, 0) / total;
    const mediaVariacao =
      veiculosMarca.reduce((acc, v) => acc + v.variacao, 0) / total;

    return { total, totalRegistros, mediaPreco, mediaVariacao };
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className={styles.loadingContainer}>
          <div className={styles.loadingContent}>
            <div className={styles.loadingIcon}>🚗</div>
            <h2 className={styles.loadingTitle}>Carregando veículos</h2>
            <p className={styles.loadingText}>Buscando dados do servidor...</p>
            <div className={styles.progressBar}>
              <div className={styles.progressFill}></div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className={styles.container}>
        <Head>
          <title>Veículos por Marca - Drive Price X</title>
          <meta
            name="description"
            content="Lista de veículos monitorados agrupados por marca"
          />
        </Head>

        {/* Page Header */}
        <div className={styles.pageHeader}>
          <h1>📋 Veículos Monitorados</h1>
          <p>
            {veiculos.length} veículo{veiculos.length !== 1 ? "s" : ""} em{" "}
            {marcasOrdenadas.length} marca
            {marcasOrdenadas.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Botões de ação */}
        <div className={styles.acoesContainer}>
          <Link href="/todos/lista" className={styles.btnSecundario}>
            📋 Ver lista completa
          </Link>
          <button
            className={`${styles.btnAtualizar} ${
              atualizando ? styles.btnAtualizando : ""
            }`}
            onClick={atualizarTodos}
            disabled={atualizando || modoSelecao}
          >
            {atualizando ? (
              <>
                <span className={styles.spinnerSmall}></span>
                Atualizando...
              </>
            ) : (
              "🔄 Atualizar todos"
            )}
          </button>

          {/* Botões de admin */}
          {isAdmin && !modoSelecao && (
            <button
              className={styles.btnAdmin}
              onClick={() => setModoSelecao(true)}
            >
              🗑️ Selecionar para excluir
            </button>
          )}
        </div>

        {/* Barra de seleção (admin) */}
        {isAdmin && modoSelecao && (
          <div className={styles.selecaoBar}>
            <span className={styles.selecaoInfo}>
              {selecionados.size} veículo(s) selecionado(s)
            </span>
            <div className={styles.selecaoBotoes}>
              <button
                className={styles.btnCancelar}
                onClick={cancelarSelecao}
                disabled={deletando}
              >
                Cancelar
              </button>
              <button
                className={styles.btnDeletar}
                onClick={deletarSelecionados}
                disabled={selecionados.size === 0 || deletando}
              >
                {deletando
                  ? "Excluindo..."
                  : `🗑️ Excluir ${
                      selecionados.size > 0 ? `(${selecionados.size})` : ""
                    }`}
              </button>
            </div>
          </div>
        )}

        {/* Status da atualização */}
        {atualizacaoStatus && (
          <div
            className={`${styles.statusBar} ${styles[atualizacaoStatus.tipo]}`}
          >
            {atualizacaoStatus.mensagem}
          </div>
        )}

        {/* Resumo */}
        <div className={styles.resumoCards}>
          <div className={styles.resumoCard}>
            <span className={styles.resumoIcon}>🏭</span>
            <span className={styles.resumoValor}>{marcasOrdenadas.length}</span>
            <span className={styles.resumoLabel}>Marcas</span>
          </div>
          <div className={styles.resumoCard}>
            <span className={styles.resumoIcon}>🚗</span>
            <span className={styles.resumoValor}>{veiculos.length}</span>
            <span className={styles.resumoLabel}>Veículos</span>
          </div>
          <div className={styles.resumoCard}>
            <span className={styles.resumoIcon}>📊</span>
            <span className={styles.resumoValor}>
              {veiculos.reduce((acc, v) => acc + v.totalRegistros, 0)}
            </span>
            <span className={styles.resumoLabel}>Registros</span>
          </div>
        </div>

        {/* Lista de marcas */}
        {marcasOrdenadas.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>🔍</span>
            <h2>Nenhum veículo cadastrado</h2>
            <p>Faça sua primeira consulta na página inicial</p>
            <Link href="/" className={styles.btnPrimary}>
              Consultar veículo
            </Link>
          </div>
        ) : (
          <div className={styles.marcasContainer}>
            {marcasOrdenadas.map((marca) => {
              const veiculosMarca = veiculosPorMarca[marca];
              const stats = getEstatisticasMarca(veiculosMarca);
              const isExpandida = marcaExpandida === marca;

              return (
                <div key={marca} className={styles.marcaCard}>
                  <button
                    className={`${styles.marcaHeader} ${
                      isExpandida ? styles.marcaExpandida : ""
                    }`}
                    onClick={() => toggleMarca(marca)}
                  >
                    <div className={styles.marcaInfo}>
                      <h2 className={styles.marcaNome}>{marca}</h2>
                      <div className={styles.marcaStats}>
                        <span className={styles.statItem}>
                          🚗 {stats.total} veículo{stats.total !== 1 ? "s" : ""}
                        </span>
                        <span className={styles.statItem}>
                          📊 {stats.totalRegistros} registros
                        </span>
                        <span
                          className={`${styles.statItem} ${
                            stats.mediaVariacao > 0
                              ? styles.variacaoUp
                              : stats.mediaVariacao < 0
                              ? styles.variacaoDown
                              : ""
                          }`}
                        >
                          {formatarVariacao(stats.mediaVariacao)} média
                        </span>
                      </div>
                    </div>
                    <span className={styles.expandIcon}>
                      {isExpandida ? "▼" : "▶"}
                    </span>
                  </button>

                  {isExpandida && (
                    <div className={styles.veiculosLista}>
                      {/* Botão selecionar todos da marca (admin) */}
                      {modoSelecao && (
                        <button
                          className={styles.selecionarTodosMarca}
                          onClick={(e) => {
                            e.stopPropagation();
                            selecionarTodosDaMarca(marca);
                          }}
                        >
                          ☑️ Selecionar todos de {marca}
                        </button>
                      )}

                      {veiculosMarca.map((veiculo) => {
                        const chave = `${veiculo.codigoMarca}-${veiculo.codigoModelo}-${veiculo.anoModelo}`;
                        const estaSelecionado = selecionados.has(chave);

                        // Em modo seleção, usar div clicável em vez de Link
                        if (modoSelecao) {
                          return (
                            <div
                              key={chave}
                              className={`${styles.veiculoItem} ${
                                estaSelecionado ? styles.veiculoSelecionado : ""
                              }`}
                              onClick={() => toggleSelecao(chave)}
                            >
                              <div className={styles.checkboxContainer}>
                                <input
                                  type="checkbox"
                                  checked={estaSelecionado}
                                  onChange={() => {}}
                                  className={styles.checkbox}
                                />
                              </div>
                              <div className={styles.veiculoInfo}>
                                <span className={styles.veiculoModelo}>
                                  {veiculo.nomeModelo}
                                </span>
                                <span className={styles.veiculoAno}>
                                  {veiculo.nomeAno}
                                </span>
                              </div>
                              <div className={styles.veiculoDados}>
                                <span className={styles.veiculoPreco}>
                                  {formatarMoeda(veiculo.ultimoPrecoNum)}
                                </span>
                              </div>
                            </div>
                          );
                        }

                        // Modo normal - Link para resultado
                        return (
                          <Link
                            key={chave}
                            href={`/resultado?marca=${veiculo.codigoMarca}&modelo=${veiculo.codigoModelo}&ano=${veiculo.anoModelo}`}
                            className={styles.veiculoItem}
                          >
                            <div className={styles.veiculoInfo}>
                              <span className={styles.veiculoModelo}>
                                {veiculo.nomeModelo}
                              </span>
                              <span className={styles.veiculoAno}>
                                {veiculo.nomeAno}
                              </span>
                            </div>
                            <div className={styles.veiculoDados}>
                              <span className={styles.veiculoPreco}>
                                {formatarMoeda(veiculo.ultimoPrecoNum)}
                              </span>
                              <span
                                className={`${styles.veiculoVariacao} ${
                                  veiculo.variacao > 0
                                    ? styles.variacaoUp
                                    : veiculo.variacao < 0
                                    ? styles.variacaoDown
                                    : ""
                                }`}
                              >
                                {formatarVariacao(veiculo.variacao)}
                              </span>
                            </div>
                            <span className={styles.veiculoArrow}>→</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Link para lista completa */}
        {veiculos.length > 0 && (
          <div className={styles.footerLinks}>
            <Link href="/todos/lista" className={styles.linkLista}>
              📋 Ver lista completa com filtros e comparação →
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
