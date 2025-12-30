import { FileItemChunk } from "@/types"
import { encode } from "gpt-tokenizer"
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf"
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"
import { CHUNK_OVERLAP, CHUNK_SIZE } from "."

export const processPdf = async (pdf: Blob): Promise<FileItemChunk[]> => {
  try {
    console.log(
      "Starting PDF processing, blob size:",
      pdf.size,
      "type:",
      pdf.type
    )

    // Use updated PDFLoader from @langchain/community
    const loader = new PDFLoader(pdf)
    console.log("PDFLoader created, loading document...")

    const docs = await loader.load()
    console.log(`Loaded ${docs.length} pages from PDF`)

    if (docs.length === 0) {
      throw new Error("PDF has no pages or could not be parsed")
    }

    let completeText = docs.map(doc => doc.pageContent).join(" ")
    console.log(`Complete text length: ${completeText.length} characters`)

    if (completeText.trim().length === 0) {
      throw new Error("PDF contains no text content")
    }

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: CHUNK_SIZE,
      chunkOverlap: CHUNK_OVERLAP
    })
    const splitDocs = await splitter.createDocuments([completeText])
    console.log(`Split into ${splitDocs.length} chunks`)

    let chunks: FileItemChunk[] = []

    for (let i = 0; i < splitDocs.length; i++) {
      const doc = splitDocs[i]

      chunks.push({
        content: doc.pageContent,
        tokens: encode(doc.pageContent).length
      })
    }

    console.log(`Processed ${chunks.length} chunks successfully`)
    return chunks
  } catch (error: any) {
    console.error("Error in processPdf:", error.message, error.stack)
    throw new Error(`Failed to process PDF: ${error.message}`)
  }
}
