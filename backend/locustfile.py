from locust import HttpUser, task, between

class WebsiteUser(HttpUser):
    wait_time = between(1, 5)

    @task
    def health_check(self):
        self.client.get("/")

    @task
    def get_rubros(self):
        self.client.get("/rubros")
