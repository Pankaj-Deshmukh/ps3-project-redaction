
import os
from flask import Flask, request, jsonify, send_file
import fitz  # PyMuPDF
from flask_cors import CORS
from io import BytesIO
import pdfplumber
import tempfile
import requests
import json
import ast
app = Flask(__name__)
CORS(app)


def combine_entity_tokens(entities):
    """
    Combines tokens for each entity type into a single string.
    Args:
        entities (List[Dict]): List of dictionaries with 'entity' and 'token' keys.
    Returns:
        Dict[str, str]: A dictionary with entity types as keys and their combined token strings as values.
    """
    combined = {}
    current_entity = None
    current_tokens = []

    for entry in entities:
        entity = entry["entity"]
        # Replace special token prefix with a space
        token = entry["token"].replace("▁", " ")

        if entity == current_entity:
            current_tokens.append(token)
        else:
            # Store the current entity tokens in the dictionary
            if current_entity:
                combined[current_entity] = combined.get(
                    current_entity, "") + "".join(current_tokens).strip() + " "
            # Reset for the new entity
            current_entity = entity
            current_tokens = [token]

    # Add the last processed entity
    if current_entity:
        combined[current_entity] = combined.get(
            current_entity, "") + "".join(current_tokens).strip()

    # Clean up whitespace in the final strings
    for key in combined:
        combined[key] = combined[key].strip()

    return combined


def detect_personal_information(text):
    """
    Detects personal information in the input text using the tokenizer and model.
    Args:
        text (str): The input text to analyze.
    Returns:
        List[Dict]: A list of dictionaries containing the detected entity, its type, and the span of the text.
    """
    # Tokenize the input text
    inputs = tokenizer(text, return_tensors="pt",
                       truncation=True, padding=True)

    # Perform inference
    with torch.no_grad():
        outputs = model(**inputs).logits

    # Get the predicted token classifications
    predictions = torch.argmax(outputs, dim=2)

    # Decode predictions and input tokens
    tokens = tokenizer.convert_ids_to_tokens(inputs["input_ids"][0])
    labels = [model.config.id2label[label_id.item()]
              for label_id in predictions[0]]

    # Extract detected entities
    entities = []
    for token, label in zip(tokens, labels):
        if label != "O":  # "O" typically means no entity detected
            entities.append({"token": token, "entity": label})

    return entities


# Helper function to extract word bounding boxes and store them in a dictionary
def extract_word_bboxes_and_store_in_dict(pdf_path):
    doc = fitz.open(pdf_path)

    # Dictionary to store the word and corresponding list of bounding boxes
    word_bboxes_dict = {}

    # Iterate through all pages in the PDF
    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        # Extract words with their bounding boxes
        words = page.get_text("words")

        # Iterate through each word and its bounding box
        for word in words:
            x0, y0, x1, y1, text, font_size, font_flags, is_bold = word  # Unpack all 8 values

            # Normalize word to lowercase to store uniformly
            normalized_word = text.lower()

            # Store the bounding box in the dictionary
            if normalized_word in word_bboxes_dict:
                word_bboxes_dict[normalized_word].append((x0, y0, x1, y1))
            else:
                word_bboxes_dict[normalized_word] = [(x0, y0, x1, y1)]

    return word_bboxes_dict

# Redact words from the PDF based on the bounding box


def redact_words_in_pdf(pdf_path, output_pdf_path, words_to_redact):
    # Extract word bounding boxes and store them in a dictionary
    word_bboxes_dict = extract_word_bboxes_and_store_in_dict(pdf_path)

    # Open the PDF
    doc = fitz.open(pdf_path)

    # Iterate through all pages in the PDF
    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        # Extract words with their bounding boxes
        words = page.get_text("words")

        # Iterate through each word and its bounding box
        for word in words:
            x0, y0, x1, y1, text, font_size, font_flags, is_bold = word  # Unpack all 8 values

            # Normalize the word for case-insensitive matching
            normalized_word = text.lower()

            # Check if the word is in the list of words to redact
            if normalized_word in words_to_redact:
                # Draw a black rectangle (redaction) over the word's bounding box
                page.draw_rect([x0, y0, x1, y1], color=(
                    0, 0, 0), fill=True)  # Black fill to redact
                # Remove the underlying text to ensure it's no longer selectable or visible
                # Add redaction annotation
                page.add_redact_annot([x0, y0, x1, y1])

        # Apply all redactions on this page
        page.apply_redactions()

    # Save the modified PDF with redactions
    doc.save(output_pdf_path)
    print(f"Redacted PDF saved to: {output_pdf_path}")
    return word_bboxes_dict

# Extract the text from the PDF


def extract_text_from_pdf(pdf_path):
    pages_text = []  # Array to hold text from each page

    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text()  # Extract text from the page
            if text:
                # Append the entire page text as a string
                pages_text.append(text)

    return pages_text, "\n".join(pages_text)


def redact_pdf(input_pdf, output_pdf, words_to_redact):
    # Open the input PDF
    pdf_document = fitz.open(input_pdf)

    for page_number in range(len(pdf_document)):
        page = pdf_document[page_number]

        # Search for each word to redact
        for word in words_to_redact:
            text_instances = page.search_for(word)

            for inst in text_instances:
                # Draw a rectangle over the word (filled with gray)
                page.draw_rect(inst, color=(0.5, 0.5, 0.5),
                               fill=(0.5, 0.5, 0.5))

    # Save the redacted PDF
    pdf_document.save(output_pdf)
    pdf_document.close()


@app.route('/redact_pdf', methods=['POST'])
def redact_pdf_route():
    # Check for file and words in the request
    if 'file' not in request.files or 'words' not in request.form:
        return {"error": "File and words are required"}, 400

    pdf_file = request.files['file']
    words_to_redact = request.form.getlist('words')  # List of words to redact

    # Save the uploaded file to a temporary location
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_input:
        pdf_file.save(temp_input.name)
        input_pdf_path = temp_input.name

    # Create a temporary file for the output
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_output:
        output_pdf_path = temp_output.name

    try:
        # Perform redaction
        redact_pdf(input_pdf_path, output_pdf_path, words_to_redact)

        # Return the redacted file for download
        return send_file(output_pdf_path, as_attachment=True, download_name="redacted_output.pdf")
    except Exception as e:
        return {"error": str(e)}, 500
    finally:
        # Clean up temporary files
        os.unlink(input_pdf_path)
        if os.path.exists(output_pdf_path):
            os.unlink(output_pdf_path)


@app.route('/api/PDFpreprocess', methods=['POST'])
def process_pdf():
    file = request.files['file']

    pdf_path = "./Uploads/input_pdf.pdf"
    file.save(pdf_path)
    pages, text = extract_text_from_pdf(pdf_path)
    url = "http://127.0.0.1:11434/api/generate"

    payload = json.dumps({
        "model": "me/llama3.2-python:latest",
        "prompt": text,
        "stream": False,
        "max_tokens": 1028
    })
    headers = {
        'Content-Type': 'application/json'
    }
    response = requests.request("POST", url, headers=headers, data=payload)
    array_data = ast.literal_eval(response.json()['response'])

    return jsonify({
        "entites": array_data,
        "pages": pages
    })

    # You can optionally redact words in the PDF and return the modified file
    # output_pdf_path = './Uploads/redacted_doc.pdf'
    # words_to_redact = ['sensitive_word1', 'sensitive_word2']
    # redact_words_in_pdf(pdf_path, output_pdf_path, words_to_redact)

    # Return the redacted PDF file as response
    # return send_file(output_pdf_path, as_attachment=True, download_name="redacted_doc.pdf")


if __name__ == '__main__':
    app.run(debug=True)
