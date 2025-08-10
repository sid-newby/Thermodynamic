# TypeScript implementation for managing conversation history 
in chat scenarios. 

## Recommended approach 
using a class-based system with proper memory management:

### Core Conversation Manager

```typescript
// types.ts
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface ConversationOptions {
  maxMessages?: number;
  maxTokens?: number;
  compressionStrategy?: 'sliding' | 'summarize';
}

// ConversationManager.ts
export class ConversationManager {
  private messages: Message[] = [];
  private readonly options: Required<ConversationOptions>;
  
  constructor(options: ConversationOptions = {}) {
    this.options = {
      maxMessages: options.maxMessages ?? 20,
      maxTokens: options.maxTokens ?? 4000,
      compressionStrategy: options.compressionStrategy ?? 'sliding'
    };
  }

  addMessage(role: Message['role'], content: string, metadata?: Record<string, any>): Message {
    const message: Message = {
      id: this.generateId(),
      role,
      content,
      timestamp: new Date(),
      metadata
    };
    
    this.messages.push(message);
    this.enforceMemoryLimits();
    
    return message;
  }

  getContext(includeSystem: boolean = true): Message[] {
    if (!includeSystem) {
      return this.messages.filter(m => m.role !== 'system');
    }
    return [...this.messages];
  }

  getRecentContext(count: number = 10): Message[] {
    return this.messages.slice(-count);
  }

  private enforceMemoryLimits(): void {
    // Strategy 1: Simple sliding window
    if (this.options.compressionStrategy === 'sliding') {
      while (this.messages.length > this.options.maxMessages) {
        // Keep system messages, remove oldest non-system message
        const firstNonSystemIndex = this.messages.findIndex(m => m.role !== 'system');
        if (firstNonSystemIndex !== -1) {
          this.messages.splice(firstNonSystemIndex, 1);
        } else {
          this.messages.shift();
        }
      }
    }
    
    // Check token limits (simplified - you'd use a real tokenizer)
    const estimatedTokens = this.estimateTokenCount();
    if (estimatedTokens > this.options.maxTokens) {
      this.compressHistory();
    }
  }

  private compressHistory(): void {
    // Keep system messages and recent messages, compress middle portion
    const systemMessages = this.messages.filter(m => m.role === 'system');
    const recentMessages = this.messages.slice(-5);
    const middleMessages = this.messages.slice(
      systemMessages.length, 
      this.messages.length - 5
    );
    
    if (middleMessages.length > 2) {
      // Create a summary of the middle messages
      const summary: Message = {
        id: this.generateId(),
        role: 'system',
        content: `[Previous conversation summary of ${middleMessages.length} messages]`,
        timestamp: new Date(),
        metadata: { 
          compressed: true, 
          originalCount: middleMessages.length 
        }
      };
      
      this.messages = [...systemMessages, summary, ...recentMessages];
    }
  }

  private estimateTokenCount(): number {
    // Rough estimate: ~4 characters per token
    return this.messages.reduce((sum, msg) => sum + Math.ceil(msg.content.length / 4), 0);
  }

  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  clear(): void {
    // Keep only system messages
    this.messages = this.messages.filter(m => m.role === 'system');
  }

  serialize(): string {
    return JSON.stringify(this.messages);
  }

  deserialize(data: string): void {
    this.messages = JSON.parse(data).map((m: any) => ({
      ...m,
      timestamp: new Date(m.timestamp)
    }));
  }
}
```


### Advanced Context Window Manager
```typescript
// ContextWindow.ts
export class ContextWindow {
  private manager: ConversationManager;
  private contextStrategy: 'full' | 'relevant' | 'windowed';
  
  constructor(
    manager: ConversationManager,
    strategy: 'full' | 'relevant' | 'windowed' = 'windowed'
  ) {
    this.manager = manager;
    this.contextStrategy = strategy;
  }

  prepareContext(currentQuery?: string): Message[] {
    switch (this.contextStrategy) {
      case 'full':
        return this.manager.getContext();
        
      case 'windowed':
        return this.getWindowedContext();
        
      case 'relevant':
        return this.getRelevantContext(currentQuery);
        
      default:
        return this.manager.getContext();
    }
  }

  private getWindowedContext(): Message[] {
    const messages = this.manager.getContext();
    const systemMessages = messages.filter(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');
    
    // Always include system messages and last N conversation turns
    const recentConversation = conversationMessages.slice(-10);
    
    return [...systemMessages, ...recentConversation];
  }

  private getRelevantContext(query?: string): Message[] {
    if (!query) return this.getWindowedContext();
    
    const messages = this.manager.getContext();
    const systemMessages = messages.filter(m => m.role === 'system');
    
    // Simple relevance scoring (you'd use embeddings in production)
    const scoredMessages = messages
      .filter(m => m.role !== 'system')
      .map(msg => ({
        message: msg,
        score: this.calculateRelevance(msg.content, query)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map(item => item.message);
    
    return [...systemMessages, ...scoredMessages];
  }

  private calculateRelevance(content: string, query: string): number {
    // Simple keyword matching (use embeddings for better results)
    const queryWords = query.toLowerCase().split(' ');
    const contentWords = content.toLowerCase().split(' ');
    
    let matches = 0;
    for (const qWord of queryWords) {
      if (contentWords.includes(qWord)) {
        matches++;
      }
    }
    
    return matches / queryWords.length;
  }
}
Usage Example with API Integration
typescriptCopy// ChatService.ts
export class ChatService {
  private conversations: Map<string, ConversationManager> = new Map();
  
  async sendMessage(
    sessionId: string,
    userMessage: string,
    systemPrompt?: string
  ): Promise<string> {
    // Get or create conversation manager for this session
    let conversation = this.conversations.get(sessionId);
    if (!conversation) {
      conversation = new ConversationManager({
        maxMessages: 20,
        maxTokens: 4000,
        compressionStrategy: 'sliding'
      });
      
      // Add system prompt if provided
      if (systemPrompt) {
        conversation.addMessage('system', systemPrompt);
      }
      
      this.conversations.set(sessionId, conversation);
    }
    
    // Add user message
    conversation.addMessage('user', userMessage);
    
    // Prepare context window
    const contextWindow = new ContextWindow(conversation, 'windowed');
    const context = contextWindow.prepareContext(userMessage);
    
    // Format for API (e.g., OpenAI format)
    const apiMessages = context.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
    
    try {
      // Make API call (pseudo-code)
      const response = await this.callLLMAPI(apiMessages);
      
      // Add assistant response to conversation
      conversation.addMessage('assistant', response);
      
      return response;
    } catch (error) {
      console.error('API call failed:', error);
      throw error;
    }
  }
  
  private async callLLMAPI(messages: any[]): Promise<string> {
    // Your actual API implementation here
    // Example with OpenAI:
    /*
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: messages,
      temperature: 0.7,
    });
    return response.choices[0].message.content;
    */
    return "Assistant response here";
  }
  
  getConversationHistory(sessionId: string): Message[] {
    const conversation = this.conversations.get(sessionId);
    return conversation ? conversation.getContext() : [];
  }
  
  clearSession(sessionId: string): void {
    this.conversations.delete(sessionId);
  }
  
  // Persistence methods
  async saveSession(sessionId: string): Promise<void> {
    const conversation = this.conversations.get(sessionId);
    if (conversation) {
      const serialized = conversation.serialize();
      // Save to database/storage
      await this.persistToStorage(sessionId, serialized);
    }
  }
  
  async loadSession(sessionId: string): Promise<void> {
    const data = await this.loadFromStorage(sessionId);
    if (data) {
      const conversation = new ConversationManager();
      conversation.deserialize(data);
      this.conversations.set(sessionId, conversation);
    }
  }
  
  private async persistToStorage(sessionId: string, data: string): Promise<void> {
    // Implement your storage logic (Redis, PostgreSQL, etc.)
    localStorage.setItem(`chat_${sessionId}`, data);
  }
  
  private async loadFromStorage(sessionId: string): Promise<string | null> {
    // Implement your storage retrieval
    return localStorage.getItem(`chat_${sessionId}`);
  }
}
```

### Simple Usage
```typescript
// app.ts
async function main() {
  const chatService = new ChatService();
  const sessionId = 'user_123';
  
  // First message
  const response1 = await chatService.sendMessage(
    sessionId,
    "What's the weather like?",
    "You are a helpful assistant."
  );
  
  // Second message (maintains context)
  const response2 = await chatService.sendMessage(
    sessionId,
    "What should I wear then?"
  );
  
  // Get full history
  const history = chatService.getConversationHistory(sessionId);
  console.log('Conversation history:', history);
  
  // Save session for later
  await chatService.saveSession(sessionId);
}
```

## Key Recommendations:

- Memory Management: Use a sliding window approach with token counting to prevent context overflow
- System Messages: Always preserve system messages as they define behavior
- Compression: Implement summarization for middle portions when history gets too long
- Session Management: Use a Map to handle multiple concurrent conversations
- Persistence: Implement save/load for maintaining conversations across server restarts
- Flexibility: Make the context window strategy configurable (full, windowed, or relevant)

This approach gives you fine-grained control over conversation history while keeping memory usage predictable and API costs manageable. The modular design makes it easy to swap out different strategies based on your specific needs.