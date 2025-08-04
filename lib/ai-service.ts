import OpenAI from "openai"
import { FileSyncService } from "./file-sync-service"

export interface DataManipulationCommand {
  action: string
  parameters: Record<string, any>
  description: string
}

export class AIService {
  private static getOpenAIClient() {
    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      throw new Error("OpenAI API key is not configured. Please add OPENAI_API_KEY to your environment variables.")
    }
    return new OpenAI({ apiKey })
  }

  static async processCommand(
    userMessage: string,
    currentData: string[][],
    headers: string[],
    mcpFilePath: string,
    options: {
      fileId?: string
      oneDriveFileId?: string
      syncFromOneDriveFirst?: boolean
    } = {},
  ): Promise<{
    response: string
    newData?: string[][]
    fileModified?: boolean
    syncResult?: any
  }> {
    try {
      console.log("AIService.processCommand called with:", {
        userMessage,
        dataRows: currentData.length,
        headers: headers.length,
        mcpFilePath,
        options,
        hasApiKey: !!process.env.OPENAI_API_KEY,
      })

      if (!process.env.OPENAI_API_KEY) {
        return {
          response: "OpenAI API key is not configured. Please add OPENAI_API_KEY to your environment variables.",
        }
      }

      if (!mcpFilePath) {
        return {
          response: "No file path provided. Please make sure a file is selected.",
        }
      }

      // Extract user ID and filename from MCP file path
      const pathParts = mcpFilePath.split("/")
      const userId = pathParts[0]
      const filename = pathParts[1]

      // Enhanced input for better MCP interaction with clearer instructions
      const input = `You are VExcel, an expert Excel data manipulation assistant. You help users work with their Excel files using natural language commands.

FILE DETAILS:
- File: ${filename}
- MCP File Path: ${mcpFilePath}
- Available columns: ${headers.join(", ")}
- Total rows: ${currentData.length - 1} (excluding header)

USER REQUEST: "${userMessage}"

INSTRUCTIONS:
1. Use the Excel MCP tools to perform the requested operation on the file at path "${mcpFilePath}"
2. Always use the exact filepath parameter: "${mcpFilePath}"
3. After performing operations, provide a clear, friendly explanation of what you did
4. If you made changes, describe the specific changes made
5. If you encountered any issues, explain them clearly
6. Be conversational and helpful in your response

IMPORTANT: Focus on explaining what you accomplished rather than technical details. Users want to know:
- What operation was performed
- What data was affected
- What the results mean
- Any next steps they might consider

Example good responses:
- "I've sorted your data by salary in descending order. The highest earner is now at the top with $95,000, and I can see you have 150 employees total."
- "I added a new 'Bonus' column and calculated 10% of each employee's salary. The bonuses range from $3,000 to $9,500."
- "I created a summary showing your top 5 customers by revenue. Microsoft leads with $2.3M in sales this quarter."

Work with the file and provide a helpful, conversational response about what you accomplished.`

      console.log("Calling OpenAI Responses API with MCP...")
      console.log("MCP file path being sent to LLM:", mcpFilePath)

      // 🔄 Use the complete sync workflow
      const { mcpResult, syncResult } = await FileSyncService.performSyncedMCPOperation(
        userId,
        filename,
        async () => {
          // This is the MCP operation wrapped in the sync workflow
          const openai = this.getOpenAIClient()
          return await openai.responses.create({
            model: "gpt-4o",
            tools: [
              {
                type: "mcp",
                server_label: "excel-mcp",
                server_url: "https://vexcelmcp.onrender.com/mcp/mcp",
                require_approval: "never",
              },
            ],
            input: input,
          })
        },
        {
          fileId: options.fileId,
          oneDriveFileId: options.oneDriveFileId,
          syncFromOneDriveFirst: options.syncFromOneDriveFirst || false,
        },
      )

      const response = mcpResult

      console.log("OpenAI MCP response received:", {
        hasOutput: !!response?.output,
        outputLength: response?.output?.length || 0,
        hasOutputText: !!response?.output_text,
        syncSuccess: syncResult.success,
      })

      let responseText = ""
      let fileModified = false
      const toolsCalled: string[] = []
      const toolResults: string[] = []

      // Process the response to extract meaningful information
      if (response?.output_text) {
        responseText = response.output_text
      }

      if (response?.output && Array.isArray(response.output)) {
        for (const item of response.output) {
          console.log("Processing output item:", item.type)

          if (item.type === "text") {
            responseText += item.text
          } else if (item.type === "mcp_call") {
            console.log("MCP tool call:", {
              name: item.name,
              hasOutput: !!item.output,
              hasError: !!item.error,
            })

            if (item.name) {
              toolsCalled.push(item.name)
            }

            if (item.error) {
              responseText += `\n\n❌ I encountered an issue: ${item.error}`
            } else if (item.output) {
              // Store the raw output but don't add it to response yet
              toolResults.push(item.output)

              // Enhanced detection of file modification operations
              if (
                item.name &&
                (item.name.includes("write") ||
                  item.name.includes("save") ||
                  item.name.includes("update") ||
                  item.name.includes("insert") ||
                  item.name.includes("delete") ||
                  item.name.includes("sort") ||
                  item.name.includes("add") ||
                  item.name.includes("create") ||
                  item.name.includes("modify") ||
                  item.name.includes("row") ||
                  item.name.includes("column") ||
                  item.name.includes("cell") ||
                  item.name.includes("formula") ||
                  item.name.includes("format") ||
                  item.name.includes("apply"))
              ) {
                fileModified = true
              }
            }
          }
        }
      }

      // If we don't have a good response text, create one based on the tools called
      if (!responseText || responseText.trim().length < 50) {
        if (toolsCalled.length > 0) {
          const toolSummary = toolsCalled
            .map((tool) => {
              // Convert technical tool names to user-friendly descriptions
              if (tool.includes("read")) return "read your Excel data"
              if (tool.includes("write") || tool.includes("save")) return "saved changes to your file"
              if (tool.includes("sort")) return "sorted your data"
              if (tool.includes("filter")) return "filtered your data"
              if (tool.includes("add") || tool.includes("insert")) return "added new data"
              if (tool.includes("delete") || tool.includes("remove")) return "removed data"
              if (tool.includes("formula")) return "applied formulas"
              if (tool.includes("format")) return "applied formatting"
              if (tool.includes("pivot")) return "created a pivot table"
              if (tool.includes("chart")) return "generated a chart"
              return `performed ${tool.replace(/_/g, " ")}`
            })
            .join(", ")

          responseText = `I successfully ${toolSummary} on your Excel file "${filename}". `

          if (fileModified) {
            responseText += "The changes have been applied and your file has been updated. "
          }

          responseText += "Is there anything else you'd like me to do with your data?"
        } else {
          responseText =
            "I processed your request, but I'm not sure what specific action was taken. Could you please try rephrasing your request or be more specific about what you'd like me to do?"
        }
      }

      // Clean up the response text
      responseText = responseText
        .replace(/```[\w]*\n?/g, "") // Remove code blocks
        .replace(/```/g, "")
        .replace(/\*\*(.*?)\*\*/g, "$1") // Remove bold markdown
        .replace(/\*(.*?)\*/g, "$1") // Remove italic markdown
        .replace(/`([^`]+)`/g, "$1") // Remove inline code
        .trim()

      // Add confirmation for file modifications
      if (fileModified) {
        responseText +=
          "\n\n✅ Your Excel file has been updated successfully! You can see the changes in the viewer on the right."
      }

      // Add helpful suggestions based on what was done
      if (fileModified) {
        const suggestions = [
          "Would you like me to create a summary of the changes?",
          "Should I generate a chart to visualize this data?",
          "Would you like to perform any additional analysis?",
          "Need me to export this data in a different format?",
        ]
        const randomSuggestion = suggestions[Math.floor(Math.random() * suggestions.length)]
        responseText += `\n\n💡 ${randomSuggestion}`
      }

      return {
        response: responseText.trim(),
        fileModified,
        syncResult,
      }
    } catch (error) {
      console.error("AI processing error:", error)

      if (error instanceof Error) {
        // Handle specific OpenAI errors
        if (error.message.includes("API key")) {
          return {
            response: "There's an issue with the OpenAI API key. Please make sure it's configured correctly.",
          }
        }

        if (error.message.includes("rate limit")) {
          return {
            response: "I'm getting too many requests right now. Please wait a moment and try again.",
          }
        }

        if (error.message.includes("quota")) {
          return {
            response: "The OpenAI API quota has been exceeded. Please check your OpenAI account billing.",
          }
        }

        // Handle MCP-specific errors
        if (error.message.includes("MCP") || error.message.includes("server")) {
          return {
            response:
              "I'm having trouble connecting to the Excel processing server. Please try again in a moment, and if the issue persists, the server might be temporarily unavailable.",
          }
        }

        console.error("Detailed error:", error.message, error.stack)

        return {
          response: `I encountered an error while processing your request: ${error.message}. Please try rephrasing your request or try a simpler operation first.`,
        }
      }

      return {
        response:
          "I'm having trouble processing that request right now. Could you try rephrasing it or breaking it down into smaller steps?",
      }
    }
  }
}
