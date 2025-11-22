import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useSocket } from '../hooks/useSocket';
import { SocketMessage } from '../../services/socketService';

interface SpaceChatProps {
  spaceId: string;
  currentUserId: string;
  currentUsername?: string;
  onMessageSent?: (message: SocketMessage) => void;
}

interface ChatMessage extends SocketMessage {
  isOwn: boolean;
  formattedTime: string;
}

export const SpaceChat: React.FC<SpaceChatProps> = ({
  spaceId,
  currentUserId,
  currentUsername = 'You',
  onMessageSent
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  const {
    connectionState,
    joinSpace,
    sendMessage,
    subscribe,
    clearMessages,
    isInSpace
  } = useSocket({
    autoConnect: true,
    onError: (error) => {
      Alert.alert('Connection Error', 'Failed to send message');
    }
  });

  // Join space on mount
  useEffect(() => {
    const initializeChat = async () => {
      setIsLoading(true);
      try {
        if (!isInSpace(spaceId)) {
          await joinSpace(spaceId);
        }
      } catch (error) {
        console.error('Failed to join space for chat:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeChat();

    return () => {
      clearMessages(spaceId);
    };
  }, [spaceId]);

  // Subscribe to new messages
  useEffect(() => {
    const unsubscribers = [
      subscribe('new_message', (message: SocketMessage) => {
        if (message.space_id === spaceId) {
          const chatMessage: ChatMessage = {
            ...message,
            isOwn: message.user_id === currentUserId,
            formattedTime: formatMessageTime(message.created_at)
          };
          
          setMessages(prev => {
            // Avoid duplicates
            if (prev.some(msg => msg.id === message.id)) {
              return prev;
            }
            const newMessages = [...prev, chatMessage];
            
            // Keep only last 100 messages for performance
            if (newMessages.length > 100) {
              return newMessages.slice(-100);
            }
            
            return newMessages;
          });

          // Auto-scroll to bottom for new messages
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);

          // Call callback if provided
          if (chatMessage.isOwn) {
            onMessageSent?.(message);
          }
        }
      })
    ];

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [spaceId, currentUserId, subscribe, onMessageSent]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const formatMessageTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isSending || !connectionState.isConnected) {
      return;
    }

    setIsSending(true);
    try {
      sendMessage(spaceId, inputMessage.trim(), 'text');
      setInputMessage('');
      inputRef.current?.focus();
    } catch (error) {
      console.error('Failed to send message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (event: any) => {
    if (event.nativeEvent.key === 'Enter' && !event.nativeEvent.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const renderMessage = ({ item: message }: { item: ChatMessage }) => (
    <View style={[
      styles.messageContainer,
      message.isOwn ? styles.ownMessage : styles.otherMessage
    ]}>
      {!message.isOwn && (
        <Text style={styles.messageUsername}>
          {message.username}
        </Text>
      )}
      <View style={[
        styles.messageBubble,
        message.isOwn ? styles.ownBubble : styles.otherBubble
      ]}>
        <Text style={[
          styles.messageText,
          message.isOwn ? styles.ownText : styles.otherText
        ]}>
          {message.message}
        </Text>
      </View>
      <Text style={[
        styles.messageTime,
        message.isOwn ? styles.ownTime : styles.otherTime
      ]}>
        {message.formattedTime}
      </Text>
    </View>
  );

  const renderSystemMessage = ({ item: message }: { item: ChatMessage }) => (
    <View style={styles.systemMessageContainer}>
      <Text style={styles.systemMessageText}>
        {message.message}
      </Text>
      <Text style={styles.systemMessageTime}>
        {message.formattedTime}
      </Text>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateText}>
        {isLoading ? 'Loading messages...' : 'No messages yet'}
      </Text>
      <Text style={styles.emptyStateSubtext}>
        {isLoading ? '' : 'Start the conversation!'}
      </Text>
    </View>
  );

  if (!connectionState.isConnected) {
    return (
      <View style={styles.container}>
        <View style={styles.offlineIndicator}>
          <Text style={styles.offlineText}>
            Connecting to chat...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chat</Text>
        <View style={styles.statusIndicator}>
          <View style={[
            styles.statusDot,
            { backgroundColor: connectionState.isConnected ? '#4CAF50' : '#F44336' }
          ]} />
          <Text style={styles.statusText}>
            {connectionState.isConnected ? 'Connected' : 'Connecting...'}
          </Text>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        style={styles.messagesList}
        data={messages}
        renderItem={({ item }) => 
          item.message_type === 'system' ? 
            renderSystemMessage({ item }) : 
            renderMessage({ item })
        }
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        inverted={false}
        ListEmptyComponent={!isLoading ? renderEmptyState : null}
        onContentSizeChange={() => {
          if (messages.length > 0) {
            flatListRef.current?.scrollToEnd({ animated: false });
          }
        }}
      />

      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <TextInput
            ref={inputRef}
            style={styles.textInput}
            value={inputMessage}
            onChangeText={setInputMessage}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            placeholderTextColor="#999"
            multiline
            maxLength={500}
            editable={connectionState.isConnected && !isSending}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputMessage.trim() || isSending || !connectionState.isConnected) && 
              styles.sendButtonDisabled
            ]}
            onPress={handleSendMessage}
            disabled={
              !inputMessage.trim() || 
              isSending || 
              !connectionState.isConnected
            }
          >
            <Text style={[
              styles.sendButtonText,
              (!inputMessage.trim() || isSending || !connectionState.isConnected) && 
              styles.sendButtonTextDisabled
            ]}>
              {isSending ? '⏳' : '➤'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#666',
  },
  offlineIndicator: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  offlineText: {
    fontSize: 16,
    color: '#666',
  },
  messagesList: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  messageContainer: {
    marginVertical: 4,
    maxWidth: '80%',
  },
  ownMessage: {
    alignSelf: 'flex-end',
  },
  otherMessage: {
    alignSelf: 'flex-start',
  },
  messageUsername: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 2,
    marginLeft: 8,
  },
  messageBubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  ownBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: 'white',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  ownText: {
    color: 'white',
  },
  otherText: {
    color: '#333',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
    textAlign: 'right',
  },
  ownTime: {
    color: '#999',
    textAlign: 'right',
  },
  otherTime: {
    color: '#999',
    textAlign: 'left',
  },
  systemMessageContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  systemMessageText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  systemMessageTime: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  inputContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    maxHeight: 100,
    minHeight: 36,
    color: '#333',
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    fontSize: 16,
    color: 'white',
  },
  sendButtonTextDisabled: {
    color: '#999',
  },
});