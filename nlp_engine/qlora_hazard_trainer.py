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
    print("Loading Appen Disaster Response Messages dataset...")
    dataset = load_dataset("community-datasets/disaster_response_messages")
    
    def map_labels(example):
        return {"label": 1 if example['related'] == 1 else 0}
        
    dataset = dataset.map(map_labels)
    cols_to_remove = [c for c in dataset['train'].column_names if c not in ['message', 'label']]
    dataset = dataset.remove_columns(cols_to_remove)
    dataset = dataset.rename_column("message", "text")
    
    # Returning the FULL dataset as requested by the user
    return dataset

def compute_metrics(eval_pred):
    metric = evaluate.load("accuracy")
    logits, labels = eval_pred
    predictions = np.argmax(logits, axis=-1)
    return metric.compute(predictions=predictions, references=labels)

def main():
    model_name = "distilbert-base-uncased"
    output_dir = "./adapters/hazard_classifier"

    dataset = get_real_dataset()
    train_dataset = dataset["train"]
    eval_dataset = dataset["test"]

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
        num_labels=2,
        quantization_config=quantization_config,
        device_map={"": 0}
    )

    model = prepare_model_for_kbit_training(model)

    config = LoraConfig(
        r=8, 
        lora_alpha=16, 
        target_modules=["q_lin", "v_lin"], # DistilBERT attention modules
        lora_dropout=0.05,
        bias="none",
        task_type="SEQ_CLS"
    )

    model = get_peft_model(model, config)
    model.print_trainable_parameters()

    training_args = TrainingArguments(
        output_dir=output_dir,
        eval_strategy="epoch",
        learning_rate=2e-4, # Higher LR for LoRA
        per_device_train_batch_size=8,
        per_device_eval_batch_size=8,
        num_train_epochs=1,
        weight_decay=0.01,
        # Ensure fp16 for fast GPU training
        fp16=True,
        optim="paged_adamw_8bit" # Memory efficient optimizer
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
    
    print(f"Saving fine-tuned LoRA adapter to {output_dir}...")
    model.save_pretrained(output_dir)
    tokenizer.save_pretrained(output_dir)
    
    print("Running final evaluation...")
    results = trainer.evaluate()
    print("Evaluation Results:", results)

if __name__ == "__main__":
    main()
