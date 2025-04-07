import os
import logging
from flask import Flask, render_template, request, jsonify
import g4f
from g4f.client import Client

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Create Flask app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "default_secret_key")

# Initialize g4f client
client = Client()


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        messages = data.get('messages', [])
        model = data.get('model', 'gpt-4o-mini')

        # Add system prompt
        system_prompt = {
            "role":
            "system",
            "content":
            "You are orion helpful AI assistant. You provide accurate, informative, and friendly responses while keeping them concise and relevant and you are make by Abdullah ali who is 13 years old and teach by sir gibran "
        }

        # Insert system prompt at the beginning if not already present
        if not messages or messages[0].get('role') != 'system':
            messages.insert(0, system_prompt)

        logger.debug(
            f"Sending request to g4f with model: {model} and messages: {messages}"
        )

        # Call the g4f API
        response = client.chat.completions.create(model=model,
                                                  messages=messages,
                                                  web_search=False)

        ai_response = response.choices[0].message.content
        logger.debug(f"Received response from g4f: {ai_response}")

        return jsonify({'status': 'success', 'message': ai_response})
    except Exception as e:
        logger.error(f"Error in chat endpoint: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f"An error occurred: {str(e)}"
        }), 500


@app.route('/api/conversations/<conversation_id>', methods=['DELETE'])
def delete_conversation(conversation_id):
    try:
        return jsonify({'status': 'success', 'message': f'Conversation {conversation_id} deleted'})
    except Exception as e:
        logger.error(f"Error deleting conversation: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f"An error occurred: {str(e)}"
        }), 500

@app.route('/api/models', methods=['GET'])
def get_models():
    try:
        # Return a list of available models
        # You can customize this list based on what g4f supports
        models = [{
            "id": "gpt-4o-mini",
            "name": "GPT-4o"
        }, {
            "id": "gpt-3.5-turbo",
            "name": "GPT-3.5 Turbo"
        }, {
            "id": "claude-instant",
            "name": "Claude Instant"
        }, {
            "id": "gemini-pro",
            "name": "Gemini Pro"
        }]
        return jsonify({'status': 'success', 'models': models})
    except Exception as e:
        logger.error(f"Error in models endpoint: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f"An error occurred: {str(e)}"
        }), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
