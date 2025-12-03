import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import Header from "../../components/Header";
import { useAuth } from "../../contexts/AuthContext";
import styles from "../../styles/Admin.module.css";

export default function AdminVeiculos() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [veiculos, setVeiculos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [deletando, setDeletando] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const carregarVeiculos = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...(search && { search }),
      });

      const res = await fetch(`/api/admin/veiculos?${params}`);
      const data = await res.json();

      if (data.success) {
        setVeiculos(data.veiculos);
        setPagination((prev) => ({
          ...prev,
          total: data.pagination.total,
          totalPages: data.pagination.totalPages,
        }));
      }
    } catch (error) {
      console.error("Erro ao carregar veículos:", error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search]);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push("/login?redirect=/admin/veiculos");
      } else if (!user?.isAdmin) {
        router.push("/");
      } else {
        carregarVeiculos();
      }
    }
  }, [isAuthenticated, user, authLoading, router, carregarVeiculos]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleDelete = async (veiculo) => {
    setDeletando(
      `${veiculo.codigo_marca}-${veiculo.codigo_modelo}-${veiculo.ano_modelo}`
    );

    try {
      const res = await fetch("/api/admin/veiculos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codigo_marca: veiculo.codigo_marca,
          codigo_modelo: veiculo.codigo_modelo,
          ano_modelo: veiculo.ano_modelo,
        }),
      });

      const data = await res.json();

      if (data.success) {
        // Remover da lista
        setVeiculos((prev) =>
          prev.filter(
            (v) =>
              !(
                v.codigo_marca === veiculo.codigo_marca &&
                v.codigo_modelo === veiculo.codigo_modelo &&
                v.ano_modelo === veiculo.ano_modelo
              )
          )
        );
        setConfirmDelete(null);
      } else {
        alert(data.error || "Erro ao deletar veículo");
      }
    } catch (error) {
      alert("Erro ao conectar com o servidor");
    } finally {
      setDeletando(null);
    }
  };

  const formatarData = (data) => {
    if (!data) return "-";
    return new Date(data).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  if (authLoading || (loading && veiculos.length === 0)) {
    return (
      <>
        <Header />
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Carregando veículos...</p>
        </div>
      </>
    );
  }

  if (!isAuthenticated || !user?.isAdmin) {
    return null;
  }

  return (
    <>
      <Header />
      <div className={styles.container}>
        <Head>
          <title>Gerenciar Veículos - Admin - Drive Price X</title>
        </Head>

        <div className={styles.pageHeader}>
          <div className={styles.headerLeft}>
            <Link href="/admin" className={styles.backLink}>
              ← Voltar ao Painel
            </Link>
            <h1>🗑️ Gerenciar Veículos</h1>
            <p>Visualize e delete veículos do banco de dados central</p>
          </div>
        </div>

        <div className={styles.content}>
          {/* Barra de pesquisa */}
          <form onSubmit={handleSearch} className={styles.searchBar}>
            <input
              type="text"
              placeholder="Buscar por marca ou modelo..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className={styles.searchInput}
            />
            <button type="submit" className={styles.searchButton}>
              🔍 Buscar
            </button>
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setSearchInput("");
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className={styles.clearButton}
              >
                ✕ Limpar
              </button>
            )}
          </form>

          {/* Info de resultados */}
          <div className={styles.resultsInfo}>
            <span>
              {pagination.total} veículo(s) encontrado(s)
              {search && ` para "${search}"`}
            </span>
          </div>

          {/* Tabela de veículos */}
          {veiculos.length > 0 ? (
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Marca</th>
                    <th>Modelo</th>
                    <th>Ano</th>
                    <th>Registros</th>
                    <th>Última Consulta</th>
                    <th>Preço Atual</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {veiculos.map((veiculo) => {
                    const key = `${veiculo.codigo_marca}-${veiculo.codigo_modelo}-${veiculo.ano_modelo}`;
                    const isDeleting = deletando === key;
                    const isConfirming = confirmDelete === key;

                    return (
                      <tr key={key}>
                        <td>{veiculo.nome_marca || veiculo.codigo_marca}</td>
                        <td>{veiculo.nome_modelo || veiculo.codigo_modelo}</td>
                        <td>{veiculo.nome_ano || veiculo.ano_modelo}</td>
                        <td>
                          <span className={styles.badge}>
                            {veiculo.total_registros}
                          </span>
                        </td>
                        <td>{formatarData(veiculo.ultima_consulta)}</td>
                        <td className={styles.priceCell}>
                          {veiculo.preco_maximo || "-"}
                        </td>
                        <td>
                          {isConfirming ? (
                            <div className={styles.confirmButtons}>
                              <button
                                onClick={() => handleDelete(veiculo)}
                                disabled={isDeleting}
                                className={styles.confirmDeleteBtn}
                              >
                                {isDeleting ? "⏳" : "✓ Confirmar"}
                              </button>
                              <button
                                onClick={() => setConfirmDelete(null)}
                                className={styles.cancelBtn}
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <div className={styles.actionButtons}>
                              <Link
                                href={`/resultado?marca=${veiculo.codigo_marca}&modelo=${veiculo.codigo_modelo}&ano=${veiculo.ano_modelo}`}
                                className={styles.viewBtn}
                              >
                                👁️
                              </Link>
                              <button
                                onClick={() => setConfirmDelete(key)}
                                className={styles.deleteBtn}
                                title="Deletar veículo"
                              >
                                🗑️
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={styles.emptyState}>
              <p>Nenhum veículo encontrado</p>
            </div>
          )}

          {/* Paginação */}
          {pagination.totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                onClick={() =>
                  setPagination((prev) => ({
                    ...prev,
                    page: Math.max(1, prev.page - 1),
                  }))
                }
                disabled={pagination.page === 1}
                className={styles.pageBtn}
              >
                ← Anterior
              </button>

              <span className={styles.pageInfo}>
                Página {pagination.page} de {pagination.totalPages}
              </span>

              <button
                onClick={() =>
                  setPagination((prev) => ({
                    ...prev,
                    page: Math.min(prev.totalPages, prev.page + 1),
                  }))
                }
                disabled={pagination.page === pagination.totalPages}
                className={styles.pageBtn}
              >
                Próxima →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal de confirmação */}
      {confirmDelete && (
        <div
          className={styles.modalOverlay}
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>⚠️ Confirmar Exclusão</h3>
            <p>
              Tem certeza que deseja deletar este veículo e{" "}
              <strong>todos os seus registros de histórico</strong>?
            </p>
            <p className={styles.warningText}>
              Esta ação não pode ser desfeita!
            </p>
            <div className={styles.modalButtons}>
              <button
                onClick={() => setConfirmDelete(null)}
                className={styles.cancelBtn}
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const veiculo = veiculos.find(
                    (v) =>
                      `${v.codigo_marca}-${v.codigo_modelo}-${v.ano_modelo}` ===
                      confirmDelete
                  );
                  if (veiculo) handleDelete(veiculo);
                }}
                className={styles.confirmDeleteBtn}
              >
                🗑️ Deletar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
