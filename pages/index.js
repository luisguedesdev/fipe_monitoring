import { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import Header from "../components/Header";
import styles from "../styles/Home.module.css";

export default function Home() {
  const router = useRouter();
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

  const handleMarcaChange = (e) => {
    const marca = e.target.value;
    setMarcaSelecionada(marca);
    setModeloSelecionado("");
    setAnoSelecionado("");
    setModelos([]);
    setAnos([]);
    if (marca) {
      carregarModelos(marca);
    }
  };

  const handleModeloChange = (e) => {
    const modelo = e.target.value;
    setModeloSelecionado(modelo);
    setAnoSelecionado("");
    setAnos([]);
    if (modelo && marcaSelecionada) {
      carregarAnos(marcaSelecionada, modelo);
    }
  };

  const consultarESalvar = async () => {
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

          {/* Etapa 2: Modelo */}
          <div className={styles.formGroup}>
            <label htmlFor="selectModelo">
              <span className={styles.stepNumber}>2</span> Modelo
            </label>
            <select
              id="selectModelo"
              value={modeloSelecionado}
              onChange={handleModeloChange}
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
              {modelos.map((modelo) => (
                <option key={modelo.Value} value={modelo.Value}>
                  {modelo.Label}
                </option>
              ))}
            </select>
          </div>

          {/* Etapa 3: Ano */}
          <div className={styles.formGroup}>
            <label htmlFor="selectAno">
              <span className={styles.stepNumber}>3</span> Ano / Combustível
            </label>
            <select
              id="selectAno"
              value={anoSelecionado}
              onChange={(e) => setAnoSelecionado(e.target.value)}
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
              📊 O sistema consultará automaticamente os últimos{" "}
              <strong>24 meses</strong> de histórico de preços
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
