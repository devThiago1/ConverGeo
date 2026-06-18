import pandas as pd
import psycopg2
import os
from sklearn.preprocessing import MinMaxScaler
from dotenv import load_dotenv

load_dotenv()

PESOS = {
    "food_service": {"populacao": 0.40, "domicilios": 0.25, "renda": 0.35},
    "farmacia":     {"populacao": 0.35, "domicilios": 0.25, "renda": 0.40},
    "vestuario":    {"populacao": 0.45, "domicilios": 0.20, "renda": 0.35},
    "clinica":      {"populacao": 0.30, "domicilios": 0.25, "renda": 0.45},
}

def carregar_demografico():
    conn = psycopg2.connect(os.getenv("DATABASE_URL"))
    df = pd.read_sql("""
        SELECT h3_index, populacao, domicilios, renda_media_est
        FROM convergeo.demografico
        WHERE populacao IS NOT NULL
    """, conn)
    conn.close()
    print(f"  {len(df)} hexágonos carregados da tabela demografico.")
    return df

def calcular_score_estrutural(df, segmento, pesos):
    """Aplica min-max normalization e compõe score_estrutural ponderado."""
    scaler = MinMaxScaler(feature_range=(0, 10))

    features = df[["populacao", "domicilios", "renda_media_est"]].copy()
    features_norm = pd.DataFrame(
        scaler.fit_transform(features),
        columns=["pop_norm", "dom_norm", "renda_norm"],
        index=df.index
    )

    df_out = df[["h3_index"]].copy()
    df_out["score_estrutural"] = (
        pesos["populacao"] * features_norm["pop_norm"] +
        pesos["domicilios"] * features_norm["dom_norm"] +
        pesos["renda"]      * features_norm["renda_norm"]
    ).round(2)

    print(f"\n  [{segmento}] Estatísticas do score_estrutural:")
    print(f"    min:    {df_out['score_estrutural'].min():.2f}")
    print(f"    max:    {df_out['score_estrutural'].max():.2f}")
    print(f"    mean:   {df_out['score_estrutural'].mean():.2f}")
    print(f"    median: {df_out['score_estrutural'].median():.2f}")

    return df_out

def salvar_scores(df_scores, segmento):
    conn = psycopg2.connect(os.getenv("DATABASE_URL"))
    salvos = 0
    ignorados = 0

    for _, row in df_scores.iterrows():
        cur = conn.cursor()
        try:
            cur.execute("""
                INSERT INTO convergeo.scores
                    (h3_index, segmento, score_estrutural, score_total)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (h3_index, segmento) DO UPDATE
                SET score_estrutural = EXCLUDED.score_estrutural,
                    calculado_em     = NOW()
            """, (
                row["h3_index"],
                segmento,
                float(row["score_estrutural"]),
                float(row["score_estrutural"])  # score_total provisório até 2.4
            ))
            conn.commit()
            salvos += 1
        except Exception as e:
            conn.rollback()
            ignorados += 1
            print(f"  Erro: {e}")
        finally:
            cur.close()

    conn.close()
    print(f"  [{segmento}] {salvos} scores gravados, {ignorados} ignorados.")

if __name__ == "__main__":
    print("=== Sprint 2.1 — Camada Estrutural ===\n")

    print("Carregando dados demográficos...")
    df = carregar_demografico()

    print(f"\nDistribuição dos features brutos:")
    print(df[["populacao", "domicilios", "renda_media_est"]].describe().round(2).to_string())

    for segmento, pesos in PESOS.items():
        print(f"\nCalculando score_estrutural — segmento: {segmento}")
        df_scores = calcular_score_estrutural(df, segmento, pesos)
        salvar_scores(df_scores, segmento)

    print("\n=== Camada Estrutural concluída para todos os segmentos ===")