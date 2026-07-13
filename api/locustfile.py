from locust import HttpUser, task, between
import random

class ConvergeoTester(HttpUser):
    # Simula o tempo que um utilizador real demora a pensar/arrastar o mapa (entre 1 e 3 segundos)
    wait_time = between(1, 3)

    @task
    def requisitar_score_aleatorio(self):
        lat = round(random.uniform(-13.0100, -12.9600), 4)
        lng = round(random.uniform(-38.5200, -38.4500), 4)
        
        segmentos = ["food_service", "farmacia", "vestuario", "clinica"]
        segmento = random.choice(segmentos)
        
        self.client.get(
            f"/score?lat={lat}&lng={lng}&segmento={segmento}", 
            name="/score (Cliques Aleatórios no Mapa)"
        )