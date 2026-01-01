import { FileItemChunk } from "@/types"
import { encode } from "gpt-tokenizer"
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"
import { CHUNK_OVERLAP, CHUNK_SIZE } from "."

export const processJSON = async (json: Blob): Promise<FileItemChunk[]> => {
  // Parse JSON blob manually
  const fileBuffer = Buffer.from(await json.arrayBuffer())
  const textDecoder = new TextDecoder("utf-8")
  const textContent = textDecoder.decode(fileBuffer)

  // Pretty print JSON for better chunking
  let completeText: string
  try {
    const jsonObj = JSON.parse(textContent)
    completeText = JSON.stringify(jsonObj, null, 2)
  } catch {
    completeText = textContent
  }

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: CHUNK_SIZE,
    chunkOverlap: CHUNK_OVERLAP
  })
  const splitDocs = await splitter.createDocuments([completeText])

  const chunks: FileItemChunk[] = []

  for (let i = 0; i < splitDocs.length; i++) {
    const doc = splitDocs[i]

    chunks.push({
      content: doc.pageContent,
      tokens: encode(doc.pageContent).length
    })
  }

  return chunks
}
