import { FileItemChunk } from "@/types"
import { encode } from "gpt-tokenizer"
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"
import { CHUNK_OVERLAP, CHUNK_SIZE } from "."

export const processCSV = async (csv: Blob): Promise<FileItemChunk[]> => {
  // Parse CSV blob manually
  const fileBuffer = Buffer.from(await csv.arrayBuffer())
  const textDecoder = new TextDecoder("utf-8")
  const completeText = textDecoder.decode(fileBuffer)

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: CHUNK_SIZE,
    chunkOverlap: CHUNK_OVERLAP,
    separators: ["\n\n"]
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
