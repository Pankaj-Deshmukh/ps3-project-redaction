from flask import Flask, request, jsonify, send_file
import requests
import pytesseract
from PIL import Image
import spacy
import io
import re
from typing import List, Tuple
import numpy as np
import cv2
import os
from flask_cors import CORS
import json
import ast
app = Flask(__name__)
CORS(app)

# Download and load spaCy model
nlp = spacy.load("en_core_web_sm")

# Load pre-trained models
face_cascade = cv2.CascadeClassifier(
    cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
body_cascade = cv2.CascadeClassifier(
    cv2.data.haarcascades + 'haarcascade_fullbody.xml')

# Initialize YOLO for logo detection


def initialize_yolo():
    # Load YOLO weights and configuration
    weights_path = "yolov3.weights"  # You'll need to download this
    config_path = "yolov3.cfg"       # And this

    net = cv2.dnn.readNet(weights_path, config_path)
    layer_names = net.getLayerNames()
    output_layers = [layer_names[i - 1] for i in net.getUnconnectedOutLayers()]

    return net, output_layers


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

    # Logo detection using template matching
    # This is a simplified approach - for better logo detection,
    # you might want to use a more sophisticated method or train a custom model
    gray = cv2.cvtColor(opencv_img, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 50, 200)
    contours, _ = cv2.findContours(
        edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    for contour in contours:
        # Filter contours that might be logos (you may need to adjust these parameters)
        if cv2.contourArea(contour) > 1000 and cv2.contourArea(contour) < 50000:
            x, y, w, h = cv2.boundingRect(contour)
            aspect_ratio = float(w)/h
            # Logos often have specific aspect ratios
            if 0.5 <= aspect_ratio <= 2.0:
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
 #   url = "http://127.0.0.1:11434/api/generate"

  #  payload = json.dumps({
  #      "model": "me/llama3.2-python:latest",
   #     "prompt": text,
  #      "stream": False,
   #     "max_tokens": 1028
   # })
    # headers = {
    #    'Content-Type': 'application/json'
    # }
 #   response = requests.request("POST", url, headers=headers, data=payload)
  #  array_data = ast.literal_eval(response.json()['response'])
   # print(array_data)
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


@app.route('/redact', methods=['POST'])
def redact():
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400

        image_file = request.files['image']

        if not image_file.filename.lower().endswith(('.png', '.jpg', '.jpeg')):
            return jsonify({'error': 'Invalid file format. Only PNG, JPG, and JPEG are allowed'}), 400

        # Open image
        image = Image.open(image_file)

        # First, redact faces, humans, and logos
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


if __name__ == '__main__':
    app.run(debug=True)
