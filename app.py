import gradio as gr
from inference import query

def triage_email(content):
    return query(f"Triage this email: {content}")

demo = gr.Interface(
    fn=triage_email,
    inputs=gr.Textbox(label="Email Content"),
    outputs=gr.Textbox(label="Triage Result"),
    title="Email Triage AI"
)

if __name__ == "__main__":
    demo.launch(server_name="0.0.0.0", server_port=7860)
