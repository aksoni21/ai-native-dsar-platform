"use client";

import { useState } from 'react';
import { Send, Edit, Flag, Brain, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/utils';
import type { ReplyData } from '@/types';

interface ConsumerRepliesProps {
  replies: ReplyData[];
}

type ReplyAction = 'sent' | 'editing' | 'escalated' | null;

export default function ConsumerReplies({ replies }: ConsumerRepliesProps) {
  const [replyActions, setReplyActions] = useState<
    Record<string, ReplyAction>
  >({});

  const handleAction = (replyId: string, action: ReplyAction) => {
    setReplyActions((prev) => ({ ...prev, [replyId]: action }));
  };

  return (
    <Card data-tour="consumer-replies">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquare className="h-5 w-5" />
          Consumer Replies
          <Badge variant="secondary" className="ml-2">
            {replies.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {replies.map((reply) => {
          const action = replyActions[reply.id] || null;

          return (
            <div key={reply.id} className="space-y-3">
              {/* Consumer message bubble */}
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl rounded-tl-none bg-muted px-4 py-3">
                  <p className="text-sm">{reply.reply_text}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {formatDateTime(reply.created_at)}
                  </p>
                </div>
              </div>

              {/* Agent analysis card */}
              <div className="ml-6 rounded-lg border border-purple-200 bg-purple-50/50 p-4 dark:border-purple-800 dark:bg-purple-950/50">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">
                    AI Analysis
                  </span>
                  <Badge
                    className="text-[10px] bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
                  >
                    {reply.category}
                  </Badge>
                </div>

                <p className="text-sm text-muted-foreground mb-2">
                  {reply.agent_summary}
                </p>

                {/* Extracted info */}
                {reply.extracted_info &&
                  Object.keys(reply.extracted_info).length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs font-medium mb-1">
                        Extracted Information:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(reply.extracted_info).map(
                          ([key, value]) => (
                            <Badge
                              key={key}
                              variant="outline"
                              className="text-[10px]"
                            >
                              {key}: {value}
                            </Badge>
                          )
                        )}
                      </div>
                    </div>
                  )}

                <p className="text-xs text-muted-foreground">
                  Suggested action:{' '}
                  <span className="font-medium">{reply.suggested_action}</span>
                </p>
              </div>

              {/* Draft response */}
              <div className="ml-6">
                <div className="flex justify-end">
                  <div className="max-w-[80%] rounded-2xl rounded-tr-none bg-primary/10 px-4 py-3 border border-primary/20">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Draft Response
                    </p>
                    <p className="text-sm">{reply.draft_response}</p>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="mt-2 flex justify-end gap-2">
                  {action ? (
                    <Badge
                      className={cn(
                        'text-xs',
                        action === 'sent' &&
                          'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
                        action === 'editing' &&
                          'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
                        action === 'escalated' &&
                          'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                      )}
                    >
                      {action === 'sent' && 'Sent'}
                      {action === 'editing' && 'Editing'}
                      {action === 'escalated' && 'Escalated'}
                    </Badge>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => handleAction(reply.id, 'sent')}
                      >
                        <Send className="mr-1 h-3 w-3" />
                        Send
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAction(reply.id, 'editing')}
                      >
                        <Edit className="mr-1 h-3 w-3" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950"
                        onClick={() => handleAction(reply.id, 'escalated')}
                      >
                        <Flag className="mr-1 h-3 w-3" />
                        Escalate
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
