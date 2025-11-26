import { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import Header from "../components/Header";
import styles from "../styles/Home.module.css";

export default function Home() {
  const router = useRouter();
  const [marcas, setMarcas] = useState([]);
  const [modelosBase, setModelosBase] = useState([]);
  const [versoes, setVersoes] = useState([]);
  const [anos, setAnos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingModelos, setLoadingModelos] = useState(false);
  const [resultado, setResultado] = useState("");

  // Estados dos selects
  const [marcaSelecionada, setMarcaSelecionada] = useState("");
  const [modeloBaseSelecionado, setModeloBaseSelecionado] = useState("");
  const [versaoSelecionada, setVersaoSelecionada] = useState("");
  const [anoSelecionado, setAnoSelecionado] = useState("");

  // Carregar marcas ao montar componente
  useEffect(() => {
    carregarMarcas();
  }, []);

  const carregarMarcas = async () => {
    try {
      const response = await fetch("/api/marcas");
      const data = await response.json();
      setMarcas(data);
    } catch (error) {
      console.error("Erro ao carregar marcas:", error);
    }
  };

  const carregarModelosAgrupados = async (marca) => {
    setLoadingModelos(true);
    try {
      const response = await fetch(`/api/modelos-agrupados/${marca}`);
      const data = await response.json();
      setModelosBase(data.modelosBase || []);
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

  const handleMarcaChange = (e) => {
    const marca = e.target.value;
    setMarcaSelecionada(marca);
    setModeloBaseSelecionado("");
    setVersaoSelecionada("");
    setAnoSelecionado("");
    setModelosBase([]);
    setVersoes([]);
    setAnos([]);
    if (marca) {
      carregarModelosAgrupados(marca);
    }
  };

  const handleModeloBaseChange = (e) => {
    const modeloBase = e.target.value;
    setModeloBaseSelecionado(modeloBase);
    setVersaoSelecionada("");
    setAnoSelecionado("");
    setAnos([]);

    // Encontrar as versões do modelo selecionado
    const modeloEncontrado = modelosBase.find((m) => m.Value === modeloBase);
    if (modeloEncontrado) {
      setVersoes(modeloEncontrado.versoes || []);
    } else {
      setVersoes([]);
    }
  };

  const handleVersaoChange = (e) => {
    const versaoId = e.target.value;
    setVersaoSelecionada(versaoId);
    setAnoSelecionado("");
    setAnos([]);
    if (versaoId && marcaSelecionada) {
      carregarAnos(marcaSelecionada, versaoId);
    }
  };

  const consultarESalvar = async () => {
    if (!marcaSelecionada || !versaoSelecionada || !anoSelecionado) {
      setResultado("Selecione marca, modelo, versão e ano!");
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
          modeloId: versaoSelecionada,
          anoId: anoSelecionado,
          meses: 24,
        }),
      });

      if (!response.ok) throw new Error("Erro na consulta");

      const data = await response.json();

      if (data.success && data.registrosSalvos > 0) {
        router.push(
          `/resultado?marca=${marcaSelecionada}&modelo=${versaoSelecionada}&ano=${anoSelecionado}`
        );
      } else {
        setResultado(
          `✅ Consulta realizada!<br>
           📊 ${data.registrosSalvos} registros salvos<br>
           📈 <a href="/resultado?marca=${marcaSelecionada}&modelo=${versaoSelecionada}&ano=${anoSelecionado}" style="color: #667eea;">Ver Resultado</a>`
        );
      }
    } catch (error) {
      console.error("Erro na consulta:", error);
      setResultado(`❌ Erro na consulta: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />
      <div className={styles.container}>
        <Head>
          <title>FIPE Monitor - Consulta e Armazenamento</title>
          <meta
            name="description"
            content="Sistema de monitoramento de preços FIPE"
          />
          <link rel="icon" href="/favicon.ico" />
        </Head>

        <div className={styles.pageHeader}>
          <h1>Nova Consulta</h1>
          <p>
            Consulte preços de veículos e armazene histórico automaticamente
          </p>
        </div>

        <div className={styles.formContainer}>
          {/* Etapa 1: Marca */}
          <div className={styles.formGroup}>
            <label htmlFor="selectMarca">
              <span className={styles.stepNumber}>1</span> Marca do Veículo
            </label>
            <select
              id="selectMarca"
              value={marcaSelecionada}
              onChange={handleMarcaChange}
              className={styles.select}
            >
              <option value="">Selecione uma marca</option>
              {marcas.map((marca) => (
                <option key={marca.Value} value={marca.Value}>
                  {marca.Label}
                </option>
              ))}
            </select>
          </div>

          {/* Etapa 2: Modelo Base */}
          <div className={styles.formGroup}>
            <label htmlFor="selectModeloBase">
              <span className={styles.stepNumber}>2</span> Modelo
            </label>
            <select
              id="selectModeloBase"
              value={modeloBaseSelecionado}
              onChange={handleModeloBaseChange}
              disabled={!marcaSelecionada || loadingModelos}
              className={styles.select}
            >
              <option value="">
                {loadingModelos
                  ? "Carregando modelos..."
                  : marcaSelecionada
                  ? "Selecione um modelo"
                  : "Primeiro selecione uma marca"}
              </option>
              {modelosBase.map((modelo) => (
                <option key={modelo.Value} value={modelo.Value}>
                  {modelo.Label} ({modelo.totalVersoes} versões)
                </option>
              ))}
            </select>
          </div>

          {/* Etapa 3: Versão */}
          <div className={styles.formGroup}>
            <label htmlFor="selectVersao">
              <span className={styles.stepNumber}>3</span> Versão
            </label>
            <select
              id="selectVersao"
              value={versaoSelecionada}
              onChange={handleVersaoChange}
              disabled={!modeloBaseSelecionado}
              className={styles.select}
            >
              <option value="">
                {modeloBaseSelecionado
                  ? "Selecione uma versão"
                  : "Primeiro selecione um modelo"}
              </option>
              {versoes.map((versao) => (
                <option key={versao.codigo} value={versao.codigo}>
                  {versao.versao}
                </option>
              ))}
            </select>
          </div>

          {/* Etapa 4: Ano */}
          <div className={styles.formGroup}>
            <label htmlFor="selectAno">
              <span className={styles.stepNumber}>4</span> Ano / Combustível
            </label>
            <select
              id="selectAno"
              value={anoSelecionado}
              onChange={(e) => setAnoSelecionado(e.target.value)}
              disabled={!versaoSelecionada}
              className={styles.select}
            >
              <option value="">
                {versaoSelecionada
                  ? "Selecione o ano"
                  : "Primeiro selecione uma versão"}
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
              📊 O sistema consultará automaticamente os últimos{" "}
              <strong>24 meses</strong> de histórico de preços
            </p>
          </div>

          <button
            onClick={consultarESalvar}
            disabled={
              loading ||
              !marcaSelecionada ||
              !versaoSelecionada ||
              !anoSelecionado
            }
            className={styles.btnConsultar}
          >
            {loading ? "🔄 Consultando..." : "🔍 Consultar e Armazenar"}
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
