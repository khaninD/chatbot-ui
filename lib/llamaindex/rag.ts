import {
  Document,
  MetadataMode,
  RouterQueryEngine,
  SentenceSplitter,
  Settings,
  SummaryIndex,
  VectorStoreIndex
} from "llamaindex"
import type { BaseNodePostprocessor, NodeWithScore } from "llamaindex"
import { openai, OpenAIEmbedding } from "@llamaindex/openai"
import { Tables } from "@/supabase/types"

/**
 * Custom LLM-based reranker that uses the LLM to score chunk relevance
 */
class LLMReranker implements BaseNodePostprocessor {
  private topN: number
  private llm: any

  constructor({ topN = 5, llm }: { topN?: number; llm: any }) {
    this.topN = topN
    this.llm = llm
  }

  async postprocessNodes(
    nodes: NodeWithScore[],
    query?: string
  ): Promise<NodeWithScore[]> {
    if (!query || nodes.length === 0) {
      return nodes.slice(0, this.topN)
    }

    // Score each node using the LLM
    const scoredNodes = await Promise.all(
      nodes.map(async node => {
        const prompt = `Given the following question and text chunk, rate the relevance of the text to the question on a scale of 0-10.
Only respond with a single number between 0 and 10.

Question: ${query}

Text: ${node.node.getContent(MetadataMode.LLM)}

Relevance score (0-10):`

        try {
          const response = await this.llm.complete({ prompt })
          const score = parseFloat(response.text.trim())
          return {
            ...node,
            score: isNaN(score) ? 0 : score / 10 // Normalize to 0-1
          }
        } catch (error) {
          console.error("[LLMReranker] Error scoring node:", error)
          return { ...node, score: node.score || 0 }
        }
      })
    )

    // Sort by score (descending) and return top N
    return scoredNodes
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, this.topN)
  }
}

/**
 * Create a LlamaIndex RouterQueryEngine for advanced RAG
 * Uses both VectorStoreIndex (for specific questions) and SummaryIndex (for summarization)
 */
export async function createRAGQueryEngine(
  fileItems: Tables<"file_items">[],
  apiKey?: string,
  model?: string,
  useCometAPI?: boolean,
  useReranking?: boolean,
  embeddingModel?: string
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
    model: embeddingModel || "text-embedding-3-small"
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

  // Optionally create LLM Reranker for improving search quality
  let nodePostprocessors = undefined
  if (useReranking) {
    console.log("[LlamaIndex RAG] Enabling LLM Reranking")
    nodePostprocessors = [
      new LLMReranker({
        topN: 5, // Return top 5 most relevant chunks after reranking
        llm: Settings.llm
      })
    ]
  }

  // Create query engines with optional reranking
  const vectorQueryEngine = vectorIndex.asQueryEngine({
    nodePostprocessors
  })
  const summaryQueryEngine = summaryIndex.asQueryEngine({
    nodePostprocessors
  })

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
