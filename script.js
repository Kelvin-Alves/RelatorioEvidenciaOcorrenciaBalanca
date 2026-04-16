




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


        renumerarEvidencias();
        console.log("✅ Auto-save restaurado");
    };
}

document.addEventListener("DOMContentLoaded", async () => {
    await abrirBanco();
    restaurarAutoSave();
});


function validarCamposObrigatorios() {
    const filial = document.getElementById("filialInput").value.trim();
    const incidente = document.getElementById("incidenteInput").value.trim();
    const field = document.getElementById("fieldInput").value.trim();

    if (!filial) {
        alert("⚠️ Informe o Nome da Filial.");
        document.getElementById("filialInput").focus();
        return false;
    }

    if (!incidente) {
        alert("⚠️ Informe o Número do Incidente.");
        document.getElementById("incidenteInput").focus();
        return false;
    }

    if (!field) {
        alert("⚠️ Informe o Nome do Field.");
        document.getElementById("fieldInput").focus();
        return false;
    }

    return true; // tudo ok
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
	<div class="card-body ">

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
}

function carregarImagem(input, id) {
    const reader = new FileReader();
    
	reader.onload = () => {
        const img = document.getElementById(id);
        img.src = reader.result;

        // ✅ SALVA APENAS DEPOIS DA IMAGEM ESTAR PRONTA
        salvarAutoSave();
    };

    reader.readAsDataURL(input.files[0]);
}



function exportarPDF() {
	exportandoPDF = true;
	renumerarEvidencias(); // garante ordem final correta
	 
	if (!validarCamposObrigatorios()) {
		return;
	}
	
	const now = new Date();

	const dataHoraFormatada = now.toLocaleString("pt-BR", {
		dateStyle: "short",
		timeStyle: "short"
	});

	const dataHoraPdf = document.getElementById("dataHoraPdf");
	dataHoraPdf.innerText = "Gerado em: " + dataHoraFormatada;
	dataHoraPdf.style.display = "block";

	const incidente = document.getElementById("incidenteInput").value
		.trim()
		.replace(/[^a-zA-Z0-9_-]/g, ""); // limpa caracteres inválidos
	
    /* ========= OBSERVAÇÃO GERAL ========= */
    const obsInput = document.getElementById("obsInput");
    const obsPdf = document.getElementById("obsPdf");
    obsPdf.innerText = obsInput.value;

    obsInput.style.display = "none";
    obsPdf.style.display = "block";

    /* ========= EVIDÊNCIAS ========= */
    document.querySelectorAll(".evidencia").forEach(bloco => {
        const textarea = bloco.querySelector(".descricao-input");
        const divPdf = bloco.querySelector(".descricao-pdf");

        if (textarea && divPdf) {
            divPdf.innerText = textarea.value;
            textarea.style.display = "none";
            divPdf.style.display = "block";
        }
    });

    /* ========= ESCONDER AÇÕES ========= */
    const esconder = document.querySelectorAll(".no-pdf, input[type='file']");
    esconder.forEach(el => el.style.display = "none");

    /* ========= GERAR PDF ========= */
    const conteudo = document.getElementById("conteudoPDF");

    
	html2pdf()
	  .set({
		margin: 10,
		filename: incidente
		  ? `${incidente}_Evidencias.pdf`
		  : `Relatorio_Evidencias.pdf`,

		image: { type: 'jpeg', quality: 0.98 },

		html2canvas: {
		  scale: 2,
		  useCORS: true,
		  logging: false,

		  // 🔑 PEGA A PÁGINA INTEIRA
		  scrollY: 0,
		  scrollX: 0,
		  windowWidth: document.documentElement.scrollWidth,
		  windowHeight: document.documentElement.scrollHeight
		},

		jsPDF: {
		  unit: "mm",
		  format: "a4",
		  orientation: "portrait"
		},

		pagebreak: {
		  mode: ['css', 'legacy']
		}
	  })
	  .from(conteudo)
	  .save()

    .then(() => {

        /* ========= RESTAURAR OBSERVAÇÃO ========= */
        obsPdf.style.display = "none";
        obsInput.style.display = "";

        /* ========= RESTAURAR EVIDÊNCIAS ========= */
        document.querySelectorAll(".evidencia").forEach(bloco => {
            const textarea = bloco.querySelector(".descricao-input");
            const divPdf = bloco.querySelector(".descricao-pdf");

            if (textarea && divPdf) {
                textarea.style.display = "";
                divPdf.style.display = "none";
            }
        });

        /* ========= RESTAURAR BOTÕES ========= */
        esconder.forEach(el => el.style.display = "");
		
		const tx = db.transaction("rascunho", "readwrite");
		tx.objectStore("rascunho").delete("relatorioAtual");
		exportandoPDF = false;
		dataHoraPdf.style.display = "none";
		console.log("🧹 Auto-save limpo");

		// MENSAGEM FINAL
	    alert("✅ Relatório salvo com sucesso! Verifique sua pasta de Downloads");

    });
}

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



document.addEventListener("input", salvarAutoSave);
document.addEventListener("change", salvarAutoSave);
