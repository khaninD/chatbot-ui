import { FileItemChunk } from "@/types"
import { encode } from "gpt-tokenizer"
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"
import { CHUNK_OVERLAP, CHUNK_SIZE } from "."
import { PDFParse } from "pdf-parse"

export const processPdf = async (pdf: Blob): Promise<FileItemChunk[]> => {
  let pdfParser: any = null

  try {
    console.log(
      "Starting PDF processing, blob size:",
      pdf.size,
      "type:",
      pdf.type
    )

    // Convert Blob to Buffer for pdf-parse
    const arrayBuffer = await pdf.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    console.log("Parsing PDF with pdf-parse...")
    pdfParser = new PDFParse({ data: buffer })
    const result = await pdfParser.getText()

    console.log(`Extracted text from ${result.pages.length} pages`)

    if (result.pages.length === 0) {
      throw new Error("PDF has no pages or could not be parsed")
    }

    const completeText = result.text
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
  } finally {
    // Clean up PDF parser resources
    if (pdfParser) {
      try {
        await pdfParser.destroy()
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }
}
