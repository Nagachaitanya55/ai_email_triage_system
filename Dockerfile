# ---------- Stage 1: Build Frontend ----------
FROM node:20 AS frontend

WORKDIR /app

COPY package*.json ./

RUN rm -rf node_modules package-lock.json
RUN npm install

COPY . .
RUN npm run build


# ---------- Stage 2: Backend ----------
FROM python:3.10

WORKDIR /app

COPY . .

# Copy built frontend
COPY --from=frontend /app/dist ./dist

RUN pip install --no-cache-dir -r requirements.txt

EXPOSE 7860

CMD ["python", "app.py"]
