/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");
const sendBtn = document.getElementById("sendBtn");

/* Cloudflare Worker URL with your Store ID */
const CLOUDFLARE_WORKER_URL = "https://lorealworker.pdgauvreau.workers.dev/";

/* Conversation history */
let conversationHistory = [];

/* L'Oréal System Prompt */
const SYSTEM_PROMPT = `You are a knowledgeable and friendly L'Oréal Beauty Advisor AI assistant. Your role is to help customers with:

1. L'Oréal product recommendations (skincare, haircare, makeup, fragrances)
2. Beauty routines and tips specific to L'Oréal products
3. Product information, ingredients, and benefits
4. Skin type and hair type consultations
5. How to use L'Oréal products effectively

Guidelines:
- Only discuss L'Oréal products and beauty topics related to L'Oréal
- Be warm, professional, and encouraging
- If asked about competitor brands, politely redirect to L'Oréal alternatives
- If asked about topics unrelated to beauty or L'Oréal, politely explain you can only help with L'Oréal beauty questions
- Provide specific product names when possible
- Ask clarifying questions to give better recommendations
- Emphasize L'Oréal's tagline spirit: "Because You're Worth It"

Remember: You represent a premium beauty brand. Be helpful, confident, and focused on making customers feel valued.`;

/* Initialize chat with welcome message */
function initializeChat() {
  addMessage(
    "ai",
    "👋 Welcome to L'Oréal Beauty Advisor! I'm here to help you find the perfect products and beauty routines tailored just for you.\n\nWhat can I help you with today? Skincare, haircare, makeup, or something else?"
  );
}

/* Add message to chat window */
function addMessage(sender, text) {
  const msgDiv = document.createElement("div");
  msgDiv.classList.add("msg", sender);
  msgDiv.textContent = text;
  chatWindow.appendChild(msgDiv);

  // Scroll to bottom
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* Show typing indicator */
function showTypingIndicator() {
  const typingDiv = document.createElement("div");
  typingDiv.classList.add("msg", "ai", "typing-indicator");
  typingDiv.id = "typingIndicator";
  typingDiv.textContent = "Thinking...";
  chatWindow.appendChild(typingDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* Remove typing indicator */
function removeTypingIndicator() {
  const indicator = document.getElementById("typingIndicator");
  if (indicator) {
    indicator.remove();
  }
}

/* Disable/enable input */
function setInputState(disabled) {
  userInput.disabled = disabled;
  sendBtn.disabled = disabled;
  if (disabled) {
    sendBtn.style.opacity = "0.6";
    sendBtn.style.cursor = "not-allowed";
  } else {
    sendBtn.style.opacity = "1";
    sendBtn.style.cursor = "pointer";
  }
}

/* Call Cloudflare Worker (which proxies to OpenAI) */
async function callCloudflareWorker(userMessage) {
  // Add user message to conversation history
  conversationHistory.push({
    role: "user",
    content: userMessage,
  });

  // Prepare messages array with system prompt
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...conversationHistory,
  ];

  // Call Cloudflare Worker instead of OpenAI directly
  const response = await fetch(CLOUDFLARE_WORKER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o", // Changed to match Worker
      messages: messages,
      temperature: 0.7,
      max_tokens: 300, // Changed to match Worker's max_completion_tokens
    }),
  });

  if (!response.ok) {
    let errorMessage = "Worker request failed";
    try {
      const errorData = await response.json();
      errorMessage = errorData.error?.message || errorMessage;
    } catch (e) {
      // If response isn't JSON, use status text
      errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();

  // Add safety check for response structure
  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    throw new Error("Invalid response format from API");
  }

  const assistantMessage = data.choices[0].message.content;

  // Add assistant response to conversation history
  conversationHistory.push({
    role: "assistant",
    content: assistantMessage,
  });

  return assistantMessage;
}

/* Initialize on page load */
initializeChat();
