from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import psycopg2
import psycopg2.extras
import os
from pathlib import Path
import h3
from dotenv import load_dotenv

load_dotenv()
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

app = FastAPI(
    title="Convergeo API", 
    description="Motor Preditivo de Viabilidade Comercial",
    version="1.0.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # No futuro (produção), mudamos para o domínio do site
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db_connection():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise ValueError("A variável DATABASE_URL não foi encontrada. Verifique o seu ficheiro .env")
    return psycopg2.connect(db_url)

@app.get("/score")
def get_score(
    lat: float = Query(..., description="Latitude do local (ex: -12.9714)"),
    lng: float = Query(..., description="Longitude do local (ex: -38.5014)"),
    segmento: str = Query("food_service", description="Segmento de mercado alvo")
):
    
    try:
        if hasattr(h3, 'latlng_to_cell'):
            h3_index = h3.latlng_to_cell(lat, lng, 8)
        else:
            h3_index = h3.geo_to_h3(lat, lng, 8)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao processar coordenadas: {str(e)}")

    conn = None
    cur = None
    try:
        conn = get_db_connection()
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
        
        if not resultado:
            return {
                "status": "sem_dados",
                "h3_index": h3_index,
                "mensagem": "Região sem dados suficientes ou fora da área de cobertura."
            }

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
        error_msg = str(e)
        print(f"\n❌ ERRO FATAL NO BANCO DE DADOS: {error_msg}\n", flush=True)
        raise HTTPException(status_code=500, detail=f"Erro no banco de dados: {error_msg}")
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()
            
@app.get("/top")
def get_top_scores(
    segmento: str = Query("food_service", description="Segmento de mercado alvo"),
    limit: int = Query(5, description="Número de recomendações a devolver")
):
    """
    Pesquisa e devolve os hexágonos com a maior nota total para um dado segmento.
    """
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        # Pesquisa os top X hexágonos ordenados pela nota mais alta
        query = """
            SELECT 
                h3_index,
                score_estrutural,
                score_macroeconomico,
                score_comportamental,
                score_total
            FROM convergeo.scores
            WHERE segmento = %s
              AND score_total IS NOT NULL
            ORDER BY score_total DESC
            LIMIT %s
        """
        cur.execute(query, (segmento, limit))
        resultados = cur.fetchall()
        
        if not resultados:
            return {"status": "sem_dados", "mensagem": f"Sem dados para o segmento {segmento}"}

        recomendacoes = []
        for res in resultados:
            recomendacoes.append({
                "h3_index": res["h3_index"],
                "score_total": round(res["score_total"], 2),
                "breakdown": {
                    "estrutural": round(res["score_estrutural"], 2) if res["score_estrutural"] else 0,
                    "macroeconomico": round(res["score_macroeconomico"], 2) if res["score_macroeconomico"] else 0,
                    "comportamental": round(res["score_comportamental"], 2) if res["score_comportamental"] else 0
                }
            })

        return {
            "status": "sucesso",
            "segmento": segmento,
            "recomendacoes": recomendacoes
        }

    except Exception as e:
        error_msg = str(e)
        raise HTTPException(status_code=500, detail=f"Erro no banco de dados: {error_msg}")
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()