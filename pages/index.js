import { useState, useEffect } from "react";
import Head from "next/head";
import styles from "../styles/Home.module.css";

export default function Home() {
  const [marcas, setMarcas] = useState([]);
  const [modelos, setModelos] = useState([]);
  const [anos, setAnos] = useState([]);
  const [loading, setLoading] = useState(false);
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

  const carregarModelos = async (marcaId) => {
    try {
      const response = await fetch(`/api/modelos/${marcaId}`);
      const data = await response.json();
      setModelos(data.modelos || []);
      setAnoSelecionado("");
      setAnos([]);
    } catch (error) {
      console.error("Erro ao carregar modelos:", error);
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
    const marcaId = e.target.value;
    setMarcaSelecionada(marcaId);
    setModeloSelecionado("");
    setAnoSelecionado("");
    setModelos([]);
    setAnos([]);
    if (marcaId) {
      carregarModelos(marcaId);
    }
  };

  const handleModeloChange = (e) => {
    const modeloId = e.target.value;
    setModeloSelecionado(modeloId);
    setAnoSelecionado("");
    setAnos([]);
    if (modeloId && marcaSelecionada) {
      carregarAnos(marcaSelecionada, modeloId);
    }
  };

  const consultarESalvar = async () => {
    if (!marcaSelecionada || !modeloSelecionado || !anoSelecionado) {
      setResultado("Selecione marca, modelo e ano!");
      return;
    }

    // Verificar meses selecionados
    const mesesSelecionados = Array.from(
      document.querySelectorAll('.month-option input[type="checkbox"]:checked')
    ).map((checkbox) => parseInt(checkbox.value));

    if (mesesSelecionados.length === 0) {
      setResultado("Selecione pelo menos um período de meses!");
      return;
    }

    setLoading(true);
    setResultado("");

    try {
      const consultas = [];

      // Fazer consulta para cada período selecionado
      for (const meses of mesesSelecionados) {
        const response = await fetch("/api/consultar-salvar", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            marcaId: marcaSelecionada,
            modeloId: modeloSelecionado,
            anoId: anoSelecionado,
            meses,
          }),
        });

        if (!response.ok) throw new Error(`Erro na consulta de ${meses} meses`);
        const resultado = await response.json();
        consultas.push(resultado);
      }

      // Calcular total de registros salvos
      const totalRegistros = consultas.reduce(
        (total, consulta) => total + (consulta.registrosSalvos || 0),
        0
      );

      setResultado(
        `✅ Consulta realizada com sucesso!<br>
                 📊 ${totalRegistros} registros salvos no banco<br>
                 📈 <a href="/dashboard" style="color: #667eea;">Ver no Dashboard</a>`
      );
    } catch (error) {
      console.error("Erro na consulta:", error);
      setResultado(`❌ Erro na consulta: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>FIPE Monitor - Consulta e Armazenamento</title>
        <meta
          name="description"
          content="Sistema de monitoramento de preços FIPE"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className={styles.header}>
        <h1>🚗 FIPE Monitor</h1>
        <p>Consulte preços de veículos e armazene histórico automaticamente</p>
      </div>

      <div className={styles.formContainer}>
        <div className={styles.formGroup}>
          <label htmlFor="selectMarca">🏷️ Marca do Veículo</label>
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

        <div className={styles.formGroup}>
          <label htmlFor="selectModelo">🚙 Modelo do Veículo</label>
          <select
            id="selectModelo"
            value={modeloSelecionado}
            onChange={handleModeloChange}
            disabled={!marcaSelecionada}
            className={styles.select}
          >
            <option value="">
              {marcaSelecionada
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

        <div className={styles.formGroup}>
          <label htmlFor="selectAno">📅 Ano do Veículo</label>
          <select
            id="selectAno"
            value={anoSelecionado}
            onChange={(e) => setAnoSelecionado(e.target.value)}
            disabled={!modeloSelecionado}
            className={styles.select}
          >
            <option value="">
              {modeloSelecionado
                ? "Selecione um ano"
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
          <label>📊 Meses Retroativos para Consulta</label>
          <div className={styles.monthOptions}>
            {[6, 12, 24].map((meses) => (
              <label key={meses} className={styles.monthOption}>
                <input type="checkbox" value={meses} />
                <span>{meses} meses</span>
              </label>
            ))}
          </div>
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

      <div className={styles.navigation}>
        <a href="/dashboard" className={styles.navLink}>
          📊 Dashboard
        </a>
        <a href="/todos" className={styles.navLink}>
          📋 Ver Registros
        </a>
      </div>
    </div>
  );
}
