# ConverGeo

**Motor Preditivo de Viabilidade Comercial e Inteligência Geoespacial**

O **ConverGeo** é um MVP (Minimum Viable Product) desenvolvido para o **Edital DESAVEXE 2026**, visando democratizar o acesso à inteligência de mercado através da análise geoespacial de dados públicos.

O sistema divide o município de Salvador (BA) em hexágonos de alta resolução (H3 - Uber) e cruza milhares de dados demográficos, empresariais e de infraestrutura para gerar um Score de Viabilidade Comercial (0 a 10) para novos negócios em tempo real.

## 🧠 A Inteligência de Dados (O Algoritmo)

O motor preditivo foi construído sob uma matriz de pesos paramétrica que avalia o risco e o potencial de uma região com base em três camadas principais:

1. **Camada Estrutural** 🏢
   * Fonte: IBGE (Censo 2022).
   * Lógica: Avalia a densidade populacional e o rendimento médio (variáveis de consumo direto).

2. **Camada Macroeconómica** 📊
   * Fonte: Receita Federal (CNPJs Ativos).
   * Lógica: Mede a saturação de mercado. Hexágonos com alta concentração de concorrentes (ex: muitos restaurantes) recebem notas menores (Oceano Vermelho), enquanto áreas desatendidas recebem notas maiores (Oceano Azul).

3. **Camada Comportamental** 🚶‍♂️🚗
   * Fonte: OpenStreetMap (OSM).
   * Lógica: Avalia a infraestrutura urbana (proximidade a hospitais, escolas, bancos e paragens de autocarro) como uma proxy para medir o fluxo orgânico pedonal e viário.

## 🚀 Tecnologias Utilizadas (Stack)

* **Ciência de Dados (ETL):** Python, Pandas, Scikit-Learn (MinMaxScaler).
* **Geolocalização:** H3-py (Uber Hexagonal Hierarchical Spatial Index).
* **Base de Dados:** Supabase (PostgreSQL + PostGIS).
* **API / Back-end:** FastAPI, Uvicorn, Psycopg2.

## 📂 Estrutura do Repositório

convergeo/
│
├── motor_etl/                      # Scripts de processamento (Rodam em batch)
│   ├── generate_hexagonos_01.py    # Geração da malha H3
│   ├── ibge_demografico_02.py      # Ingestão IBGE
│   ├── cnpj_extracao.py            # Ingestão Receita Federal
│   ├── 04_osm_salvador.py          # Ingestão OpenStreetMap
│   ├── 05_camada_estrutural.py     # Cálculo do Score Estrutural
│   ├── 06_camada_macroeconomica.py # Cálculo do Score Macroeconómico
│   └── 07_camada_comportamental.py # Cálculo do Score Comportamental e Score Total
│
├── api/                            # Back-end em tempo real
│   └── main.py                     # Endpoint FastAPI para consulta do Score
│
├── .env.example                    # Template de variáveis de ambiente
├── requirements.txt                # Dependências do projeto
└── README.md                       # Documentação

## 🛠️ Como Executar Localmente

### 1. Pré-requisitos
* Python 3.10 ou superior.
* Conta no Supabase configurada com a estrutura base (Tabelas hexagonos, demografico, empresas, osm_pois e scores).

### 2. Instalação
Clone o repositório e instale as dependências:

git clone https://github.com/seu-usuario/convergeo.git
cd convergeo
pip install -r requirements.txt

### 3. Variáveis de Ambiente
Crie um ficheiro .env na raiz do projeto e adicione a sua string de conexão do banco de dados:

DATABASE_URL=postgresql://postgres.xxxxx:sua_senha@aws-0-sa-east-1.pooler.supabase.com:6543/postgres

### 4. Iniciando a API
Suba o servidor de desenvolvimento:

uvicorn api.main:app --reload

A API estará disponível em http://localhost:8000.
Aceda à documentação interativa (Swagger UI) em http://localhost:8000/docs.

## 📡 Documentação da API

### GET /score
Retorna a avaliação de viabilidade para uma coordenada específica.

**Parâmetros:**
* lat (float): Latitude (Obrigatório).
* lng (float): Longitude (Obrigatório).
* segmento (string): Opcional. Padrão: food_service. (Opções: food_service, farmacia, vestuario, clinica).

**Exemplo de Resposta (JSON):**

{
  "status": "sucesso",
  "h3_index": "888116b0e1fffff",
  "segmento": "food_service",
  "score_total": 5.88,
  "breakdown": {
    "estrutural": 3.78,
    "macroeconomico": 10.0,
    "comportamental": 2.24
  }
}



