import os
from flask import Flask, request, jsonify, send_file
import fitz  # PyMuPDF
from flask_cors import CORS
import pdfplumber
import spacy
from PIL import Image
import cv2
import numpy as np
import pytesseract
import io
from typing import List, Tuple
import tempfile

app = Flask(__name__)
CORS(app)

# Load spaCy model
nlp = spacy.load("en_core_web_sm")

# Load pre-trained cascades for face and body detection
face_cascade = cv2.CascadeClassifier(
    cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
body_cascade = cv2.CascadeClassifier(
    cv2.data.haarcascades + 'haarcascade_fullbody.xml')


def detect_and_redact_objects(image):
    """
    Detect and redact faces, human figures, and logos in the image
    """
    # Convert PIL Image to OpenCV format
    opencv_img = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
    gray = cv2.cvtColor(opencv_img, cv2.COLOR_BGR2GRAY)

    # Detect faces
    faces = face_cascade.detectMultiScale(
        gray,
        scaleFactor=1.1,
        minNeighbors=5,
        minSize=(30, 30)
    )

    # Detect bodies
    bodies = body_cascade.detectMultiScale(
        gray,
        scaleFactor=1.1,
        minNeighbors=5,
        minSize=(30, 30)
    )

    # Redact detected faces
    for (x, y, w, h) in faces:
        cv2.rectangle(opencv_img, (x, y), (x+w, y+h), (0, 0, 0), -1)

    # Redact detected bodies
    for (x, y, w, h) in bodies:
        cv2.rectangle(opencv_img, (x, y), (x+w, y+h), (0, 0, 0), -1)

    # Convert back to PIL Image
    redacted_image = Image.fromarray(
        cv2.cvtColor(opencv_img, cv2.COLOR_BGR2RGB))
    return redacted_image


def perform_ocr(image) -> str:
    """
    Perform OCR on the input image
    """
    try:
        text = pytesseract.image_to_string(image)
        return text
    except Exception as e:
        raise Exception(f"OCR failed: {str(e)}")


def get_entities_for_redaction(text: str) -> List[Tuple[str, int, int]]:
    """
    Extract named entities from text using spaCy
    """
    doc = nlp(text)
    entities = []
    for ent in doc.ents:
        entities.append((ent.text, ent.start_char, ent.end_char))
    return entities


def redact_text_in_image(image, text: str, entities: List[Tuple[str, int, int]]):
    """
    Redact text entities in the image
    """
    opencv_img = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
    d = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)

    for i, word in enumerate(d['text']):
        for entity_text, _, _ in entities:
            if word and word in entity_text:
                x = d['left'][i]
                y = d['top'][i]
                w = d['width'][i]
                h = d['height'][i]
                cv2.rectangle(opencv_img, (x, y),
                              (x + w, y + h), (0, 0, 0), -1)

    return Image.fromarray(cv2.cvtColor(opencv_img, cv2.COLOR_BGR2RGB))


def extract_text_from_pdf(pdf_path: str) -> tuple[List[str], str]:
    """
    Extract text from PDF file
    Returns: Tuple of (list of page texts, combined text)
    """
    pages_text = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                pages_text.append(text)

    return pages_text, "\n".join(pages_text)


def redact_pdf(input_pdf: str, output_pdf: str, words_to_redact: List[str]):
    """
    Redact specified words from PDF
    """
    pdf_document = fitz.open(input_pdf)

    for page_number in range(len(pdf_document)):
        page = pdf_document[page_number]
        for word in words_to_redact:
            text_instances = page.search_for(word)
            for inst in text_instances:
                page.draw_rect(inst, color=(0, 0, 0), fill=(0, 0, 0))

    pdf_document.save(output_pdf)
    pdf_document.close()


@app.route('/api/redact_image', methods=['POST'])
def redact_image():
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400

        image_file = request.files['image']
        if not image_file.filename.lower().endswith(('.png', '.jpg', '.jpeg')):
            return jsonify({'error': 'Invalid file format. Only PNG, JPG, and JPEG are allowed'}), 400

        # Open and process image
        image = Image.open(image_file)

        # First, redact faces and humans
        image = detect_and_redact_objects(image)

        # Then perform OCR and redact text entities
        extracted_text = perform_ocr(image)
        entities = get_entities_for_redaction(extracted_text)
        final_redacted_image = redact_text_in_image(
            image, extracted_text, entities)

        # Save redacted image to bytes
        img_byte_arr = io.BytesIO()
        final_redacted_image.save(img_byte_arr, format=image.format or 'PNG')
        img_byte_arr.seek(0)

        return send_file(
            img_byte_arr,
            mimetype='image/png',
            as_attachment=True,
            download_name='redacted_image.png'
        )

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/redact_pdf', methods=['POST'])
def redact_pdf_route():
    if 'file' not in request.files or 'words' not in request.form:
        return jsonify({"error": "File and words are required"}), 400

    pdf_file = request.files['file']
    words_to_redact = request.form.getlist('words')

    # Create temporary files
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_input:
        pdf_file.save(temp_input.name)
        input_pdf_path = temp_input.name

    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_output:
        output_pdf_path = temp_output.name

    try:
        # Perform redaction
        redact_pdf(input_pdf_path, output_pdf_path, words_to_redact)
        return send_file(output_pdf_path, as_attachment=True, download_name="redacted_output.pdf")

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        # Clean up temporary files
        os.unlink(input_pdf_path)
        if os.path.exists(output_pdf_path):
            os.unlink(output_pdf_path)


@app.route('/api/PDFpreprocess', methods=['POST'])
def process_pdf():
    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files['file']
    if not file.filename.endswith('.pdf'):
        return jsonify({"error": "File must be a PDF"}), 400

    try:
        # Save uploaded file
        pdf_path = os.path.join("Uploads", "input_pdf.pdf")
        os.makedirs("Uploads", exist_ok=True)
        file.save(pdf_path)

        # Extract text and process entities
        pages, full_text = extract_text_from_pdf(pdf_path)
        doc = nlp(full_text)
        entities = list(set([ent.text for ent in doc.ents]))

        # Clean up
        if os.path.exists(pdf_path):
            os.remove(pdf_path)

        return jsonify({
            "entites": entities,
            "pages": pages
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True)
