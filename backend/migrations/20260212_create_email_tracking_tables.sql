-- Create email_conversations table
CREATE TABLE IF NOT EXISTS public.email_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    lead_email TEXT NOT NULL,
    lead_name TEXT,
    subject TEXT,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'archived')),
    unread_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for email_conversations
ALTER TABLE public.email_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own conversations" 
ON public.email_conversations FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversations" 
ON public.email_conversations FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations" 
ON public.email_conversations FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations" 
ON public.email_conversations FOR DELETE 
USING (auth.uid() = user_id);

-- Create email_messages table
CREATE TABLE IF NOT EXISTS public.email_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.email_conversations(id) ON DELETE CASCADE,
    external_id TEXT UNIQUE, -- Message-ID from Gmail/Outlook
    sender_email TEXT NOT NULL,
    recipient_email TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    body_text TEXT,
    body_html TEXT,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for email_messages
ALTER TABLE public.email_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view messages if they own the conversation
CREATE POLICY "Users can view messages of their conversations" 
ON public.email_messages FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.email_conversations 
        WHERE id = public.email_messages.conversation_id 
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert messages to their conversations" 
ON public.email_messages FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.email_conversations 
        WHERE id = public.email_messages.conversation_id 
        AND user_id = auth.uid()
    )
);
