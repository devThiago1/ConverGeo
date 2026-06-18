import h3
import psycopg2
from shapely.geometry import Polygon
import os
from dotenv import load_dotenv

load_dotenv()

# Bounding box de Salvador, BA
SALVADOR_BBOX = {
    "lat_min": -13.0108,
    "lat_max": -12.7442,
    "lng_min": -38.5762,
    "lng_max": -38.2891
}

RESOLUCAO = 8  # ~0.46 km² por hexágono

def bbox_para_hexagonos(bbox, resolucao):
    """Gera todos os hexágonos H3 que cobrem o bounding box de Salvador."""
    poligono_geojson = {
        "type": "Polygon",
        "coordinates": [[
            [bbox["lng_min"], bbox["lat_min"]],
            [bbox["lng_max"], bbox["lat_min"]],
            [bbox["lng_max"], bbox["lat_max"]],
            [bbox["lng_min"], bbox["lat_max"]],
            [bbox["lng_min"], bbox["lat_min"]],
        ]]
    }
    hexagonos = h3.geo_to_cells(poligono_geojson, resolucao)
    return hexagonos

def hexagono_para_wkt(h3_index):
    """Converte um índice H3 em WKT POLYGON para o PostGIS."""
    vertices = h3.cell_to_boundary(h3_index)
    vertices = [(lng, lat) for lat, lng in vertices]
    coords = ", ".join(f"{lng} {lat}" for lng, lat in vertices)
    primeiro = f"{vertices[0][0]} {vertices[0][1]}"
    return f"POLYGON(({coords}, {primeiro}))"

def inserir_hexagonos(hexagonos):
    conn = psycopg2.connect(os.getenv("DATABASE_URL"))
    cur = conn.cursor()
    
    print(f"Inserindo {len(hexagonos)} hexágonos...")
    
    inseridos = 0
    for h3_index in hexagonos:
        wkt = hexagono_para_wkt(h3_index)
        cur.execute("""
            INSERT INTO convergeo.hexagonos (h3_index, h3_resolucao, geom)
            VALUES (%s, %s, ST_GeomFromText(%s, 4326))
            ON CONFLICT (h3_index) DO NOTHING
        """, (h3_index, RESOLUCAO, wkt))
        inseridos += 1
        if inseridos % 100 == 0:
            print(f"  {inseridos}/{len(hexagonos)} inseridos...")
            conn.commit()
    
    conn.commit()
    cur.close()
    conn.close()
    print(f"\nConcluído! {inseridos} hexágonos gravados no banco.")

if __name__ == "__main__":
    print("Gerando grade hexagonal H3 de Salvador...")
    hexagonos = bbox_para_hexagonos(SALVADOR_BBOX, RESOLUCAO)
    print(f"Total de hexágonos gerados: {len(hexagonos)}")
    inserir_hexagonos(hexagonos)