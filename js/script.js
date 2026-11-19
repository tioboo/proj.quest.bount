import { initializeApp } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-app.js";
import { getFirestore, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-firestore.js";

"use strict";

const firebaseConfig = {
  apiKey: "AIzaSyCqhAlsHXmszXSZHHPVnsSX0PWl0fsqI8",
  authDomain: "loja-rpg-do-pai.firebaseapp.com",
  projectId: "loja-rpg-do-pai",
  storageBucket: "loja-rpg-do-pai.firebasestorage.app",
  messagingSenderId: "1068677014319",
  appId: "1:1068677014319:web:39a90d1e92e98dd98db7da"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const $ = id => document.getElementById(id);
const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const PRECO_KM = 400; // centavos por quilômetro
const CEP_ORIGEM = "12502112";
const URL_MODELO = "https://teachablemachine.withgoogle.com/models/AA5GX0PlL/";

let produtos = [];
let quantidades = {};
let frete = null;
let modelo = null;
let camera = null;
let cameraAtiva = false;
let urlPreview = null;

const centavos = valor => Math.round(Number(valor || 0) * 100);
const qtdTotal = () => Object.values(quantidades).reduce((soma, qtd) => soma + qtd, 0);
const subtotal = () => produtos.reduce((soma, item) => soma + centavos(item.preco) * (quantidades[item.id] || 0), 0);

function atualizarCarrinho() {
  const valor = subtotal();
  $("quantidade").textContent = qtdTotal();
  $("total").textContent = $("subtotal-compra").textContent = moeda.format(valor / 100);
  $("total-compra").textContent = frete === null ? "Calcule o frete" : moeda.format((valor + frete) / 100);

  document.querySelectorAll(".produto").forEach(card => {
    const item = produtos.find(produto => produto.id === card.dataset.produto);
    const qtd = quantidades[card.dataset.produto] || 0;
    card.querySelector(".quantidade-produto").textContent = qtd;
    card.querySelector('[data-acao="remover"]').disabled = qtd === 0;
    card.querySelector('[data-acao="adicionar"]').disabled = !item || qtd >= Number(item.quantidade || 0);
  });
}

function renderizarProdutos() {
  const lista = $("lista-produtos");
  lista.replaceChildren();

  const disponiveis = produtos.filter(item => Number(item.quantidade || 0) > 0);
  $("status-produtos").textContent = disponiveis.length
    ? `${disponiveis.length} produto(s) disponível(is) na loja.`
    : "Ainda não há produtos disponíveis. Volte em breve!";

  disponiveis.forEach(item => {
    const card = document.createElement("article");
    card.className = "produto";
    card.dataset.produto = item.id;

    const imagemArea = document.createElement("div");
    imagemArea.className = "produto-imagem";
    if (item.imagemUrl) {
      const imagem = document.createElement("img");
      imagem.src = item.imagemUrl;
      imagem.alt = item.nome || "Produto da loja";
      imagem.loading = "lazy";
      imagem.addEventListener("error", () => imagem.replaceWith(criarSemImagem()), { once: true });
      imagemArea.appendChild(imagem);
    } else {
      imagemArea.appendChild(criarSemImagem());
    }

    const conteudo = document.createElement("div");
    conteudo.className = "produto-conteudo";

    const categoria = document.createElement("p");
    categoria.className = "categoria";
    categoria.textContent = item.categoria || "RPG";

    const nome = document.createElement("h3");
    nome.textContent = item.nome || "Produto";

    const descricao = document.createElement("p");
    descricao.className = "descricao";
    descricao.textContent = item.descricao || "";

    const rodape = document.createElement("div");
    rodape.className = "produto-rodape";

    const preco = document.createElement("strong");
    preco.className = "preco";
    preco.textContent = moeda.format(Number(item.preco || 0));

    const controles = document.createElement("div");
    controles.className = "controles-produto";

    const remover = document.createElement("button");
    remover.type = "button";
    remover.dataset.acao = "remover";
    remover.dataset.id = item.id;
    remover.textContent = "−";
    remover.setAttribute("aria-label", `Remover ${item.nome}`);

    const qtd = document.createElement("span");
    qtd.className = "quantidade-produto";
    qtd.textContent = "0";

    const adicionar = document.createElement("button");
    adicionar.type = "button";
    adicionar.dataset.acao = "adicionar";
    adicionar.dataset.id = item.id;
    adicionar.textContent = "Adicionar";

    controles.append(remover, qtd, adicionar);
    rodape.append(preco, controles);
    conteudo.append(categoria, nome, descricao, rodape);
    card.append(imagemArea, conteudo);
    lista.appendChild(card);
  });

  atualizarCarrinho();
}

function criarSemImagem() {
  const elemento = document.createElement("div");
  elemento.className = "sem-imagem";
  elemento.textContent = "🎲";
  return elemento;
}

function carregarProdutos() {
  $("status-produtos").textContent = "Carregando produtos...";
  onSnapshot(collection(db, "itens"), snapshot => {
    const anteriores = quantidades;
    produtos = snapshot.docs.map(registro => ({ id: registro.id, ...registro.data() }));
    quantidades = Object.fromEntries(produtos.map(item => [
      item.id,
      Math.min(anteriores[item.id] || 0, Number(item.quantidade || 0))
    ]));
    renderizarProdutos();
  }, erro => {
    console.error("Erro ao carregar produtos:", erro);
    $("status-produtos").textContent = "Não foi possível carregar os produtos. Verifique as regras de leitura do Firestore e sua conexão.";
  });
}

$("lista-produtos").addEventListener("click", evento => {
  const botao = evento.target.closest("button[data-acao]");
  if (!botao) return;
  const id = botao.dataset.id;
  const item = produtos.find(produto => produto.id === id);
  if (!item) return;

  if (botao.dataset.acao === "adicionar" && (quantidades[id] || 0) < Number(item.quantidade || 0)) {
    quantidades[id] = (quantidades[id] || 0) + 1;
  } else if (botao.dataset.acao === "remover" && (quantidades[id] || 0) > 0) {
    quantidades[id]--;
  }
  atualizarCarrinho();
});

$("botao-tema").addEventListener("click", evento => {
  const escuro = document.body.classList.toggle("modo-escuro");
  evento.currentTarget.setAttribute("aria-pressed", String(escuro));
  evento.currentTarget.innerHTML = escuro ? "☀️ <span>Modo claro</span>" : "🌙 <span>Modo escuro</span>";
});

function abrirAba(nome) {
  document.querySelectorAll(".aba-chat").forEach(botao => {
    const ativa = botao.dataset.aba === nome;
    botao.classList.toggle("ativa", ativa);
    botao.setAttribute("aria-pressed", String(ativa));
  });
  document.querySelectorAll(".painel-chat").forEach(painel => {
    painel.hidden = painel.dataset.painel !== nome;
  });
}

document.querySelectorAll(".aba-chat").forEach(botao =>
  botao.addEventListener("click", () => abrirAba(botao.dataset.aba))
);

$("btn-abrir-chat").addEventListener("click", () => {
  $("janela-chat").hidden = false;
  $("btn-abrir-chat").setAttribute("aria-expanded", "true");
});
$("btn-fechar-chat").addEventListener("click", () => {
  $("janela-chat").hidden = true;
  $("btn-abrir-chat").setAttribute("aria-expanded", "false");
  pararCamera();
});

async function consultarJSON(url) {
  const resposta = await fetch(url);
  if (!resposta.ok) throw new Error("Não foi possível consultar o serviço de localização.");
  return resposta.json();
}

async function localizarCep(cep) {
  const dados = await consultarJSON(`https://viacep.com.br/ws/${cep}/json/`);
  if (dados.erro) throw new Error(`O CEP ${cep} não foi encontrado.`);
  return dados;
}

const cacheCoordenadas = new Map();
let ultimaConsultaGeocodificacao = 0;

async function geocodificarCep(cep, dadosCep) {
  if (cacheCoordenadas.has(cep)) return cacheCoordenadas.get(cep);
  const parametros = new URLSearchParams({
    postalcode: cep,
    city: dadosCep.localidade || "",
    state: dadosCep.uf || "",
    country: "Brazil",
    countrycodes: "br",
    format: "jsonv2",
    limit: "1"
  });
  const espera = Math.max(0, 1100 - (Date.now() - ultimaConsultaGeocodificacao));
  if (espera) await new Promise(resolve => window.setTimeout(resolve, espera));
  ultimaConsultaGeocodificacao = Date.now();
  const resultados = await consultarJSON(`https://nominatim.openstreetmap.org/search?${parametros}`);
  if (!resultados.length) throw new Error(`Não foi possível localizar o CEP ${cep} no mapa.`);
  const ponto = { lat: Number(resultados[0].lat), lon: Number(resultados[0].lon) };
  cacheCoordenadas.set(cep, ponto);
  return ponto;
}

async function calcularDistanciaPorCep(cepDestino) {
  const origemDados = await localizarCep(CEP_ORIGEM);
  const destinoDados = await localizarCep(cepDestino);
  const origem = await geocodificarCep(CEP_ORIGEM, origemDados);
  const destino = await geocodificarCep(cepDestino, destinoDados);
  const rota = await consultarJSON(
    `https://router.project-osrm.org/route/v1/driving/${origem.lon},${origem.lat};${destino.lon},${destino.lat}?overview=false&alternatives=false&steps=false`
  );
  if (rota.code !== "Ok" || !rota.routes?.length) {
    throw new Error("Não foi possível calcular uma rota para esse CEP.");
  }
  return rota.routes[0].distance / 1000;
}

function limparFrete() {
  frete = null;
  $("distancia-entrega").textContent = "—";
  $("frete-entrega").textContent = "A calcular";
  $("total-compra").textContent = "Calcule o frete";
  $("status-frete").textContent = "";
}

$("form-frete").addEventListener("submit", async evento => {
  evento.preventDefault();
  const status = $("status-frete");
  const botao = $("form-frete").querySelector('button[type="submit"]');
  const cep = $("cep-destino").value.replace(/\D/g, "");

  if (!qtdTotal()) {
    status.textContent = "Adicione um produto ao carrinho antes de calcular o frete.";
    return;
  }
  if (!$("endereco").value.trim() || !/^\d{8}$/.test(cep)) {
    status.textContent = "Informe o endereço completo e um CEP válido.";
    return;
  }

  botao.disabled = true;
  botao.textContent = "Calculando...";
  status.textContent = "Localizando os CEPs e calculando a rota...";
  try {
    const distancia = await calcularDistanciaPorCep(cep);
    $("distancia-entrega").textContent = `${distancia.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`;
    if (distancia > 100) {
      frete = null;
      $("frete-entrega").textContent = $("total-compra").textContent = "Indisponível";
      status.textContent = "Não é possível entregar acima de 100 km.";
      return;
    }
    frete = Math.round(distancia * PRECO_KM);
    $("frete-entrega").textContent = moeda.format(frete / 100);
    $("total-compra").textContent = moeda.format((subtotal() + frete) / 100);
    status.textContent = "Frete calculado pelo CEP. O endereço informado não altera o preço.";
  } catch (erro) {
    frete = null;
    $("distancia-entrega").textContent = "—";
    $("frete-entrega").textContent = $("total-compra").textContent = "Indisponível";
    status.textContent = erro.message || "Não foi possível calcular o frete. Tente novamente.";
  } finally {
    botao.disabled = false;
    botao.textContent = "Calcular frete";
  }
});

["endereco", "cep-destino"].forEach(id => $(id).addEventListener("input", limparFrete));
$("cep-destino").addEventListener("input", evento => {
  const numeros = evento.target.value.replace(/\D/g, "").slice(0, 8);
  evento.target.value = numeros.length > 5 ? `${numeros.slice(0, 5)}-${numeros.slice(5)}` : numeros;
});

function adicionarMensagem(texto, tipo) {
  const div = document.createElement("div");
  div.className = `mensagem ${tipo}`;
  div.textContent = texto;
  $("chat-mensagens").appendChild(div);
  $("chat-corpo").scrollTop = $("chat-corpo").scrollHeight;
}

function responder(texto) {
  const pergunta = texto.toLocaleLowerCase("pt-BR").trim();
  if (/\b(normal|original|padr[aã]o)\b/.test(pergunta) || /voltar ao (tema )?(normal|original|padr[aã]o)/.test(pergunta)) {
    document.body.classList.remove("tema-matrix", "tema-starwars");
    return "Tema padrão restaurado. Tudo como antes!";
  }
  if (/\bmatrix\b/i.test(pergunta)) {
    document.body.classList.remove("tema-starwars");
    document.body.classList.add("tema-matrix");
    return "Modo Matrix ativado. Bem-vindo à realidade.";
  }
  if (/\bstar\s*wars\b/i.test(pergunta)) {
    document.body.classList.remove("tema-matrix");
    document.body.classList.add("tema-starwars");
    return "Modo Star Wars ativado. Que a Força esteja com você.";
  }
  if (pergunta.includes("frete")) return "O frete é calculado pela distância da rota entre o CEP da loja (12502-112) e o CEP de destino: R$ 4,00 por km, para entregas de até 100 km.";
  const encontrados = produtos.filter(item =>
    `${item.nome || ""} ${item.categoria || ""}`.toLocaleLowerCase("pt-BR").split(/\s+/)
      .some(palavra => palavra.length > 2 && pergunta.includes(palavra))
  );
  if (encontrados.length) {
    return encontrados.slice(0, 4).map(item =>
      `${item.nome}: ${moeda.format(Number(item.preco || 0))}. Estoque: ${item.quantidade || 0}.`
    ).join(" ");
  }
  if (/preço|preco|produto|itens/.test(pergunta)) {
    return produtos.length
      ? produtos.map(item => `${item.nome}: ${moeda.format(Number(item.preco || 0))}`).join("; ")
      : "Ainda não há produtos cadastrados na loja.";
  }
  return "Posso ajudar com informações sobre os produtos cadastrados e o frete.";
}

$("form-chat").addEventListener("submit", evento => {
  evento.preventDefault();
  const campo = $("mensagem");
  const texto = campo.value.trim();
  if (!texto) return;
  abrirAba("atendimento");
  adicionarMensagem(texto, "usuario");
  campo.value = "";
  window.setTimeout(() => adicionarMensagem(responder(texto), "robo"), 250);
});

async function carregarModelo() {
  if (modelo) return modelo;
  if (typeof tmImage === "undefined") throw new Error("O modelo de identificação não carregou. Confira sua conexão.");
  modelo = await tmImage.load(`${URL_MODELO}model.json`, `${URL_MODELO}metadata.json`);
  return modelo;
}

function produtoPrevisto(resultados) {
  if (!resultados?.length) return null;
  const melhor = resultados.reduce((a, b) => b.probability > a.probability ? b : a);
  const classe = melhor.className.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return produtos.find(item => {
    const nome = `${item.nome || ""} ${item.categoria || ""}`.normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "").toLowerCase();
    return nome.split(/\W+/).filter(p => p.length > 2).some(p => classe.includes(p));
  }) || null;
}

function mostrarIdentificacao(resultados) {
  const area = $("acao-identificacao");
  area.replaceChildren();
  const item = produtoPrevisto(resultados);
  const mensagem = document.createElement("p");

  if (!item) {
    mensagem.textContent = "Não reconheci um produto cadastrado na loja.";
    area.appendChild(mensagem);
    return;
  }

  mensagem.textContent = `Produto identificado: ${item.nome}.`;
  const botao = document.createElement("button");
  botao.type = "button";
  botao.textContent = "Adicionar ao carrinho";
  botao.disabled = (quantidades[item.id] || 0) >= Number(item.quantidade || 0);
  botao.addEventListener("click", () => {
    if ((quantidades[item.id] || 0) >= Number(item.quantidade || 0)) return;
    quantidades[item.id] = (quantidades[item.id] || 0) + 1;
    atualizarCarrinho();
    mensagem.textContent = `${item.nome} adicionado ao carrinho.`;
    botao.disabled = true;
  });
  area.append(mensagem, botao);
}

$("botao-modelo").addEventListener("click", async () => {
  const video = $("camera-video");
  const aviso = $("aviso-camera");
  if (cameraAtiva) return pararCamera();

  try {
    await carregarModelo();
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("Seu navegador não permite acessar a câmera neste endereço.");
    camera = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
    video.srcObject = camera;
    video.hidden = false;
    $("imagem-preview").hidden = true;
    await video.play();
    cameraAtiva = true;
    $("texto-botao-camera").textContent = "Fechar câmera";
    analisarCamera();
  } catch (erro) {
    aviso.textContent = erro.message || "Não foi possível abrir a câmera.";
    aviso.hidden = false;
    pararCamera();
  }
});

async function analisarCamera() {
  if (!cameraAtiva) return;
  try {
    if (modelo && $("camera-video").readyState >= 2) mostrarIdentificacao(await modelo.predict($("camera-video")));
  } catch (erro) {
    console.error("Erro ao analisar a câmera:", erro);
  }
  if (cameraAtiva) window.setTimeout(analisarCamera, 900);
}

function pararCamera() {
  cameraAtiva = false;
  camera?.getTracks().forEach(faixa => faixa.stop());
  camera = null;
  $("camera-video").srcObject = null;
  $("camera-video").hidden = true;
  $("texto-botao-camera").textContent = "Abrir câmera";
}

$("imagem-computador").addEventListener("change", async evento => {
  const arquivo = evento.target.files[0];
  evento.target.value = "";
  if (!arquivo) return;
  pararCamera();
  $("aviso-camera").hidden = true;
  if (urlPreview) URL.revokeObjectURL(urlPreview);
  urlPreview = URL.createObjectURL(arquivo);

  const imagem = $("imagem-preview");
  imagem.src = urlPreview;
  imagem.hidden = false;

  try {
    await imagem.decode();
    await carregarModelo();
    mostrarIdentificacao(await modelo.predict(imagem));
  } catch (erro) {
    $("aviso-camera").textContent = erro.message || "Não foi possível analisar a imagem.";
    $("aviso-camera").hidden = false;
  }
});

window.addEventListener("beforeunload", () => {
  pararCamera();
  if (urlPreview) URL.revokeObjectURL(urlPreview);
});

carregarProdutos();
