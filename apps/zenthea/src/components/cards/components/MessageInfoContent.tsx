'use client';

import React from 'react';
import { MessageCardContent } from './MessageCardContent';
import { MessageThread } from './MessageThread';
import { MessageActions } from './MessageActions';
import { MessageData } from '../MessageCard';

type DeliveryOptions = {
  inApp: boolean;
  email: boolean;
  sms: boolean;
};

interface MessageInfoContentProps {
  messageData: MessageData;
  isTyping: boolean;
  typingUser: string | null;
  messageInput: string;
  setMessageInput: (value: string) => void;
  deliveryOptions: DeliveryOptions;
  setDeliveryOptions: React.Dispatch<React.SetStateAction<DeliveryOptions>>;
  onSendMessage: () => void;
  onReply: () => void;
  onForward: () => void;
  onArchive: () => void;
  onStar: () => void;
  onUnstar: () => void;
  isSending?: boolean;
}

export const MessageInfoContent: React.FC<MessageInfoContentProps> = ({
  messageData,
  isTyping,
  typingUser,
  messageInput,
  setMessageInput,
  deliveryOptions,
  setDeliveryOptions,
  onSendMessage,
  onReply,
  onForward,
  onArchive,
  onStar,
  onUnstar,
  isSending = false
}) => {
  const {
    content,
    messageType,
    isRead,
    attachments = [],
    threadMessages = [],
    canReply = false,
    canForward = false,
    isStarred = false
  } = messageData;

  const handleStarToggle = () => {
    if (isStarred) {
      onUnstar();
    } else {
      onStar();
    }
  };

  return (
    <div className="space-y-4">
      {/* Full Chat Interface */}
      <div className="space-y-4">
        {/* Current Message Content */}
        <MessageCardContent 
          message={{
            content,
            messageType,
            isRead
          }}
          attachments={attachments}
        />
        
        {/* Message Thread */}
        {threadMessages && threadMessages.length > 0 && (
          <MessageThread
            thread={(threadMessages || []).map(msg => ({
              id: msg.id,
              sender: msg.sender,
              content: msg.content,
              timestamp: msg.timestamp,
              isRead: msg.isRead,
              messageType: msg.messageType,
              isInternal: msg.isInternal,
              attachments: msg.attachments
            }))}
            onReply={onReply}
          />
        )}

        {/* Message Actions */}
        <MessageActions
          onReply={onReply}
          onForward={onForward}
          onArchive={onArchive}
          onStar={handleStarToggle}
          isStarred={isStarred}
          isArchived={messageData.isArchived}
          canReply={canReply}
          canForward={canForward}
          canArchive={messageData.canArchive}
          canStar={messageData.canStar}
        />

        {/* Reply Input */}
        {(canReply || canForward) && (
          <div className="border-t pt-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <textarea
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder="Type your reply..."
                    className="w-full p-3 border border-border-primary rounded-lg resize-none focus:ring-2 focus:ring-interactive-primary focus:border-transparent"
                    rows={3}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={onSendMessage}
                    disabled={!messageInput.trim() || isSending}
                    className="px-4 py-2 bg-interactive-primary text-white rounded-lg hover:bg-interactive-primary-hover disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isSending ? (
                      <>
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Sending...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                        Send
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Typing Indicator */}
              {isTyping && (
                <div className="flex items-center gap-2 text-sm text-text-tertiary">
                  <div className="flex gap-1">
                    <div className="w-1 h-1 bg-text-tertiary rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                    <div className="w-1 h-1 bg-text-tertiary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-1 h-1 bg-text-tertiary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span>{typingUser} is typing...</span>
                </div>
              )}

              {/* Delivery Options */}
              <div className="mt-3 flex items-center justify-end gap-4 text-xs">
                <span className="text-text-secondary font-medium">Send to:</span>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      id="inApp"
                      checked={deliveryOptions.inApp}
                      onChange={(e) => setDeliveryOptions(prev => ({ ...prev, inApp: e.target.checked }))}
                      className="h-3 w-3 bg-surface-elevated text-interactive-primary border-border-primary rounded focus:ring-border-focus"
                    />
                    <label htmlFor="inApp" className="text-text-primary cursor-pointer flex items-center gap-1">
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      In-app
                    </label>
                  </div>
                  <div className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      id="email"
                      checked={deliveryOptions.email}
                      onChange={(e) => setDeliveryOptions(prev => ({ ...prev, email: e.target.checked }))}
                      className="h-3 w-3 bg-surface-elevated text-interactive-primary border-border-primary rounded focus:ring-border-focus"
                    />
                    <label htmlFor="email" className="text-text-primary cursor-pointer flex items-center gap-1">
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Email
                    </label>
                  </div>
                  <div className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      id="sms"
                      checked={deliveryOptions.sms}
                      onChange={(e) => setDeliveryOptions(prev => ({ ...prev, sms: e.target.checked }))}
                      className="h-3 w-3 bg-surface-elevated text-interactive-primary border-border-primary rounded focus:ring-border-focus"
                    />
                    <label htmlFor="sms" className="text-text-primary cursor-pointer flex items-center gap-1">
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      SMS
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
