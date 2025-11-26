import { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import styles from "../styles/Todos.module.css";

export default function TodosVeiculos() {
  const [veiculos, setVeiculos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroMarca, setFiltroMarca] = useState("");
  const [ordenacao, setOrdenacao] = useState("recente");
  const [deletando, setDeletando] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

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

  const deletarVeiculo = async (veiculo, e) => {
    e.preventDefault();
    e.stopPropagation();

    const chave = `${veiculo.codigoMarca}-${veiculo.codigoModelo}-${veiculo.anoModelo}`;
    setDeletando(chave);

    try {
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
        setConfirmDelete(null);
      } else {
        alert("Erro ao deletar veículo: " + data.error);
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
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Carregando veículos...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Todos os Veículos - FIPE Monitor</title>
        <meta name="description" content="Lista de todos os veículos monitorados" />
      </Head>

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <Link href="/" className={styles.backLink}>
            ← Voltar
          </Link>
          <h1>📋 Veículos Monitorados</h1>
          <p>
            {veiculos.length} veículo{veiculos.length !== 1 ? "s" : ""} cadastrado
            {veiculos.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

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
          <Link href="/" className={styles.btnPrimary}>
            Consultar veículo
          </Link>
        </div>
      ) : (
        <div className={styles.veiculosGrid}>
          {veiculosFiltrados.map((veiculo, index) => {
            const chave = `${veiculo.codigoMarca}-${veiculo.codigoModelo}-${veiculo.anoModelo}`;
            return (
              <div key={chave} className={styles.veiculoCardWrapper}>
                <Link
                  href={`/resultado?marca=${veiculo.codigoMarca}&modelo=${veiculo.codigoModelo}&ano=${veiculo.anoModelo}`}
                  className={styles.veiculoCard}
                >
                  <div className={styles.veiculoHeader}>
                    <span className={styles.veiculoMarca}>{veiculo.nomeMarca}</span>
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

                  <h3 className={styles.veiculoModelo}>{veiculo.nomeModelo}</h3>
                  <span className={styles.veiculoAno}>{veiculo.nomeAno}</span>

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

                  <div className={styles.verMais}>Ver histórico →</div>
                </Link>

                <button
                  className={styles.btnDeletar}
                  onClick={(e) => abrirConfirmacao(veiculo, e)}
                  title="Deletar veículo"
                >
                  🗑️
                </button>
              </div>
            );
          })}
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
              Esta ação irá remover {confirmDelete.totalRegistros} registros de
              histórico e não pode ser desfeita.
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

      {/* Navegação */}
      <div className={styles.navigation}>
        <Link href="/" className={styles.navButton}>
          ← Nova Consulta
        </Link>
        <Link href="/dashboard" className={styles.navButtonPrimary}>
          Dashboard →
        </Link>
      </div>
    </div>
  );
}
