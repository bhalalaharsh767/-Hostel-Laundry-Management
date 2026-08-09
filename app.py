from flask import Flask, send_from_directory, request, jsonify
import os, json
from datetime import datetime

app = Flask(__name__, static_folder='.')

DATA_FILE = 'laundry_data.json'

def get_today_str():
    return datetime.now().strftime("%Y-%m-%d")

def get_default_data():
    return {
        "date": get_today_str(),
        "students": {
            "Ronit": {"pant": 0, "shirt": 0, "tshirt": 0, "track": 0, "towel": 0, "saved": False, "savedAt": ""},
            "Raj": {"pant": 0, "shirt": 0, "tshirt": 0, "track": 0, "towel": 0, "saved": False, "savedAt": ""},
            "Harsh": {"pant": 0, "shirt": 0, "tshirt": 0, "track": 0, "towel": 0, "saved": False, "savedAt": ""},
            "Preet": {"pant": 0, "shirt": 0, "tshirt": 0, "track": 0, "towel": 0, "saved": False, "savedAt": ""},
            "Meet": {"pant": 0, "shirt": 0, "tshirt": 0, "track": 0, "towel": 0, "saved": False, "savedAt": ""}
        }
    }

def load_data():
    today_str = get_today_str()
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, 'r') as f:
                data = json.load(f)
                # Check if data belongs to today; if date changed, auto reset for new day!
                if data.get("date") == today_str and "students" in data:
                    return data
        except Exception:
            pass

    # Auto Reset for New Day
    default_data = get_default_data()
    save_data(default_data)
    return default_data

def save_data(data):
    with open(DATA_FILE, 'w') as f:
        json.dump(data, f, indent=2)

@app.route('/api/laundry', methods=['GET'])
def get_laundry():
    return jsonify(load_data())

@app.route('/api/laundry/save-row', methods=['POST'])
def save_row():
    req = request.json or {}
    student_name = req.get('name')
    if not student_name:
        return jsonify({"error": "Missing student name"}), 400
    
    data = load_data()
    today_str = get_today_str()
    data["date"] = today_str

    if "students" not in data:
        data["students"] = get_default_data()["students"]

    data["students"][student_name] = {
        "pant": req.get('pant', 0),
        "shirt": req.get('shirt', 0),
        "tshirt": req.get('tshirt', 0),
        "track": req.get('track', 0),
        "towel": req.get('towel', 0),
        "saved": True,
        "savedAt": req.get('savedAt', '')
    }
    save_data(data)
    return jsonify({"success": True, "data": data})

@app.route('/api/laundry/reset', methods=['POST'])
def reset_laundry():
    data = get_default_data()
    save_data(data)
    return jsonify({"success": True, "data": data})

@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8085))
    app.run(host='0.0.0.0', port=port)
