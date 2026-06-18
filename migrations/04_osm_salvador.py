import requests
import psycopg2
import h3
import os
from dotenv import load_dotenv

load_dotenv()

# Overpass API — busca POIs comerciais de Salvador
OVERPASS_URL = "https://overpass.kumi.systems/api/interpreter"


QUERY = """
[out:json][timeout:120];
area["name"="Salvador"]["boundary"="administrative"]["admin_level"="8"]->.salvador;
(
  node["shop"](area.salvador);
  node["amenity"~"restaurant|cafe|pharmacy|hospital|clinic|bank|school|fuel"](area.salvador);
  node["office"](area.salvador);
);
out body;
"""

def buscar_osm():
    print("Buscando POIs do OpenStreetMap para Salvador...")
    resp = requests.post(OVERPASS_URL, data={"data": QUERY}, timeout=180)
    resp.raise_for_status()
    data = resp.json()
    elementos = data.get("elements", [])
    print(f"  {len(elementos)} POIs encontrados.")
    return elementos

def salvar_osm(elementos):
    conn = psycopg2.connect(os.getenv("DATABASE_URL"))
    print("\nSalvando POIs no banco...")

    # Cria tabela OSM se não existir
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS convergeo.osm_pois (
            id            BIGINT PRIMARY KEY,
            h3_index      VARCHAR(20) REFERENCES convergeo.hexagonos(h3_index),
            tipo          VARCHAR(50),
            subtipo       VARCHAR(100),
            nome          VARCHAR(200),
            lat           NUMERIC,
            lng           NUMERIC,
            geom          GEOMETRY(POINT, 4326)
        );
        CREATE INDEX IF NOT EXISTS idx_osm_h3   ON convergeo.osm_pois (h3_index);
        CREATE INDEX IF NOT EXISTS idx_osm_tipo ON convergeo.osm_pois (tipo);
        CREATE INDEX IF NOT EXISTS idx_osm_geom ON convergeo.osm_pois USING GIST (geom);
    """)
    conn.commit()
    cur.close()

    salvos = 0
    ignorados = 0
    for el in elementos:
        cur = conn.cursor()
        try:
            lat = el.get("lat")
            lng = el.get("lon")
            if not lat or not lng:
                continue

            tags = el.get("tags", {})
            tipo    = next((k for k in ["shop","amenity","office"] if k in tags), "outro")
            subtipo = tags.get(tipo, "")
            nome    = tags.get("name", "")
            h3_idx  = h3.latlng_to_cell(float(lat), float(lng), 8)

            cur.execute("""
                INSERT INTO convergeo.osm_pois
                    (id, h3_index, tipo, subtipo, nome, lat, lng, geom)
                VALUES (%s, %s, %s, %s, %s, %s, %s,
                        ST_SetSRID(ST_MakePoint(%s, %s), 4326))
                ON CONFLICT (id) DO NOTHING
            """, (
                el["id"], h3_idx, tipo, subtipo, nome,
                lat, lng, lng, lat
            ))
            conn.commit()
            salvos += 1
        except Exception as e:
            conn.rollback()
            ignorados += 1
        finally:
            cur.close()

    conn.close()
    print(f"Concluído! {salvos} POIs salvos, {ignorados} ignorados.")

if __name__ == "__main__":
    elementos = buscar_osm()
    if elementos:
        salvar_osm(elementos)