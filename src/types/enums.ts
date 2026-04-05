import {
  VehicleStatus,
  DealStatus,
  InventoryCondition,
  TradeInCondition,
  VehicleRequestStatus,
  InquiryStatus,
  ProposalStatus,
  EnergyServiceStatus,
  PaymentStatus,
  DocumentStatus,
  EnvelopeStatus,
  Drivetrain,
  TitleStatus,
  ContactMethod,
} from "@prisma/client";

/**
 * UI Label Maps
 * These provide human-readable strings for raw enum values.
 */

export const DRIVETRAIN_LABELS: Record<Drivetrain, string> = {
  AWD: "All-Wheel Drive (AWD)",
  RWD: "Rear-Wheel Drive (RWD)",
  FWD: "Front-Wheel Drive (FWD)",
};

export const TITLE_STATUS_LABELS: Record<TitleStatus, string> = {
  CLEAN: "Clean",
  SALVAGE: "Salvage",
  REBUILT: "Rebuilt",
  LEMON: "Lemon",
};

/** Admin-facing labels; LISTED is shown as "Published" (live on public site). */
export const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  DRAFT: "Draft",
  UNPUBLISHED: "Unpublished",
  LISTED: "Published",
  RESERVED: "Reserved",
  UNDER_CONTRACT: "Contract in Progress",
  SOLD: "Sold",
  ARCHIVED: "Archived",
};

export const DEAL_STATUS_LABELS: Record<DealStatus, string> = {
  LEAD: "Lead",
  DEPOSIT_PENDING: "Processing Deposit",
  DEPOSIT_RECEIVED: "Vehicle Reserved",
  DOCUMENTS_PENDING: "Awaiting Your Documentation",
  CONTRACTS_SENT: "Ready for Signature",
  CONTRACTS_SIGNED: "Contract Completed",
  FINANCING_PENDING: "Finalizing Transaction",
  READY_FOR_DELIVERY: "Ready for Pickup",
  COMPLETED: "Delivered",
  CANCELLED: "Deal Cancelled",
};

export const INVENTORY_CONDITION_LABELS: Record<InventoryCondition, string> = {
  EXCELLENT: "Excellent",
  GOOD: "Good",
  FAIR: "Fair",
};

export const TRADEIN_CONDITION_LABELS: Record<TradeInCondition, string> = {
  EXCELLENT: "Excellent",
  GOOD: "Good",
  FAIR: "Fair",
  POOR: "Poor",
};

export const REQUEST_STATUS_LABELS: Record<VehicleRequestStatus, string> = {
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under Review",
  SOURCING: "Searching Auctions",
  VEHICLE_PROPOSED: "Vehicle Proposed",
  CUSTOMER_APPROVED: "Customer Approved",
  CONVERTED_TO_DEAL: "Converted to Deal",
  CLOSED: "Closed",
};

export const INQUIRY_STATUS_LABELS: Record<InquiryStatus, string> = {
  NEW: "New",
  REVIEWED: "Reviewed",
  RESPONDED: "Responded",
  CONVERTED: "Converted",
  CLOSED: "Closed",
};

export const PROPOSAL_STATUS_LABELS: Record<ProposalStatus, string> = {
  PROPOSED: "Proposed",
  CUSTOMER_ACCEPTED: "Accepted",
  CUSTOMER_DECLINED: "Declined",
  EXPIRED: "Expired",
};

export const ENERGY_SERVICE_STATUS_LABELS: Record<EnergyServiceStatus, string> = {
  INTEREST_CAPTURED: "Interest Captured",
  SUBMITTED_TO_BAYTECH: "Submitted to Baytech",
  ACKNOWLEDGED: "Acknowledged",
  CONTACT_PENDING: "Contact Pending",
  CLOSED: "Closed",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: "Pending",
  SUCCEEDED: "Succeeded",
  FAILED: "Failed",
  REFUNDED: "Refunded",
};

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  PENDING: "Pending",
  UPLOADED: "Uploaded",
  VERIFIED: "Verified",
  REJECTED: "Rejected",
};

export const ENVELOPE_STATUS_LABELS: Record<EnvelopeStatus, string> = {
  SENT: "Sent",
  DELIVERED: "Delivered",
  COMPLETED: "Completed",
  VOIDED: "Voided",
};

export const CONTACT_METHOD_LABELS: Record<ContactMethod, string> = {
  EMAIL: "Email",
  PHONE: "Phone",
  EITHER: "Either",
};
