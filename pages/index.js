import { useState, useEffect, useMemo, useRef } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import Header from "../components/Header";
import { useAuth } from "../contexts/AuthContext";
import styles from "../styles/Home.module.css";

export default function Home() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [marcas, setMarcas] = useState([]);
  const [modelos, setModelos] = useState([]);
  const [anos, setAnos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingModelos, setLoadingModelos] = useState(false);
  const [resultado, setResultado] = useState("");

  // Estados dos selects
  const [marcaSelecionada, setMarcaSelecionada] = useState("");
  const [modeloSelecionado, setModeloSelecionado] = useState("");
  const [anoSelecionado, setAnoSelecionado] = useState("");

  // Estados de busca/filtro
  const [buscaMarca, setBuscaMarca] = useState("");
  const [buscaModelo, setBuscaModelo] = useState("");
  const [showMarcaList, setShowMarcaList] = useState(false);
  const [showModeloList, setShowModeloList] = useState(false);

  // Refs para detectar clique fora
  const marcaRef = useRef(null);
  const modeloRef = useRef(null);

  // Nomes para passar à API
  const [marcaNome, setMarcaNome] = useState("");
  const [modeloNome, setModeloNome] = useState("");
  const [anoNome, setAnoNome] = useState("");

  // Carregar marcas ao montar componente
  useEffect(() => {
    carregarMarcas();
  }, []);

  // Fechar listas ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (marcaRef.current && !marcaRef.current.contains(e.target)) {
        setShowMarcaList(false);
      }
      if (modeloRef.current && !modeloRef.current.contains(e.target)) {
        setShowModeloList(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtrar marcas baseado na busca
  const marcasFiltradas = useMemo(() => {
    if (!buscaMarca.trim()) return marcas;
    const termo = buscaMarca.toLowerCase().trim();
    return marcas.filter((marca) => marca.Label.toLowerCase().includes(termo));
  }, [marcas, buscaMarca]);

  // Filtrar modelos baseado na busca
  const modelosFiltrados = useMemo(() => {
    if (!buscaModelo.trim()) return modelos;
    const termo = buscaModelo.toLowerCase().trim();
    return modelos.filter((modelo) =>
      modelo.Label.toLowerCase().includes(termo)
    );
  }, [modelos, buscaModelo]);

  const carregarMarcas = async () => {
    try {
      const response = await fetch("/api/marcas");
      const data = await response.json();
      setMarcas(data);
    } catch (error) {
      console.error("Erro ao carregar marcas:", error);
    }
  };

  const carregarModelos = async (marca) => {
    setLoadingModelos(true);
    try {
      const response = await fetch(`/api/modelos/${marca}`);
      const data = await response.json();
      setModelos(data.Modelos || []);
    } catch (error) {
      console.error("Erro ao carregar modelos:", error);
    } finally {
      setLoadingModelos(false);
    }
  };

  const carregarAnos = async (marcaId, modeloId) => {
    try {
      const response = await fetch(`/api/anos/${marcaId}/${modeloId}`);
      const data = await response.json();
      setAnos(data || []);
    } catch (error) {
      console.error("Erro ao carregar anos:", error);
    }
  };

  // Selecionar marca da lista
  const selecionarMarca = (marca) => {
    setMarcaSelecionada(marca.Value);
    setMarcaNome(marca.Label);
    setBuscaMarca(marca.Label);
    setShowMarcaList(false);
    setModeloSelecionado("");
    setModeloNome("");
    setBuscaModelo("");
    setAnoSelecionado("");
    setAnoNome("");
    setModelos([]);
    setAnos([]);
    carregarModelos(marca.Value);
  };

  // Selecionar modelo da lista
  const selecionarModelo = (modelo) => {
    setModeloSelecionado(modelo.Value);
    setModeloNome(modelo.Label);
    setBuscaModelo(modelo.Label);
    setShowModeloList(false);
    setAnoSelecionado("");
    setAnoNome("");
    setAnos([]);
    carregarAnos(marcaSelecionada, modelo.Value);
  };

  // Limpar marca
  const limparMarca = () => {
    setMarcaSelecionada("");
    setMarcaNome("");
    setBuscaMarca("");
    setModeloSelecionado("");
    setModeloNome("");
    setBuscaModelo("");
    setAnoSelecionado("");
    setAnoNome("");
    setModelos([]);
    setAnos([]);
  };

  // Limpar modelo
  const limparModelo = () => {
    setModeloSelecionado("");
    setModeloNome("");
    setBuscaModelo("");
    setAnoSelecionado("");
    setAnoNome("");
    setAnos([]);
  };

  const handleAnoChange = (e) => {
    const ano = e.target.value;
    const anoLabel = e.target.options[e.target.selectedIndex]?.text || "";
    setAnoSelecionado(ano);
    setAnoNome(anoLabel);
  };

  // Consulta simples para visitantes (sem salvar no banco)
  const consultarSimples = async () => {
    if (!marcaSelecionada || !modeloSelecionado || !anoSelecionado) {
      setResultado("Selecione marca, modelo e ano!");
      return;
    }

    setLoading(true);
    setResultado("");

    try {
      const response = await fetch("/api/consultar-fipe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          marcaId: marcaSelecionada,
          modeloId: modeloSelecionado,
          anoId: anoSelecionado,
          marcaNome,
          modeloNome,
          anoNome,
        }),
      });

      if (!response.ok) throw new Error("Erro na consulta");

      const data = await response.json();

      if (data.success) {
        // Redirecionar para página de resultado com parâmetros
        router.push(
          `/resultado?marca=${marcaSelecionada}&modelo=${modeloSelecionado}&ano=${anoSelecionado}`
        );
      } else {
        setResultado(`❌ ${data.error || "Veículo não encontrado na FIPE"}`);
      }
    } catch (error) {
      console.error("Erro na consulta:", error);
      setResultado(`❌ Erro na consulta: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Consulta completa para usuários logados (com histórico e salvamento)
  const consultarCompleto = async () => {
    if (!marcaSelecionada || !modeloSelecionado || !anoSelecionado) {
      setResultado("Selecione marca, modelo e ano!");
      return;
    }

    setLoading(true);
    setResultado("");

    try {
      const response = await fetch("/api/consultar-salvar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          marcaId: marcaSelecionada,
          modeloId: modeloSelecionado,
          anoId: anoSelecionado,
          meses: 24,
        }),
      });

      if (!response.ok) throw new Error("Erro na consulta");

      const data = await response.json();

      if (data.success && data.registrosSalvos > 0) {
        router.push(
          `/resultado?marca=${marcaSelecionada}&modelo=${modeloSelecionado}&ano=${anoSelecionado}`
        );
      } else {
        setResultado(
          `✅ Consulta realizada!<br>
           📊 ${data.registrosSalvos} registros salvos<br>
           📈 <a href="/resultado?marca=${marcaSelecionada}&modelo=${modeloSelecionado}&ano=${anoSelecionado}" style="color: #667eea;">Ver Resultado</a>`
        );
      }
    } catch (error) {
      console.error("Erro na consulta:", error);
      setResultado(`❌ Erro na consulta: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Função principal de consulta - decide qual método usar
  const consultarESalvar = async () => {
    if (isAuthenticated) {
      await consultarCompleto();
    } else {
      await consultarSimples();
    }
  };

  return (
    <>
      <Header />
      <div className={styles.container}>
        <Head>
          <title>Drive Price X - Consulta e Armazenamento</title>
          <meta
            name="description"
            content="Sistema de monitoramento de preços FIPE"
          />
          <link rel="icon" href="/favicon.ico" />
        </Head>

        <div className={styles.pageHeader}>
          <h1>Nova Consulta</h1>
          <p>
            {isAuthenticated
              ? "Consulte preços de veículos e armazene histórico automaticamente"
              : "Consulte o preço FIPE atual de veículos"}
          </p>
          {!isAuthenticated && (
            <div className={styles.loginBanner}>
              <p>
                🔐{" "}
                <Link href="/login">
                  <strong>Faça login</strong>
                </Link>{" "}
                para ver o histórico completo de 24 meses, gráficos de evolução
                e adicionar veículos à sua conta!
              </p>
            </div>
          )}
        </div>

        <div className={styles.formContainer}>
          {/* Etapa 1: Marca */}
          <div className={styles.formGroup} ref={marcaRef}>
            <label>
              <span className={styles.stepNumber}>1</span> Marca do Veículo
            </label>
            <div className={styles.searchInputContainer}>
              <input
                type="text"
                placeholder="Digite para buscar a marca..."
                value={buscaMarca}
                onChange={(e) => {
                  setBuscaMarca(e.target.value);
                  setShowMarcaList(true);
                  if (!e.target.value) limparMarca();
                }}
                onFocus={() => setShowMarcaList(true)}
                className={styles.searchInput}
              />
              {marcaSelecionada && (
                <button
                  className={styles.clearButton}
                  onClick={limparMarca}
                  type="button"
                >
                  ✕
                </button>
              )}
            </div>
            {showMarcaList && !marcaSelecionada && (
              <div className={styles.searchList}>
                {marcasFiltradas.length === 0 ? (
                  <div className={styles.searchEmpty}>
                    Nenhuma marca encontrada
                  </div>
                ) : (
                  marcasFiltradas.map((marca) => (
                    <button
                      key={marca.Value}
                      className={styles.searchItem}
                      onClick={() => selecionarMarca(marca)}
                      type="button"
                    >
                      {marca.Label}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Etapa 2: Modelo */}
          <div className={styles.formGroup} ref={modeloRef}>
            <label>
              <span className={styles.stepNumber}>2</span> Modelo
            </label>
            <div className={styles.searchInputContainer}>
              <input
                type="text"
                placeholder={
                  loadingModelos
                    ? "Carregando modelos..."
                    : marcaSelecionada
                    ? "Digite para buscar o modelo..."
                    : "Primeiro selecione uma marca"
                }
                value={buscaModelo}
                onChange={(e) => {
                  setBuscaModelo(e.target.value);
                  setShowModeloList(true);
                  if (!e.target.value) limparModelo();
                }}
                onFocus={() => setShowModeloList(true)}
                disabled={!marcaSelecionada || loadingModelos}
                className={styles.searchInput}
              />
              {modeloSelecionado && (
                <button
                  className={styles.clearButton}
                  onClick={limparModelo}
                  type="button"
                >
                  ✕
                </button>
              )}
            </div>
            {showModeloList &&
              marcaSelecionada &&
              !modeloSelecionado &&
              !loadingModelos && (
                <div className={styles.searchList}>
                  {modelosFiltrados.length === 0 ? (
                    <div className={styles.searchEmpty}>
                      Nenhum modelo encontrado
                    </div>
                  ) : (
                    modelosFiltrados.map((modelo) => (
                      <button
                        key={modelo.Value}
                        className={styles.searchItem}
                        onClick={() => selecionarModelo(modelo)}
                        type="button"
                      >
                        {modelo.Label}
                      </button>
                    ))
                  )}
                </div>
              )}
          </div>

          {/* Etapa 3: Ano */}
          <div className={styles.formGroup}>
            <label htmlFor="selectAno">
              <span className={styles.stepNumber}>3</span> Ano / Combustível
            </label>
            <select
              id="selectAno"
              value={anoSelecionado}
              onChange={handleAnoChange}
              disabled={!modeloSelecionado}
              className={styles.select}
            >
              <option value="">
                {modeloSelecionado
                  ? "Selecione o ano"
                  : "Primeiro selecione um modelo"}
              </option>
              {anos.map((ano) => (
                <option key={ano.Value} value={ano.Value}>
                  {ano.Label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <p className={styles.infoText}>
              {isAuthenticated ? (
                <>
                  📊 O sistema consultará automaticamente os últimos{" "}
                  <strong>24 meses</strong> de histórico de preços e salvará no
                  banco de dados
                </>
              ) : (
                <>
                  📊 Consulta do preço FIPE do <strong>mês atual</strong>
                  <br />
                  <small style={{ color: "#888" }}>
                    Faça login para ver o histórico completo de 24 meses
                  </small>
                </>
              )}
            </p>
          </div>

          <button
            onClick={consultarESalvar}
            disabled={
              loading ||
              !marcaSelecionada ||
              !modeloSelecionado ||
              !anoSelecionado
            }
            className={styles.btnConsultar}
          >
            {loading
              ? "🔄 Consultando..."
              : isAuthenticated
              ? "🔍 Consultar e Armazenar (24 meses)"
              : "🔍 Consultar Preço Atual"}
          </button>

          {resultado && (
            <div
              className={`${styles.resultado} ${
                resultado.includes("✅") ? styles.success : styles.error
              }`}
              dangerouslySetInnerHTML={{ __html: resultado }}
            />
          )}
        </div>
      </div>
    </>
  );
}
