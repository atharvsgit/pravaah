import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer, pipeline, BitsAndBytesConfig
from peft import PeftModel

print("Loading Hazard Classifier Adapter for Test...")

quantization_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_compute_dtype=torch.float16,
    bnb_4bit_quant_type="nf4",
    llm_int8_skip_modules=["pre_classifier", "classifier"]
)

model_name = "distilbert-base-uncased"
hazard_path = "./adapters/hazard_classifier"

base_model = AutoModelForSequenceClassification.from_pretrained(
    model_name, num_labels=2, quantization_config=quantization_config, device_map={"": 0}
)
model = PeftModel.from_pretrained(base_model, hazard_path)
tokenizer = AutoTokenizer.from_pretrained(model_name)

pipe = pipeline("text-classification", model=model, tokenizer=tokenizer)

test_sentences = [
    "Huge waves are crashing over the seawall in Puri, people are evacuating!",
    "Just had a nice coffee by the beach.",
    "The cyclone is making landfall tonight, shelter immediately.",
]

print("\n--- Inference Results ---")
for text in test_sentences:
    res = pipe(text)[0]
    print(f"Text: {text}")
    print(f"Prediction: {res['label']} (Score: {res['score']:.4f})\n")
