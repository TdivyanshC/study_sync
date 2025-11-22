/**
 * Comprehensive Frontend Validation Utilities
 * Provides client-side validation for all user inputs
 */

import { z } from 'zod';

// Validation schemas using Zod
export const userRegistrationSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be less than 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  
  email: z.string()
    .email('Please enter a valid email address')
    .max(255, 'Email is too long'),
  
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number'),
});

export const userLoginSchema = z.object({
  email: z.string()
    .email('Please enter a valid email address'),
  
  password: z.string()
    .min(1, 'Password is required'),
});

export const studySessionSchema = z.object({
  spaceId: z.string().uuid().optional().or(z.literal('')),
  durationMinutes: z.number()
    .positive('Duration must be positive')
    .max(1440, 'Duration cannot exceed 24 hours'),
  efficiency: z.number()
    .min(0, 'Efficiency must be between 0 and 100')
    .max(100, 'Efficiency must be between 0 and 100')
    .optional(),
});

export const spaceCreateSchema = z.object({
  name: z.string()
    .min(1, 'Space name is required')
    .max(100, 'Space name must be less than 100 characters'),
  
  visibility: z.enum(['public', 'private']),
});

export const chatMessageSchema = z.object({
  message: z.string()
    .min(1, 'Message cannot be empty')
    .max(1000, 'Message must be less than 1000 characters'),
});

export const activityUpdateSchema = z.object({
  action: z.string()
    .min(1, 'Action is required')
    .max(100, 'Action must be less than 100 characters'),
  
  progress: z.number()
    .min(0, 'Progress must be between 0 and 100')
    .max(100, 'Progress must be between 0 and 100'),
  
  subject: z.string()
    .max(100, 'Subject must be less than 100 characters')
    .optional(),
});

export const xpAwardSchema = z.object({
  userId: z.string().uuid(),
  amount: z.number()
    .positive('XP amount must be positive')
    .max(10000, 'XP amount cannot exceed 10,000'),
  
  source: z.enum([
    'session', 'streak', 'daily_bonus', 'milestone', 
    'achievement', 'admin', 'correction', 'referral'
  ]),
  
  metadata: z.record(z.any()).optional(),
});

// Type inference from schemas
export type UserRegistrationData = z.infer<typeof userRegistrationSchema>;
export type UserLoginData = z.infer<typeof userLoginSchema>;
export type StudySessionData = z.infer<typeof studySessionSchema>;
export type SpaceCreateData = z.infer<typeof spaceCreateSchema>;
export type ChatMessageData = z.infer<typeof chatMessageSchema>;
export type ActivityUpdateData = z.infer<typeof activityUpdateSchema>;
export type XPAwardData = z.infer<typeof xpAwardSchema>;

// Validation functions
export function validateEmail(email: string): { isValid: boolean; error?: string } {
  try {
    userLoginSchema.parse({ email, password: 'dummy' });
    return { isValid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, error: error.errors[0].message };
    }
    return { isValid: false, error: 'Invalid email format' };
  }
}

export function validatePassword(password: string): { isValid: boolean; error?: string; issues?: string[] } {
  const issues: string[] = [];
  
  if (password.length < 8) {
    issues.push('At least 8 characters');
  }
  
  if (!/[a-z]/.test(password)) {
    issues.push('At least one lowercase letter');
  }
  
  if (!/[A-Z]/.test(password)) {
    issues.push('At least one uppercase letter');
  }
  
  if (!/\d/.test(password)) {
    issues.push('At least one number');
  }
  
  const isValid = issues.length === 0;
  return { 
    isValid, 
    error: isValid ? undefined : 'Password does not meet requirements',
    issues: isValid ? undefined : issues
  };
}

export function validateUsername(username: string): { isValid: boolean; error?: string } {
  try {
    userRegistrationSchema.parse({ username, email: 'test@example.com', password: 'Password123' });
    return { isValid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, error: error.errors[0].message };
    }
    return { isValid: false, error: 'Invalid username format' };
  }
}

export function validateUUID(uuid: string): { isValid: boolean; error?: string } {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  if (!uuidRegex.test(uuid)) {
    return { isValid: false, error: 'Invalid UUID format' };
  }
  
  return { isValid: true };
}

// Input sanitization
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return String(input);
  
  return input
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/\x00/g, '') // Remove null bytes
    .trim();
}

export function sanitizeFilename(filename: string): string {
  if (typeof filename !== 'string') return 'unnamed_file';
  
  return filename
    .replace(/[<>:"/\\|?*]/g, '_') // Replace dangerous characters
    .replace(/\x00/g, '') // Remove null bytes
    .trim()
    .substring(0, 255); // Limit length
}

// Data type validation
export function isValidNumber(value: any): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

export function isValidBoolean(value: any): value is boolean {
  return typeof value === 'boolean';
}

export function isValidDate(value: any): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

export function isValidArray(value: any): value is any[] {
  return Array.isArray(value);
}

export function isValidObject(value: any): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Form validation helpers
export function validateForm<T>(
  data: Record<string, any>, 
  schema: z.ZodSchema<T>
): { isValid: boolean; data?: T; errors?: Record<string, string> } {
  try {
    const validatedData = schema.parse(data);
    return { isValid: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        errors[path] = err.message;
      });
      
      return { isValid: false, errors };
    }
    
    return { 
      isValid: false, 
      errors: { general: 'Validation failed due to unexpected error' }
    };
  }
}

// Real-time validation for forms
export function validateField(
  fieldName: string, 
  value: any, 
  schema: z.ZodSchema<any>
): { isValid: boolean; error?: string } {
  try {
    const testData = { [fieldName]: value };
    schema.parse(testData);
    return { isValid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, error: error.errors[0].message };
    }
    return { isValid: false, error: 'Invalid value' };
  }
}

// URL validation
export function validateURL(url: string): { isValid: boolean; error?: string } {
  try {
    new URL(url);
    return { isValid: true };
  } catch {
    return { isValid: false, error: 'Invalid URL format' };
  }
}

// Phone number validation (basic)
export function validatePhoneNumber(phone: string): { isValid: boolean; error?: string } {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  
  if (!phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''))) {
    return { isValid: false, error: 'Invalid phone number format' };
  }
  
  return { isValid: true };
}

// File validation
export function validateFile(
  file: File | { name: string; size: number; type: string }
): { isValid: boolean; error?: string } {
  // Check file size (10MB limit)
  if (file.size > 10 * 1024 * 1024) {
    return { isValid: false, error: 'File size cannot exceed 10MB' };
  }
  
  // Check file type
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'text/plain', 'text/markdown',
    'application/json'
  ];
  
  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, error: 'File type not allowed' };
  }
  
  // Check filename
  if (!file.name || file.name.length > 255) {
    return { isValid: false, error: 'Invalid filename' };
  }
  
  // Check for dangerous characters in filename
  const dangerousChars = /[<>:"/\\|?*]/;
  if (dangerousChars.test(file.name)) {
    return { isValid: false, error: 'Filename contains invalid characters' };
  }
  
  return { isValid: true };
}

// Credit card validation (basic Luhn algorithm)
export function validateCreditCard(cardNumber: string): { isValid: boolean; error?: string } {
  const cleaned = cardNumber.replace(/\s/g, '');
  
  if (!/^\d{13,19}$/.test(cleaned)) {
    return { isValid: false, error: 'Invalid card number format' };
  }
  
  // Luhn algorithm
  let sum = 0;
  let isEven = false;
  
  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i], 10);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  if (sum % 10 !== 0) {
    return { isValid: false, error: 'Invalid card number' };
  }
  
  return { isValid: true };
}

// Security validation
export function detectMaliciousInput(input: string): { isSafe: boolean; threats?: string[] } {
  const threats: string[] = [];
  
  // SQL injection patterns
  const sqlPatterns = [
    /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/i,
    /('|(\\x27)|(\\x22))/,
    /(\b(or|and)\b\s*['"\\x27\\x22]?\s*\d+\s*=\s*\d+)/i,
  ];
  
  // XSS patterns
  const xssPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
    /javascript:/i,
    /on\w+\s*=/i,
  ];
  
  // Command injection patterns
  const commandPatterns = [
    /[;&|`$(){}\[\]]/,
    /\s*(?:sh|bash|cmd|powershell)\s*/i,
    /(curl|wget|nc|netcat)\s+/i,
  ];
  
  // Check patterns
  sqlPatterns.forEach(pattern => {
    if (pattern.test(input)) {
      threats.push('Potential SQL injection detected');
    }
  });
  
  xssPatterns.forEach(pattern => {
    if (pattern.test(input)) {
      threats.push('Potential XSS attack detected');
    }
  });
  
  commandPatterns.forEach(pattern => {
    if (pattern.test(input)) {
      threats.push('Potential command injection detected');
    }
  });
  
  return {
    isSafe: threats.length === 0,
    threats: threats.length > 0 ? threats : undefined,
  };
}

// Batch validation
export function validateBatch<T>(
  items: any[], 
  validator: (item: any) => { isValid: boolean; error?: string }
): { results: Array<{ item: any; isValid: boolean; error?: string }>; validCount: number; invalidCount: number } {
  const results = items.map(item => {
    const validation = validator(item);
    return {
      item,
      isValid: validation.isValid,
      error: validation.error,
    };
  });
  
  const validCount = results.filter(r => r.isValid).length;
  const invalidCount = results.length - validCount;
  
  return { results, validCount, invalidCount };
}

// Validation state management
export interface ValidationState {
  isValid: boolean;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  validating: Record<string, boolean>;
}

export function createInitialValidationState(fields: string[]): ValidationState {
  const state: ValidationState = {
    isValid: true,
    errors: {},
    touched: {},
    validating: {},
  };
  
  fields.forEach(field => {
    state.touched[field] = false;
    state.validating[field] = false;
  });
  
  return state;
}

// Error message formatting
export function formatValidationErrors(errors: Record<string, string>): string {
  return Object.entries(errors)
    .map(([field, error]) => `${field}: ${error}`)
    .join('\n');
}

// Required field validation
export function validateRequired(value: any, fieldName: string): { isValid: boolean; error?: string } {
  if (value === null || value === undefined || value === '') {
    return { isValid: false, error: `${fieldName} is required` };
  }
  
  if (typeof value === 'string' && value.trim() === '') {
    return { isValid: false, error: `${fieldName} cannot be empty` };
  }
  
  return { isValid: true };
}

// Length validation
export function validateLength(
  value: string, 
  fieldName: string, 
  min?: number, 
  max?: number
): { isValid: boolean; error?: string } {
  if (min !== undefined && value.length < min) {
    return { isValid: false, error: `${fieldName} must be at least ${min} characters` };
  }
  
  if (max !== undefined && value.length > max) {
    return { isValid: false, error: `${fieldName} must be less than ${max} characters` };
  }
  
  return { isValid: true };
}

// Pattern validation
export function validatePattern(
  value: string, 
  pattern: RegExp, 
  fieldName: string, 
  errorMessage?: string
): { isValid: boolean; error?: string } {
  if (!pattern.test(value)) {
    return { isValid: false, error: errorMessage || `${fieldName} format is invalid` };
  }
  
  return { isValid: true };
}