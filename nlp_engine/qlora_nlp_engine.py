import os
import logging
import sys
from typing import Optional, Tuple
from pydantic import BaseModel, Field
import torch
from transformers import (
    pipeline,
    AutoModelForSequenceClassification,
    AutoModelForTokenClassification,
    AutoTokenizer,
    BitsAndBytesConfig
)
from peft import PeftModel

logging.basicConfig(
    level=logging.ERROR,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stderr)]
)
logger = logging.getLogger(__name__)

class NLPMetrics(BaseModel):
    hazard_type: str = Field(description="Detected hazard type")
    urgency_score: int = Field(description="Urgency score from 1 to 10")

class LocationData(BaseModel):
    extracted_location: str = Field(description="Location string extracted by NER")
    latitude: float = Field(description="Geocoded latitude")
    longitude: float = Field(description="Geocoded longitude")

class BackendOutputSchema(BaseModel):
    post_id: str
    is_hazard: bool
    confidence_score: float = Field(ge=0.0, le=1.0)
    nlp_metrics: Optional[NLPMetrics] = None
    location_data: Optional[LocationData] = None
    processing_status: str

class MockBhashiniAPI:
    @staticmethod
    def detect_and_translate(text: str) -> str:
        return text

class MockGeocodingAPI:
    @staticmethod
    def geocode(location_string: str) -> Tuple[float, float]:
        mock_db = {
            "chennai": (13.0827, 80.2707),
            "kochi": (9.9312, 76.2673),
            "mumbai": (18.9667, 72.8333),
            "puri": (19.8135, 85.8312),
        }
        loc_lower = location_string.lower()
        for key, coords in mock_db.items():
            if key in loc_lower:
                return coords
        return (0.0, 0.0)

class SamudraWatchNLPEngine:
    def __init__(self, 
                 hazard_model_name: str = "distilbert-base-uncased", 
                 ner_model_name: str = "distilbert-base-uncased", 
                 urgency_model_name: str = "distilbert-base-uncased"):
        try:
            self.device = 0 if torch.cuda.is_available() else -1
            
            hazard_path = "./adapters/hazard_classifier"
            ner_path = "./adapters/ner_model"
            urgency_path = "./adapters/urgency_regressor"

            quantization_config = BitsAndBytesConfig(
                load_in_4bit=True,
                bnb_4bit_compute_dtype=torch.float16,
                bnb_4bit_quant_type="nf4",
                llm_int8_skip_modules=["pre_classifier", "classifier"]
            )

            # Hazard Classifier
            if os.path.exists(hazard_path):
                logger.info("Loading PEFT Hazard Classifier...")
                base_hz = AutoModelForSequenceClassification.from_pretrained(
                    hazard_model_name, num_labels=2, quantization_config=quantization_config, device_map={"": 0}
                )
                self.hazard_model = PeftModel.from_pretrained(base_hz, hazard_path)
            else:
                self.hazard_model = AutoModelForSequenceClassification.from_pretrained(hazard_model_name, num_labels=2)
                if self.device != -1: self.hazard_model.to('cuda')
            
            self.hazard_tokenizer = AutoTokenizer.from_pretrained(hazard_model_name)
            self.hazard_pipeline = pipeline("text-classification", model=self.hazard_model, tokenizer=self.hazard_tokenizer)

            # NER Classifier
            if os.path.exists(ner_path):
                logger.info("Loading PEFT NER Model...")
                label_list = ["O", "B-PER", "I-PER", "B-ORG", "I-ORG", "B-LOC", "I-LOC", "B-MISC", "I-MISC"]
                id2label = {i: label for i, label in enumerate(label_list)}
                label2id = {label: i for i, label in enumerate(label_list)}
                base_ner = AutoModelForTokenClassification.from_pretrained(
                    ner_model_name, num_labels=len(label_list), id2label=id2label, label2id=label2id, ignore_mismatched_sizes=True, quantization_config=quantization_config, device_map={"": 0}
                )
                self.ner_model = PeftModel.from_pretrained(base_ner, ner_path)
                self.ner_tokenizer = AutoTokenizer.from_pretrained(ner_path)
            else:
                self.ner_model = AutoModelForTokenClassification.from_pretrained(ner_model_name, num_labels=len(label_list), id2label=id2label, label2id=label2id)
                self.ner_tokenizer = AutoTokenizer.from_pretrained(ner_model_name)
                if self.device != -1: self.ner_model.to('cuda')
                
            self.ner_pipeline = pipeline("token-classification", model=self.ner_model, tokenizer=self.ner_tokenizer, aggregation_strategy="simple")

            # Urgency Regressor
            if os.path.exists(urgency_path):
                logger.info("Loading PEFT Urgency Regressor...")
                base_urg = AutoModelForSequenceClassification.from_pretrained(
                    urgency_model_name, num_labels=1, quantization_config=quantization_config, device_map={"": 0}
                )
                self.urgency_model = PeftModel.from_pretrained(base_urg, urgency_path)
                self.urgency_tokenizer = AutoTokenizer.from_pretrained(urgency_path)
            else:
                self.urgency_model = AutoModelForSequenceClassification.from_pretrained(urgency_model_name, num_labels=1)
                self.urgency_tokenizer = AutoTokenizer.from_pretrained(urgency_model_name)
                if self.device != -1: self.urgency_model.to('cuda')

        except Exception as e:
            logger.error(f"Failed to initialize NLP models: {e}")
            raise RuntimeError("Engine initialization failed.") from e

    def process_message(self, post_id: str, raw_text: str) -> str:
        try:
            english_text = MockBhashiniAPI.detect_and_translate(raw_text)
            
            hazard_result = self.hazard_pipeline(english_text)[0]
            is_hazard = hazard_result['label'] in ['LABEL_1', 'POSITIVE']
            confidence_score = min(max(float(hazard_result['score']), 0.0), 1.0)
            
            if not is_hazard:
                return self._build_payload(post_id, False, confidence_score)

            ner_results = self.ner_pipeline(english_text)
            extracted_loc = "Unknown Coastal Location"
            disaster_type = "Unspecified Coastal Hazard"
            
            for entity in ner_results:
                if 'LOC' in entity['entity_group']:
                    extracted_loc = entity['word']
                elif 'DIS' in entity['entity_group']:
                    disaster_type = entity['word']
                elif 'ORG' in entity['entity_group'] or 'MISC' in entity['entity_group']:
                    disaster_type = entity['word']

            inputs = self.urgency_tokenizer(english_text, return_tensors="pt", truncation=True, padding=True)
            if self.device != -1:
                inputs = {k: v.to('cuda') for k, v in inputs.items()}
                
            with torch.no_grad():
                outputs = self.urgency_model(**inputs)
                urgency_raw = outputs.logits.squeeze().item()
                urgency_score = int(max(1, min(10, round(abs(urgency_raw) * 10))))

            lat, lon = MockGeocodingAPI.geocode(extracted_loc)
            
            nlp_metrics = NLPMetrics(hazard_type=disaster_type, urgency_score=urgency_score)
            location_data = LocationData(extracted_location=extracted_loc, latitude=lat, longitude=lon)
            
            return self._build_payload(post_id, True, confidence_score, nlp_metrics, location_data)
            
        except Exception as e:
            logger.error(f"Inference exception for post_id '{post_id}': {str(e)}")
            return self._build_payload(post_id, False, 0.0, status="Failed")

    def _build_payload(self, post_id: str, is_hazard: bool, confidence_score: float, nlp_metrics: Optional[NLPMetrics] = None, location_data: Optional[LocationData] = None, status: str = "Success") -> str:
        payload = BackendOutputSchema(
            post_id=post_id, is_hazard=is_hazard, confidence_score=confidence_score,
            nlp_metrics=nlp_metrics, location_data=location_data, processing_status=status
        )
        return payload.model_dump_json(indent=2)

if __name__ == "__main__":
    print("Initializing QLoRA SamudraWatch NLP Engine...")
    engine = SamudraWatchNLPEngine()
    
    print("\n--- Test Case 1: Valid Hazard ---")
    payload_valid = engine.process_message(
        post_id="msg_909",
        raw_text="Massive tsunami waves hitting Chennai coast! Immediate rescue operations needed."
    )
    print(payload_valid)
    
    print("\n--- Test Case 2: Non-Hazard ---")
    payload_invalid = engine.process_message(
        post_id="msg_910",
        raw_text="The sunset at the beach was beautiful today."
    )
    print(payload_invalid)
