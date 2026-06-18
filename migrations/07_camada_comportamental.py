import pandas as pd
import psycopg2
import os
import warnings
from sklearn.preprocessing import MinMaxScaler
from dotenv import load_dotenv

# Silencia o aviso do Pandas pedindo para usar SQLAlchemy
warnings.filterwarnings('ignore', category=UserWarning)

load_dotenv()

# Categorias chave do OpenStreetMap que geram fluxo pedonal/veicular
CATEGORIAS_FLUXO = [
    'bus_stop', 'station', 'hospital', 'clinic', 'school', 'university',
    'supermarket', 'mall', 'restaurant', 'cafe', 'bank', 'pharmacy'
]

def carregar_pois_por_hexagono():
    """
    Agrega a contagem de Pontos de Interesse (POIs) geradores de fluxo por hexágono.
    Lê o h3_index diretamente da tabela osm_pois.
    """
    conn = psycopg2.connect(os.getenv("DATABASE_URL"))
    
    print("  Executando query de agregação de POIs na base 'osm_pois'...", flush=True)
    
    # Query atualizada para utilizar a coluna correta: 'subtipo'
    query = """
        SELECT 
            o.h3_index,
            COUNT(o.id) as total_pois
        FROM convergeo.osm_pois o
        WHERE o.subtipo = ANY(%s)
          AND o.h3_index IS NOT NULL
        GROUP BY o.h3_index;
    """
    
    # Passamos a lista de categorias apenas uma vez, pois só consultamos a coluna 'subtipo'
    df_raw = pd.read_sql(query, conn, params=(CATEGORIAS_FLUXO,))
    conn.close()
    
    print(f"  {len(df_raw)} hexágonos com dados de infraestrutura urbana carregados.", flush=True)
    return df_raw

def calcular_score_comportamental(df_raw, segmento):
    """
    Aplica normalização direta sobre o volume de POIs.
    """
    df_agrupado = df_raw.copy()
    
    # 3. Normalização Direta (Min-Max)
    # Lógica: Mais infraestrutura urbana = Maior atratividade = Nota mais alta.
    if len(df_agrupado) > 0:
        scaler = MinMaxScaler(feature_range=(0, 10))
        df_agrupado['score_comportamental'] = scaler.fit_transform(df_agrupado[['total_pois']]).round(2)
    else:
        df_agrupado = pd.DataFrame(columns=['h3_index', 'total_pois', 'score_comportamental'])

    print(f"\n  [{segmento}] Estatísticas do score_comportamental (Fluxo estimado):", flush=True)
    if len(df_agrupado) > 0:
        print(f"    min POIs: {df_agrupado['total_pois'].min()}", flush=True)
        print(f"    max POIs: {df_agrupado['total_pois'].max()}", flush=True)
        print(f"    score_comportamental min:  {df_agrupado['score_comportamental'].min():.2f} (Baixo fluxo)", flush=True)
        print(f"    score_comportamental max:  {df_agrupado['score_comportamental'].max():.2f} (Alto fluxo/Polo)", flush=True)
    else:
        print("    Nenhum POI encontrado no OpenStreetMap.", flush=True)

    return df_agrupado

def atualizar_scores_comportamental(df_scores, segmento):
    """
    Faz o UPDATE na tabela scores para inserir o score comportamental e finalizar o score_total.
    """
    conn = psycopg2.connect(os.getenv("DATABASE_URL"))
    atualizados = 0
    ignorados = 0

    for _, row in df_scores.iterrows():
        cur = conn.cursor()
        try:
            # Atualiza o registo, fechando a equação dos 100% (35% + 40% + 25%)
            cur.execute("""
                UPDATE convergeo.scores
                SET 
                    score_comportamental = %s,
                    -- Fechamos a fórmula do MVP aqui
                    score_total = COALESCE(score_estrutural, 0) * 0.35 
                                + COALESCE(score_macroeconomico, 0) * 0.40 
                                + %s * 0.25, 
                    calculado_em = NOW()
                WHERE h3_index = %s AND segmento = %s;
            """, (
                float(row["score_comportamental"]),
                float(row["score_comportamental"]),
                row["h3_index"],
                segmento
            ))
            
            if cur.rowcount > 0:
                atualizados += 1
            else:
                ignorados += 1
                
            conn.commit()
            
        except Exception as e:
            conn.rollback()
            print(f"  Erro ao atualizar H3 {row['h3_index']}: {e}", flush=True)
        finally:
            cur.close()

    # Fallback: Hexágonos residenciais/periféricos sem POIs registrados no OSM recebem nota 0 de atratividade comercial
    cur = conn.cursor()
    try:
        cur.execute("""
            UPDATE convergeo.scores
            SET 
                score_comportamental = 0.0,
                score_total = COALESCE(score_estrutural, 0) * 0.35 
                            + COALESCE(score_macroeconomico, 0) * 0.40 
                            + (0.0 * 0.25),
                calculado_em = NOW()
            WHERE segmento = %s AND score_comportamental IS NULL;
        """, (segmento,))
        conn.commit()
        print(f"  [{segmento}] Atualizados hexágonos sem POIs geradores de fluxo (nota 0 comportamental).", flush=True)
    except Exception as e:
         conn.rollback()
         print(f"  Erro no fallback: {e}", flush=True)
    finally:
        cur.close()

    conn.close()
    print(f"  [{segmento}] {atualizados} atualizados. {ignorados} não encontrados na tabela base.", flush=True)

if __name__ == "__main__":
    print("=== Sprint 2.3 — Camada Comportamental ===\n", flush=True)

    print("Passo 1: Carregando dados da infraestrutura urbana (OSM)...", flush=True)
    df_raw = carregar_pois_por_hexagono()

    # Para este MVP, a atratividade base baseada em infraestrutura é a mesma para todos os segmentos.
    # No futuro (pós-pitch), isso pode ser customizado (ex: Farmácias valorizam mais fluxo viário, 
    # Restaurantes valorizam fluxo pedonal).
    segmentos = ["food_service", "farmacia", "vestuario", "clinica"]
    
    for segmento in segmentos:
        print(f"\nPasso 2: Calculando score_comportamental — segmento: {segmento}", flush=True)
        df_scores_comp = calcular_score_comportamental(df_raw, segmento)
        
        print(f"Passo 3: Finalizando equação de pesos no banco de dados...", flush=True)
        atualizar_scores_comportamental(df_scores_comp, segmento)

    print("\n=== Camada Comportamental e Score Total concluídos! ===", flush=True)