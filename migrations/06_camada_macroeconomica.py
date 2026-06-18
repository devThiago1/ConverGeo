import pandas as pd
import psycopg2
import os
import warnings
from sklearn.preprocessing import MinMaxScaler
from dotenv import load_dotenv

# Silencia o aviso do Pandas pedindo para usar SQLAlchemy (mantém o console limpo)
warnings.filterwarnings('ignore', category=UserWarning)

load_dotenv()

# Dicionário de CNAEs concorrentes por segmento
CNAES_ALVO = {
    "food_service": ["5611201", "5611203", "5620104", "5611204"], # Restaurantes, Lanchonetes, Bares
    "farmacia":     ["4771701", "4771702", "4771703"],           # Farmácias e Drogarias
    "vestuario":    ["4781400", "4782201", "4782202"],           # Comércio Varejista de Vestuário
    "clinica":      ["8630501", "8630502", "8630503"],           # Atividade Médica Ambulatorial
}

def carregar_concorrencia_por_hexagono():
    """
    Agrega a contagem de CNPJs ativos por hexágono e por segmento.
    Lê diretamente a coluna h3_index da tabela empresas.
    """
    conn = psycopg2.connect(os.getenv("DATABASE_URL"))
    
    print("  Executando query de agregação de concorrência na base 'empresas'...", flush=True)
    
    query = """
        SELECT 
            e.h3_index,
            e.cnae_principal AS cnae,
            COUNT(e.id) as total_cnpjs
        FROM convergeo.empresas e
        WHERE e.situacao = 'ATIVA'
          AND e.h3_index IS NOT NULL
        GROUP BY e.h3_index, e.cnae_principal;
    """
    
    df_raw = pd.read_sql(query, conn)
    conn.close()
    
    print(f"  {len(df_raw)} registros de agrupamento CNAE/Hexágono carregados.", flush=True)
    return df_raw

def calcular_score_macroeconomico(df_raw, segmento, cnaes_concorrentes):
    """
    Filtra os CNAEs, conta os concorrentes e aplica normalização inversa.
    """
    # 1. Filtra apenas as empresas concorrentes do segmento
    df_segmento = df_raw[df_raw['cnae'].isin(cnaes_concorrentes)].copy()
    
    # 2. Soma o total por hexágono
    df_agrupado = df_segmento.groupby('h3_index')['total_cnpjs'].sum().reset_index()
    df_agrupado.rename(columns={'total_cnpjs': 'densidade_concorrencia'}, inplace=True)
    
    # 3. Normalização Inversa (Min-Max)
    # Muita concorrência = Nota baixa; Pouca/Nenhuma = Nota alta.
    if len(df_agrupado) > 0:
        scaler = MinMaxScaler()
        concorrencia_norm_0_1 = scaler.fit_transform(df_agrupado[['densidade_concorrencia']])
        df_agrupado['score_macro'] = ((1.0 - concorrencia_norm_0_1) * 10).round(2)
    else:
        df_agrupado = pd.DataFrame(columns=['h3_index', 'densidade_concorrencia', 'score_macro'])

    print(f"\n  [{segmento}] Estatísticas do score_macro (concorrência):", flush=True)
    if len(df_agrupado) > 0:
        print(f"    min concorrentes: {df_agrupado['densidade_concorrencia'].min()}", flush=True)
        print(f"    max concorrentes: {df_agrupado['densidade_concorrencia'].max()}", flush=True)
        print(f"    score_macro min:  {df_agrupado['score_macro'].min():.2f} (Alta saturação)", flush=True)
        print(f"    score_macro max:  {df_agrupado['score_macro'].max():.2f} (Oportunidade)", flush=True)
    else:
        print("    Nenhum concorrente encontrado para os CNAEs fornecidos.", flush=True)

    return df_agrupado

def atualizar_scores_macro(df_scores_macro, segmento):
    """
    Faz o UPDATE na tabela scores para inserir o score macroeconómico.
    """
    conn = psycopg2.connect(os.getenv("DATABASE_URL"))
    atualizados = 0
    ignorados = 0

    for _, row in df_scores_macro.iterrows():
        cur = conn.cursor()
        try:
            cur.execute("""
                UPDATE convergeo.scores
                SET 
                    score_macroeconomico = %s,
                    score_total = COALESCE(score_estrutural, 0) * 0.35 + %s * 0.40, 
                    calculado_em = NOW()
                WHERE h3_index = %s AND segmento = %s;
            """, (
                float(row["score_macro"]),
                float(row["score_macro"]),
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

    # Fallback: Hexágonos que existem na tabela mas não têm concorrentes recebem nota 10
    cur = conn.cursor()
    try:
        cur.execute("""
            UPDATE convergeo.scores
            SET 
                score_macroeconomico = 10.0,
                score_total = COALESCE(score_estrutural, 0) * 0.35 + (10.0 * 0.40),
                calculado_em = NOW()
            WHERE segmento = %s AND score_macroeconomico IS NULL;
        """, (segmento,))
        conn.commit()
        print(f"  [{segmento}] Atualizados hexágonos sem concorrentes (nota 10 de oportunidade).", flush=True)
    except Exception as e:
         conn.rollback()
         print(f"  Erro no fallback: {e}", flush=True)
    finally:
        cur.close()

    conn.close()
    print(f"  [{segmento}] {atualizados} atualizados. {ignorados} não encontrados na tabela scores.", flush=True)

if __name__ == "__main__":
    print("=== Sprint 2.2 — Camada Macroeconômica ===\n", flush=True)

    print("Passo 1: Carregando dados da tabela de empresas (CNPJs)...", flush=True)
    df_raw = carregar_concorrencia_por_hexagono()

    for segmento, cnaes in CNAES_ALVO.items():
        print(f"\nPasso 2: Calculando score_macroeconomico — segmento: {segmento}", flush=True)
        df_scores_macro = calcular_score_macroeconomico(df_raw, segmento, cnaes)
        
        print(f"Passo 3: Atualizando banco de dados...", flush=True)
        atualizar_scores_macro(df_scores_macro, segmento)

    print("\n=== Camada Macroeconômica concluída para todos os segmentos ===", flush=True)