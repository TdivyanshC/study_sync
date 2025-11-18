/**
 * Soft Audit Event System
 * Event emitter for soft audit notifications (Module Soft)
 */

import { EventEmitter } from 'events';

// Define event types for Module Soft - Session Audit Strictness
export interface AuditForgivenessEvent {
  userId: string;
  forgivenessRate: number;
  streakContribution: number;
  xpContribution: number;
  behaviorContribution: number;
  timestamp: Date;
}

export interface SoftAuditFlagEvent {
  userId: string;
  sessionId: string;
  suspicionScore: number;
  adjustedScore: number;
  forgivenessApplied: number;
  isValid: boolean;
  recommendations: string[];
  timestamp: Date;
}

export interface AuditValidationEvent {
  userId: string;
  sessionId: string;
  isValid: boolean;
  validationMode: 'soft' | 'strict';
  baseScore: number;
  adjustedScore: number;
  forgivenessApplied: number;
  threshold: number;
  message: string;
  timestamp: Date;
}

export interface AuditPatternEvent {
  userId: string;
  sessionId: string;
  patterns: {
    missingEvents: string[];
    irregularTiming: boolean;
    suspiciousDuration: boolean;
    gapsDetected: number;
  };
  severityLevel: 'low' | 'medium' | 'high';
  timestamp: Date;
}

class SoftAuditEventEmitter {
  private emitter: EventEmitter;

  constructor() {
    this.emitter = new EventEmitter();
    // Increase max listeners to avoid memory leak warnings
    this.emitter.setMaxListeners(50);
  }

  /**
   * Emit audit forgiveness event
   */
  emitAuditForgiveness(event: AuditForgivenessEvent) {
    this.emitter.emit('audit_forgiveness', event);
  }

  /**
   * Listen for audit forgiveness events
   */
  onAuditForgiveness(callback: (event: AuditForgivenessEvent) => void): () => void {
    this.emitter.on('audit_forgiveness', callback);
    return () => this.emitter.off('audit_forgiveness', callback);
  }

  /**
   * Emit soft audit flag event (non-punitive)
   */
  emitSoftAuditFlag(event: SoftAuditFlagEvent) {
    this.emitter.emit('soft_audit_flag', event);
  }

  /**
   * Listen for soft audit flag events
   */
  onSoftAuditFlag(callback: (event: SoftAuditFlagEvent) => void): () => void {
    this.emitter.on('soft_audit_flag', callback);
    return () => this.emitter.off('soft_audit_flag', callback);
  }

  /**
   * Emit audit validation event
   */
  emitAuditValidation(event: AuditValidationEvent) {
    this.emitter.emit('audit_validation', event);
  }

  /**
   * Listen for audit validation events
   */
  onAuditValidation(callback: (event: AuditValidationEvent) => void): () => void {
    this.emitter.on('audit_validation', callback);
    return () => this.emitter.off('audit_validation', callback);
  }

  /**
   * Emit audit pattern event
   */
  emitAuditPattern(event: AuditPatternEvent) {
    this.emitter.emit('audit_pattern', event);
  }

  /**
   * Listen for audit pattern events
   */
  onAuditPattern(callback: (event: AuditPatternEvent) => void): () => void {
    this.emitter.on('audit_pattern', callback);
    return () => this.emitter.off('audit_pattern', callback);
  }

  /**
   * Remove all listeners (useful for cleanup)
   */
  removeAllListeners() {
    this.emitter.removeAllListeners();
  }

  /**
   * Get listener count for debugging
   */
  getListenerCount(event: string): number {
    return this.emitter.listenerCount(event);
  }
}

// Export singleton instance
export const softAuditEventEmitter = new SoftAuditEventEmitter();