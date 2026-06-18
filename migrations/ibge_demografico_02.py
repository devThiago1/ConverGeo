import pandas as pd
import geopandas as gpd
import psycopg2
import h3
import os
from dotenv import load_dotenv

load_dotenv()

ARQUIVO_IBGE = r"C:\Users\thiag\Documents\convergeo\Area_efetivamente_domiciliada_e_densidade_ajustada_dos_Setores_Censitarios.xlsx"
ARQUIVO_GPKG = r"C:\Users\thiag\Documents\convergeo\BA_Malha_Preliminar_2022.gpkg"
COD_SALVADOR  = "2927408"

def carregar_salvador():
    print("Carregando arquivo IBGE...")
    df = pd.read_excel(ARQUIVO_IBGE)
    df["CD_SETOR"] = df["CD_SETOR"].astype(str)
    df["municipio"] = df["CD_SETOR"].str[:7]
    df = df[df["municipio"] == COD_SALVADOR].copy()
    df["v0001"]    = pd.to_numeric(df["v0001"], errors="coerce").fillna(0)
    df["v0002"]    = pd.to_numeric(df["v0002"], errors="coerce").fillna(0)
    df["densidade"] = pd.to_numeric(
        df["DENSIDADE_DEMOGRAFICA_DOMICILIADA_HAB_KM2"], errors="coerce"
    ).fillna(0)
    print(f"  {len(df)} setores de Salvador no Excel.")
    print(f"  Exemplo CD_SETOR Excel: {df['CD_SETOR'].head(3).tolist()}")
    return df

def carregar_malha():
    print("\nLendo malha geográfica...")
    gdf = gpd.read_file(ARQUIVO_GPKG)
    gdf["CD_SETOR"] = gdf["CD_SETOR"].astype(str)
    
    # Filtra Salvador
    gdf_salvador = gdf[gdf["CD_SETOR"].str[:7] == COD_SALVADOR].copy()
    print(f"  {len(gdf_salvador)} setores de Salvador na malha.")
    print(f"  Exemplo CD_SETOR gpkg: {gdf_salvador['CD_SETOR'].head(3).tolist()}")

    # Remove o 'P' do final para bater com o Excel
    gdf_salvador["CD_SETOR"] = gdf_salvador["CD_SETOR"].str.rstrip("P")

    # Calcula centroide com projeção correta para Salvador
    gdf_proj = gdf_salvador.to_crs("EPSG:32724")
    centroides = gdf_proj.geometry.centroid.to_crs("EPSG:4326")
    gdf_salvador = gdf_salvador.copy()
    gdf_salvador["lat"] = centroides.y
    gdf_salvador["lng"] = centroides.x

    print(f"  Exemplo após ajuste: {gdf_salvador['CD_SETOR'].head(3).tolist()}")
    return gdf_salvador[["CD_SETOR", "lat", "lng"]]

def salvar_demografico(df_hex):
    conn = psycopg2.connect(os.getenv("DATABASE_URL"))
    print("\nSalvando no banco...")
    salvos = 0
    ignorados = 0
    for _, row in df_hex.iterrows():
        cur = conn.cursor()
        try:
            cur.execute("""
                INSERT INTO convergeo.demografico
                    (h3_index, populacao, domicilios, renda_media_est)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (h3_index) DO UPDATE
                SET populacao       = EXCLUDED.populacao,
                    domicilios      = EXCLUDED.domicilios,
                    renda_media_est = EXCLUDED.renda_media_est
            """, (
                row["h3_index"],
                float(row["populacao"]),
                float(row["domicilios"]),
                float(row["renda_media_est"])
            ))
            conn.commit()
            salvos += 1
        except Exception:
            conn.rollback()
            ignorados += 1
        finally:
            cur.close()
    conn.close()
    print(f"Concluído! {salvos} hexágonos gravados, {ignorados} ignorados (fora da grade H3).")

if __name__ == "__main__":
    # 1. Carrega Excel
    df = carregar_salvador()

    # 2. Carrega malha e extrai centroides
    gdf = carregar_malha()

    # 3. Merge pelo código do setor
    df_merged = df.merge(gdf, on="CD_SETOR", how="inner")
    print(f"\n  {len(df_merged)} setores com coordenadas válidas após merge.")

    # 4. Atribui hexágono H3
    df_merged["h3_index"] = df_merged.apply(
        lambda r: h3.latlng_to_cell(float(r["lat"]), float(r["lng"]), 8), axis=1
    )

    # 5. Agrupa por hexágono
    df_hex = df_merged.groupby("h3_index").agg(
        populacao=("v0001", "sum"),
        domicilios=("v0002", "sum"),
        renda_media_est=("densidade", "mean")
    ).reset_index()

    print(f"  {len(df_hex)} hexágonos únicos com dados demográficos.")
    print(df_hex.head(3).to_string())

    # 6. Salva no banco
    salvar_demografico(df_hex)