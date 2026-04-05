/**
 * https://github.com/openai/openai/blob/master/chatgpt/web/src/%40types/backend.ts#L94
 */
export enum AccountPlanType {
  FREE = "free",
  GO = "go",
  PLUS = "plus",
  PRO = "pro",
  PROLITE = "prolite",
  SELF_SERVE_BUSINESS = "team",
  ENTERPRISE_CBP = "business",
  SELF_SERVE_BUSINESS_USAGE_BASED = "self_serve_business_usage_based",
  ENTERPRISE_CBP_USAGE_BASED = "enterprise_cbp_usage_based",
  FINSERV = "finserv",
  EDUCATION_CBP = "education",
  QUORUM = "quorum",
  DEPRECATED_ENTERPRISE = "enterprise",
  HC = "hc",
  DEPRECATED_ENTERPRISE_2 = "deprecated_enterprise",
  DEPRECATED_EDU = "edu",
  DEPRECATED_EDU_2 = "deprecated_edu",
}

export function isEducationalPlan(planType?: AccountPlanType | null): boolean {
  return planType === "education" || planType === "deprecated_edu";
}

export function isQuorumPlan(planType?: AccountPlanType | null): boolean {
  return planType === "quorum";
}

export function isSelfServeBusinessPlan(
  planType?: AccountPlanType | string | null,
): boolean {
  return (
    planType === AccountPlanType.SELF_SERVE_BUSINESS ||
    planType === AccountPlanType.SELF_SERVE_BUSINESS_USAGE_BASED
  );
}

export function isEnterpriseyPlan(planType?: AccountPlanType | null): boolean {
  return (
    planType === "business" ||
    planType === "enterprise_cbp_usage_based" ||
    planType === "deprecated_enterprise" ||
    planType === "hc" ||
    planType === "finserv" ||
    isEducationalPlan(planType) ||
    isQuorumPlan(planType)
  );
}

export function isUsageBasedSeatPlan(
  planType?: AccountPlanType | string | null,
): boolean {
  return (
    planType === AccountPlanType.SELF_SERVE_BUSINESS_USAGE_BASED ||
    planType === AccountPlanType.ENTERPRISE_CBP_USAGE_BASED
  );
}

export function isDoubleRateLimitPlan(
  planType?: AccountPlanType | string | null,
): boolean {
  return (
    planType === AccountPlanType.PLUS ||
    planType === AccountPlanType.PRO ||
    planType === AccountPlanType.PROLITE ||
    isSelfServeBusinessPlan(planType) ||
    planType === AccountPlanType.DEPRECATED_ENTERPRISE ||
    planType === AccountPlanType.DEPRECATED_ENTERPRISE_2 ||
    planType === AccountPlanType.DEPRECATED_EDU ||
    planType === AccountPlanType.DEPRECATED_EDU_2
  );
}
