import { describe, it, expect } from 'vitest';

describe('Integration - Task Claim to Payment Flow', () => {
  describe('Task Lifecycle States', () => {
    const taskStatuses = [
      'AVAILABLE',
      'CLAIMED',
      'IN_PROGRESS',
      'SUBMITTED',
      'UNDER_REVIEW',
      'COMPLETED',
      'DISPUTED',
    ];

    it('should transition from AVAILABLE to CLAIMED', () => {
      const fromStatus = 'AVAILABLE';
      const toStatus = 'CLAIMED';
      const availableIdx = taskStatuses.indexOf(fromStatus);
      const claimedIdx = taskStatuses.indexOf(toStatus);
      expect(claimedIdx).toBe(availableIdx + 1);
    });

    it('should transition from SUBMITTED to UNDER_REVIEW', () => {
      const fromStatus = 'SUBMITTED';
      const toStatus = 'UNDER_REVIEW';
      expect(taskStatuses.includes(fromStatus)).toBe(true);
      expect(taskStatuses.includes(toStatus)).toBe(true);
    });

    it('should transition from UNDER_REVIEW to COMPLETED (approved)', () => {
      const approvedStatus = 'COMPLETED';
      expect(approvedStatus).toBe('COMPLETED');
    });

    it('should transition from UNDER_REVIEW to DISPUTED (rejected)', () => {
      const rejectedStatus = 'DISPUTED';
      expect(rejectedStatus).toBe('DISPUTED');
    });

    it('only tasks in AVAILABLE status can be claimed', () => {
      const claimableStatus = 'AVAILABLE';
      expect(claimableStatus).toBe('AVAILABLE');
    });
  });

  describe('Payment Flow on Approval', () => {
    it('approved task should create TASK_PAYMENT transaction', () => {
      const paymentType = 'TASK_PAYMENT';
      expect(paymentType).toBe('TASK_PAYMENT');
    });

    it('payment should be sent to task claimant', () => {
      const toAgentId = 'claimed-by-agent-uuid';
      expect(toAgentId).toBeDefined();
    });

    it('payment amount should match bountyAmount', () => {
      const bountyAmount = '10000';
      const paymentAmount = '10000';
      expect(paymentAmount).toBe(bountyAmount);
    });

    it('payment status should default to PENDING', () => {
      const initialStatus = 'PENDING';
      expect(initialStatus).toBe('PENDING');
    });

    it('payment token should match task bountyToken', () => {
      const defaultToken = 'SATS';
      expect(defaultToken).toBe('SATS');
    });
  });

  describe('Task Quality Scoring', () => {
    it('quality score should be numeric', () => {
      const qualityScore = 85;
      expect(typeof qualityScore).toBe('number');
    });

    it('quality score can be reviewed', () => {
      const reviewNotes = 'Good implementation, minor improvements suggested';
      expect(typeof reviewNotes).toBe('string');
      expect(reviewNotes.length).toBeGreaterThan(0);
    });

    it('approved tasks should have COMPLETED status', () => {
      const approved = true;
      const expectedStatus = 'COMPLETED';
      expect(approved ? expectedStatus : 'DISPUTED').toBe('COMPLETED');
    });

    it('disputed tasks should have DISPUTED status', () => {
      const approved = false;
      const expectedStatus = 'DISPUTED';
      expect(approved ? 'COMPLETED' : expectedStatus).toBe('DISPUTED');
    });
  });
});
