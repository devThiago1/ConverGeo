import pandas as pd
import psycopg2
import h3
import os
import zipfile
from dotenv import load_dotenv

load_dotenv()

ARQUIVO_ZIP  = r"C:\Users\thiag\Documents\convergeo\Estabelecimentos0.zip"
UF_FILTRO    = "BA"
MUN_FILTRO = "3849"

# Colunas do layout da Receita Federal 2026
COLUNAS = [
    "cnpj_basico", "cnpj_ordem", "cnpj_dv", "identificador",
    "nome_fantasia", "situacao_cadastral", "data_situacao",
    "motivo_situacao", "nome_cidade_exterior", "pais",
    "data_inicio", "cnae_principal", "cnae_secundaria",
    "tipo_logradouro", "logradouro", "numero", "complemento",
    "bairro", "cep", "uf", "municipio", "ddd1", "telefone1",
    "ddd2", "telefone2", "ddd_fax", "fax", "email",
    "situacao_especial", "data_situacao_especial"
]

def processar_zip():
    print("Abrindo ZIP...")
    with zipfile.ZipFile(ARQUIVO_ZIP, "r") as z:
        nome_csv = z.namelist()[0]
        print(f"  Arquivo interno: {nome_csv}")

        print("  Lendo e filtrando Salvador (pode demorar 1-2 min)...")
        chunks = pd.read_csv(
            z.open(nome_csv),
            sep=";",
            encoding="latin1",
            header=None,
            names=COLUNAS,
            dtype=str,
            chunksize=50000
        )

        df_salvador = []
        total_lido = 0
        for chunk in chunks:
            total_lido += len(chunk)
            filtrado = chunk[
                (chunk["uf"] == UF_FILTRO) &
                (chunk["municipio"] == MUN_FILTRO) &
                (chunk["situacao_cadastral"] == "02")  # 02 = Ativa
            ]
            if len(filtrado) > 0:
                df_salvador.append(filtrado)
            if total_lido % 500000 == 0:
                print(f"  {total_lido:,} linhas lidas...")

        if not df_salvador:
            print("  Nenhum registro encontrado nesse arquivo.")
            return None

        df = pd.concat(df_salvador, ignore_index=True)
        print(f"  {len(df)} empresas ativas em Salvador encontradas.")
        return df

def atribuir_coords_bairro(bairro):
    """Coordenadas aproximadas por bairro para empresas sem geocode."""
    mapa = {
        "PITUBA": (-12.9989, -38.4724), "BARRA": (-13.0089, -38.5324),
        "CENTRO": (-12.9714, -38.5124), "ITAIGARA": (-12.9889, -38.4624),
        "CAMINHO DAS ARVORES": (-12.9789, -38.4524), "RIO VERMELHO": (-13.0089, -38.4924),
        "BROTAS": (-12.9589, -38.4924), "LIBERDADE": (-12.9489, -38.5124),
        "CAJAZEIRAS": (-12.9089, -38.3924), "TANCREDO NEVES": (-12.9589, -38.4324),
        "NORDESTE DE AMARALINA": (-13.0089, -38.4624), "ONDINA": (-13.0189, -38.5124),
        "GARCIA": (-12.9789, -38.5024), "FEDERACAO": (-12.9889, -38.5024),
        "NAZARE": (-12.9689, -38.5224), "COMERCIO": (-12.9614, -38.5124),
        "IMBUÍ": (-12.9389, -38.3924), "ITAPUA": (-12.9789, -38.3524),
        "STELLA MARIS": (-12.9589, -38.3424), "PATAMARES": (-12.9489, -38.3624),
        "SUSSUARANA": (-12.9289, -38.4224), "SAO CAETANO": (-12.9389, -38.4724),
        "PAU DA LIMA": (-12.9089, -38.4124), "VALERIA": (-12.8989, -38.4324),
        "SUBURBIO FERROVIARIO": (-12.9114, -38.5224), "BONFIM": (-12.9314, -38.5024),
    }
    if bairro and isinstance(bairro, str):
        bairro_up = bairro.upper().strip()
        for k, v in mapa.items():
            if k in bairro_up:
                return v
    return (-12.9714, -38.5124)  # fallback: centro de Salvador

def salvar_empresas(df):
    conn = psycopg2.connect(os.getenv("DATABASE_URL"))
    print("\nSalvando empresas no banco...")
    salvos = 0
    ignorados = 0

    for _, row in df.iterrows():
        cur = conn.cursor()
        try:
            lat, lng = atribuir_coords_bairro(row.get("bairro"))
            h3_index = h3.latlng_to_cell(lat, lng, 8)
            cnpj_completo = str(row["cnpj_basico"]) + str(row["cnpj_ordem"]) + str(row["cnpj_dv"])

            cur.execute("""
                INSERT INTO convergeo.empresas
                    (h3_index, cnpj, cnae_principal, nome_fantasia, situacao, lat, lng,
                     geom)
                VALUES (%s, %s, %s, %s, %s, %s, %s,
                        ST_SetSRID(ST_MakePoint(%s, %s), 4326))
                ON CONFLICT DO NOTHING
            """, (
                h3_index, cnpj_completo,
                str(row["cnae_principal"])[:10],
                str(row["nome_fantasia"])[:200],
                str(row["situacao_cadastral"]),
                lat, lng, lng, lat
            ))
            conn.commit()
            salvos += 1
            if salvos % 1000 == 0:
                print(f"  {salvos} empresas salvas...")
        except Exception as e:
            conn.rollback()
            ignorados += 1
        finally:
            cur.close()

    conn.close()
    print(f"\nConcluído! {salvos} empresas salvas, {ignorados} ignoradas.")

if __name__ == "__main__":
    df = processar_zip()
    if df is not None:
        print(f"\nCNAEs mais frequentes:")
        print(df["cnae_principal"].value_counts().head(10).to_string())
        salvar_empresas(df)