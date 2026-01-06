# Context Management Strategy

This document explains how chat history context is managed in the chatbot-ui, following the Claude Code CLI approach.

## Overview

The system uses a **stateless** architecture where the client sends the full conversation history with each request. The server intelligently manages which messages to include based on token limits.

## Strategy (Claude Code Approach)

### 1. Token Reservations

```typescript
const CHUNK_SIZE = chatSettings.contextLength // e.g., 128,000 tokens
const RESERVED_FOR_RESPONSE = 4000 // Reserve for model's response
const RESERVED_FOR_SYSTEM = PROMPT_TOKENS + 500 // System prompt + overhead

const availableTokens = CHUNK_SIZE - RESERVED_FOR_SYSTEM - RESERVED_FOR_RESPONSE
```

**Why?** Prevents context overflow by ensuring space for:
- System prompt (instructions, date, user context)
- Model's response (tool calls + final answer)

### 2. Message Prioritization

```typescript
const ALWAYS_INCLUDE_LAST_N = 6 // Last 3 exchanges (user + assistant pairs)
```

**Priority Levels:**
- **P0 (Always included):** Last 6 messages (most recent context)
- **P1 (Optional):** Older messages that fit within token limit

**Why?** Recent context is critical for coherent conversation. Older messages are included if there's room.

### 3. Tool Usage Handling (Claude Code Approach)

**How it works:**
```typescript
case "tool_call":
  // Log to console for debugging
  console.log(`🔧 Using tool: ${event.data.toolName}`)
  // Don't send to UI - keeps history clean
  break

case "tool_result":
  // Log to console for debugging
  console.log(`✓ Tool result from ${event.data.toolName}`)
  // Don't send to UI - keeps history clean
  break

case "text_delta":
  // Only send final text response
  controller.enqueue(encoder.encode(event.data.delta))
  break
```

**What users see in real-time (during execution):**
```
🔧 list_schemas
✓ Schema info retrieved
🔧 execute_sql
✓ 1 results
Boeing 777-300 использовался в 610 рейсах.
```

**What's saved to database:**
```
Boeing 777-300 использовался в 610 рейсах.
```
(Tool markers `🔧` and `✓` cleaned before saving)

**What's logged (for debugging):**
```
[LlamaIndex] 🔧 Using tool: list_schemas
[LlamaIndex] ✓ Tool result from list_schemas: Available schemas: bookings, public
[LlamaIndex] 🔧 Using tool: execute_sql
[LlamaIndex] ✓ Tool result from execute_sql: [{"count": 610}]
```

**Why this approach?**
- ✅ **Clean history** - Only final answers saved to database
- ✅ **Saves tokens** - No verbose tool outputs (thousands of tokens saved)
- ✅ **Better UX** - Users see clean, concise responses
- ✅ **Debugging** - Tool usage visible in logs when needed
- ✅ **Like Claude Code** - Same behavior as official Claude CLI

### 4. Smart Truncation

```typescript
// Try adding older messages from most recent to oldest
for (let i = optionalMessages.length - 1; i >= 0; i--) {
  if (usedTokens + messageTokens <= availableTokens) {
    finalMessages.unshift(message)
  }
  // Continue even if message doesn't fit - try older ones
}
```

**No `break` statement!**
- Old approach: If one message was too large, all older messages were lost
- New approach: Skip large messages but continue trying older ones
- Result: Maximum history included within token budget

## Example Scenario

### Input (from database):
```
Messages: 50 total
Each message: Only final text (no tool results)
Total tokens: ~50,000 (fits easily in 128K limit)
```

### Processing:

1. **Calculate available space:**
   ```
   Context length: 128,000
   - System prompt: 2,000
   - Reserved for response: 4,000
   = Available: 122,000 tokens
   ```

2. **Guarantee recent messages:**
   ```
   Last 6 messages (P0): ~3,000 tokens → Always included
   (No tool results, only clean text answers)
   ```

3. **Add older messages:**
   ```
   Message 44 (500 tokens - clean text only) → Fits → Include
   Message 43 (600 tokens - clean text only) → Fits → Include
   Message 42 (450 tokens - clean text only) → Fits → Include
   ...
   All messages fit! (no verbose tool outputs)
   ```

4. **Final result:**
   ```
   Included: 50 messages (all of them!)
   Total tokens: 50,000 / 122,000
   Messages 1-44: All included (P1 - optional and fit)
   Messages 45-50: Always included (P0 - recent)
   Message 51: Current query (not in history)
   ```

## Logging

```
[Context Management] Total: 50 msgs | Included: 30 msgs | Tokens: 121500/128000 | Reserved: 6000 | Available: 122000
```

**Fields:**
- **Total:** All messages in database for this chat
- **Included:** Messages sent to LLM (after filtering)
- **Tokens:** Actual usage / Context limit
- **Reserved:** Tokens reserved for system + response
- **Available:** Tokens available for history

## Benefits vs. Simple Approach

| Aspect | Simple (old) | Claude Code (new) |
|--------|--------------|-------------------|
| **Recent context** | May be lost if large | Always guaranteed (last 6) |
| **Large messages** | Block all older ones | Skipped, continue |
| **Token efficiency** | Wastes on tool results | No tool results saved |
| **Predictability** | Unpredictable cutoff | Always includes recent |
| **History cleanliness** | Cluttered with tool outputs | Clean text answers only |
| **Debugging** | Tool calls visible in history | Tool calls in logs only |

## Comparison to LlamaIndex Memory

| Feature | Manual (this approach) | LlamaIndex Memory |
|---------|----------------------|-------------------|
| **Stateless** | ✅ Yes | ❌ No (stateful) |
| **Scalability** | ✅ Easy (any server) | ⚠️ Need state sync |
| **Token management** | ✅ Smart cleanup | ✅ Automatic |
| **Vector search** | ❌ No | ✅ Yes |
| **Fact extraction** | ❌ No | ✅ Yes |
| **Complexity** | ✅ Simple | ⚠️ Complex |
| **Use case** | Short-term SQL queries | Long-term assistants |

## Configuration

Adjust these constants in `lib/build-prompt.ts`:

```typescript
const RESERVED_FOR_RESPONSE = 4000 // Adjust based on average response length
const ALWAYS_INCLUDE_LAST_N = 6    // Adjust based on conversation style
```

**Recommendations:**
- **SQL agent:** `ALWAYS_INCLUDE_LAST_N = 6` (last 3 Q&A pairs)
- **Chat assistant:** `ALWAYS_INCLUDE_LAST_N = 10` (last 5 exchanges)
- **Code generation:** `RESERVED_FOR_RESPONSE = 8000` (longer responses)

## Future Enhancements

If needed in the future:

1. **Summarization:** Summarize old messages into a compact summary
2. **Vector search:** Use embeddings to retrieve relevant old messages
3. **Fact extraction:** Extract key facts from conversation for long-term memory
4. **Hybrid approach:** Recent buffer + vector search for old context

For now, the current approach is optimal for stateless SQL query agents.
