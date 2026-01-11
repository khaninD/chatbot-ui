import {
  Document,
  RouterQueryEngine,
  SentenceSplitter,
  Settings,
  SummaryIndex,
  VectorStoreIndex
} from "llamaindex"
import { openai, OpenAIEmbedding } from "@llamaindex/openai"
import { Tables } from "@/supabase/types"

/**
 * Create a LlamaIndex RouterQueryEngine for advanced RAG
 * Uses both VectorStoreIndex (for specific questions) and SummaryIndex (for summarization)
 */
export async function createRAGQueryEngine(
  fileItems: Tables<"file_items">[],
  apiKey?: string,
  model?: string,
  useCometAPI?: boolean
) {
  if (fileItems.length === 0) {
    throw new Error("No file items provided for RAG")
  }

  // Configure LlamaIndex Settings
  const llmConfig: {
    model: string
    apiKey: string
    baseURL?: string
  } = {
    model: model || "gpt-4o",
    apiKey: apiKey || process.env.OPENAI_API_KEY || ""
  }

  // Add baseURL if using Comet API
  if (useCometAPI) {
    llmConfig.baseURL = "https://api.cometapi.com/v1"
  }

  Settings.llm = openai(llmConfig)

  // Configure embeddings model (required for VectorStoreIndex)
  const embedConfig: {
    apiKey: string
    model?: string
    baseURL?: string
  } = {
    apiKey: apiKey || process.env.OPENAI_API_KEY || "",
    model: "text-embedding-3-small"
  }

  // Add baseURL for embeddings if using Comet API
  if (useCometAPI) {
    embedConfig.baseURL = "https://api.cometapi.com/v1"
  }

  Settings.embedModel = new OpenAIEmbedding(embedConfig)

  // Configure node parser with chunking strategy
  Settings.nodeParser = new SentenceSplitter({
    chunkSize: 1024,
    chunkOverlap: 200
  })

  console.log(
    `[LlamaIndex RAG] Creating query engine from ${fileItems.length} file items`
  )

  // Convert file items to LlamaIndex Documents
  const documents = fileItems.map(
    item =>
      new Document({
        text: item.content,
        id_: item.id,
        metadata: {
          file_id: item.file_id,
          user_id: item.user_id
        }
      })
  )

  // Create Vector Index for specific/factual questions
  const vectorIndex = await VectorStoreIndex.fromDocuments(documents)

  // Create Summary Index for summarization questions
  const summaryIndex = await SummaryIndex.fromDocuments(documents)

  // Create query engines
  const vectorQueryEngine = vectorIndex.asQueryEngine()
  const summaryQueryEngine = summaryIndex.asQueryEngine()

  // Create Router Query Engine
  const queryEngine = RouterQueryEngine.fromDefaults({
    queryEngineTools: [
      {
        queryEngine: vectorQueryEngine,
        description:
          "Useful for answering specific questions, retrieving particular facts, or finding detailed information from the documents"
      },
      {
        queryEngine: summaryQueryEngine,
        description:
          "Useful for summarization tasks, getting an overview, or understanding the general content of the documents"
      }
    ]
  })

  console.log("[LlamaIndex RAG] Query engine created successfully")

  return queryEngine
}

/**
 * Query the RAG engine with a user question
 */
export async function queryRAG(
  queryEngine: RouterQueryEngine,
  query: string
): Promise<{ response: string; metadata?: any }> {
  console.log(`[LlamaIndex RAG] Querying: "${query}"`)

  const result = await queryEngine.query({ query })

  console.log(
    `[LlamaIndex RAG] Response generated, metadata:`,
    result.metadata?.selectorResult
  )

  return {
    response: result.response,
    metadata: result.metadata
  }
}
