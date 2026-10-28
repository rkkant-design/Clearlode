"use client";

import { Sparkles, X, Send, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5001";

interface Message {
    role: 'user' | 'assistant';
    content: string;
    sources?: Array<{
        title: string;
        channel: string;
        videoId: string;
        videoUrl: string;
        similarity: number;
    }>;
    intent?: string;
    intentConfidence?: number;
    intentReasoning?: string;
    semanticResults?: Array<{
        video_id?: string;
        title?: string;
        channel?: string;
        excerpt?: string;
        similarity?: number;
    }>;
    graphResults?: {
        nodes?: Array<{
            id: string;
            labels: string[];
            properties: Record<string, any>;
        }>;
        relationships?: Array<{
            id: string;
            type: string;
            start: string;
            end: string;
            startNode?: string;
            endNode?: string;
            properties?: Record<string, any>;
        }>;
    };
}

export function AskNeo() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'assistant',
            content: "Hey there! 👋 I'm Neo, your friendly AI assistant. I'm here to help you understand enterprise technology videos from vendors like Oracle, SAP, Salesforce, and Workday. But I'm also great at just chatting! Feel free to ask me anything - whether it's about tech, or just to say hi! 😊"
        }
    ]);
    const [inputValue, setInputValue] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const handleSendMessage = async () => {
        const question = inputValue.trim();
        if (!question || isLoading) return;

        // Add user message
        const userMessage: Message = { role: 'user', content: question };
        setMessages(prev => {
            const updated = [...prev, userMessage];
            // Keep only last 10 messages (5 user + 5 assistant = 10 total)
            return updated.slice(-10);
        });
        setInputValue("");
        setIsLoading(true);
        setError(null);

        try {
            // Build conversation history for context (last 10 messages, excluding the current one)
            const conversationHistory = messages
                .slice(-10)
                .map(msg => ({
                    role: msg.role === 'user' ? 'user' : 'assistant',
                    content: msg.content
                }));

            const response = await fetch(`${API_BASE_URL}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    question,
                    conversationHistory
                }),
            }).catch((fetchError) => {
                // Handle network errors
                if (fetchError instanceof TypeError && fetchError.message === 'Failed to fetch') {
                    throw new Error(`Cannot connect to backend server at ${API_BASE_URL}. Please make sure the backend is running on port 5001.`);
                }
                throw fetchError;
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to get response');
            }

            // Add assistant response
            const assistantMessage: Message = {
                role: 'assistant',
                content: data.data.answer
            };
            setMessages(prev => {
                const updated = [...prev, assistantMessage];
                // Keep only last 10 messages
                return updated.slice(-10);
            });

        } catch (err) {
            console.error('Error sending message:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to get response. Please try again.';
            setError(errorMessage);
            
            // Add error message to chat with more helpful information
            let errorContent = `Sorry, I encountered an error: ${errorMessage}`;
            
            if (errorMessage.includes('Cannot connect to backend')) {
                errorContent += '\n\nPlease check:\n1. Is the backend server running? (npm run dev in the backend folder)\n2. Is it running on port 5001?\n3. Check the browser console for more details.';
            } else if (errorMessage.includes('OpenAI API key')) {
                errorContent += '\n\nPlease make sure the OPENAI_API_KEY is set in the backend .env file.';
            }
            
            const errorMsg: Message = {
                role: 'assistant',
                content: errorContent
            };
            setMessages(prev => {
                const updated = [...prev, errorMsg];
                return updated.slice(-10);
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSamplePrompt = (prompt: string) => {
        setInputValue(prompt);
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const samplePrompts = [
        "Summarize Oracle's latest finance AI features",
        "Show me agentic demos from SAP",
        "Compare Workday vs Salesforce agents"
    ];

    return (
        <>
            {/* Floating Action Button */}
            <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed bottom-8 right-8 z-50 flex items-center gap-3 px-5 py-3 rounded-full shadow-2xl backdrop-blur-lg border transition-all duration-300 ${isOpen ? 'bg-neo-accent-a text-white border-neo-accent-a' : 'bg-neo-panel text-neo-text-primary border-neo-accent-a/30 hover:border-neo-accent-a'}`}
            >
                {isOpen ? <X size={20} /> : <Sparkles size={20} className={isOpen ? "" : "text-neo-accent-b"} />}
                <span className="font-medium text-sm">Ask FieldNote</span>
            </motion.button>

            {/* Chat Interface */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="fixed bottom-24 right-8 w-[380px] h-[500px] bg-neo-bg/95 backdrop-blur-xl border border-neo-divider rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-neo-divider bg-neo-panel flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neo-accent-a to-neo-accent-c flex items-center justify-center">
                                <Sparkles size={16} className="text-white" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-sm text-neo-text-primary">Ask FieldNote</h3>
                                <p className="text-xs text-neo-text-secondary">Context-aware enterprise assistant</p>
                            </div>
                            {messages.length > 1 && (
                                <button
                                    onClick={() => {
                                        setMessages([messages[0]]);
                                        setError(null);
                                        setInputValue("");
                                    }}
                                    className="text-xs text-neo-text-secondary hover:text-neo-accent-a transition-colors px-2 py-1 rounded hover:bg-neo-panel-hover"
                                >
                                    Clear
                                </button>
                            )}
                        </div>

                        {/* Chat Body */}
                        <div className="flex-grow p-4 space-y-4 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-neo-divider [&::-webkit-scrollbar-thumb]:rounded-full">
                            {messages.map((message, index) => (
                                <div
                                    key={index}
                                    className={`flex items-start gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                                >
                                    <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold ${
                                        message.role === 'user' 
                                            ? 'bg-neo-accent-a text-white' 
                                            : 'bg-neo-panel border border-neo-divider text-neo-text-primary'
                                    }`}>
                                        {message.role === 'user' ? 'U' : 'N'}
                                    </div>
                                    <div className={`rounded-2xl p-3 text-sm max-w-[85%] ${
                                        message.role === 'user'
                                            ? 'bg-neo-accent-a/20 text-neo-text-primary rounded-tr-none'
                                            : 'bg-neo-panel border border-neo-divider text-neo-text-primary rounded-tl-none'
                                    }`}>
                                        <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                                        

                                    </div>
                                </div>
                            ))}

                            {/* Loading Indicator */}
                            {isLoading && (
                                <div className="flex items-start gap-3">
                                    <div className="w-6 h-6 rounded-full bg-neo-panel border border-neo-divider flex-shrink-0 flex items-center justify-center text-[10px]">N</div>
                                    <div className="bg-neo-panel border border-neo-divider rounded-2xl rounded-tl-none p-3">
                                        <Loader2 size={16} className="text-neo-accent-a animate-spin" />
                                    </div>
                                </div>
                            )}

                            {/* Error Message */}
                            {error && !isLoading && (
                                <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-400">
                                    {error}
                                </div>
                            )}

                            {/* Sample Prompts (only show when no conversation) */}
                            {messages.length === 1 && !isLoading && (
                                <div className="grid grid-cols-1 gap-2 mt-4">
                                    {samplePrompts.map((prompt, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleSamplePrompt(prompt)}
                                            className="text-left px-3 py-2 text-xs text-neo-text-secondary hover:text-neo-accent-a bg-neo-panel hover:bg-neo-panel-hover rounded-lg transition-colors border border-transparent hover:border-neo-accent-a/20"
                                        >
                                            {prompt}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="p-4 border-t border-neo-divider bg-neo-panel">
                            <div className="relative">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder="Ask a question..."
                                    disabled={isLoading}
                                    className="w-full bg-neo-bg border border-neo-divider rounded-xl py-2.5 pl-4 pr-10 text-sm text-neo-text-primary placeholder:text-neo-text-secondary focus:outline-none focus:border-neo-accent-a/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                                <button
                                    onClick={handleSendMessage}
                                    disabled={!inputValue.trim() || isLoading}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-neo-panel-hover text-neo-text-secondary hover:text-neo-accent-a transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? (
                                        <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                        <Send size={14} />
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
