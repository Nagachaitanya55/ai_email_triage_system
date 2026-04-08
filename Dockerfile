FROM python:3.10

WORKDIR /app

COPY . .

RUN pip install fastapi uvicorn pydantic

EXPOSE 7860

CMD ["python", "app.py"]
