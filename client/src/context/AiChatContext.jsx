import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const AiChatContext = createContext(null);

export function AiChatProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [initialPrompt, setInitialPrompt] = useState('');
  const openChat = useCallback((prompt = '') => {
    setInitialPrompt(prompt);
    setOpen(true);
  }, []);
  const closeChat = useCallback(() => setOpen(false), []);
  const clearInitialPrompt = useCallback(() => setInitialPrompt(''), []);
  const value = useMemo(() => ({
    open,
    initialPrompt,
    openChat,
    closeChat,
    clearInitialPrompt,
  }), [open, initialPrompt, openChat, closeChat, clearInitialPrompt]);
  return <AiChatContext.Provider value={value}>{children}</AiChatContext.Provider>;
}

export function useAiChat() {
  const context = useContext(AiChatContext);
  if (!context) throw new Error('useAiChat must be used within AiChatProvider.');
  return context;
}
