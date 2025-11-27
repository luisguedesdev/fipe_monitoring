import { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import Header from "../components/Header";
import OfflineIndicator from "../components/OfflineIndicator";
import {
  saveVeiculos,
  getVeiculos as getOfflineVeiculos,
  deleteVeiculo as deleteOfflineVeiculo,
  getLastSyncTime,
} from "../lib/offlineStorage";
import styles from "../styles/Todos.module.css";

const MAX_COMPARACAO = 3;

export default function TodosVeiculos() {
  const router = useRouter();
  const [veiculos, setVeiculos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroMarca, setFiltroMarca] = useState("");
  const [ordenacao, setOrdenacao] = useState("recente");
  const [deletando, setDeletando] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [isOnline, setIsOnline] = useState(true);
  const [isOfflineData, setIsOfflineData] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [selecionados, setSelecionados] = useState([]);
  const [modoSelecao, setModoSelecao] = useState(false);

  useEffect(() => {
    // Verificar status de conexão
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      // Recarregar dados quando voltar online
      carregarVeiculos();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    carregarVeiculos();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const carregarVeiculos = async () => {
    try {
      // Tentar buscar da API primeiro
      if (navigator.onLine) {
        const response = await fetch("/api/veiculos");
        const data = await response.json();

        if (data.success) {
          setVeiculos(data.veiculos);
          setIsOfflineData(false);
          // Salvar no IndexedDB para uso offline
          await saveVeiculos(data.veiculos);
          setLastSync(new Date());
        }
      } else {
        // Se offline, carregar do IndexedDB
        await carregarDadosOffline();
      }
    } catch (error) {
      console.error("Erro ao carregar veículos:", error);
      // Fallback para dados offline em caso de erro
      await carregarDadosOffline();
    } finally {
      setLoading(false);
    }
  };

  const carregarDadosOffline = async () => {
    try {
      const offlineVeiculos = await getOfflineVeiculos();
      if (offlineVeiculos.length > 0) {
        setVeiculos(offlineVeiculos);
        setIsOfflineData(true);
        const syncTime = await getLastSyncTime();
        setLastSync(syncTime);
      }
    } catch (error) {
      console.error("Erro ao carregar dados offline:", error);
    }
  };

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

  const formatarData = (data) => {
    return new Date(data).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
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

  const deletarVeiculo = async (veiculo, e) => {
    e.preventDefault();
    e.stopPropagation();

    const chave = `${veiculo.codigoMarca}-${veiculo.codigoModelo}-${veiculo.anoModelo}`;
    setDeletando(chave);

    try {
      if (navigator.onLine) {
        const response = await fetch("/api/veiculos/deletar", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            codigoMarca: veiculo.codigoMarca,
            codigoModelo: veiculo.codigoModelo,
            anoModelo: veiculo.anoModelo,
          }),
        });

        const data = await response.json();

        if (data.success) {
          // Remover da lista local
          setVeiculos((prev) =>
            prev.filter(
              (v) =>
                !(
                  v.codigoMarca === veiculo.codigoMarca &&
                  v.codigoModelo === veiculo.codigoModelo &&
                  v.anoModelo === veiculo.anoModelo
                )
            )
          );
          // Remover do IndexedDB também
          await deleteOfflineVeiculo(
            veiculo.codigoMarca,
            veiculo.codigoModelo,
            veiculo.anoModelo
          );
          setConfirmDelete(null);
        } else {
          alert("Erro ao deletar veículo: " + data.error);
        }
      } else {
        // Offline - apenas remover localmente (será sincronizado depois)
        setVeiculos((prev) =>
          prev.filter(
            (v) =>
              !(
                v.codigoMarca === veiculo.codigoMarca &&
                v.codigoModelo === veiculo.codigoModelo &&
                v.anoModelo === veiculo.anoModelo
              )
          )
        );
        await deleteOfflineVeiculo(
          veiculo.codigoMarca,
          veiculo.codigoModelo,
          veiculo.anoModelo
        );
        setConfirmDelete(null);
        alert(
          "Veículo removido localmente. Será sincronizado quando voltar online."
        );
      }
    } catch (error) {
      console.error("Erro ao deletar:", error);
      alert("Erro ao deletar veículo");
    } finally {
      setDeletando(null);
    }
  };

  const abrirConfirmacao = (veiculo, e) => {
    e.preventDefault();
    e.stopPropagation();
    setConfirmDelete(veiculo);
  };

  const fecharConfirmacao = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setConfirmDelete(null);
  };

  // Funções de seleção para comparação
  const toggleSelecao = (veiculo, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const chave = `${veiculo.codigoMarca}-${veiculo.codigoModelo}-${veiculo.anoModelo}`;

    setSelecionados((prev) => {
      const jaExiste = prev.find((v) => v.chave === chave);
      if (jaExiste) {
        return prev.filter((v) => v.chave !== chave);
      }
      if (prev.length >= MAX_COMPARACAO) {
        return prev;
      }
      return [...prev, { ...veiculo, chave }];
    });
  };

  const limparSelecao = () => {
    setSelecionados([]);
    setModoSelecao(false);
  };

  const irParaComparacao = () => {
    if (selecionados.length < 2) {
      alert("Selecione pelo menos 2 veículos para comparar");
      return;
    }
    const params = selecionados
      .map((v) => `v=${v.codigoMarca}-${v.codigoModelo}-${v.anoModelo}`)
      .join("&");
    router.push(`/comparar?${params}`);
  };

  const isSelecionado = (veiculo) => {
    const chave = `${veiculo.codigoMarca}-${veiculo.codigoModelo}-${veiculo.anoModelo}`;
    return selecionados.some((v) => v.chave === chave);
  };

  // Filtrar e ordenar veículos
  const veiculosFiltrados = veiculos
    .filter((v) =>
      filtroMarca
        ? v.nomeMarca?.toLowerCase().includes(filtroMarca.toLowerCase()) ||
          v.nomeModelo?.toLowerCase().includes(filtroMarca.toLowerCase())
        : true
    )
    .sort((a, b) => {
      switch (ordenacao) {
        case "recente":
          return new Date(b.ultimaConsulta) - new Date(a.ultimaConsulta);
        case "antigo":
          return new Date(a.ultimaConsulta) - new Date(b.ultimaConsulta);
        case "preco-maior":
          return b.ultimoPrecoNum - a.ultimoPrecoNum;
        case "preco-menor":
          return a.ultimoPrecoNum - b.ultimoPrecoNum;
        case "variacao-maior":
          return b.variacao - a.variacao;
        case "variacao-menor":
          return a.variacao - b.variacao;
        case "registros":
          return b.totalRegistros - a.totalRegistros;
        default:
          return 0;
      }
    });

  // Obter marcas únicas para o filtro
  const marcasUnicas = [...new Set(veiculos.map((v) => v.nomeMarca))].sort();

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

            {/* Skeleton Cards */}
            <div className={styles.skeletonGrid}>
              {[1, 2, 3].map((i) => (
                <div key={i} className={styles.skeletonCard}>
                  <div className={styles.skeletonHeader}>
                    <div className={styles.skeletonBadge}></div>
                    <div className={styles.skeletonBadgeSmall}></div>
                  </div>
                  <div className={styles.skeletonTitle}></div>
                  <div className={styles.skeletonSubtitle}></div>
                  <div className={styles.skeletonPrice}></div>
                  <div className={styles.skeletonInfo}>
                    <div className={styles.skeletonInfoItem}></div>
                    <div className={styles.skeletonInfoItem}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <OfflineIndicator
        isOnline={isOnline}
        isOfflineData={isOfflineData}
        lastSync={lastSync}
        onSync={carregarVeiculos}
      />
      <div className={styles.container}>
        <Head>
          <title>Todos os Veículos - FIPE Monitor</title>
          <meta
            name="description"
            content="Lista de todos os veículos monitorados"
          />
        </Head>

        {/* Page Header */}
        <div className={styles.pageHeader}>
          <h1>📋 Veículos Monitorados</h1>
          <p>
            {veiculos.length} veículo{veiculos.length !== 1 ? "s" : ""}{" "}
            cadastrado
            {veiculos.length !== 1 ? "s" : ""}
          </p>
          {isOfflineData && (
            <span className={styles.offlineBadge}>
              📱 Modo Offline • Sincronizado: {formatarDataHora(lastSync)}
            </span>
          )}
        </div>

        {/* Botão de modo comparação */}
        {veiculos.length >= 2 && !modoSelecao && (
          <div className={styles.comparacaoToggle}>
            <button
              className={styles.btnComparar}
              onClick={() => setModoSelecao(true)}
            >
              📊 Comparar veículos
            </button>
          </div>
        )}

        {/* Filtros */}
        <div className={styles.filtrosContainer}>
          <div className={styles.filtroGroup}>
            <label>🔍 Buscar</label>
            <input
              type="text"
              placeholder="Buscar por marca ou modelo..."
              value={filtroMarca}
              onChange={(e) => setFiltroMarca(e.target.value)}
              className={styles.inputBusca}
            />
          </div>

          <div className={styles.filtroGroup}>
            <label>📊 Ordenar por</label>
            <select
              value={ordenacao}
              onChange={(e) => setOrdenacao(e.target.value)}
              className={styles.selectOrdenacao}
            >
              <option value="recente">Mais recente</option>
              <option value="antigo">Mais antigo</option>
              <option value="preco-maior">Maior preço</option>
              <option value="preco-menor">Menor preço</option>
              <option value="variacao-maior">Maior valorização</option>
              <option value="variacao-menor">Maior desvalorização</option>
              <option value="registros">Mais registros</option>
            </select>
          </div>
        </div>

        {/* Resumo */}
        <div className={styles.resumoCards}>
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
            <span className={styles.resumoLabel}>Registros totais</span>
          </div>
          <div className={styles.resumoCard}>
            <span className={styles.resumoIcon}>🏷️</span>
            <span className={styles.resumoValor}>{marcasUnicas.length}</span>
            <span className={styles.resumoLabel}>Marcas</span>
          </div>
        </div>

        {/* Lista de veículos */}
        {veiculosFiltrados.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>🔍</span>
            <h2>Nenhum veículo encontrado</h2>
            <p>
              {filtroMarca
                ? "Tente uma busca diferente"
                : "Faça sua primeira consulta na página inicial"}
            </p>
            {isOnline && (
              <Link href="/" className={styles.btnPrimary}>
                Consultar veículo
              </Link>
            )}
          </div>
        ) : (
          <div className={styles.veiculosGrid}>
            {veiculosFiltrados.map((veiculo) => {
              const chave = `${veiculo.codigoMarca}-${veiculo.codigoModelo}-${veiculo.anoModelo}`;
              const selecionado = isSelecionado(veiculo);
              const desabilitado =
                !selecionado && selecionados.length >= MAX_COMPARACAO;

              return (
                <div
                  key={chave}
                  className={`${styles.veiculoCardWrapper} ${
                    selecionado ? styles.cardSelecionado : ""
                  }`}
                >
                  {modoSelecao ? (
                    // Em modo seleção, usar div clicável
                    <div
                      className={`${styles.veiculoCard} ${
                        styles.cardSelecaoMode
                      } ${desabilitado ? styles.cardDesabilitado : ""}`}
                      onClick={(e) => {
                        if (!desabilitado) {
                          toggleSelecao(veiculo, e);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <div className={styles.checkboxWrapper}>
                        <div
                          className={`${styles.checkbox} ${
                            selecionado ? styles.checked : ""
                          }`}
                        >
                          {selecionado ? "✓" : ""}
                        </div>
                      </div>
                      <div className={styles.veiculoHeader}>
                        <span className={styles.veiculoMarca}>
                          {veiculo.nomeMarca}
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

                      <h3 className={styles.veiculoModelo}>
                        {veiculo.nomeModelo}
                      </h3>
                      <span className={styles.veiculoAno}>
                        {veiculo.nomeAno}
                      </span>

                      <div className={styles.veiculoPreco}>
                        <span className={styles.precoLabel}>Último preço</span>
                        <span className={styles.precoValor}>
                          {formatarMoeda(veiculo.ultimoPrecoNum)}
                        </span>
                      </div>

                      <div className={styles.veiculoInfo}>
                        <div className={styles.infoItem}>
                          <span className={styles.infoIcon}>📊</span>
                          <span>{veiculo.totalRegistros} registros</span>
                        </div>
                        <div className={styles.infoItem}>
                          <span className={styles.infoIcon}>📅</span>
                          <span>{formatarData(veiculo.ultimaConsulta)}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Modo normal, usar Link
                    <>
                      <Link
                        href={`/resultado?marca=${veiculo.codigoMarca}&modelo=${veiculo.codigoModelo}&ano=${veiculo.anoModelo}`}
                        className={styles.veiculoCard}
                      >
                        <div className={styles.veiculoHeader}>
                          <span className={styles.veiculoMarca}>
                            {veiculo.nomeMarca}
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

                        <h3 className={styles.veiculoModelo}>
                          {veiculo.nomeModelo}
                        </h3>
                        <span className={styles.veiculoAno}>
                          {veiculo.nomeAno}
                        </span>

                        <div className={styles.veiculoPreco}>
                          <span className={styles.precoLabel}>
                            Último preço
                          </span>
                          <span className={styles.precoValor}>
                            {formatarMoeda(veiculo.ultimoPrecoNum)}
                          </span>
                        </div>

                        <div className={styles.veiculoInfo}>
                          <div className={styles.infoItem}>
                            <span className={styles.infoIcon}>📊</span>
                            <span>{veiculo.totalRegistros} registros</span>
                          </div>
                          <div className={styles.infoItem}>
                            <span className={styles.infoIcon}>📅</span>
                            <span>{formatarData(veiculo.ultimaConsulta)}</span>
                          </div>
                        </div>

                        <div className={styles.verMais}>Ver histórico →</div>
                      </Link>

                      <button
                        className={styles.btnDeletar}
                        onClick={(e) => abrirConfirmacao(veiculo, e)}
                        title="Deletar veículo"
                      >
                        🗑️
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Barra de ações flutuante para comparação */}
        {modoSelecao && (
          <div className={styles.barraComparacao}>
            <div className={styles.barraInfo}>
              <span className={styles.barraContador}>
                {selecionados.length} / {MAX_COMPARACAO} selecionados
              </span>
              <div className={styles.barraSelecionados}>
                {selecionados.map((v, i) => (
                  <span key={v.chave} className={styles.chipVeiculo}>
                    {v.nomeModelo}
                    <button
                      onClick={() =>
                        toggleSelecao(v, {
                          preventDefault: () => {},
                          stopPropagation: () => {},
                        })
                      }
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
            <div className={styles.barraAcoes}>
              <button
                className={styles.btnCancelarComp}
                onClick={limparSelecao}
              >
                Cancelar
              </button>
              <button
                className={styles.btnCompararAtivo}
                onClick={irParaComparacao}
                disabled={selecionados.length < 2}
              >
                Comparar ({selecionados.length})
              </button>
            </div>
          </div>
        )}

        {/* Modal de confirmação */}
        {confirmDelete && (
          <div className={styles.modalOverlay} onClick={fecharConfirmacao}>
            <div
              className={styles.modalContent}
              onClick={(e) => e.stopPropagation()}
            >
              <h3>⚠️ Confirmar exclusão</h3>
              <p>
                Tem certeza que deseja excluir o veículo{" "}
                <strong>
                  {confirmDelete.nomeMarca} {confirmDelete.nomeModelo}
                </strong>
                ?
              </p>
              <p className={styles.modalWarning}>
                Esta ação irá remover {confirmDelete.totalRegistros} registros
                de histórico e não pode ser desfeita.
              </p>
              <div className={styles.modalButtons}>
                <button
                  className={styles.btnCancelar}
                  onClick={fecharConfirmacao}
                >
                  Cancelar
                </button>
                <button
                  className={styles.btnConfirmarDelete}
                  onClick={(e) => deletarVeiculo(confirmDelete, e)}
                  disabled={deletando !== null}
                >
                  {deletando ? "Excluindo..." : "Sim, excluir"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
