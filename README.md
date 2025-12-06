Complete Project v2 - Kids Zone
Structure:
 - backend/   -> FastAPI app (main.py, requirements.txt)
 - frontend/  -> index.html, kids.html, app.js, games.js, styles.css

How to run backend:
cd backend
python3 -m venv venv
source venv/bin/activate         # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000

Then open frontend/index.html in a browser (or serve it via a static server).
