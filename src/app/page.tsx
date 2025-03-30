'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";
import { ChatHeader } from '@/components/ChatHeader';
import { ChatMessages } from '@/components/ChatMessages';
import { MessageInput } from '@/components/MessageInput';
import { Footer } from '@/components/Footer';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Message {
  id: string;
  role: 'user' | 'model' | 'system' | 'error';
  text: string;
}

interface GreetingOptions {
  language: 'english' | 'urdu';
  includeHadith: boolean;
  includeQuran: boolean;
  tone: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    { id: crypto.randomUUID(), role: 'system', text: "Assalamu Alaikum! How can I help you create an Eid greeting today? Use the options below to customize your greeting." }
  ]);
  const [userInput, setUserInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null!);
  const [options, setOptions] = useState<GreetingOptions>({
    language: 'english',
    includeHadith: false,
    includeQuran: false,
    tone: 'general'
  });

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async () => {
    const trimmedInput = userInput.trim();
    if ((!trimmedInput && options.tone === 'custom') || isLoading) return;

    const formattedPrompt = buildPrompt(trimmedInput);
    
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      text: formattedPrompt,
    };

    setMessages(prev => [...prev, userMessage]);
    setUserInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt: formattedPrompt,
          options
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
        throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();

      if (data.greeting) {
        const modelMessage: Message = {
          id: crypto.randomUUID(),
          role: 'model',
          text: data.greeting,
        };
        setMessages(prev => [...prev, modelMessage]);
      } else {
        throw new Error("Received an empty greeting from the API.");
      }
    } catch (error) {
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'error',
        text: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again later.`,
      };
      setMessages(prev => [...prev, errorMessage]);
      toast.error("Failed to generate greeting. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  const buildPrompt = (customText: string) => {
    if (options.tone === 'custom' && customText) {
      return customText;
    }

    let prompt = `Generate an Eid greeting in ${options.language} with a ${options.tone} tone`;
    
    if (options.includeHadith) {
      prompt += ", include a relevant Hadith";
    }
    
    if (options.includeQuran) {
      prompt += ", include a relevant Quranic ayat";
    }

    if (customText) {
      prompt += `. Additional details: ${customText}`;
    }

    return prompt;
  };

  const handleCopyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Greeting copied to clipboard!");
    } catch (err) {
      toast.error("Failed to copy greeting to clipboard.");
    }
  };

  const handleShare = async (text: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Eid Greeting',
          text: text,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          toast.error("Failed to share greeting.");
        }
      }
    } else {
      toast.error("Web Share API not supported.");
    }
  };

  return (
    <main className="flex h-screen flex-col items-center justify-center p-2 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-gray-900 dark:via-emerald-950 dark:to-teal-950">
      <Card className="w-full max-w-3xl h-full md:h-[90vh] md:max-h-[700px] shadow-xl flex flex-col">
        <ChatHeader />
        <div className="p-4 border-b bg-emerald-50/50 dark:bg-emerald-950/30">
          <Tabs defaultValue="simple" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="simple">Simple Options</TabsTrigger>
              <TabsTrigger value="custom">Custom Message</TabsTrigger>
            </TabsList>
            
            <TabsContent value="simple" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select 
                    value={options.language} 
                    onValueChange={(val) => setOptions({...options, language: val as 'english' | 'urdu'})}
                  >
                    <SelectTrigger id="language">
                      <SelectValue placeholder="Select Language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="english">English</SelectItem>
                      <SelectItem value="urdu">Urdu</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="tone">Tone/Recipient</Label>
                  <Select 
                    value={options.tone} 
                    onValueChange={(val) => setOptions({...options, tone: val})}
                  >
                    <SelectTrigger id="tone">
                      <SelectValue placeholder="Select Tone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="family">Family</SelectItem>
                      <SelectItem value="friends">Friends</SelectItem>
                      <SelectItem value="spouse">Spouse/Partner</SelectItem>
                      <SelectItem value="formal">Formal/Professional</SelectItem>
                      <SelectItem value="college">College Group</SelectItem>
                      <SelectItem value="custom">Custom (Use Message Box)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex items-center space-x-8">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="includeHadith" 
                    checked={options.includeHadith}
                    onCheckedChange={(checked) => 
                      setOptions({...options, includeHadith: checked as boolean})
                    }
                  />
                  <Label htmlFor="includeHadith">Include Hadith</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="includeQuran" 
                    checked={options.includeQuran}
                    onCheckedChange={(checked) => 
                      setOptions({...options, includeQuran: checked as boolean})
                    }
                  />
                  <Label htmlFor="includeQuran">Include Quranic Ayat</Label>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="custom">
              <div className="space-y-2">
                <Label htmlFor="customMessage">
                  Describe your greeting (recipients, tone, specific wishes)
                </Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Example: "Eid greeting for my brother in English, something brotherly with a Quranic verse"
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
        
        <CardContent className="flex-1 overflow-hidden p-0">
          <ChatMessages
            messages={messages}
            isLoading={isLoading}
            scrollAreaRef={scrollAreaRef}
            onCopy={handleCopyToClipboard}
            onShare={handleShare}
          />
        </CardContent>
        
        <CardFooter className="p-4 border-t">
          <MessageInput
            userInput={userInput}
            setUserInput={setUserInput}
            isLoading={isLoading}
            onSend={handleSendMessage}
            placeholder={options.tone === 'custom' ? "Describe your greeting in detail..." : "Add any additional details (optional)..."}
          />
        </CardFooter>
      </Card>
      <Footer />
    </main>
  );
}