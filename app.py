import os
import logging
from flask import Flask, render_template, request, jsonify
import g4f
from g4f.client import Client
import os
import logging
from flask import Flask, render_template, request, jsonify
import g4f
from g4f.client import Client


# Configure logging

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
from flask import make_response

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        # Retrieve data from the request
        data = request.json
        messages = data.get('messages', [])
        model = data.get('model', 'gpt-4o-mini')

        # Add system prompt
        system_prompt = {
            "role": "system",
            "content": "You are Orion, a helpful AI assistant. You provide accurate, informative, and friendly responses while keeping them concise and relevant. You were made by Abdullah Ali, who is 13 years old."
        }

        # Insert system prompt at the beginning if not already present
        if not messages or messages[0].get('role') != 'system':  # Fixed this part to ensure the check is correct
            messages.insert(0, system_prompt)

        # Log the request for debugging
        logger.debug(f"Sending request to g4f with model: {model} and messages: {messages}")

        # Call the g4f API to get the response
        response = client.chat.completions.create(model=model,
                                                  messages=messages,
                                                  web_search=False)

        # Extract the AI's response from the API response
        ai_response = response.choices[0].message.content
        logger.debug(f"Received response from g4f: {ai_response}")

        # Return the response to the client
        return make_response(jsonify({'status': 'success', 'message': ai_response}), 200)
    
    except Exception as e:
        # Log the error for debugging
        logger.error(f"Error in chat endpoint: {str(e)}")

        # Ensure the error response is valid JSON
        error_message = f"An error occurred: {str(e)}"
        
        # Return a JSON error response
        return make_response(jsonify({'status': 'error', 'message': error_message}), 500)


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
