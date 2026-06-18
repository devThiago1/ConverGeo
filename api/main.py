from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import psycopg2
import psycopg2.extras
import os
import h3
from dotenv import load_dotenv

# Carrega as variáveis de ambiente (o seu DATABASE_URL)
load_dotenv()

# Inicializa a API
app = FastAPI(
    title="Convergeo API", 
    description="Motor Preditivo de Viabilidade Comercial",
    version="1.0.0"
)

# Configuração de CORS: Crucial para a Sprint 3! 
# Permite que o mapa no navegador (front-end) consiga pedir dados a esta API sem ser bloqueado.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # No futuro (produção), mudamos para o domínio do seu site
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db_connection():
    """Cria a ligação ao Supabase."""
    return psycopg2.connect(os.getenv("DATABASE_URL"))

@app.get("/score")
def get_score(
    lat: float = Query(..., description="Latitude do local (ex: -12.9714)"),
    lng: float = Query(..., description="Longitude do local (ex: -38.5014)"),
    segmento: str = Query("food_service", description="Segmento de mercado alvo")
):
    """
    Recebe coordenadas, converte para H3 e devolve a nota de viabilidade.
    """
    # 1. Converter a coordenada num índice H3 (Resolução 8, a mesma da nossa base)
    try:
        # Nota: dependendo da versão da biblioteca h3-py instalada, 
        # o método pode chamar-se geo_to_h3 ou latlng_to_cell
        if hasattr(h3, 'latlng_to_cell'):
            h3_index = h3.latlng_to_cell(lat, lng, 8)
        else:
            h3_index = h3.geo_to_h3(lat, lng, 8)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao processar coordenadas: {str(e)}")

    # 2. Consultar as notas no Supabase
    conn = None
    try:
        conn = get_db_connection()
        # Usamos DictCursor para que os resultados venham como dicionário em vez de tupla
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        query = """
            SELECT 
                h3_index,
                segmento,
                score_estrutural,
                score_macroeconomico,
                score_comportamental,
                score_total
            FROM convergeo.scores
            WHERE h3_index = %s AND segmento = %s
        """
        cur.execute(query, (h3_index, segmento))
        resultado = cur.fetchone()
        
        # 3. Preparar a Resposta
        if not resultado:
            # Se clicarem numa zona no meio do oceano ou fora de Salvador
            return {
                "status": "sem_dados",
                "h3_index": h3_index,
                "mensagem": "Região sem dados suficientes ou fora da área de cobertura."
            }

        # Formata o JSON perfeito para o Dashboard ler na Sprint 3
        return {
            "status": "sucesso",
            "h3_index": resultado["h3_index"],
            "segmento": resultado["segmento"],
            "score_total": round(resultado["score_total"], 2),
            "breakdown": {
                "estrutural": round(resultado["score_estrutural"], 2) if resultado["score_estrutural"] else 0,
                "macroeconomico": round(resultado["score_macroeconomico"], 2) if resultado["score_macroeconomico"] else 0,
                "comportamental": round(resultado["score_comportamental"], 2) if resultado["score_comportamental"] else 0
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro no banco de dados: {str(e)}")
    finally:
        if conn:
            cur.close()
            conn.close()