




let contador = 0;

let db;

let exportandoPDF = false;

function abrirBanco() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("RelatorioDB", 1);

        request.onupgradeneeded = event => {
            db = event.target.result;
            db.createObjectStore("rascunho", { keyPath: "id" });
        };

        request.onsuccess = event => {
            db = event.target.result;
            resolve(db);
        };

        request.onerror = () => reject("Erro ao abrir IndexedDB");
    });
}

async function salvarAutoSave() {
    if (!db) await abrirBanco();
	if (exportandoPDF) return;
    const dados = {
        id: "relatorioAtual",
        filial: document.getElementById("filialInput")?.value || "",
        incidente: document.getElementById("incidenteInput")?.value || "",
        field: document.getElementById("fieldInput")?.value || "",
        outroField: document.getElementById("outroField")?.value || "",
        observacao: document.getElementById("obsInput")?.value || "",
        evidencias: []
    };

    document.querySelectorAll(".evidencia").forEach(ev => {
        const texto = ev.querySelector(".descricao-input")?.value || "";
        const img = ev.querySelector("img")?.src || "";
        dados.evidencias.push({ texto, img });
    });

    const tx = db.transaction("rascunho", "readwrite");
    const store = tx.objectStore("rascunho");
    store.put(dados);

    console.log("💾 Auto-save (IndexedDB)");
}
async function restaurarAutoSave() {
    if (!db) await abrirBanco();

    const tx = db.transaction("rascunho", "readonly");
    const store = tx.objectStore("rascunho");
    const req = store.get("relatorioAtual");

    req.onsuccess = () => {
        const data = req.result;
        if (!data) return;

        document.getElementById("filialInput").value = data.filial || "";
        document.getElementById("incidenteInput").value = data.incidente || "";
        document.getElementById("fieldInput").value = data.field || "";
        document.getElementById("obsInput").value = data.observacao || "";
		
		
		// === Limpa evidências atuais ===
        document.getElementById("lista").innerHTML = "";


        
		// === Restaura evidências corretamente ===
        data.evidencias.forEach((ev, index) => {
            adicionarEvidencia();

            setTimeout(() => {
                const blocos = document.querySelectorAll(".evidencia");
                const bloco = blocos[index]; // ✅ PEGA A EVIDÊNCIA CORRETA

                if (!bloco) return;

                const texto = bloco.querySelector(".descricao-input");
                const img = bloco.querySelector("img");

                if (texto) texto.value = ev.texto || "";
                if (img && ev.img) img.src = ev.img;
            }, 0);
        });

		atualizarEstadoBotaoFinalizar();
        renumerarEvidencias();
        console.log("✅ Auto-save restaurado");
    };
}


document.addEventListener("DOMContentLoaded", async () => {
  await abrirBanco();
  restaurarAutoSave();

  // Campos obrigatórios
  ["filialInput", "incidenteInput", "fieldInput", "obsInput"]
    .forEach(id => {
      document.getElementById(id)
        .addEventListener("input", atualizarEstadoBotaoFinalizar);
    });

  atualizarEstadoBotaoFinalizar();
});


function validarCamposObrigatorios() {
  if (!document.getElementById("filialInput").value.trim()) {
    alert("⚠️ Informe o Nome da Filial.");
    return false;
  }

  if (!document.getElementById("incidenteInput").value.trim()) {
    alert("⚠️ Informe o Número do Incidente.");
    return false;
  }

  if (!document.getElementById("fieldInput").value.trim()) {
    alert("⚠️ Informe o Nome do Field.");
    return false;
  }

  if (!document.getElementById("obsInput").value.trim()) {
    alert("⚠️ Preencha a Observação do que foi realizado.");
    return false;
  }

  const evidencias = document.querySelectorAll(".evidencia");

  if (evidencias.length === 0) {
    alert("⚠️ Adicione pelo menos uma evidência.");
    return false;
  }

  for (let ev of evidencias) {
    const texto = ev.querySelector(".descricao-input")?.value.trim();
    const img = ev.querySelector("img")?.src;

    if (!texto) {
      alert("⚠️ Todas as evidências devem ter descrição.");
      return false;
    }

    if (!img) {
      alert("⚠️ Todas as evidências devem ter imagem.");
      return false;
    }
  }

  return true;
}

function removerEvidencia(botao) {
    const bloco = botao.closest(".evidencia");
    if (!bloco) return;

    const confirmar = confirm("Deseja remover esta evidência?");
    if (!confirmar) return;

    bloco.remove();
    renumerarEvidencias();
	
	//atulizar banco
	salvarAutoSave();
	atualizarEstadoBotaoFinalizar();
}

function renumerarEvidencias() {
    document.querySelectorAll(".evidencia").forEach((bloco, index) => {
        const titulo = bloco.querySelector(".card-title, h6, h3");
        if (titulo) {
            titulo.innerText = `Evidência ${index + 1}`;
        }
    });
}


function adicionarEvidencia() {
    contador++;

	

    const div = document.createElement("div");
	
    div.className = "evidencia";
    div.innerHTML = `
	<div class="card-body">

            <div class="d-flex justify-content-between align-items-center mb-2">
                <h6 class="card-title mb-0">Evidência ${contador}</h6>

                <!-- Botão remover -->
                <button class="btn no-pdf btn-outline-danger btn-sm no-pdf"
                        onclick="removerEvidencia(this)">
                    <i class="bi bi-trash"></i>
                </button>
            </div>

            <textarea class="form-control descricao-input  no-pdf mb-2"  placeholder="Descrição"></textarea>

            <div class="descricao-pdf mb-2"
                 style="display:none; white-space: pre-wrap;">
            </div>

            <div class="d-flex align-items-center gap-2 mb-2 no-pdf">

                <button class="btn no-pdf btn-outline-primary btn-sm"
                        onclick="tirarPrint('img_${contador}')">
                    <i class="bi bi-camera"></i> Print
                </button>

                <button class="btn no-pdf btn-outline-secondary btn-sm"
                        onclick="document.getElementById('file_${contador}').click()">
                    <i class="bi bi-image"></i> Update Imagem
                </button>

                <input type="file"
                       id="file_${contador}"
                       accept="image/*"
                       onchange="carregarImagem(this,'img_${contador}')"
                       hidden>
            </div>

			
			<img id="img_${contador}" 
				 class="img-fluid rounded border">


        </div>
    `;
// 👉 AGORA ENTRA NO TOPO
    document.getElementById("lista").prepend(div);
	
	 renumerarEvidencias()
	atualizarEstadoBotaoFinalizar();
}

async function tirarPrint(id) {
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    const video = document.createElement("video");
    video.srcObject = stream;
    await video.play();

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    stream.getTracks().forEach(t => t.stop());

    document.getElementById(id).src = canvas.toDataURL();
	// ✅ SALVA DEPOIS DO PRINT
	 salvarAutoSave();
	 atualizarEstadoBotaoFinalizar();
}


function carregarImagem(input, id) {
  if (!input.files || !input.files[0]) return; // ✅ cancelado ou vazio

  const img = document.getElementById(id);
  if (!img) return; // ✅ segurança extra

  const reader = new FileReader();

  reader.onload = () => {
    img.src = reader.result;

    // ✅ salva e revalida somente após imagem pronta
    salvarAutoSave();
    atualizarEstadoBotaoFinalizar();
  };

  reader.readAsDataURL(input.files[0]);
}


function exportarPDF() {
  if (!validarCamposObrigatorios()) return;

  const filial = document.getElementById("filialInput").value;
  const incidente = document.getElementById("incidenteInput").value;
  const field = document.getElementById("fieldInput").value;
  const observacao = document.getElementById("obsInput").value;
  const dataHora = new Date().toLocaleString("pt-BR");

  const pdfTemp = document.getElementById("pdfTemp");

  pdfTemp.innerHTML = `
    <style>
      @page { size: A4; margin: 15mm; }

      body {
        font-family: Arial, Helvetica, sans-serif;
        font-size: 12px;
        color: #000;
      }

      h1 {
        text-align: center;
        font-size: 20px;
        margin-bottom: 15px;
      }

      h2 {
        font-size: 16px;
        margin: 20px 0 10px;
      }

      .dados {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
        margin-bottom: 20px;
      }

      .campo {
        border: 1px solid #ccc;
        border-radius: 4px;
        padding: 6px;
      }

      .campo label {
        font-size: 11px;
        font-weight: bold;
        display: block;
        margin-bottom: 4px;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
      }

      th, td {
        border: 1px solid #000;
        padding: 6px;
      }

      th { background: #f2f2f2; }

      .observacao-box {
        border: 1px solid #ccc;
        border-radius: 4px;
        padding: 10px;
        min-height: 60px;
        white-space: pre-wrap;
      }

      .evidencia {
        page-break-before: always;
        border: 1px solid #000;
        padding: 10px;
      }

      .evidencia img {
        width: 100%;
        height: auto;
        margin-top: 10px;
        border: 1px solid #000;
      }

      .rodape {
        position: fixed;
        bottom: 10mm;
        right: 15mm;
        font-size: 10px;
      }
    </style>

    <h1>Relatório de Evidências</h1>

    <div class="dados">
      <div class="campo"><label>Nome da Filial</label>${filial}</div>
      <div class="campo"><label>Número do Incidente</label>${incidente}</div>
      <div class="campo"><label>Nome do Field</label>${field}</div>
    </div>

    <h2>Orientações de Evidências Necessárias</h2>
    <table>
      <tr><th>Item</th><th>Descrição</th><th>Evidência</th></tr>
      <tr><td>1</td><td>Observação do que foi realizado</td><td>Descrição detalhada do serviço executado</td></tr>
      <tr><td>2</td><td>Foto do Módulo – Antes</td><td>Imagem da condição inicial do módulo</td></tr>
      <tr><td>3</td><td>Foto do Módulo – Durante</td><td>Imagem do momento da execução</td></tr>
      <tr><td>4</td><td>Foto do Módulo – Depois</td><td>Imagem do estado final do módulo</td></tr>
    </table>

    <h2>Observação do que foi realizado</h2>
    <div class="observacao-box">${observacao}</div>

    <h2>Evidências</h2>
    ${[...document.querySelectorAll(".evidencia")].map((ev, i) => {
      const texto = ev.querySelector(".descricao-input")?.value || "";
      const img = ev.querySelector("img")?.src || "";
      return `
        <div class="evidencia">
          <h3>Evidência ${i + 1}</h3>
          <p>${texto}</p>
          ${img ? `<img src="${img}">` : ""}
        </div>
      `;
    }).join("")}

    <div class="rodape">${incidente} — ${dataHora}</div>
  `;

  html2pdf()
    .set({
      margin: 0,
      filename: `${incidente}_Evidencias.pdf`,
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["css", "avoid-all"] }
    })
    .from(pdfTemp)
    .save()
    .then(() => pdfTemp.innerHTML = "");
}
``

 

const templates = {
  1: {
      observacao:
`Realizado abertura manual da cancela lado A`,
    evidencias: [
      { texto: "Antes de Ativar modo manual" },
      { texto: "Modo manual Ativo" },
      { texto: "Cancela lado A aberto" },
	  { texto: "Cancela lado A Fechado" },
	  { texto: "Modo manual desativado" }
    ]
  },

  2: {
    observacao:
	"Relizado abertura manual da cancela lado B",
    evidencias: [
      { texto: "Antes de Ativar modo manual" },
      { texto: "Modo manual Ativo" },
      { texto: "Cancela lado B aberto" },
	  { texto: "Cancela lado B Fechado" },
	  { texto: "Modo manual desativado" }
    ]
  },

  3: {
     observacao:
"Realizado abertura manual da cancel do lado A e lado B",
    evidencias: [
      { texto: "Antes de Ativar modo manual" },
      { texto: "Modo manual Ativo" },
	  { texto: "Cancela lado A aberto" },
	  { texto: "Cancela lado A Fechado" },
      { texto: "Cancela lado B aberto" },
	  { texto: "Cancela lado B Fechado" },
	  { texto: "Modo manual desativado" }
    ]
  },
  4: {
     observacao:
		"Realizado Reset do MCA",
    evidencias: [
      { texto: "Modulo desligado" },
	  { texto: "Modulo ligado" }
    ]
  },
  5: {
     observacao:
		"Realizado abertura manual da cancel do lado A e lado B",
    evidencias: [
      { texto: "Antes de Ativar modo manual" },
      { texto: "Modo manual Ativo" },
	  { texto: "Cancela lado B aberto" },
	  { texto: "Cancela lado B Fechado" },
      { texto: "Cancela lado A aberto" },
	  { texto: "Cancela lado a Fechado" },
	  { texto: "Modo manual desativado" }
    ]
  }
};


function aplicarTemplate(numero) {

  const t = templates[numero];
  if (!t) return;

  if (!confirm("Aplicar este template e substituir os dados atuais?")) return;

  // Campos principais
  document.getElementById("obsInput").value = t.observacao;

  // Limpa evidências atuais
  document.getElementById("lista").innerHTML = "";

  // Cria evidências do template
 
	t.evidencias.slice().reverse().forEach(ev => {
	  adicionarEvidencia();
	  const bloco = document.querySelector(".evidencia:first-child");
	  bloco.querySelector(".descricao-input").value = ev.texto;
	});


  renumerarEvidencias();
  salvarAutoSave();

  alert("✅ Template aplicado com sucesso!");
}

function limparCampos() {
  if (!confirm("Deseja limpar todos os campos do relatório?")) return;

  document.getElementById("filialInput").value = "";
  document.getElementById("incidenteInput").value = "";
  document.getElementById("fieldInput").value = "";
  document.getElementById("obsInput").value = "";
  document.getElementById("lista").innerHTML = "";

  salvarAutoSave();
}

//monitora em tempo real os Campos obriatorios

function atualizarEstadoBotaoFinalizar() {
  const btn = document.getElementById("btnFinalizar");
  if (!btn) return;

  const filial = document.getElementById("filialInput").value.trim();
  const incidente = document.getElementById("incidenteInput").value.trim();
  const field = document.getElementById("fieldInput").value.trim();
  const observacao = document.getElementById("obsInput").value.trim();

  // ✅ Evidências
  const evidencias = document.querySelectorAll(".evidencia");
  let evidenciasValidas = evidencias.length > 0;

  evidencias.forEach(ev => {
    const texto = ev.querySelector(".descricao-input")?.value.trim();
    const img = ev.querySelector("img")?.src;

    if (!texto || !img) {
      evidenciasValidas = false;
    }
  });

  const tudoPreenchido =
    filial &&
    incidente &&
    field &&
    observacao &&
    evidenciasValidas;

  btn.disabled = !tudoPreenchido;
  btn.style.opacity = tudoPreenchido ? "1" : "0.5";
  btn.style.cursor = tudoPreenchido ? "pointer" : "not-allowed";
}






document.addEventListener("input", salvarAutoSave);
document.addEventListener("change", salvarAutoSave);
