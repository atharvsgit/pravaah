import os
import pika
import json
import requests
import logging

# Correctly import the settings object from your config file
from config import settings

# --- Set up basic logging ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Hugging Face Space fallback. Set HF_FALLBACK_URL in the env to enable.
# When unset/empty, classification short-circuits to {"hazard_type": "other"}
# instead of hitting a (frequently-asleep) HF free-tier Space.
HF_API_URL = os.getenv("HF_FALLBACK_URL", "").strip()

def classify_description_with_hf_api(description: str) -> dict:
    """
    Sends a description to the Hugging Face API for analysis and returns the result.
    If HF_FALLBACK_URL is not configured, returns {"hazard_type": "other"}.
    """
    if not HF_API_URL:
        logging.info("HF_FALLBACK_URL not set; skipping HF call and returning 'other'.")
        return {"hazard_type": "other"}

    logging.info(f"Sending description to Hugging Face API: '{description}'")

    # The HF API expects a 'query', so we'll use the user's description.
    payload = {
        "query": description,
        "limit": 5
    }

    try:
        response = requests.post(HF_API_URL, json=payload, timeout=30) # Added a timeout
        
        # Print detailed response information for debugging
        print(f"🔍 DEBUG: Response Status Code: {response.status_code}")
        print(f"🔍 DEBUG: Response Headers: {dict(response.headers)}")
        print(f"🔍 DEBUG: Response Content: {response.text}")
        
        response.raise_for_status()  # This will raise an error for bad responses (4xx or 5xx)

        logging.info("Successfully received analysis from Hugging Face API.")
        api_result = response.json()
        print(f"🔍 DEBUG: Parsed JSON Response: {api_result}")

        if api_result.get("hazardous_tweets"):
            first_hazard = api_result["hazardous_tweets"][0]
            # Prioritize NER hazard detection
            hazard_type = first_hazard.get("ner", {}).get("hazards", ["other"])[0]
            # Normalize to match your database schema (e.g., "High Waves" -> "high_waves")
            normalized_hazard = hazard_type.lower().replace(" ", "_")
            return {"hazard_type": normalized_hazard}
        else:
             logging.info("No hazardous content identified by the API.")
             return {"hazard_type": "other"}

    except requests.exceptions.RequestException as e:
        logging.error(f"Could not connect to Hugging Face API: {e}")
        print(f"🔍 DEBUG: Request Exception Details: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"🔍 DEBUG: Error Response Status: {e.response.status_code}")
            print(f"🔍 DEBUG: Error Response Text: {e.response.text}")
        return {"hazard_type": "other"} # Fallback on connection error
    except Exception as e:
        logging.error(f"An error occurred while processing the HF API response: {e}")
        return {"hazard_type": "other"} # Fallback on other errors


def post_nlp_verification(report_id: str, hazard_type: str, source: str) -> None:
    """
    POST the classification back to the FastAPI backend so the verification is
    recorded and the report's confidence score gets recalculated.

    Failures are logged but not raised — the message is still ACKed so a single
    backend hiccup doesn't park reports in the queue forever.
    """
    url = f"{settings.BACKEND_URL.rstrip('/')}/api/verifications/nlp"
    payload = {
        "report_id": report_id,
        "result_data": {"hazard_type": hazard_type, "source": source},
    }
    try:
        response = requests.post(url, json=payload, timeout=15)
        response.raise_for_status()
        logging.info(f"Posted NLP verification for report {report_id} -> {response.status_code}")
    except requests.exceptions.RequestException as e:
        logging.error(f"Failed to post NLP verification for report {report_id}: {e}")


def process_message(channel, method, properties, body):
    """
    Callback function to process a message from the reports queue.
    """
    try:
        data = json.loads(body)

        # Extract user_description and report_id directly from the message
        user_description = data.get("user_description")
        report_id = data.get("report_id")

        if not user_description or not report_id:
            logging.warning(f"Message missing 'user_description' or 'report_id'. Skipping. Body: {data}")
            channel.basic_ack(delivery_tag=method.delivery_tag)
            return

        logging.info(f"Received report {report_id} for analysis.")

        # Use the function that calls your Hugging Face API
        analysis_result = classify_description_with_hf_api(user_description)
        hazard_type = analysis_result.get("hazard_type", "other")

        logging.info(f"Analysis complete for report {report_id}. Hazard type: {hazard_type}")

        post_nlp_verification(report_id, hazard_type, source="hf_space" if HF_API_URL else "fallback")

        # Acknowledge that the message has been successfully processed
        channel.basic_ack(delivery_tag=method.delivery_tag)

    except json.JSONDecodeError:
        logging.error("Failed to decode message body.")
        channel.basic_ack(delivery_tag=method.delivery_tag)
    except Exception as e:
        logging.error(f"An unexpected error occurred: {e}", exc_info=True)
        # Negatively acknowledge the message, and don't requeue it to prevent loops
        channel.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

def start_worker():
    """
    Connects to RabbitMQ and starts consuming messages.
    """
    try:
        # Use the settings object to get the RabbitMQ URL
        connection = pika.BlockingConnection(pika.URLParameters(settings.RABBITMQ_URL))
        channel = connection.channel()

        channel.queue_declare(queue='nlp_queue', durable=True)
        logging.info('Waiting for messages in "nlp_queue". To exit press CTRL+C')

        channel.basic_qos(prefetch_count=1)
        channel.basic_consume(queue='nlp_queue', on_message_callback=process_message)

        channel.start_consuming()

    except pika.exceptions.AMQPConnectionError as e:
        logging.error(f"Failed to connect to RabbitMQ: {e}. Is it running?")
    except KeyboardInterrupt:
        logging.info("Worker stopped manually.")
    except Exception as e:
        logging.error(f"An error occurred in the worker: {e}", exc_info=True)
    finally:
        if 'connection' in locals() and connection.is_open:
            connection.close()
            logging.info("RabbitMQ connection closed.")


if __name__ == '__main__':
    start_worker()