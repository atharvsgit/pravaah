import os
import evaluate
import numpy as np
import torch
from datasets import Dataset, load_dataset
from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification,
    TrainingArguments,
    Trainer,
    BitsAndBytesConfig
)
from peft import prepare_model_for_kbit_training, LoraConfig, get_peft_model

def get_real_dataset():
    print("Loading Appen Disaster Response Messages dataset for Urgency...")
    dataset = load_dataset("community-datasets/disaster_response_messages")
    
    def calculate_urgency(example):
        # Base score starts at 1
        score = 1
        if example['related'] == 1:
            score += 1
        if example['request'] == 1:
            score += 2
        if example['medical_help'] == 1 or example['medical_products'] == 1:
            score += 3
        if example['search_and_rescue'] == 1 or example['death'] == 1:
            score += 4
        if example['water'] == 1 or example['food'] == 1 or example['shelter'] == 1:
            score += 2
        
        # Cap score between 1 and 10
        score = min(10, max(1, score))
        return {"label": float(score)}
        
    dataset = dataset.map(calculate_urgency)
    cols_to_remove = [c for c in dataset['train'].column_names if c not in ['message', 'label']]
    dataset = dataset.remove_columns(cols_to_remove)
    dataset = dataset.rename_column("message", "text")
    return dataset

def compute_metrics(eval_pred):
    metric = evaluate.load("mse")
    logits, labels = eval_pred
    predictions = logits.squeeze()
    return metric.compute(predictions=predictions, references=labels)

def main():
    model_name = "distilbert-base-uncased"
    output_dir = "./adapters/urgency_regressor"

    print("Using MOCK dataset for rapid regression pipeline verification...")
    dataset = get_real_dataset()

    full_dataset = dataset["train"].train_test_split(test_size=0.1)
    train_dataset = full_dataset["train"]
    eval_dataset = full_dataset["test"]

    print("Tokenizing data...")
    tokenizer = AutoTokenizer.from_pretrained(model_name)

    def tokenize_function(examples):
        return tokenizer(examples["text"], padding="max_length", truncation=True, max_length=128)

    tokenized_train = train_dataset.map(tokenize_function, batched=True)
    tokenized_eval = eval_dataset.map(tokenize_function, batched=True)

    print(f"Loading {model_name} in 4-bit...")
    quantization_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_compute_dtype=torch.float16,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_use_double_quant=True,
        llm_int8_skip_modules=["pre_classifier", "classifier"]
    )

    model = AutoModelForSequenceClassification.from_pretrained(
        model_name, 
        num_labels=1,
        quantization_config=quantization_config,
        device_map={"": 0}
    )

    model = prepare_model_for_kbit_training(model)

    config = LoraConfig(
        r=8, 
        lora_alpha=16, 
        target_modules=["q_lin", "v_lin"],
        lora_dropout=0.05,
        bias="none",
        task_type="SEQ_CLS"
    )

    model = get_peft_model(model, config)
    model.print_trainable_parameters()
    
    training_args = TrainingArguments(
        output_dir=output_dir,
        eval_strategy="epoch",
        learning_rate=2e-4,
        per_device_train_batch_size=4,
        per_device_eval_batch_size=4,
        num_train_epochs=3,
        weight_decay=0.01,
        fp16=True,
        optim="paged_adamw_8bit"
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized_train,
        eval_dataset=tokenized_eval,
        compute_metrics=compute_metrics,
    )

    print("Starting QLoRA training loop...")
    trainer.train()
    
    print(f"Saving fine-tuned regressor adapter to {output_dir}...")
    model.save_pretrained(output_dir)
    tokenizer.save_pretrained(output_dir)
    
    print("Running final evaluation...")
    results = trainer.evaluate()
    print("Evaluation Results:", results)

if __name__ == "__main__":
    main()
