"use client"

import { Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

export function AIAssistantButton() {
  const handleAIClick = () => {
    // Placeholder for future AI assistant functionality
    console.log("AI Assistant clicked - functionality coming soon!")
  }

  return (
    <Button
      onClick={handleAIClick}
      size="icon"
      className="ai-assistant-button fixed bottom-6 right-6 h-14 w-14 rounded-full bg-gradient-to-r from-zenthea-purple to-zenthea-coral hover:from-zenthea-purple hover:to-zenthea-coral hover:opacity-90 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
      style={{ zIndex: 999999999 }}
      aria-label="Open AI Assistant"
    >
      <Sparkles className="h-7 w-7 text-white" />
    </Button>
  )
}
