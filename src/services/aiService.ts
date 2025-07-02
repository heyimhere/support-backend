import { v4 as uuidv4 } from 'uuid';
import {
  ConversationStep,
  ConversationStepType,
  TicketCategory,
  TicketCategoryType,
} from '../types';

// Types for AI processing
interface ConversationState {
  id: string;
  currentStep: ConversationStepType;
  collectedData: {
    userName?: string;
    userEmail?: string;
    issueDescription?: string;
    issueTitle?: string;
    suggestedCategory?: string;
    confirmedCategory?: string;
    additionalDetails?: string[];
  };
  messages: Array<{
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
    metadata?: Record<string, any>;
  }>;
  isComplete: boolean;
  createdTicketId?: string;
  startedAt: string;
  completedAt?: string;
}

interface AIResponse {
  type: 'question' | 'clarification' | 'category_suggestion' | 'confirmation' | 'success' | 'error' | 'typing';
  content: string;
  nextStep?: ConversationStepType;
  suggestions?: string[];
  categoryOptions?: string[];
  requiresInput: boolean;
  metadata?: Record<string, any>;
}

interface AIProcessResult {
  assistantResponse: AIResponse;
  updatedConversation: ConversationState;
  suggestedCategory?: string;
}

// Category detection patterns (enhanced version of frontend logic)
const CATEGORY_PATTERNS = {
  technical: [
    'bug', 'error', 'crash', 'broken', 'not working', 'issue', 'problem',
    'glitch', 'freeze', 'slow', 'performance', 'loading', 'timeout',
    'connection', 'server', 'database', 'api', 'sync', 'refresh'
  ],
  billing: [
    'payment', 'charge', 'billing', 'invoice', 'refund', 'subscription',
    'price', 'cost', 'credit card', 'transaction', 'money', 'plan',
    'upgrade', 'downgrade', 'cancel', 'receipt'
  ],
  account: [
    'login', 'password', 'access', 'account', 'profile', 'settings',
    'email', 'username', 'forgot', 'reset', 'security', 'verification',
    'signin', 'logout', 'permissions'
  ],
  feature_request: [
    'feature', 'request', 'suggestion', 'improvement', 'enhancement',
    'add', 'new', 'would like', 'could you', 'wish', 'hope',
    'functionality', 'option', 'ability'
  ],
  bug_report: [
    'bug', 'error message', 'unexpected', 'wrong', 'incorrect',
    'mistake', 'fault', 'defect', 'glitch', 'malfunction'
  ]
};

// AI Prompts and responses
const AI_PROMPTS = {
  GREETING: "Hi there! 👋 I'm here to help you create a support ticket. To get started, could you please tell me your name?",
  
  COLLECT_ISSUE: (name: string) => 
    `Nice to meet you, ${name}! Now, could you please describe the issue you're experiencing? Be as detailed as possible - this will help our support team assist you better.`,
  
  CLARIFY_DETAILS: "Thank you for that information. Could you provide any additional details that might help us understand the issue better? For example, when did this start happening, or what steps led to this issue?",
  
  SUGGEST_CATEGORY: (suggestedCategory: string) => 
    `Based on your description, this seems like a **${getCategoryDisplayName(suggestedCategory as TicketCategoryType)}** issue. Does this sound right to you? You can confirm this category or let me know if you think it should be categorized differently.`,
  
  COLLECT_EMAIL: "Great! To complete your support ticket, could you please provide your email address? This will help our support team get back to you.",
  
  FINAL_CONFIRMATION: (data: { userName: string; issueDescription: string; category: string; userEmail?: string }) =>
    `Perfect! Let me confirm the details for your support ticket:

**Name:** ${data.userName}
**Email:** ${data.userEmail || 'Not provided'}
**Issue:** ${data.issueDescription}
**Category:** ${getCategoryDisplayName(data.category as TicketCategoryType)}

Does everything look correct? If yes, I'll create your support ticket right away!`,
  
  TICKET_CREATED: (ticketId: string) =>
    `✅ Great! Your support ticket has been created successfully.

**Ticket ID:** ${ticketId}

Our support team will review your ticket and get back to you soon. You can reference this ticket ID in any future communications.

Is there anything else I can help you with today?`,
  
  ERROR: "I apologize, but something went wrong. Let me try to help you in a different way. Could you please tell me what you were trying to do?",
  
  INVALID_INPUT: "I didn't quite understand that. Could you please rephrase your response?",
};

// Category detection function
function detectCategory(text: string): TicketCategoryType {
  const lowerText = text.toLowerCase();
  
  let maxMatches = 0;
  let detectedCategory: TicketCategoryType = TicketCategory.GENERAL;
  
  Object.entries(CATEGORY_PATTERNS).forEach(([category, patterns]) => {
    const matches = patterns.filter(pattern => lowerText.includes(pattern)).length;
    if (matches > maxMatches) {
      maxMatches = matches;
      detectedCategory = category as TicketCategoryType;
    }
  });
  
  return maxMatches > 0 ? detectedCategory : TicketCategory.GENERAL;
}

// Get category display name
function getCategoryDisplayName(category: TicketCategoryType): string {
  const displayNames = {
    [TicketCategory.TECHNICAL]: 'Technical Issue',
    [TicketCategory.BILLING]: 'Billing & Payments',
    [TicketCategory.ACCOUNT]: 'Account Management',
    [TicketCategory.FEATURE_REQUEST]: 'Feature Request',
    [TicketCategory.BUG_REPORT]: 'Bug Report',
    [TicketCategory.GENERAL]: 'General Inquiry',
    [TicketCategory.OTHER]: 'Other',
  };
  
  return displayNames[category] || 'Unknown';
}

// Get next conversation step
function getNextStep(currentStep: ConversationStepType, userInput: string, collectedData: any): ConversationStepType {
  switch (currentStep) {
    case ConversationStep.GREETING:
      return ConversationStep.COLLECT_ISSUE;
    
    case ConversationStep.COLLECT_ISSUE:
      return ConversationStep.CLARIFY_DETAILS;
    
    case ConversationStep.CLARIFY_DETAILS:
      return ConversationStep.SUGGEST_CATEGORY;
    
    case ConversationStep.SUGGEST_CATEGORY:
      return ConversationStep.CONFIRM_CATEGORY;
    
    case ConversationStep.CONFIRM_CATEGORY:
      // If we don't have email, collect it, otherwise go to confirmation
      return !collectedData.userEmail ? ConversationStep.COLLECT_NAME : ConversationStep.FINAL_CONFIRMATION;
    
    case ConversationStep.COLLECT_NAME:
      return ConversationStep.FINAL_CONFIRMATION;
    
    case ConversationStep.FINAL_CONFIRMATION:
      return ConversationStep.TICKET_CREATED;
    
    default:
      return ConversationStep.ERROR;
  }
}

// Check if input contains affirmative response
function isAffirmative(input: string): boolean {
  const lowerInput = input.toLowerCase().trim();
  const affirmatives = [
    'yes', 'yeah', 'yep', 'yup', 'sure', 'correct', 'right', 'exactly',
    'that\'s right', 'sounds good', 'looks good', 'ok', 'okay', 'k',
    'absolutely', 'definitely', 'of course', 'perfect', 'great',
    'let\'s do it', 'lets do it', 'go ahead', 'proceed', 'continue',
    'create it', 'create the ticket', 'make the ticket', 'submit it',
    'confirm', 'approved', 'good to go', 'all good', 'that works'
  ];
  
  // Check for exact matches or phrases within the input
  return affirmatives.some(phrase => 
    lowerInput === phrase || 
    lowerInput.includes(phrase) ||
    (phrase.length > 3 && lowerInput.includes(phrase))
  );
}

// Check if input contains negative response
function isNegative(input: string): boolean {
  const lowerInput = input.toLowerCase().trim();
  const negatives = [
    'no', 'nope', 'nah', 'not', 'wrong', 'incorrect', 'different',
    'that\'s wrong', 'not right', 'not correct', 'not quite',
    'don\'t', 'dont', 'stop', 'cancel', 'abort', 'nevermind',
    'never mind', 'wait', 'hold on', 'not yet', 'not ready'
  ];
  
  return negatives.some(phrase => 
    lowerInput === phrase || 
    lowerInput.includes(phrase) ||
    (phrase.length > 3 && lowerInput.includes(phrase))
  );
}

// Extract name from user input (handles sentences like "Hi, my name is John Smith")
function extractNameFromInput(input: string): { name: string; isSentence: boolean; needsClarification: boolean } {
  const cleanInput = input.trim();
  const lowerInput = cleanInput.toLowerCase();
  
  // Check if it's a sentence (has multiple words and common sentence patterns)
  const sentencePatterns = [
    /^(hi|hello|hey|good morning|good afternoon|good evening)/,
    /\b(my name is|i am|i'm|call me|name's)\s+/,
    /\b(and|but|so|because|i need|i want|please|help)/,
    /[.!?]/, // Contains punctuation
  ];
  
  const isSentence = sentencePatterns.some(pattern => pattern.test(lowerInput)) || cleanInput.split(' ').length > 3;
  
  if (isSentence) {
    // Try to extract name from common patterns
    const namePatterns = [
      /(?:my name is|i am|i'm|call me|name's)\s+([a-zA-Z\s\-'\.]{2,30}?)(?:\s+and|\s+,|\s*\.|$)/i,
      /^(?:hi|hello|hey),?\s+(?:my name is|i am|i'm)\s+([a-zA-Z\s\-'\.]{2,30}?)(?:\s+and|\s+,|\s*\.|$)/i,
    ];
    
    for (const pattern of namePatterns) {
      const match = cleanInput.match(pattern);
      if (match) {
        const extractedName = match[1].trim()
          .replace(/[^\w\s\-'\.]/g, '')
          .replace(/\s+/g, ' ');
        
        if (extractedName.length >= 2 && extractedName.length <= 30) {
          return { 
            name: extractedName, 
            isSentence: true, 
            needsClarification: true 
          };
        }
      }
    }
    
    // If we can't extract a clear name from the sentence, ask for clarification
    return { 
      name: '', 
      isSentence: true, 
      needsClarification: true 
    };
  }
  
  // If it's not a sentence, treat as direct name input
  const cleanedName = cleanInput
    .replace(/[^\w\s\-'\.]/g, '')
    .replace(/\s+/g, ' ')
    .substring(0, 50);
  
  return { 
    name: cleanedName, 
    isSentence: false, 
    needsClarification: cleanedName.length < 2 
  };
}

// Main AI processing function
export async function processAIMessage(userInput: string, conversation: ConversationState): Promise<AIProcessResult> {
  const { currentStep, collectedData } = conversation;
  let updatedData = { ...collectedData };
  let aiResponse: AIResponse;
  let nextStep: ConversationStepType;
  let suggestedCategory: string | undefined;

  try {
    switch (currentStep) {
      case ConversationStep.GREETING:
        // Smart name extraction from user input
        const nameResult = extractNameFromInput(userInput);
        
        if (nameResult.needsClarification) {
          if (nameResult.name && nameResult.isSentence) {
            // We extracted a potential name from a sentence - confirm it
            aiResponse = {
              type: 'clarification',
              content: `I think I heard your name is "${nameResult.name}". Is that correct? If not, please just tell me your name.`,
              suggestions: ['Yes, that\'s correct', 'No, my name is...'],
              requiresInput: true,
            };
            // Store the potential name for confirmation
            (updatedData as any).potentialName = nameResult.name;
            nextStep = currentStep; // Stay on same step for confirmation
          } else {
            // Couldn't extract name or input too short
            aiResponse = {
              type: 'question',
              content: nameResult.isSentence 
                ? 'I\'d love to help you! Could you please just tell me your name first?'
                : 'Please provide your name (at least 2 characters).',
              requiresInput: true,
            };
            nextStep = currentStep; // Stay on same step
          }
        } else if ((updatedData as any).potentialName && (isAffirmative(userInput) || isNegative(userInput))) {
          // User is responding to name confirmation
          if (isAffirmative(userInput)) {
            updatedData.userName = (updatedData as any).potentialName;
            delete (updatedData as any).potentialName;
            nextStep = getNextStep(currentStep, userInput, updatedData);
            aiResponse = {
              type: 'question',
              content: AI_PROMPTS.COLLECT_ISSUE(updatedData.userName!),
              nextStep,
              requiresInput: true,
            };
          } else {
            // User said no, ask for name again
            delete (updatedData as any).potentialName;
            aiResponse = {
              type: 'question',
              content: 'No problem! Please tell me your name.',
              requiresInput: true,
            };
            nextStep = currentStep; // Stay on same step
          }
        } else {
          // Clean name input, ready to proceed
          updatedData.userName = nameResult.name;
          if ((updatedData as any).potentialName) delete (updatedData as any).potentialName;
          nextStep = getNextStep(currentStep, userInput, updatedData);
          aiResponse = {
            type: 'question',
            content: AI_PROMPTS.COLLECT_ISSUE(updatedData.userName),
            nextStep,
            requiresInput: true,
          };
        }
        break;

      case ConversationStep.COLLECT_ISSUE:
        // Collect issue description with sanitization
        const cleanedIssue = userInput.trim()
          .replace(/\s+/g, ' ') // Replace multiple spaces with single space
          .substring(0, 1000); // Limit to 1000 characters
        
        if (cleanedIssue.length < 10) {
          aiResponse = {
            type: 'question',
            content: 'Please provide more details about your issue (at least 10 characters).',
            requiresInput: true,
          };
          nextStep = currentStep; // Stay on same step
        } else {
          updatedData.issueDescription = cleanedIssue;
          updatedData.issueTitle = cleanedIssue.split('.')[0].substring(0, 100) || 'Support Request';
          nextStep = getNextStep(currentStep, userInput, updatedData);
          aiResponse = {
            type: 'question',
            content: AI_PROMPTS.CLARIFY_DETAILS,
            nextStep,
            requiresInput: true,
          };
        }
        break;

      case ConversationStep.CLARIFY_DETAILS:
        // Collect additional details with sanitization
        const cleanedDetails = userInput.trim()
          .replace(/\s+/g, ' ')
          .substring(0, 500); // Limit additional details to 500 characters
        
        if (cleanedDetails.length < 5 && !userInput.toLowerCase().includes('skip')) {
          aiResponse = {
            type: 'question',
            content: 'Please provide some additional details (at least 5 characters), or type "skip" if you have nothing to add.',
            requiresInput: true,
          };
          nextStep = currentStep; // Stay on same step
        } else {
          if (!updatedData.additionalDetails) updatedData.additionalDetails = [];
          
          // Only add details if not skipping
          if (!userInput.toLowerCase().includes('skip') && cleanedDetails.length >= 5) {
            updatedData.additionalDetails.push(cleanedDetails);
          }
          
          // Detect category based on all collected text
          const allText = `${updatedData.issueDescription} ${updatedData.additionalDetails.join(' ')}`;
          const detectedCategory = detectCategory(allText);
          updatedData.suggestedCategory = detectedCategory;
          suggestedCategory = detectedCategory;
          
          nextStep = getNextStep(currentStep, userInput, updatedData);
          aiResponse = {
            type: 'category_suggestion',
            content: AI_PROMPTS.SUGGEST_CATEGORY(detectedCategory),
            nextStep,
            suggestions: ['Yes, that\'s correct', 'No, different category'],
            requiresInput: true,
          };
        }
        break;

      case ConversationStep.SUGGEST_CATEGORY:
        if (isAffirmative(userInput)) {
          // User confirmed the suggested category
          updatedData.confirmedCategory = updatedData.suggestedCategory;
          nextStep = getNextStep(currentStep, userInput, updatedData);
        } else if (isNegative(userInput)) {
          // User wants different category - for now, set to general
          updatedData.confirmedCategory = TicketCategory.GENERAL;
          nextStep = getNextStep(currentStep, userInput, updatedData);
        } else {
          // User might have mentioned a different category
          const mentionedCategory = detectCategory(userInput);
          updatedData.confirmedCategory = mentionedCategory;
          nextStep = getNextStep(currentStep, userInput, updatedData);
        }
        
        // Check if we need to collect email
        if (!updatedData.userEmail) {
          aiResponse = {
            type: 'question',
            content: AI_PROMPTS.COLLECT_EMAIL,
            nextStep: ConversationStep.COLLECT_NAME,
            requiresInput: true,
          };
          nextStep = ConversationStep.COLLECT_NAME;
        } else {
          aiResponse = {
            type: 'confirmation',
            content: AI_PROMPTS.FINAL_CONFIRMATION({
              userName: updatedData.userName!,
              issueDescription: updatedData.issueDescription!,
              category: updatedData.confirmedCategory!,
              userEmail: updatedData.userEmail,
            }),
            nextStep,
            suggestions: ['Yes, create the ticket', 'No, let me modify something'],
            requiresInput: true,
          };
        }
        break;

      case ConversationStep.COLLECT_NAME:
        // This step is now for collecting email
        const cleanedEmail = userInput.trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (emailRegex.test(cleanedEmail)) {
          updatedData.userEmail = cleanedEmail;
          nextStep = getNextStep(currentStep, userInput, updatedData);
          aiResponse = {
            type: 'confirmation',
            content: AI_PROMPTS.FINAL_CONFIRMATION({
              userName: updatedData.userName!,
              issueDescription: updatedData.issueDescription!,
              category: updatedData.confirmedCategory!,
              userEmail: updatedData.userEmail,
            }),
            nextStep,
            suggestions: ['Yes, create the ticket', 'No, let me modify something'],
            requiresInput: true,
          };
        } else {
          aiResponse = {
            type: 'question',
            content: 'Please provide a valid email address (e.g., john@example.com).',
            requiresInput: true,
          };
          nextStep = currentStep; // Stay on same step
        }
        break;

      case ConversationStep.FINAL_CONFIRMATION:
        if (isAffirmative(userInput)) {
          // Mark conversation as ready for ticket creation
          updatedData.issueTitle = updatedData.issueTitle || 'Support Request';
          
          nextStep = ConversationStep.TICKET_CREATED;
          aiResponse = {
            type: 'success',
            content: '✅ Perfect! I\'m creating your support ticket now...\n\nYour ticket will be created with all the details we\'ve collected. Our support team will review it and get back to you soon.',
            nextStep,
            requiresInput: false,
            metadata: { shouldCreateTicket: true }
          };
        } else {
          // User wants to modify - for simplicity, restart the process
          nextStep = ConversationStep.GREETING;
          aiResponse = {
            type: 'question',
            content: 'Let\'s start over. ' + AI_PROMPTS.GREETING,
            nextStep,
            requiresInput: true,
          };
        }
        break;

      default:
        nextStep = ConversationStep.ERROR;
        aiResponse = {
          type: 'error',
          content: AI_PROMPTS.ERROR,
          nextStep,
          requiresInput: true,
        };
    }

    // Update conversation state
    const updatedConversation: ConversationState = {
      ...conversation,
      currentStep: nextStep,
      collectedData: updatedData,
      isComplete: nextStep === ConversationStep.TICKET_CREATED,
      completedAt: nextStep === ConversationStep.TICKET_CREATED ? new Date().toISOString() : undefined,
    };

    return {
      assistantResponse: aiResponse,
      updatedConversation,
      suggestedCategory,
    };

  } catch (error) {
    console.error('Error in AI processing:', error);
    
    return {
      assistantResponse: {
        type: 'error',
        content: AI_PROMPTS.ERROR,
        nextStep: ConversationStep.ERROR,
        requiresInput: true,
      },
      updatedConversation: {
        ...conversation,
        currentStep: ConversationStep.ERROR,
      },
    };
  }
} 