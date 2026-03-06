import os
import requests
import json
from datetime import datetime, timedelta

# Borzo API endpoint (v1.6 Business API)
BORZO_API_URL = "https://robot.borzodelivery.com/api/business/1.6"

def get_borzo_headers():
    token = os.getenv("BORZO_API_TOKEN", "")
    return {
        "X-DV-Auth-Token": token,
        "Content-Type": "application/json"
    }

def calculate_order_price(pickup_address, delivery_address, weight_kg=1):
    """
    Estimates the delivery cost for a prospective order.
    """
    url = f"{BORZO_API_URL}/calculate-order"
    
    payload = {
        "matter": "Standard Apparel Delivery",
        "points": [
            {
                "address": pickup_address,
                "note": "Pickup from U.S ATELIER warehouse."
            },
            {
                "address": delivery_address,
                "note": "Deliver to customer."
            }
        ]
    }
    
    response = requests.post(url, headers=get_borzo_headers(), json=payload)
    if response.status_code == 200:
        return response.json().get("order", {}).get("payment_amount")
    return None

def create_delivery_order(order_id, pickup_address, delivery_address, customer_phone, customer_name, items_description="Apparel"):
    """
    Creates an actual delivery dispatch via Borzo.
    """
    url = f"{BORZO_API_URL}/create-order"
    
    payload = {
        "matter": items_description,
        "points": [
            {
                "address": pickup_address,
                "contact_person": {
                    "phone": os.getenv("STORE_PHONE", "9999999999"),
                    "name": "U.S ATELIER Dispatch"
                },
                "note": f"Pickup for Order #{order_id}"
            },
            {
                "address": delivery_address,
                "contact_person": {
                    "phone": customer_phone,
                    "name": customer_name
                },
                "note": "Please call customer upon arrival."
            }
        ]
    }
    
    try:
        response = requests.post(url, headers=get_borzo_headers(), json=payload)
        response_data = response.json()
        
        if response.status_code == 200 and response_data.get("is_successful"):
            order_info = response_data.get("order", {})
            return {
                "success": True,
                "borzo_order_id": order_info.get("order_id"),
                "delivery_fee": order_info.get("payment_amount"),
                "tracking_url": order_info.get("tracking_url")
            }
        else:
            return {
                "success": False,
                "error": response_data.get("parameter_errors", response_data.get("errors", ["Failed to create Borzo order."]))
            }
    except Exception as e:
        return {"success": False, "error": str(e)}

def get_order_status(borzo_order_id):
    """
    Fetches the latest tracking information for an existing Borzo delivery.
    """
    url = f"{BORZO_API_URL}/order"
    
    payload = {
        "order_id": borzo_order_id
    }
    
    response = requests.post(url, headers=get_borzo_headers(), json=payload)
    if response.status_code == 200:
        return response.json().get("order")
    return None
