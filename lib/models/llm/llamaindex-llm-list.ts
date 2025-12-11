import { LLM } from "@/types"

const LLAMAINDEX_PLATFORM_LINK = "https://www.llamaindex.ai"

// LlamaIndex Models
const LlamaIndexSQLAgent: LLM = {
  modelId: "llamaindex-sql-agent",
  modelName: "LlamaIndex SQL Agent",
  provider: "llamaindex",
  hostedId: "llamaindex-sql-agent",
  platformLink: LLAMAINDEX_PLATFORM_LINK,
  imageInput: false,
  pricing: {
    currency: "USD",
    unit: "1M tokens",
    inputCost: 5,
    outputCost: 15
  }
}

export const LLAMAINDEX_LLM_LIST: LLM[] = [LlamaIndexSQLAgent]
