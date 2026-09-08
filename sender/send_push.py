import argparse
import json
from pathlib import Path

from pywebpush import webpush


SENDER_DIRECTORY = Path(__file__).parent
SUBSCRIPTION_FILE = SENDER_DIRECTORY / "subscription.json"
PRIVATE_KEY_FILE = SENDER_DIRECTORY / "private_key.pem"

parser = argparse.ArgumentParser()
parser.add_argument(
    "restaurant_id",
    choices=[f"restaurant-{number}" for number in range(1, 11)],
)
arguments = parser.parse_args()

with SUBSCRIPTION_FILE.open(encoding="utf-8") as file:
    subscription = json.load(file)

payload = {
    "title": "Restaurante destacado",
    "body": "Abre la aplicación para ver la recomendación",
    "url": f"./?restaurant={arguments.restaurant_id}",
}

# TODO: invocar webpush() con la suscripción, el payload y la clave privada.
