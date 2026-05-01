"""
Weather worker implementation using the base worker class.
"""
import asyncio
import os
import httpx
from typing import Dict, Any, Tuple, Optional
from app.workers.base_worker import BaseWorker
from app.core.config import settings

# Use environment variable for API URL, fallback to production URL
BACKEND_API_URL = os.getenv("VITE_API_BASE_URL", "https://pravaah-backend-9w97.onrender.com")

class WeatherWorker(BaseWorker):
    """
    Weather verification worker that checks weather conditions against user reports.
    """
    
    def __init__(self):
        super().__init__("weather")
        self.rules = {
            "Storm Surge": {"min_wind_kph": 50},
            "High Waves / Swell": {"min_wind_kph": 30},
            "Coastal Flooding": {"min_precip_mm": 5.0},
        }
    
    async def handle_message(self, message_data: Dict[str, Any]):
        """
        Process weather verification message.
        """
        report_id = message_data["report_id"]
        lat = message_data["latitude"]
        lon = message_data["longitude"]
        user_hazard_type = message_data["user_hazard_type"]

        self.logger.info(f"Processing weather check for '{user_hazard_type}' report {report_id}")
        
        weather_data = await self._get_weather_data(lat, lon)
        
        if weather_data:
            match_status, reason = self._analyze_weather_match(user_hazard_type, weather_data)
            
            verification_result = {
                "match_status": match_status,
                "reason": reason,
                "weather_api_data": weather_data
            }
            await self._submit_verification_result(report_id, verification_result)
            self.log_success("weather verification", f"report {report_id}")
        else:
            self.log_error("weather verification", Exception("Failed to fetch weather data"), f"report {report_id}")

    def _analyze_weather_match(self, user_hazard_type: str, weather_data: dict) -> Tuple[str, str]:
        """
        Compares weather data against a user's report to determine if they match.
        Returns a status ('confirmed', 'unconfirmed', 'inconclusive') and a reason.
        """
        rule = self.rules.get(user_hazard_type)

        if rule is None:
            return "inconclusive", f"No specific weather rule defined for hazard type: '{user_hazard_type}'."

        if "min_wind_kph" in rule and weather_data.get("wind_kph", 0) >= rule["min_wind_kph"]:
            return "confirmed", f"Wind speed of {weather_data['wind_kph']} kph supports the report."
        
        if "min_precip_mm" in rule and weather_data.get("precip_mm", 0) >= rule["min_precip_mm"]:
            return "confirmed", f"Precipitation of {weather_data['precip_mm']} mm supports the report."

        return "unconfirmed", "Current weather conditions do not strongly support the reported hazard."

    async def _get_weather_data(self, lat: float, lon: float) -> Optional[dict]:
        """Fetches weather data from the WeatherAPI.com API."""
        api_key = settings.WEATHERAPI_KEY
        location_query = f"{lat},{lon}"
        url = f"http://api.weatherapi.com/v1/current.json?key={api_key}&q={location_query}"
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url)
                response.raise_for_status() 
                data = response.json()["current"]
                
                return {
                    "condition": data["condition"]["text"],
                    "temp_celsius": data["temp_c"],
                    "wind_kph": data["wind_kph"],
                    "humidity_percent": data["humidity"],
                    "cloud_percent": data["cloud"],
                    "precip_mm": data["precip_mm"],
                }
            except httpx.HTTPStatusError as e:
                self.log_error("weather API request", e, f"HTTP {e.response.status_code}")
                return None
            except Exception as e:
                self.log_error("weather data fetch", e)
                return None

    async def _submit_verification_result(self, report_id: str, verification_result: dict):
        """Submits the analyzed weather data back to the main FastAPI backend."""
        endpoint_url = f"{BACKEND_API_URL}/api/verifications/weather"
        payload = {
            "report_id": report_id,
            "result_data": verification_result
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(endpoint_url, json=payload)
                response.raise_for_status()
                self.log_success("verification result submission", f"report {report_id}")
            except httpx.HTTPStatusError as e:
                self.log_error("verification submission", e, f"HTTP {e.response.status_code}")

async def main():
    """Main function to connect to RabbitMQ and start the worker."""
    worker = WeatherWorker()
    print("Starting WeatherAPI.com Worker...")
    
    from app.services.rabbitmq_service import rabbitmq_service
    await rabbitmq_service.connect()
    await rabbitmq_service.consume_messages("weather_queue", worker.process_message)
    
    print("[*] Weather worker is running and waiting for jobs...")
    try:
        await asyncio.Future()
    finally:
        await rabbitmq_service.close()

if __name__ == "__main__":
    asyncio.run(main())