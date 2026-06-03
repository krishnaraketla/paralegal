import { useState, useCallback } from 'react'
import { ChatContainer, ChatContainerContent } from '@/components/ui/chat-container'
import { Message, MessageAvatar, MessageContent } from '@/components/ui/message'
import { PromptInput, PromptInputTextarea, PromptInputActions, PromptInputAction } from '@/components/ui/prompt-input'
import { Markdown } from '@/components/ui/markdown'
import { Loader } from '@/components/ui/loader'
import { Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import './SidebarChat.css'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface SidebarChatProps {
  className?: string
}

export default function SidebarChat({ className }: SidebarChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSend = useCallback(() => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    // Simulate AI response (placeholder for future backend integration)
    setTimeout(() => {
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Thanks for your message! The chat feature is still being developed. Soon you'll be able to ask questions about your document and get AI-powered assistance.",
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, assistantMessage])
      setIsLoading(false)
    }, 1000)
  }, [inputValue, isLoading])

  return (
    <div className={cn("sidebar-chat", className)}>
      <div className="chat-content">
        <ChatContainer className="chat-container">
          <ChatContainerContent className="chat-messages">
            {messages.map((message) => (
              <Message
                key={message.id}
                variant={message.role}
                className="chat-message"
              >
                <MessageAvatar
                  fallback={message.role === 'user' ? 'U' : 'AI'}
                  className={cn(
                    message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  )}
                />
                <MessageContent variant={message.role}>
                  {message.role === 'assistant' ? (
                    <Markdown>{message.content}</Markdown>
                  ) : (
                    <p>{message.content}</p>
                  )}
                </MessageContent>
              </Message>
            ))}
            
            {isLoading && (
              <Message variant="assistant" className="chat-message">
                <MessageAvatar fallback="AI" className="bg-muted" />
                <MessageContent variant="assistant">
                  <Loader variant="dots" size="sm" className="text-muted-foreground" />
                </MessageContent>
              </Message>
            )}
          </ChatContainerContent>
        </ChatContainer>
        
        <div className="chat-input-wrapper">
          <PromptInput
            value={inputValue}
            onValueChange={setInputValue}
            disabled={isLoading}
            className="chat-input ring-0 focus-within:ring-0 focus-within:ring-offset-0"
          >
            <PromptInputTextarea
              placeholder="Ask me anything..."
              onSubmit={handleSend}
            />
            <PromptInputActions>
              <PromptInputAction
                onClick={handleSend}
                disabled={!inputValue.trim() || isLoading}
                className={cn(
                  inputValue.trim() && !isLoading && "text-primary hover:bg-primary hover:text-primary-foreground"
                )}
              >
                <Send className="h-4 w-4" />
              </PromptInputAction>
            </PromptInputActions>
          </PromptInput>
        </div>
      </div>
    </div>
  )
}

