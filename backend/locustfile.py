from locust import HttpUser, task, between, SequentialTaskSet
import uuid
import random

class UserWorkflow(SequentialTaskSet):
    def on_start(self):
        """Called when a User starts executing the TaskSet"""
        self.user_id = str(uuid.uuid4())
        self.task_id = str(uuid.uuid4())

    @task
    def check_health(self):
        self.client.get("/")

    @task
    def list_rubros(self):
        self.client.get("/rubros")

    @task
    def get_credits(self):
        self.client.get(f"/api/users/{self.user_id}/credits")

    @task
    def trigger_search(self):
        payload = {
            "rubro": random.choice(["Restaurantes", "Gimnasios", "Contadores"]),
            "ciudad": "Buenos Aires",
            "user_id": self.user_id,
            "task_id": self.task_id,
            "scrapear_websites": False # Faster for load testing
        }
        with self.client.post("/buscar", json=payload, catch_response=True) as response:
            if response.status_code == 200 or response.status_code == 400:
                # 400 might be "not enough credits" which is expected in load test
                response.success()
            else:
                response.failure(f"Search failed with {response.status_code}")

    @task
    def check_progress(self):
        self.client.get(f"/buscar/progreso/{self.task_id}")

class WebsiteUser(HttpUser):
    tasks = [UserWorkflow]
    wait_time = between(1, 4)
